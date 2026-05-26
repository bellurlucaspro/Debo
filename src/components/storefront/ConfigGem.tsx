"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Environment,
  Float,
  ContactShadows,
  MeshRefractionMaterial,
  useEnvironment,
} from "@react-three/drei";
import * as THREE from "three";

import type { GemCut } from "@/lib/custom-config";

/**
 * Gemme 3D ultra-réaliste pour le configurateur.
 * - Pierres précieuses → MeshRefractionMaterial (réfraction réelle + aberration
 *   chromatique = le « feu ») sur une géométrie de taille procédurale.
 * - Perles facettées → matériau nacré opaque (iridescence + sheen).
 * Environnement HDRI studio pour des reflets crédibles. Rotation + suivi curseur.
 */

const HDRI = "/hdri/gem.hdr";

// Profil d'un brillant (rayon, hauteur) : culet → pavillon → rondiste → couronne → table.
const BRILLIANT: [number, number][] = [
  [0.001, -1.0],
  [0.55, -0.42],
  [1.0, -0.06],
  [1.0, 0.02],
  [0.6, 0.34],
  [0.001, 0.36],
];

function lathe(points: [number, number][], segments: number): THREE.BufferGeometry {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, segments);
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  g.dispose();
  return flat;
}

function gemGeometry(cut: GemCut): THREE.BufferGeometry {
  switch (cut) {
    case "emerald": {
      // Prisme octogonal (taille à degrés).
      const g = new THREE.CylinderGeometry(0.82, 0.66, 1.5, 8, 1);
      const flat = g.toNonIndexed();
      flat.computeVertexNormals();
      g.dispose();
      return flat;
    }
    case "rose":
      // Dôme facetté (taille rose, signature DEBO).
      return lathe(
        [
          [1.0, -0.05],
          [1.0, 0.02],
          [0.58, 0.3],
          [0.001, 0.52],
        ],
        12
      );
    case "cushion":
      return lathe(BRILLIANT, 8);
    case "oval":
    case "pear":
    case "round":
    default:
      return lathe(BRILLIANT, 18);
  }
}

function scaleFor(cut: GemCut): [number, number, number] {
  switch (cut) {
    case "oval":
      return [1.4, 1, 0.95];
    case "pear":
      return [1, 1.32, 1];
    case "cushion":
      return [1.06, 0.92, 1.06];
    case "emerald":
      return [1.12, 1, 0.78];
    default:
      return [1, 1, 1];
  }
}

function Gem({
  color,
  cut,
  refractive,
  env,
}: {
  color: string;
  cut: GemCut;
  refractive: boolean;
  env: THREE.Texture;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => gemGeometry(cut), [cut]);
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    if (!reduce) m.rotation.y += delta * 0.32;
    m.rotation.x = THREE.MathUtils.lerp(m.rotation.x, state.pointer.y * 0.25, 0.05);
    m.rotation.z = THREE.MathUtils.lerp(m.rotation.z, -state.pointer.x * 0.15, 0.05);
  });

  return (
    <mesh ref={ref} geometry={geometry} scale={scaleFor(cut)} castShadow>
      {refractive ? (
        <MeshRefractionMaterial
          envMap={env}
          bounces={3}
          ior={2.0}
          fresnel={1}
          aberrationStrength={0.025}
          color={color}
          fastChroma={false}
          toneMapped={false}
        />
      ) : (
        <meshPhysicalMaterial
          color={color}
          roughness={0.16}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
          iridescence={1}
          iridescenceIOR={1.4}
          iridescenceThicknessRange={[120, 480]}
          sheen={1}
          sheenRoughness={0.4}
          sheenColor={new THREE.Color("#EAD9C6")}
          envMapIntensity={1.4}
          flatShading
        />
      )}
    </mesh>
  );
}

function Scene({ color, cut, refractive }: { color: string; cut: GemCut; refractive: boolean }) {
  const env = useEnvironment({ files: HDRI }) as THREE.Texture;

  return (
    <>
      <Environment map={env} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 3]} intensity={1.3} color="#FFF6E8" castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#D8E2FF" />

      <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.5}>
        <Gem color={color} cut={cut} refractive={refractive} env={env} />
      </Float>

      <ContactShadows position={[0, -1.55, 0]} opacity={0.32} scale={6} blur={2.6} far={3} color="#000000" />
    </>
  );
}

export function ConfigGem({
  color,
  cut,
  refractive,
  className,
}: {
  color: string;
  cut: GemCut;
  refractive: boolean;
  className?: string;
}) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      shadows
      camera={{ position: [0, 0, 4.6], fov: 32 }}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <Scene color={color} cut={cut} refractive={refractive} />
      </Suspense>
    </Canvas>
  );
}
