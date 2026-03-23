"use client";

import { useMemo, useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Environment, useAnimations, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

function Model({
  url,
  autoRotate = true,
  modelScale = 1,
  position = [0, 0, 0],
  animationName = 'idle',
}: {
  url: string;
  autoRotate?: boolean;
  modelScale?: number;
  position?: [number, number, number];
  animationName?: string;
}) {
  const { scene, animations } = useGLTF(url) as any;
  const { ref, actions, names } = useAnimations(animations);

  const clone = useMemo(() => {
    const clonedScene = SkeletonUtils.clone(scene);
    clonedScene.traverse((node: any) => {
      // Ensure all nodes are visible
      node.visible = true;
      if (node.isMesh) {
        const oldMat = node.material as THREE.MeshStandardMaterial;
        if (oldMat) {
          const newMat = new THREE.MeshToonMaterial({
            map: oldMat.map,
            color: oldMat.color,
            transparent: oldMat.transparent,
            opacity: oldMat.opacity,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
          });

          if (newMat.map) {
            newMat.map.generateMipmaps = false;
            newMat.map.minFilter = THREE.NearestFilter;
            newMat.map.magFilter = THREE.NearestFilter;
            newMat.map.anisotropy = 1;
            newMat.map.needsUpdate = true;
          }
          node.material = newMat;
          node.castShadow = true;
          node.receiveShadow = true;
        }
      }
    });
    return clonedScene;
  }, [scene]);

  // Track the current action so we can cleanly crossfade
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!names.length) return;

    // Determine target animation name based on the prop
    let targetName = names[0];
    const matchAnim = (keyword: string) => names.find((n: string) => n.toLowerCase().includes(keyword));

    if (animationName === 'attack') {
      targetName = matchAnim('attack') || matchAnim('bite') || matchAnim('strike') || names[0];
    } else if (animationName === 'hit') {
      targetName = matchAnim('hit') || matchAnim('damage') || matchAnim('hurt') || names[0];
    } else if (animationName === 'walk') {
      targetName = matchAnim('walk') || matchAnim('run') || matchAnim('move') || names[0];
    } else {
      targetName = matchAnim('idle') || names[0];
    }

    const action = actions[targetName];
    if (action) {
      action.reset().fadeIn(0.2).play();

      // If it's an attack or hit, we don't want it to loop forever, maybe play once?
      if (animationName === 'attack' || animationName === 'hit') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }

      if (currentActionRef.current && currentActionRef.current !== action) {
        currentActionRef.current.fadeOut(0.2);
      }
      currentActionRef.current = action;
    }

  }, [actions, names, url, animationName]);

  return (
    <group scale={modelScale} position={position}>
      <primitive ref={ref} object={clone} />
    </group>
  );
}

export default function Creature3D({
  modelUrl,
  autoRotate = true,
  scale = 1,
  position = [0, 0, 0],
  animationName = 'idle',
}: {
  modelUrl: string;
  autoRotate?: boolean;
  scale?: number;
  position?: [number, number, number];
  animationName?: string;
}) {
  return (
    <div className="w-full h-full min-h-[200px] cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ position: [30, 15, 10], fov: 40 }}>
        <color attach="background" args={["transparent"]} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={4}
          makeDefault
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />

        <Environment preset="city" />
        <ambientLight intensity={2.5} />
        <directionalLight position={[10, 15, 10]} intensity={3} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={2} />

        <group scale={scale} position={position}>
          <Center>
            <Suspense fallback={null}>
              <Model url={modelUrl} autoRotate={autoRotate} animationName={animationName} />
            </Suspense>
          </Center>
        </group>

        <ContactShadows
          opacity={0.4}
          scale={25}
          blur={2.5}
          far={15}
          resolution={512}
          color="#000000"
        />
      </Canvas>
    </div>
  );
} // Preload models for faster first-time rendering
useGLTF.preload("/model/rajawali.glb");
useGLTF.preload("/model/Komodo.glb");
useGLTF.preload("/model/OrangUtan.glb");
useGLTF.preload("/model/badag.glb");
useGLTF.preload("/model/HarimauSumatera.glb");
