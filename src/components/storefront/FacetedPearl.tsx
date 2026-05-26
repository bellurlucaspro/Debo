"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Float,
  Lightformer,
} from "@react-three/drei";
import * as THREE from "three";

/**
 * La perle de culture facettée — pièce maîtresse 3D.
 *
 * - Géométrie : icosaèdre (detail 1) en `flatShading` → vraies facettes.
 * - Matériau : MeshPhysicalMaterial avec iridescence (nacre), clearcoat et
 *   sheen rosé (Nude) → reflets vivants et profondeur.
 * - Éclairage : environnement custom à base de Lightformers (aucun téléchargement
 *   HDR externe) qui dessine les halos de lumière signature.
 * - Mouvement : rotation lente + inclinaison qui suit le curseur. Coupé en
 *   `prefers-reduced-motion`.
 */
function Pearl() {
  const ref = useRef<THREE.Mesh>(null);
  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;

    if (!reduceMotion) {
      mesh.rotation.y += delta * 0.22;
    }
    // Inclinaison douce vers le curseur (lerp pour la fluidité).
    mesh.rotation.x = THREE.MathUtils.lerp(
      mesh.rotation.x,
      state.pointer.y * 0.3,
      0.04
    );
    mesh.rotation.z = THREE.MathUtils.lerp(
      mesh.rotation.z,
      -state.pointer.x * 0.2,
      0.04
    );
  });

  return (
    <mesh ref={ref} castShadow scale={1.08}>
      <icosahedronGeometry args={[1, 1]} />
      <meshPhysicalMaterial
        color="#F7F1E9"
        roughness={0.12}
        metalness={0.05}
        clearcoat={1}
        clearcoatRoughness={0.08}
        iridescence={1}
        iridescenceIOR={1.38}
        iridescenceThicknessRange={[140, 520]}
        sheen={1}
        sheenRoughness={0.35}
        sheenColor={new THREE.Color("#E9D8C4")}
        envMapIntensity={1.6}
        flatShading
      />
    </mesh>
  );
}

/** Environnement lumineux custom (sans HDR distant) → halos contrôlés. */
function StudioLighting() {
  return (
    <Environment resolution={256}>
      <group>
        <Lightformer
          form="rect"
          intensity={2.4}
          color="#E9D8C4"
          position={[3, 2, 2]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#B98C84"
          position={[-3, -1, 2]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          form="circle"
          intensity={2.4}
          color="#F2EEE6"
          position={[0, 3, -2]}
          scale={[4, 4, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#AA9F95"
          position={[0, -3, 1]}
          scale={[5, 2, 1]}
        />
      </group>
    </Environment>
  );
}

export function FacetedPearl({ className }: { className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      shadows
      camera={{ position: [0, 0, 4.2], fov: 34 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <spotLight
        position={[5, 6, 5]}
        angle={0.3}
        penumbra={1}
        intensity={1.3}
        color="#FFF4E0"
        castShadow
      />
      {/* Rim light froid pour détacher les facettes */}
      <pointLight position={[-5, -2, -4]} intensity={0.6} color="#DCE6FF" />
      <pointLight position={[0, 4, 3]} intensity={0.5} color="#FFFFFF" />

      <Float speed={1.1} rotationIntensity={0.35} floatIntensity={0.7}>
        <Pearl />
      </Float>

      <StudioLighting />

      <ContactShadows
        position={[0, -1.7, 0]}
        opacity={0.4}
        scale={7}
        blur={2.8}
        far={3.2}
        color="#000000"
      />
    </Canvas>
  );
}
