/**
 * Gem Studio — Compilateur géométrique (CSG par demi-espaces).
 *
 * Transforme les instructions de taille (angle/index/depth) en un ENSEMBLE DE
 * PLANS. La pierre = ⋂ demi-espaces { p : dot(nᵢ, p) ≤ dᵢ }, nᵢ = normale
 * sortante. C'est la représentation envoyée au GPU : le shader ray-trace
 * directement l'intersection convexe, sans triangle ni BVH.
 *
 * ZÉRO-GC : la sortie est écrite *en place* dans un `Float32Array` pré-alloué
 * (voir `PlaneArena`). Pendant le drag d'un slider, on n'alloue rien — on
 * réécrit les mêmes 4·N flottants. C'est la version TS de référence ; en prod
 * cette boucle chaude est portée en Rust → WASM (cf. ARCHITECTURE.md §2), avec
 * EXACTEMENT le même layout mémoire, vu côté JS comme un view sur
 * `WebAssembly.Memory.buffer`.
 *
 * Layout SoA du buffer de plans (stride 4, aligné std430 pour WGSL) :
 *   [ nx, ny, nz, d ] × N   (vec4<f32> par plan : xyz = normale, w = offset)
 */

import type { GemDesign, FacetInstruction } from "./design";

/** Plafond de plans — borne l'allocation et la boucle GPU. */
export const MAX_PLANES = 256;
export const PLANE_STRIDE = 4; // vec4<f32>

/**
 * Arène mémoire stable. Allouée UNE fois, réutilisée à chaque recompilation.
 * `planes` est directement uploadable dans un GPUBuffer (writeBuffer/mapped).
 */
export class PlaneArena {
  readonly planes: Float32Array<ArrayBuffer>;
  /** AABB de la pierre, recalculée à chaque compile (rayon englobant). */
  readonly aabb: Float32Array<ArrayBuffer>; // [minx,miny,minz, maxx,maxy,maxz]
  count = 0;

  constructor() {
    this.planes = new Float32Array(MAX_PLANES * PLANE_STRIDE);
    this.aabb = new Float32Array(6);
  }
}

/**
 * Compile un design dans l'arène. Boucle chaude, sans allocation.
 * Renvoie le nombre de plans écrits.
 */
export function compilePlanes(design: GemDesign, arena: PlaneArena): number {
  const out = arena.planes;
  const gear = design.indexGear || 96;
  let w = 0; // index d'écriture (en flottants)

  for (const inst of design.instructions) {
    for (const phi of azimuthsFor(inst, gear)) {
      if (w / PLANE_STRIDE >= MAX_PLANES) break;
      writeFacetPlane(inst, phi, out, w);
      w += PLANE_STRIDE;
    }
  }

  arena.count = w / PLANE_STRIDE;
  applySilhouette(out, arena.count, design);
  computeAabb(arena.aabb);
  return arena.count;
}

/** Liste des azimuts (radians) d'une rangée : index explicites ou répartition régulière. */
function azimuthsFor(inst: FacetInstruction, gear: number): number[] {
  if (inst.tier === "table" || inst.tier === "culet") return [0]; // facette axiale unique
  const TAU = Math.PI * 2;
  if (inst.indices && inst.indices.length > 0) {
    return inst.indices.map((i) => (i / gear) * TAU);
  }
  const r = inst.repeat <= 1 ? 1 : inst.repeat;
  const base = inst.index / gear;
  const out: number[] = [];
  for (let k = 0; k < r; k++) out.push((base + k / r) * TAU);
  return out;
}

/**
 * Post-traitement : allongement (ovale/poire/émeraude) + échelle visuelle.
 * Un demi-espace {n·p ≤ d} subissant la mise à l'échelle S=diag(sx,1,sz) devient
 * {(S⁻¹n)·p ≤ d} ; on renormalise la normale et on reporte la longueur sur d.
 * Puis on multiplie tous les offsets par `viewScale` (grossit/réduit la pierre).
 */
