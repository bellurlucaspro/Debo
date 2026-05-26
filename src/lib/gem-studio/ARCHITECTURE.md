# Gem Studio — Architecture technique

Configurateur de gemmes 3D photoréaliste, WebGPU-natif, 60 FPS sans jank.
Intégré dans `/sur-mesure` (Next.js 15 / React 19).

> **Insight fondateur** : une pierre taillée est un **polyèdre convexe**, donc
> l'intersection de N demi-espaces (plans). On ne stocke ni ne tessellise un
> maillage comme source de vérité — on stocke les **instructions de taille**
> (triplets angle/index/depth). Le shader ray-trace directement l'intersection
> des plans : **pas de triangles, pas de BVH** pour la passe optique.

---

## §1 — Flux de données : Main ⇄ Worker ⇄ GPU

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MAIN THREAD (React + Zustand)            ← UI uniquement, jamais de calc │
│                                                                            │
│  Sliders ─┬─ drag continu ──► SharedArrayBuffer[params] ──┐               │
│           └─ commit/preset ──► postMessage(set-design) ───┤               │
│  <canvas> ── transferControlToOffscreen() ────────────────┤ (1 seule fois)│
│           ◄── postMessage(stats: fps, carats, lightReturn)─┘               │
└───────────────────────────────────│───────────────────────────────────────┘
                                     │  (transferables, zéro copie)
┌────────────────────────────────────▼──────────────────────────────────────┐
│  RENDER/GEOMETRY WORKER                  ← OffscreenCanvas + WebGPU + RAF   │
│                                                                             │
│   requestAnimationFrame loop:                                              │
│     1. lit params live depuis le SAB (Atomics, si dirty)                   │
│     2. WASM(Rust): compilePlanes(design) → Float32Array (ZÉRO alloc)       │
│     3. device.queue.writeBuffer(planeBuffer, …)   ← réutilise le GPUBuffer │
│     4. renderFrame() → fragment shader ray-trace (gem.wgsl)                │
│     5. tous les ~250ms: post stats au main thread                          │
└─────────────────────────────────────│──────────────────────────────────────┘
                                       │
                                   ┌───▼────┐
                                   │  GPU   │  WGSL: Snell + RTI + dispersion
                                   └────────┘
```

**Pourquoi l'OffscreenCanvas dans le worker ?** Tout le travail GPU (encodage de
commandes, `submit`, RAF) quitte le main thread. React peut re-render, animer
GSAP/Lenis, gérer le scroll — le rendu de la gemme ne bloque jamais le thread UI.
C'est la condition *sine qua non* du « 0 jank ».

**Pourquoi un SharedArrayBuffer pour le drag ?** Pendant un drag de slider à
120 Hz, on évite de sérialiser/cloner un message par frame. Le main écrit un
float + lève un flag `Atomics`. Le worker lit dans sa propre RAF. Si COOP/COEP
ne sont pas disponibles (headers `Cross-Origin-Opener-Policy` / `…-Embedder-Policy`),
on retombe sur `postMessage(patch-param)` throttlé en `requestAnimationFrame`.

**Headers Next.js requis** (`next.config.js`) pour le SAB :
```js
headers: async () => [{ source: "/sur-mesure", headers: [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
]}]
```

**Fallback** : si `navigator.gpu` est absent (Firefox < 141 selon config, vieux
Safari), le worker poste `{type:"fallback"}` et l'UI monte le composant R3F
existant (`ConfigGem.tsx`, `MeshRefractionMaterial`). Dégradation gracieuse,
même état `GemDesign` source.

---

## §2 — Moteur géométrique : allocateur stable + CSG

### Allocateur zéro-GC (Rust → WASM)

La boucle chaude (`compilePlanes`) est appelée à **chaque frame** pendant un
drag. En JS pur, recréer des objets `{nx,ny,nz,d}` génèrerait des centaines de
milliers d'allocations/sec → GC stutter. Solution :

- **La mémoire linéaire WASM EST l'ArrayBuffer.** Rust expose un
  `Vec<f32>`/slice sur `WebAssembly.Memory.buffer`. Côté JS on en prend un
  `Float32Array` view — **zéro copie** entre Rust, JS et `writeBuffer` GPU.
- **Arène à pools fixes** (`PlaneArena`) : les buffers (plans, AABB, sommets si
  besoin du maillage pour l'export STL/sélection d'arêtes) sont alloués **une
  fois** au démarrage avec une capacité `MAX_PLANES`. La recompilation **réécrit
  en place** les mêmes octets. Aucune désallocation, aucun `malloc` en boucle.
- Layout **SoA** aligné `std430` (`vec4<f32>` = 16 B) → uploadable tel quel,
  pas de padding manuel.

```rust
// gem_core (wasm-bindgen) — esquisse
#[wasm_bindgen]
pub struct PlaneArena { planes: Vec<f32>, count: usize } // capacité = MAX_PLANES*4

