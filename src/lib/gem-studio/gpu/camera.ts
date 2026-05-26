/**
 * Gem Studio — Caméra orbitale + assemblage des uniforms GPU.
 *
 * Maths mat4 minimales (column-major, conventions gl-matrix) pour éviter
 * d'importer Three.js dans le worker. Le shader reconstruit le rayon monde
 * depuis `invViewProj` + `camPos`, donc on a juste besoin de :
 *   perspective · lookAt → viewProj → invert.
 */

export type Mat4 = Float32Array; // 16, column-major

// Vue tuple en lecture : l'indexation d'un tuple n'est pas soumise à
// `noUncheckedIndexedAccess` (indices 0..15 toujours définis) → math sans `| undefined`.
// prettier-ignore
type R16 = readonly [
  number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number,
];
const r16 = (m: Mat4): R16 => m as unknown as R16;

export function perspective(out: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

type Vec3 = readonly [number, number, number];

export function lookAt(out: Mat4, eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const [ex, ey, ez] = eye;
  const [cx, cy, cz] = center;
  const [ux, uy, uz] = up;
  let z0 = ex - cx, z1 = ey - cy, z2 = ez - cz;
  let len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len; z1 *= len; z2 *= len;
  let x0 = uy * z2 - uz * z1, x1 = uz * z0 - ux * z2, x2 = ux * z1 - uy * z0;
  len = Math.hypot(x0, x1, x2);
  if (len) { len = 1 / len; x0 *= len; x1 *= len; x2 *= len; } else { x0 = x1 = x2 = 0; }
  const y0 = z1 * x2 - z2 * x1, y1 = z2 * x0 - z0 * x2, y2 = z0 * x1 - z1 * x0;
  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * ex + x1 * ey + x2 * ez);
  out[13] = -(y0 * ex + y1 * ey + y2 * ez);
  out[14] = -(z0 * ex + z1 * ey + z2 * ez);
  out[15] = 1;
  return out;
}

export function multiply(out: Mat4, aMat: Mat4, bMat: Mat4): Mat4 {
  const a = r16(aMat);
  const b = r16(bMat);
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8, a9, a10, a11, a12, a13, a14, a15] = a;
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15] = b;
  out[0] = a0 * b0 + a4 * b1 + a8 * b2 + a12 * b3;
  out[1] = a1 * b0 + a5 * b1 + a9 * b2 + a13 * b3;
  out[2] = a2 * b0 + a6 * b1 + a10 * b2 + a14 * b3;
  out[3] = a3 * b0 + a7 * b1 + a11 * b2 + a15 * b3;
  out[4] = a0 * b4 + a4 * b5 + a8 * b6 + a12 * b7;
  out[5] = a1 * b4 + a5 * b5 + a9 * b6 + a13 * b7;
  out[6] = a2 * b4 + a6 * b5 + a10 * b6 + a14 * b7;
  out[7] = a3 * b4 + a7 * b5 + a11 * b6 + a15 * b7;
  out[8] = a0 * b8 + a4 * b9 + a8 * b10 + a12 * b11;
  out[9] = a1 * b8 + a5 * b9 + a9 * b10 + a13 * b11;
  out[10] = a2 * b8 + a6 * b9 + a10 * b10 + a14 * b11;
  out[11] = a3 * b8 + a7 * b9 + a11 * b10 + a15 * b11;
  out[12] = a0 * b12 + a4 * b13 + a8 * b14 + a12 * b15;
  out[13] = a1 * b12 + a5 * b13 + a9 * b14 + a13 * b15;
  out[14] = a2 * b12 + a6 * b13 + a10 * b14 + a14 * b15;
  out[15] = a3 * b12 + a7 * b13 + a11 * b14 + a15 * b15;
  return out;
}

export function invert(out: Mat4, mMat: Mat4): Mat4 {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = r16(mMat);
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return out;
  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}

/** Position caméra depuis les angles orbitaux (en unités « rayon de pierre »). */
export function orbitEye(yaw: number, pitch: number, distance: number): [number, number, number] {
  const cp = Math.cos(pitch);
  return [distance * cp * Math.sin(yaw), distance * Math.sin(pitch), distance * cp * Math.cos(yaw)];
}

/* ── Assemblage du buffer d'uniforms (doit matcher la struct WGSL) ─────────── */

const _proj = new Float32Array(16);
const _view = new Float32Array(16);
const _vp = new Float32Array(16);
const _inv = new Float32Array(16);

export interface CameraState {
  yaw: number;
  pitch: number;
  distance: number;
}

/**
 * Remplit `uniforms` (Float32Array(64)) en place — zéro alloc par frame.
 * `iorD` = indice à la raie D, `dispersion` = Δn ; on en dérive l'IOR par canal.
 */
export function writeUniforms(
  uniforms: Float32Array,
  width: number,
  height: number,
  cam: CameraState,
  iorD: number,
  dispersion: number,
  absorption: readonly [number, number, number],
  planeCount: number,
  exposure: number,
): void {
  const eye = orbitEye(cam.yaw, cam.pitch, cam.distance);
  const aspect = width / Math.max(1, height);
  perspective(_proj, (32 * Math.PI) / 180, aspect, 0.01, 100);
  lookAt(_view, eye, [0, 0, 0], [0, 1, 0]);
  multiply(_vp, _proj, _view);
  invert(_inv, _vp);

  uniforms.set(_inv, 0); // invViewProj : floats 0..15
  uniforms[16] = eye[0]; uniforms[17] = eye[1]; uniforms[18] = eye[2]; uniforms[19] = 1;
  // Dispersion : modèle de Cauchy simplifié autour de l'IOR D.
  uniforms[20] = iorD - dispersion * 0.5; // R (grande λ, faible IOR)
  uniforms[21] = iorD;                      // V
  uniforms[22] = iorD + dispersion * 0.5;  // B (petite λ, fort IOR)
  uniforms[23] = 0;
  uniforms[24] = absorption[0]; uniforms[25] = absorption[1]; uniforms[26] = absorption[2]; uniforms[27] = 0;
  uniforms[28] = width; uniforms[29] = height;
  // planeCount est un u32 : on l'écrit via une vue entière sur le même buffer.
  new Uint32Array(uniforms.buffer, uniforms.byteOffset)[30] = planeCount;
  uniforms[31] = exposure;
}
