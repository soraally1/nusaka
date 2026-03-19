'use client';

import { useMemo, useRef, useEffect, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

// ─── Types ────────────────────────────────────────────────────────────────────
type AttackEffectInfo = {
    element: 'Tanah' | 'Angin' | 'Air' | null;
    target: 'enemy' | 'player' | null;
};

// ─── Per-element configs ──────────────────────────────────────────────────────
const ELEMENT_CFG = {
    Tanah: { color: new THREE.Color('#A0522D'), trail: new THREE.Color('#CD853F'), geometry: 'box' as const },
    Angin: { color: new THREE.Color('#60A5FA'), trail: new THREE.Color('#BAE6FD'), geometry: 'torus' as const },
    Air:   { color: new THREE.Color('#06B6D4'), trail: new THREE.Color('#A5F3FC'), geometry: 'sphere' as const },
};

// ─── 3D Particle burst ────────────────────────────────────────────────────────
const PARTICLE_COUNT = 28;

type ParticleState = {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;       // 0..1, decrements each frame
    maxLife: number;
    scale: number;
};

function ElementParticles({
    origin,
    element,
    active,
}: {
    origin: [number, number, number];
    element: keyof typeof ELEMENT_CFG;
    active: boolean;
}) {
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const particles = useRef<ParticleState[]>([]);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const cfg = ELEMENT_CFG[element];

    // Spawn all particles on activation
    useEffect(() => {
        if (!active) {
            particles.current = [];
            return;
        }
        const o = new THREE.Vector3(...origin);
        particles.current = Array.from({ length: PARTICLE_COUNT }, () => {
            const theta = Math.random() * Math.PI * 2;
            const phi   = (Math.random() - 0.5) * Math.PI;
            const speed = 0.08 + Math.random() * 0.14;
            return {
                pos: o.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 1.5,
                    (Math.random() - 0.5) * 2,
                )),
                vel: new THREE.Vector3(
                    Math.cos(theta) * Math.cos(phi) * speed,
                    Math.sin(phi) * speed + 0.04,
                    Math.sin(theta) * Math.cos(phi) * speed,
                ),
                life: 1,
                maxLife: 0.6 + Math.random() * 0.4,
                scale: 0.15 + Math.random() * 0.25,
            };
        });
    }, [active, origin]);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        const gravity = element === 'Tanah' ? -0.003 : element === 'Angin' ? 0.001 : -0.001;

        let alive = 0;
        particles.current.forEach((p, i) => {
            if (p.life <= 0) {
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);
                return;
            }
            // Special motion per element
            if (element === 'Angin') {
                // Spiral
                const angle = (1 - p.life) * Math.PI * 4;
                p.vel.x = Math.cos(angle) * 0.06;
                p.vel.z = Math.sin(angle) * 0.06;
            }
            p.vel.y += gravity;
            p.pos.addScaledVector(p.vel, 1);
            p.life -= delta / p.maxLife;

            const s = p.scale * Math.max(0, p.life);
            dummy.position.copy(p.pos);

            if (element === 'Tanah') {
                dummy.rotation.set(p.life * 3, p.life * 5, 0);
            } else if (element === 'Angin') {
                dummy.rotation.set(0, p.life * 8, p.life * 4);
            } else {
                dummy.rotation.set(0, 0, 0);
            }
            dummy.scale.setScalar(s);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
            alive++;
        });

        meshRef.current.instanceMatrix.needsUpdate = true;

        // Color transition: bright → faded
        (meshRef.current.material as THREE.MeshToonMaterial).color.lerpColors(
            cfg.color, cfg.trail, 0.3
        );
    });

    const geo = useMemo(() => {
        if (element === 'Tanah') return new THREE.BoxGeometry(1, 1, 1);
        if (element === 'Angin') return new THREE.TorusGeometry(0.5, 0.15, 6, 8);
        return new THREE.SphereGeometry(0.5, 6, 6);
    }, [element]);

    return (
        <instancedMesh ref={meshRef} args={[geo, undefined, PARTICLE_COUNT]} frustumCulled={false}>
            <meshToonMaterial color={cfg.color} transparent opacity={0.9} />
        </instancedMesh>
    );
}