#[wasm_bindgen]
impl PlaneArena {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PlaneArena { PlaneArena { planes: vec![0.0; MAX_PLANES*4], count: 0 } }

    /// Vue zéro-copie pour JS → writeBuffer().
    pub fn planes_ptr(&self) -> *const f32 { self.planes.as_ptr() }

    /// Boucle chaude : réécrit en place, n'alloue rien.
    pub fn compile(&mut self, /* params plats: angles, index, depth… */) -> usize { /* … */ self.count }
}
```

La version TS de référence (`compile.ts`) a **exactement le même layout** : on
peut livrer en TS d'abord, porter en Rust ensuite sans toucher au reste.

### Algorithme CSG : intersection plan ↔ polyèdre

Pour le **rendu**, on n'a pas besoin du maillage explicite : le shader fait
l'intersection convexe analytiquement (méthode des slabs, voir `intersectConvex`
dans `gem.wgsl.ts`). Pour l'**export** (STL, calcul de volume/carats exact,
affichage des arêtes), on matérialise le polyèdre par **clipping successif** :

1. Partir du demi-espace englobant (boîte AABB → 6 plans, ou un grand octaèdre).
2. Pour chaque facette (plan `H`), **clipper** le polyèdre courant par `H` :
   - pour chaque face existante, classer ses sommets (devant/derrière `H`) ;
   - couper les arêtes traversant `H` (interpolation linéaire au point
     `dot(n,p)=d`) ;
   - reconstruire la nouvelle face de coupe à partir des points d'intersection
     (Sutherland–Hodgman 3D / Weiler–Atherton sur le plan).
3. Le résultat après tous les plans = le polyèdre final. **Volume exact** =
   Σ des volumes signés des tétraèdres (origine, triangle de face).

Cette passe de clipping est `O(facettes × arêtes)`, exécutée **uniquement** au
commit (changement de preset, export) — pas dans la boucle de drag, qui ne
recompile que les plans. Le drag reste donc trivbackbone-cheap.

---

## §3 — Renderer optique (voir `gem.wgsl.ts`)

Le fragment shader, par pixel :

| Étape | Implémentation |
|-------|----------------|
| Ray caméra | reconstruit depuis `invViewProj` + UV plein-écran |
| Entrée polytope | `intersectConvex` — slabs généralisés sur N plans |
| Fresnel | équations exactes (rs/rp non polarisées), **pas Schlick** |
| Réfraction | `refractVec` — Snell–Descartes vectoriel ; `k<0` ⇒ RTI |
| RTI | détectée par discriminant ; rebonds internes jusqu'à `MAX_BOUNCES` |
| Dispersion | `traceChannel` exécuté 3× (R/V/B), IOR par canal via Cauchy |
| Absorption | Beer–Lambert `exp(−absorb·pathLen)` cumulé par segment interne |
| Tonemap | ACES filmic, sortie alpha=1 (gemme), alpha=0 hors silhouette |

L'IOR par canal est calculé côté worker :
`ior_R = ior_D − dispersion·0.5`, `ior_B = ior_D + dispersion·0.5` (modèle de
Cauchy simplifié sur le visible ; affinable en 5–7 longueurs d'onde pour le
diamant si on veut un feu encore plus fin, au coût de N traceChannel).

**Coût** : `O(pixels × bounces × planes)` par canal. À 600×600, 12 rebonds,
~60 plans, 3 canaux → ~1.5 Gops/frame, confortable sur GPU intégré moderne.
Optimisations : early-out énergie (`throughput < 0.004`), réduction du nombre de
plans par culling de face arrière, résolution adaptative pendant le drag
(rendu à 0.6× puis re-rendu net au repos).

---

## §4 — Manual Optimizer : grille 7×7 (49 variations)

Reproduit l'optimiseur de Gem Cut Studio : 49 miniatures montrant la pierre pour
49 combinaisons (axe X = angle couronne ±span, axe Y = angle pavillon ±span).
On veut les 49 **en une passe**, sans écrouler le frame rate.

**Deux briques GPU :**

1. **Instanced rendering en atlas.** Une seule `draw(3, 49)` : le shader reçoit
   `@builtin(instance_index)`, en déduit la cellule `(i%7, i/7)`, décale le
   viewport dans une texture atlas (ex. 7×7 × 128px = 896²), et **perturbe les
   deux angles** selon la cellule avant de compiler ses plans *à la volée* dans
   le shader (les angles paramétrant directement les normales des plans, c'est
   bon marché). Une seule passe, 49 thumbnails. L'atlas est ensuite blitté dans
   49 `<canvas>`/sprites de l'UI (ou affiché tel quel comme une texture).

2. **Compute shader pour le SCORE (la vraie valeur de l'optimiseur).** GCS ne
   montre pas que des images : il classe les tailles par **light return / ISO
   brightness**. Un compute pass parallélise : 49 workgroups, chacun lance un
   pavé de rayons (ex. 32×32) à travers sa variante, intègre la luminance qui
   ressort par le haut de la pierre (face observateur), et écrit un **scalaire
   de brillance** dans un `storage buffer[49]`. Réduction → on renvoie
   `{scores, best}` au main thread (`WorkerToMain.optimizer-grid`). L'UI
   surligne la meilleure cellule, exactement comme GCS.

```
Compute: @workgroup_size(8,8)  // 64 rayons/cellule, 49 cellules dispatchées
  cell = workgroup_id.x        // 0..48
  (dCrown, dPav) = gridOffset(cell, span)
  → recompile plans avec angles perturbés (en registres, pas de buffer global)
  → trace N rayons, accumule lightReturn via atomicAdd / réduction en shared mem
  → scores[cell] = lightReturn / N
