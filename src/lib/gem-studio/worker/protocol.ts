/**
 * Gem Studio — Protocole de communication Main ⇄ Worker.
 *
 * Stratégie de threading (cf. ARCHITECTURE.md §1) :
 *   - Le thread principal (React/Zustand) ne fait QUE de l'UI. Il ne touche
 *     jamais au GPU ni à la géométrie.
 *   - Un `OffscreenCanvas` est TRANSFÉRÉ au worker à l'init : tout WebGPU
 *     (device, pipelines, requestAnimationFrame) vit dans le worker. Le main
 *     thread reste donc libre même pendant un rendu lourd → 0 jank UI.
 *   - Les sliders n'envoient que des DELTAS (params), jamais de la géométrie.
 *     Le worker recompile les plans (zéro-GC) et redessine.
 *
 * Deux canaux complémentaires :
 *   1. postMessage (ce fichier) : commandes discrètes (init, mutation, resize…).
 *   2. SharedArrayBuffer (optionnel, si COOP/COEP actifs) : pour le streaming
 *      continu des paramètres pendant un drag à 120 Hz sans pression GC ni
 *      sérialisation. Le main écrit les floats, le worker les lit dans sa RAF.
 *
 * Tous les messages sont discriminés par `type`. Les transferables (canvas,
 * buffers) passent dans le 2ᵉ argument de postMessage, jamais clonés.
 */

import type { GemDesign } from "../model/design";

/* ───────────── Main → Worker ───────────── */

export type MainToWorker =
  | {
      type: "init";
      /** Transféré (transferControlToOffscreen). */
      canvas: OffscreenCanvas;
      dpr: number;
      /** Buffer partagé des paramètres live (si dispo), sinon null. */
      params: SharedArrayBuffer | null;
      design: GemDesign;
    }
  | { type: "set-design"; design: GemDesign }
  /** Drag d'un slider : delta léger, pas de re-sérialisation complète. */
  | { type: "patch-param"; key: LiveParamKey; value: number }
  | { type: "camera"; yaw: number; pitch: number; distance: number }
  | { type: "resize"; width: number; height: number; dpr: number }
  /** Active la grille 7×7 du Manual Optimizer (compute pass). */
  | { type: "optimizer"; enabled: boolean; axisX: LiveParamKey; axisY: LiveParamKey; span: number }
  | { type: "pause"; paused: boolean }
  | { type: "dispose" };

/* ───────────── Worker → Main ───────────── */

export type WorkerToMain =
  | { type: "ready"; adapter: string; backend: "webgpu" }
  | { type: "fallback"; reason: string } // WebGPU indispo → bascule R3F/WebGL
  /** Métriques perf + gemmologie poussées vers l'UI (volume exact, light return). */
  | { type: "stats"; fps: number; caratsExact: number; lightReturnPct: number; planeCount: number }
  /** Résultat d'une cellule de la grille d'optimisation (score de brillance). */
  | { type: "optimizer-grid"; scores: Float32Array; best: number }
  | { type: "error"; message: string };

/* ───────────── Paramètres « live » (drag-friendly) ───────────── */

/**
 * Sous-ensemble de l'état modifiable en continu par un slider. Indexés dans le
 * SharedArrayBuffer pour le streaming. Tout le reste passe par `set-design`.
 */
export type LiveParamKey =
  | "crownAngle"
  | "pavilionAngle"
  | "tableSize"
  | "girdleThickness"
  | "totalDepthMm"
  | "girdleDiameterMm"
  | "dispersion";

export const LIVE_PARAM_KEYS: readonly LiveParamKey[] = [
  "crownAngle",
  "pavilionAngle",
  "tableSize",
  "girdleThickness",
  "totalDepthMm",
  "girdleDiameterMm",
  "dispersion",
];

/** Taille du SAB des paramètres : 1 float par clé + 1 flag « dirty ». */
export const PARAM_SAB_BYTES = (LIVE_PARAM_KEYS.length + 1) * Float32Array.BYTES_PER_ELEMENT;
export const PARAM_DIRTY_INDEX = LIVE_PARAM_KEYS.length;

/** Helper typé pour écrire un paramètre live + lever le flag dirty. */
export function writeLiveParam(view: Float32Array, key: LiveParamKey, value: number): void {
  view[LIVE_PARAM_KEYS.indexOf(key)] = value;
  Atomics.store(new Int32Array(view.buffer), PARAM_DIRTY_INDEX, 1);
}
