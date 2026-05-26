/**
 * Gem Studio — Shader de rendu optique photoréaliste (WGSL).
 *
 * Pipeline : un triangle plein-écran génère un rayon caméra par pixel, qui est
 * ray-tracé À TRAVERS le polyèdre convexe (⋂ demi-espaces stockés en buffer).
 *
 * Physique implémentée par pixel :
 *   1. Intersection rayon ↔ polytope convexe (méthode des slabs généralisée).
 *   2. Fresnel diélectrique exact (équations de Fresnel, pas Schlick) à chaque
 *      interface air↔gemme.
 *   3. Réfraction par Snell–Descartes : n₁·sinθ₁ = n₂·sinθ₂ (forme vectorielle).
 *   4. Réflexion Totale Interne : détectée quand le discriminant de Snell < 0
 *      (angle d'incidence > angle critique θc = asin(n₂/n₁)). Le rayon rebondit
 *      à l'intérieur jusqu'à MAX_BOUNCES → c'est l'« éclat » / light return.
 *   5. Dispersion chromatique : la boucle est exécutée pour 3 longueurs d'onde
 *      (R≈650nm, V≈550nm, B≈450nm), chacune avec son IOR (Cauchy autour de l'IOR
 *      D ± dispersion·k). Les chemins divergent → le « feu » multicolore.
 *   6. Absorption de Beer–Lambert : exp(−absorption · longueur_du_chemin) →
 *      couleur et profondeur de la pierre.
 *
 * Exporté comme template-string pour bundler sans loader .wgsl dans Next.js.
 */

