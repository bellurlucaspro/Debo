/**
 * Gem Studio — Bootstrap du device WebGPU et du pipeline de rendu.
 *
 * Exécuté DANS le worker (jamais sur le main thread). Configure :
 *   - l'adaptateur + device (avec features/limits négociées) ;
 *   - le contexte de l'OffscreenCanvas (format préféré, alphaMode premultiplied) ;
 *   - les GPUBuffers stables (plans, uniforms) — alloués une fois, ré-écrits ;
 *   - le render pipeline plein-écran (fullscreen triangle → fragment ray-tracer).
 *
 * Le shader WGSL est dans `shaders/gem.wgsl.ts`. La passe d'optimisation 7×7
 * (compute) est branchée séparément dans `optimizer.ts`.
 */

import { GEM_WGSL } from "./shaders/gem.wgsl";
import { MAX_PLANES, PLANE_STRIDE } from "../model/compile";

export interface GpuContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  pipeline: GPURenderPipeline;
  planeBuffer: GPUBuffer;
  uniformBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  envSampler: GPUSampler;
}

/** Uniforms partagés (std140-compatible, 256 B aligné). */
export const UNIFORM_FLOATS = 64; // 256 octets

export async function initGpu(
  canvas: OffscreenCanvas,
  envTexture: GPUTexture | null,
): Promise<GpuContext | null> {
  if (!("gpu" in navigator)) return null;

  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return null;

  const device = await adapter.requestDevice({
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
    },
  });

  const context = canvas.getContext("webgpu") as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "premultiplied", // se fond dans la page de luxe (fond clair)
  });

  // ── Buffers stables (alloués UNE fois) ────────────────────────────────────
  const planeBuffer = device.createBuffer({
    size: MAX_PLANES * PLANE_STRIDE * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    label: "gem.planes",
  });
  const uniformBuffer = device.createBuffer({
    size: UNIFORM_FLOATS * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    label: "gem.uniforms",
  });

  // ── Environnement (HDRI equirect) pour les rayons sortants/réfléchis ──────
  // À défaut d'un HDRI fourni, on génère un environnement studio procédural
  // HDR (rgba16float) → la pierre a de quoi réfracter/réfléchir dès le 1er rendu.
  const env = envTexture ?? createProceduralEnv(device);
  const envSampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
    addressModeU: "repeat",
    addressModeV: "clamp-to-edge",
  });

  // ── Pipeline plein-écran ──────────────────────────────────────────────────
  const module = device.createShaderModule({ code: GEM_WGSL, label: "gem.wgsl" });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: { module, entryPoint: "vs_fullscreen" },
    fragment: {
      module,
      entryPoint: "fs_gem",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: { buffer: planeBuffer } },
      { binding: 2, resource: envSampler },
      { binding: 3, resource: env.createView() },
    ],
  });

  return { device, context, format, pipeline, planeBuffer, uniformBuffer, bindGroup, envSampler };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Environnement studio procédural (equirectangulaire HDR).
 * Trois sources douces (key chaude en haut, fill froid, rim) sur un dégradé
 * sol↔ciel. Encodé en demi-flottants pour rgba16float (filtrable partout).
 * ────────────────────────────────────────────────────────────────────────── */
function createProceduralEnv(device: GPUDevice): GPUTexture {
  const W = 256;
  const H = 128;
  const data = new Uint16Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1); // 0 = haut (ciel), 1 = bas (sol)
    const elevation = 1 - v; // 1 en haut
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      // Dégradé vertical : ciel lumineux → sol sombre.
      let r = 0.35 + 0.5 * elevation;
      let g = 0.36 + 0.52 * elevation;
      let b = 0.4 + 0.55 * elevation;
      // Key light chaude (spot haut, légèrement à gauche).
      const key = softSpot(u, v, 0.32, 0.18, 0.16) * 6.0;
      r += key * 1.0; g += key * 0.92; b += key * 0.78;
      // Fill froid (droite).
      const fill = softSpot(u, v, 0.74, 0.42, 0.22) * 1.6;
      r += fill * 0.7; g += fill * 0.8; b += fill * 1.0;
      const i = (y * W + x) * 4;
      data[i] = f32ToF16(r);
      data[i + 1] = f32ToF16(g);
      data[i + 2] = f32ToF16(b);
      data[i + 3] = f32ToF16(1);
    }
  }
  const tex = device.createTexture({
    size: [W, H, 1],
    format: "rgba16float",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });
  device.queue.writeTexture({ texture: tex }, data, { bytesPerRow: W * 4 * 2, rowsPerImage: H }, [W, H, 1]);
  return tex;
}

function softSpot(u: number, v: number, cx: number, cy: number, radius: number): number {
  const d = Math.hypot(u - cx, v - cy) / radius;
  return Math.max(0, 1 - d * d) ** 2;
}

/** Encode un float32 en demi-flottant (IEEE 754 binary16). */
function f32ToF16(val: number): number {
  f32[0] = val;
  const x = i32[0]!;
  const sign = (x >> 16) & 0x8000;
  const exp = ((x >> 23) & 0xff) - 127 + 15;
  const mant = x & 0x7fffff;
  if (exp <= 0) return sign;
  if (exp >= 31) return sign | 0x7c00;
  return sign | (exp << 10) | (mant >> 13);
}
const f32 = new Float32Array(1);
const i32 = new Int32Array(f32.buffer);

/** Upload des plans recompilés (zéro-alloc côté GPU : writeBuffer réutilise). */
export function uploadPlanes(gpu: GpuContext, planes: Float32Array<ArrayBuffer>, count: number): void {
  gpu.device.queue.writeBuffer(gpu.planeBuffer, 0, planes, 0, count * PLANE_STRIDE);
}

/** Dessine une frame (appelé dans la RAF du worker). */
export function renderFrame(gpu: GpuContext, uniforms: Float32Array<ArrayBuffer>): void {
  gpu.device.queue.writeBuffer(gpu.uniformBuffer, 0, uniforms);

  const encoder = gpu.device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: gpu.context.getCurrentTexture().createView(),
        loadOp: "clear",
        storeOp: "store",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
      },
    ],
  });
  pass.setPipeline(gpu.pipeline);
  pass.setBindGroup(0, gpu.bindGroup);
  pass.draw(3); // fullscreen triangle
  pass.end();
  gpu.device.queue.submit([encoder.finish()]);
}
