/// <reference lib="webworker" />
/**
 * Gem Studio — Worker de rendu.
 *
 * Propriétaire exclusif de l'OffscreenCanvas, du device WebGPU et de la boucle
 * requestAnimationFrame. Le main thread ne lui envoie que des commandes légères
 * (cf. protocol.ts). Toute la charge GPU vit ici → le thread UI reste libre.
 */

import {
  initGpu,
  uploadPlanes,
  renderFrame,
  UNIFORM_FLOATS,
  type GpuContext,
} from "../gpu/device";
import { writeUniforms, type CameraState } from "../gpu/camera";
import { PlaneArena, compilePlanes } from "../model/compile";
import { estimateCarats, type GemDesign, type FacetInstruction } from "../model/design";
import {
  LIVE_PARAM_KEYS,
  PARAM_DIRTY_INDEX,
  type MainToWorker,
  type WorkerToMain,
} from "./protocol";

/** Copie mutable d'une instruction (l'original est `readonly`). */
type MutableFacet = { -readonly [K in keyof FacetInstruction]: FacetInstruction[K] };

const post = (m: WorkerToMain, transfer?: Transferable[]) =>
  (self as DedicatedWorkerGlobalScope).postMessage(m, transfer ?? []);

/* ── État du worker (mutable et privé : on patche en place, zéro-GC) ──────── */
let gpu: GpuContext | null = null;
let canvas: OffscreenCanvas | null = null;

const arena = new PlaneArena();
const uniforms = new Float32Array(UNIFORM_FLOATS);

let design: GemDesign | null = null;
let instructions: MutableFacet[] = []; // copie mutable des instructions
let needsCompile = true;

// Paramètres « live » partagés (drag des sliders).
let paramF32: Float32Array | null = null;
let paramI32: Int32Array | null = null;
let liveDispersion = 0;

const cam: CameraState = { yaw: 0.6, pitch: 0.45, distance: 4.6 };
let autoRotate = true;
let paused = false;

// Métriques.
let lastStats = 0;
let frames = 0;
let fpsClock = performance.now();
let fps = 0;

/* ── Réception des messages ───────────────────────────────────────────────── */
self.onmessage = async (e: MessageEvent<MainToWorker>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      canvas = msg.canvas;
      design = msg.design;
      instructions = msg.design.instructions.map((i) => ({ ...i }));
      liveDispersion = msg.design.optics.dispersion;
      if (msg.params) {
        paramF32 = new Float32Array(msg.params);
        paramI32 = new Int32Array(msg.params);
      }
      try {
        gpu = await initGpu(canvas, null);
      } catch (err) {
        post({ type: "fallback", reason: String(err) });
        return;
      }
      if (!gpu) {
        post({ type: "fallback", reason: "navigator.gpu indisponible" });
        return;
      }
      post({ type: "ready", adapter: "webgpu", backend: "webgpu" });
      requestAnimationFrame(loop);
      break;
    }
    case "resize": {
      if (!canvas) break;
      canvas.width = Math.max(1, Math.floor(msg.width * msg.dpr));
      canvas.height = Math.max(1, Math.floor(msg.height * msg.dpr));
      break;
    }
    case "camera":
      cam.yaw = msg.yaw;
      cam.pitch = msg.pitch;
      cam.distance = msg.distance;
      autoRotate = false;
      break;
    case "set-design":
      design = msg.design;
      instructions = msg.design.instructions.map((i) => ({ ...i }));
      liveDispersion = msg.design.optics.dispersion;
      needsCompile = true;
      break;
    case "patch-param":
      applyLiveParam(LIVE_PARAM_KEYS.indexOf(msg.key), msg.value);
      needsCompile = true;
      break;
    case "pause":
      paused = msg.paused;
      break;
    case "dispose":
      gpu?.device.destroy();
      gpu = null;
      break;
  }
};

/* ── Boucle de rendu ──────────────────────────────────────────────────────── */
function loop() {
  if (!gpu || !design || !canvas) return;
  requestAnimationFrame(loop);
  if (paused || canvas.width < 2) return;

  // 1) Lecture des paramètres live (drag) via SharedArrayBuffer.
  if (paramI32 && Atomics.load(paramI32, PARAM_DIRTY_INDEX) === 1) {
    for (let k = 0; k < LIVE_PARAM_KEYS.length; k++) applyLiveParam(k, paramF32![k] ?? 0);
    Atomics.store(paramI32, PARAM_DIRTY_INDEX, 0);
    needsCompile = true;
  }

  // 2) Recompilation des plans (zéro-alloc) uniquement si nécessaire.
  if (needsCompile) {
    const live: GemDesign = { ...design, instructions, optics: { ...design.optics, dispersion: liveDispersion } };
    compilePlanes(live, arena);
    uploadPlanes(gpu, arena.planes, arena.count);
    needsCompile = false;
  }

  // 3) Caméra (auto-rotation tant que l'utilisateur n'a pas pris la main).
  if (autoRotate) cam.yaw += 0.006;

  // 4) Uniforms + draw.
  writeUniforms(
    uniforms,
    canvas.width,
    canvas.height,
    cam,
    design.optics.ior,
    liveDispersion,
    design.optics.absorption,
    arena.count,
    1.0,
  );
  renderFrame(gpu, uniforms);

  // 5) Stats throttlées (~4/s).
  frames++;
  const now = performance.now();
  if (now - fpsClock >= 500) {
    fps = Math.round((frames * 1000) / (now - fpsClock));
    frames = 0;
    fpsClock = now;
  }
  if (now - lastStats >= 250) {
    lastStats = now;
    post({
      type: "stats",
      fps,
      caratsExact: estimateCarats(design),
      lightReturnPct: 0, // rempli plus tard par le compute pass de l'optimiseur
      planeCount: arena.count,
    });
  }
}

/* ── Application d'un paramètre live sur les instructions (en place) ───────── */
function applyLiveParam(index: number, value: number): void {
  if (!design || index < 0) return;
  switch (LIVE_PARAM_KEYS[index]) {
    case "crownAngle":
      for (const i of instructions) if (i.tier === "crown") i.angle = value;
      break;
    case "pavilionAngle":
      for (const i of instructions) if (i.tier === "pavilion") i.angle = value;
      break;
    case "tableSize":
      for (const i of instructions) if (i.tier === "table") i.depth = value;
      break;
    case "girdleThickness":
      for (const i of instructions) if (i.tier === "girdle") i.depth = value;
      break;
    case "totalDepthMm":
      design = { ...design, totalDepthMm: value };
      break;
    case "girdleDiameterMm":
      design = { ...design, girdleDiameterMm: value };
      break;
    case "dispersion":
      liveDispersion = value;
      break;
  }
}