// ─── Impact ring flash at target ─────────────────────────────────────────────
function ImpactRing({
    origin,
    element,
    active,
}: {
    origin: [number, number, number];
    element: keyof typeof ELEMENT_CFG;
    active: boolean;
}) {
    const ringRef = useRef<THREE.Mesh>(null!);
    const t = useRef(0);

    useEffect(() => { t.current = 0; }, [active]);

    useFrame((_, delta) => {
        if (!ringRef.current) return;
        if (!active) {
            ringRef.current.visible = false;
            return;
        }
        t.current += delta * 3;
        const scale = Math.min(t.current * 6, 5);
        const opacity = Math.max(0, 1 - t.current);
        ringRef.current.visible = opacity > 0;
        ringRef.current.scale.setScalar(scale);
        ringRef.current.position.y = origin[1] + 0.5;
        (ringRef.current.material as THREE.MeshToonMaterial).opacity = opacity;
    });

    const cfg = ELEMENT_CFG[element];

    return (
        <mesh ref={ringRef} position={origin} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.9, 32]} />
            <meshToonMaterial color={cfg.color} transparent opacity={1} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ─── Defence shield ring around player ───────────────────────────────────────
function DefenceShield({ origin, active }: { origin: [number, number, number]; active: boolean }) {
    const ref = useRef<THREE.Mesh>(null!);
    const t = useRef(0);
    useFrame((_, delta) => {
        if (!ref.current) return;
        t.current += delta;
        ref.current.rotation.y = t.current * 1.5;
        ref.current.rotation.z = Math.sin(t.current * 2) * 0.2;
        const op = active ? 0.45 + Math.sin(t.current * 4) * 0.15 : 0;
        (ref.current.material as THREE.MeshToonMaterial).opacity = op;
        ref.current.visible = active;
    });
    return (
        <mesh ref={ref} position={[origin[0], origin[1] + 2, origin[2]]}>
            <sphereGeometry args={[2.8, 16, 12]} />
            <meshToonMaterial color="#60A5FA" transparent opacity={0} wireframe side={THREE.DoubleSide} />
        </mesh>
    );
}