```

L'optimiseur tourne **à la demande** (pas chaque frame) : on déclenche le
compute pass uniquement quand l'utilisateur ouvre la grille ou bouge un slider,
puis on cache. Les miniatures, elles, ne se redessinent que sur changement →
le configurateur principal garde ses 60 FPS intacts.

---

## Arborescence

```
src/lib/gem-studio/
├── model/
│   ├── design.ts      # GemDesign immuable + presets optiques + estimation carats
│   └── compile.ts     # instructions → plans (PlaneArena, zéro-GC) [→ Rust/WASM]
├── worker/
│   └── protocol.ts    # types postMessage + SharedArrayBuffer params
├── gpu/
│   ├── device.ts      # bootstrap WebGPU, buffers stables, renderFrame
│   └── shaders/
│       └── gem.wgsl.ts# ray-tracer optique (Snell/RTI/dispersion/Beer-Lambert)
└── ARCHITECTURE.md    # ce document
```

## Reste à brancher (ordre conseillé)
1. `worker/render.worker.ts` — RAF, lit SAB, appelle compile + renderFrame.
2. Store Zustand `useGemStudio` + hook `useGemWorker` (init OffscreenCanvas).
3. Composant `<GemStudioCanvas/>` + panneau de sliders → remplace l'aperçu de
   `Configurator.tsx` (garder R3F en fallback).
4. Chargement HDRI → `GPUTexture rgba16float` (decode dans le worker).
5. `optimizer.ts` (compute pipeline 7×7) + UI grille.
6. Port Rust/WASM de `compile.ts` une fois le profil JS validé.