function applySilhouette(out: Float32Array, count: number, design: GemDesign): void {
  const sx = design.silhouette?.scaleX ?? 1;
  const sz = design.silhouette?.scaleZ ?? 1;
  const vs = design.viewScale ?? 1;
  if (sx === 1 && sz === 1 && vs === 1) return;
  for (let i = 0; i < count; i++) {
    const w = i * PLANE_STRIDE;
    const nx = out[w]! / sx;
    const ny = out[w + 1]!;
    const nz = out[w + 2]! / sz;
    const len = Math.hypot(nx, ny, nz) || 1;
    out[w] = nx / len;
    out[w + 1] = ny / len;
    out[w + 2] = nz / len;
    out[w + 3] = (out[w + 3]! / len) * vs;
  }
}

/**
 * Convertit (angle, index, depth) → plan sortant, en COORDONNÉES UNITAIRES :
 * le rondiste a un rayon 1 (les dimensions mm ne servent qu'à l'estimation
 * carats, pas à l'échelle visuelle — la caméra est calée sur le rayon unité).
 *
 *  - azimut φ  = (index/gear + k/repeat) · 2π                  (rotation autour de Y)
 *  - une facette couronne/pavillon passe par l'arête du rondiste (rayon 1, y=0) :
 *      normale n = ( cos α·cosφ , sin α·signe , cos α·sinφ )    (α = angle/horizontale)
 *      offset   d = cos α        ⇐ = n · (cosφ, 0, sinφ), donc le plan touche
 *                                   exactement le rondiste puis s'incline vers l'axe.
 *    Plus l'angle est petit (facette plate), plus d est grand → facette haute.
 *  - table  : plan horizontal y ≤ depth·1.6 (hauteur de couronne).
 *  - culet  : minuscule méplat près de la pointe (d≈1.1, sinon il tronquerait
 *             tout le pavillon).
 *  - girdle : N plans verticaux à d=1 → polygone du rondiste.
 */
function writeFacetPlane(inst: FacetInstruction, phi: number, out: Float32Array, w: number): void {
  const DEG = Math.PI / 180;

  if (inst.tier === "table") {
    // Plan horizontal du dessus : y ≤ depth (hauteur de couronne).
    out[w] = 0; out[w + 1] = 1; out[w + 2] = 0;
    out[w + 3] = inst.depth;
    return;
  }
  if (inst.tier === "culet") {
    // Base/pointe : y ≥ −depth. depth≈1.1 → micro-méplat ; depth=0 → fond plat (rose).
    out[w] = 0; out[w + 1] = -1; out[w + 2] = 0;
    out[w + 3] = inst.depth;
    return;
  }
  if (inst.tier === "girdle") {
    out[w] = Math.cos(phi); out[w + 1] = 0; out[w + 2] = Math.sin(phi);
    out[w + 3] = inst.depth > 0 ? inst.depth : 1; // rayon du rondiste
    return;
  }

  // Couronne (vers le haut) / pavillon (vers le bas).
  // L'angle est mesuré depuis la TABLE (horizontale) : une facette à θ a sa normale
  // à θ de la VERTICALE → composante horizontale sin θ, composante verticale cos θ.
  const sign = inst.tier === "pavilion" ? -1 : 1;
  const a = inst.angle * DEG;
  const nh = Math.sin(a);          // composante horizontale (radiale)
  const nv = Math.cos(a) * sign;   // composante verticale (signée)

  out[w] = nh * Math.cos(phi);
  out[w + 1] = nv;
  out[w + 2] = nh * Math.sin(phi);
  // Offset : distance fournie (import GemCAD) sinon « touche le rondiste » (= sin θ).
  out[w + 3] = inst.depth > 0 ? inst.depth : nh;
}

function computeAabb(aabb: Float32Array): void {
  // Boîte unitaire conservatrice (table ≈ +0.7, culet ≈ −1.2, rayon 1).
  aabb[0] = -1; aabb[1] = -1.3; aabb[2] = -1;
  aabb[3] = 1; aabb[4] = 0.8; aabb[5] = 1;
}