// ─── Model ────────────────────────────────────────────────────────────────────
function Model({
    url,
    modelScale = 1,
    animationName = 'idle',
    facing = 'right',
}: {
    url: string;
    modelScale?: number;
    animationName?: string;
    facing?: 'left' | 'right';
}) {
    const { scene, animations } = useGLTF(url) as any;
    const { ref, actions, names } = useAnimations(animations);

    const clone = useMemo(() => {
        const clonedScene = SkeletonUtils.clone(scene);
        clonedScene.traverse((node: any) => {
            node.visible = true;
            if (node.isMesh) {
                const oldMat = node.material as THREE.MeshStandardMaterial;
                if (oldMat) {
                    const newMat = new THREE.MeshToonMaterial({
                        map: oldMat.map,
                        color: oldMat.color,
                        transparent: false,
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

    const currentActionRef = useRef<THREE.AnimationAction | null>(null);

    useEffect(() => {
        if (!names.length) return;
        const matchAnim = (kw: string) => names.find((n: string) => n.toLowerCase().includes(kw));
        let targetName = names[0];
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
    }, [actions, names, animationName]);

    const finalRotationY = facing === 'left' ? -Math.PI / 4 : (3 * Math.PI) / 4;

    return (
        <group scale={modelScale * 0.7} rotation={[0, finalRotationY, 0]}>
            <primitive ref={ref} object={clone} />
        </group>
    );
}

// ─── Scene content ────────────────────────────────────────────────────────────
function SceneContent({
    playerUrl,
    playerScale,
    playerAnim,
    enemyUrl,
    enemyScale,
    enemyAnim,
    attackEffect,
    defenseActive,
}: any) {
    const { viewport, camera } = useThree();
    const isPortrait = viewport.aspect < 1;

    // Fixed positions — don't move models
    const playerPos: [number, number, number] = [isPortrait ? 4 : 2, 0, 15];
    const enemyPos:  [number, number, number] = [isPortrait ? -6 : -10, 0, -5];

    useEffect(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = isPortrait ? 45 : 35;
            camera.position.set(isPortrait ? 5 : 4, isPortrait ? 8 : 6, isPortrait ? 32 : 26);
            camera.lookAt(0, 0, 5);
            camera.updateProjectionMatrix();
        }
    }, [isPortrait, camera]);

    // Determine which target is being hit and which element
    const playerAttacking = attackEffect?.target === 'enemy' && attackEffect?.element;
    const enemyAttacking  = attackEffect?.target === 'player' && attackEffect?.element;

    const particleOrigin: [number, number, number] = playerAttacking ? enemyPos : playerPos;
    const activeElement = (attackEffect?.element ?? 'Tanah') as keyof typeof ELEMENT_CFG;
    const anyAttack = !!(attackEffect?.element && attackEffect?.target);

    return (
        <>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-bias={-0.001} />
            <directionalLight position={[-10, 5, -10]} intensity={1.5} />

            {/* Arena ground — positions unchanged */}
            <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[20, 64]} />
                <meshToonMaterial color="#689F38" />
            </mesh>
            <mesh receiveShadow position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[22, 64]} />
                <meshToonMaterial color="#558B2F" />
            </mesh>

            {/* Player — position unchanged */}
            <group position={playerPos}>
                <Suspense fallback={null}>
                    <Model url={playerUrl} modelScale={playerScale} animationName={playerAnim} facing="right" />
                </Suspense>
            </group>

            {/* Enemy — position unchanged */}
            <group position={enemyPos}>
                <Suspense fallback={null}>
                    <Model url={enemyUrl} modelScale={enemyScale} animationName={enemyAnim} facing="left" />
                </Suspense>
            </group>

            {/* 3D Attack particles — spawns at the target */}
            {anyAttack && (
                <ElementParticles
                    key={`${attackEffect.element}-${attackEffect.target}`}
                    origin={particleOrigin}
                    element={activeElement}
                    active={anyAttack}
                />
            )}

            {/* Impact ring flash at target */}
            {anyAttack && (
                <ImpactRing
                    origin={particleOrigin}
                    element={activeElement}
                    active={anyAttack}
                />
            )}

            {/* Defence wireframe shield around player */}
            <DefenceShield origin={playerPos} active={!!defenseActive} />

            <ContactShadows opacity={0.4} scale={30} blur={2} far={15} color="#000000" />
        </>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function BattleArena({
    playerUrl,
    playerScale = 1,
    playerAnim = 'idle',
    enemyUrl,
    enemyScale = 1,
    enemyAnim = 'idle',
    attackEffect,
    defenseActive = false,
}: {
    playerUrl: string;
    playerScale?: number;
    playerAnim?: string;
    enemyUrl: string;
    enemyScale?: number;
    enemyAnim?: string;
    attackEffect?: AttackEffectInfo;
    defenseActive?: boolean;
}) {
    return (
        <div className="absolute inset-0 z-0 pointer-events-none">
            <Canvas shadows camera={{ position: [0, 6, 26], fov: 35 }}>
                <SceneContent
                    playerUrl={playerUrl}
                    playerScale={playerScale}
                    playerAnim={playerAnim}
                    enemyUrl={enemyUrl}
                    enemyScale={enemyScale}
                    enemyAnim={enemyAnim}
                    attackEffect={attackEffect}
                    defenseActive={defenseActive}
                />
            </Canvas>
        </div>
    );
}