export const GEM_WGSL = /* wgsl */ `
const MAX_PLANES : u32 = 256u;
const MAX_BOUNCES : i32 = 12;
const EPS : f32 = 1e-4;
const PI : f32 = 3.14159265;

struct Uniforms {
  invViewProj : mat4x4<f32>,  // pour reconstruire le rayon monde
  camPos      : vec4<f32>,    // xyz = position caméra
  iorChannels : vec4<f32>,    // IOR par canal R,V,B (w = inutilisé)
  absorption  : vec4<f32>,    // coeff Beer-Lambert R,V,B (mm⁻¹)
  resolution  : vec2<f32>,
  planeCount  : u32,
  exposure    : f32,
};

@group(0) @binding(0) var<uniform> U : Uniforms;
@group(0) @binding(1) var<storage, read> planes : array<vec4<f32>, MAX_PLANES>;
@group(0) @binding(2) var envSampler : sampler;
@group(0) @binding(3) var envMap : texture_2d<f32>;

/* ── Triangle plein-écran (3 sommets, pas de vertex buffer) ───────────────── */
struct VsOut { @builtin(position) pos : vec4<f32>, @location(0) uv : vec2<f32> };

@vertex
fn vs_fullscreen(@builtin(vertex_index) vi : u32) -> VsOut {
  var p = array<vec2<f32>, 3>(vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
  var o : VsOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = p[vi] * 0.5 + vec2(0.5);
  return o;
}

/* ── Échantillonnage de l'environnement (equirectangulaire) ───────────────── */
fn sampleEnv(dir : vec3<f32>) -> vec3<f32> {
  let u = atan2(dir.z, dir.x) / (2.0 * PI) + 0.5;
  let v = acos(clamp(dir.y, -1.0, 1.0)) / PI;
  return textureSampleLevel(envMap, envSampler, vec2(u, v), 0.0).rgb;
}

/* ── Intersection rayon ↔ polytope convexe (slabs généralisés) ─────────────
 * Inside = pour tout i : dot(nᵢ, p) ≤ dᵢ. On borne t par intervalle [tN, tF].
 * Renvoie hit + paramètres d'entrée et de sortie + normales correspondantes. */
struct Hit { hit : bool, tN : f32, tF : f32, nN : vec3<f32>, nF : vec3<f32> };

fn intersectConvex(ro : vec3<f32>, rd : vec3<f32>) -> Hit {
  var tN = -1e30;
  var tF =  1e30;
  var nN = vec3<f32>(0.0);
  var nF = vec3<f32>(0.0);
  for (var i : u32 = 0u; i < U.planeCount; i = i + 1u) {
    let pl = planes[i];
    let n = pl.xyz;
    let d = pl.w;
    let denom = dot(n, rd);
    let dist = d - dot(n, ro);
    if (abs(denom) < EPS) {
      // Rayon parallèle au plan : si hors du demi-espace, miss définitif.
      if (dist < 0.0) { return Hit(false, 0.0, 0.0, nN, nF); }
      continue;
    }
    let t = dist / denom;
    if (denom < 0.0) {            // entrée dans ce demi-espace
      if (t > tN) { tN = t; nN = n; }
    } else {                       // sortie de ce demi-espace
      if (t < tF) { tF = t; nF = n; }
    }
  }
  return Hit(tN <= tF && tF > EPS, tN, tF, nN, nF);
}

/* ── Re-intersection depuis l'intérieur : trouve la facette de sortie ─────── */
fn exitFromInside(ro : vec3<f32>, rd : vec3<f32>) -> Hit {
  var tF = 1e30;
  var nF = vec3<f32>(0.0);
  for (var i : u32 = 0u; i < U.planeCount; i = i + 1u) {
    let pl = planes[i];
    let denom = dot(pl.xyz, rd);
    if (denom > EPS) {
      let t = (pl.w - dot(pl.xyz, ro)) / denom;
      if (t > EPS && t < tF) { tF = t; nF = pl.xyz; }
    }
  }
  return Hit(tF < 1e29, 0.0, tF, vec3<f32>(0.0), nF);
}

/* ── Fresnel diélectrique exact (réflectance non polarisée) ───────────────── */
fn fresnelDielectric(cosI : f32, n1 : f32, n2 : f32) -> f32 {
  let s = n1 / n2 * sqrt(max(0.0, 1.0 - cosI * cosI));
  if (s >= 1.0) { return 1.0; } // RTI → réflexion totale
  let cosT = sqrt(max(0.0, 1.0 - s * s));
  let rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  let rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
  return clamp(0.5 * (rs * rs + rp * rp), 0.0, 1.0);
}

/* ── Réfraction vectorielle (Snell–Descartes). k<0 ⇒ RTI (pas de transmis). ── */
fn refractVec(I : vec3<f32>, N : vec3<f32>, eta : f32) -> vec4<f32> {
  let cosI = -dot(N, I);
  let k = 1.0 - eta * eta * (1.0 - cosI * cosI);
  if (k < 0.0) { return vec4<f32>(0.0, 0.0, 0.0, 0.0); } // total internal reflection
  let dir = eta * I + (eta * cosI - sqrt(k)) * N;
  return vec4<f32>(normalize(dir), 1.0);
}

/*
 * Trace UN canal (une longueur d'onde) avec son IOR. Renvoie le radiance scalaire
 * de ce canal : suit le chemin transmis dominant, rebondit en RTI, accumule
 * l'absorption de Beer–Lambert et les fuites lumineuses pondérées par Fresnel.
 */
fn traceChannel(roIn : vec3<f32>, rdIn : vec3<f32>, ior : f32, absorb : f32, hit0 : Hit) -> f32 {
  // 1) Entrée air→gemme sur la facette frontale.
  // hit0.nN est la normale SORTANTE de la facette d'entrée (elle fait face à la
  // caméra : dot(nN, rdIn) < 0). C'est la convention attendue par refract().
  let entry = roIn + hit0.tN * rdIn;
  let nEntry = hit0.nN;
  let cosI = -dot(nEntry, rdIn);
  let R0 = fresnelDielectric(cosI, 1.0, ior);

  // Le reflet externe direct (la « scintillation » de surface).
  var radiance = R0 * luminance(sampleEnv(reflect(rdIn, nEntry)));

  // Rayon réfracté qui pénètre dans la pierre.
  let refr = refractVec(rdIn, nEntry, 1.0 / ior);
  if (refr.w < 0.5) { return radiance; }

  var ro = entry + refr.xyz * EPS;
  var rd = refr.xyz;
  var throughput = (1.0 - R0);

  // 2) Rebonds internes (RTI) jusqu'à fuite ou budget épuisé.
  for (var b : i32 = 0; b < MAX_BOUNCES; b = b + 1) {
    let ex = exitFromInside(ro, rd);
    if (!ex.hit) { break; }

    let p = ro + ex.tF * rd;
    let pathLen = ex.tF;
    throughput = throughput * exp(-absorb * pathLen); // Beer–Lambert

    let nOut = ex.nF;                                  // normale sortante (dot(nOut, rd) > 0)
    let cosInt = dot(rd, nOut);
    let Rint = fresnelDielectric(abs(cosInt), ior, 1.0);

    // Part transmise → quitte la pierre vers l'environnement (le « feu »).
    // refract() veut la normale face au rayon incident : -nOut côté intérieur.
    let outRefr = refractVec(rd, -nOut, ior);
    if (outRefr.w > 0.5) {
      radiance = radiance + throughput * (1.0 - Rint) * luminance(sampleEnv(outRefr.xyz));
    }
    // Part réfléchie en interne (RTI totale si Rint==1) → on continue.
    throughput = throughput * Rint;
    if (throughput < 0.004) { break; }                 // coupe-circuit énergie

    rd = reflect(rd, nOut);
    ro = p + rd * EPS;
  }
  return radiance;
}

fn luminance(c : vec3<f32>) -> f32 { return dot(c, vec3<f32>(0.2126, 0.7152, 0.0722)); }

@fragment
fn fs_gem(in : VsOut) -> @location(0) vec4<f32> {
  // Reconstruit le rayon caméra monde depuis l'UV plein-écran.
  let ndc = vec4<f32>(in.uv * 2.0 - 1.0, 1.0, 1.0);
  var world = U.invViewProj * ndc;
  world = world / world.w;
  let ro = U.camPos.xyz;
  let rd = normalize(world.xyz - ro);

  let h = intersectConvex(ro, rd);
  if (!h.hit) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0); // transparent → laisse passer la page
  }

  // Dispersion : un canal par longueur d'onde, chacun avec son IOR.
  let r = traceChannel(ro, rd, U.iorChannels.r, U.absorption.r, h);
  let g = traceChannel(ro, rd, U.iorChannels.g, U.absorption.g, h);
  let b = traceChannel(ro, rd, U.iorChannels.b, U.absorption.b, h);

  var color = vec3<f32>(r, g, b) * U.exposure;
  // Tonemap ACES approx + retour alpha plein (la pierre est opaque à l'écran).
  color = (color * (2.51 * color + 0.03)) / (color * (2.43 * color + 0.59) + 0.14);
  return vec4<f32>(color, 1.0);
}
`;
