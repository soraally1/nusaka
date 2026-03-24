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
    Tanah: {
        color: new THREE.Color('#A0522D'),
        trail: new THREE.Color('#CD853F'),
        glow: new THREE.Color('#8B4513'),
        geometry: 'box' as const,
    },
    Angin: {
        color: new THREE.Color('#60A5FA'),
        trail: new THREE.Color('#BFDBFE'),
        glow: new THREE.Color('#3B82F6'),
        geometry: 'torus' as const,
    },
    Air: {
        color: new THREE.Color('#06B6D4'),
        trail: new THREE.Color('#A5F3FC'),
        glow: new THREE.Color('#0891B2'),
        geometry: 'sphere' as const,
    },
};

// ─── Utility: model body center height from scale ─────────────────────────────
// Rough heuristic: body center is ~1.2 world units per unit of scale
function bodyCenter(scale: number): number {
    return Math.max(1.5, scale * 1.2);
}

// ─── Projectile: flies from attacker to target, explodes on arrival ───────────
const PARTICLE_COUNT = 40;

type ParticleState = {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
    scale: number;
};

function AttackProjectile({
    fromPos,
    toPos,
    element,
    active,
    fromScale,
    toScale,
}: {
    fromPos: [number, number, number];
    toPos: [number, number, number];
    element: keyof typeof ELEMENT_CFG;
    active: boolean;
    fromScale: number;
    toScale: number;
}) {
    const projRef = useRef<THREE.Mesh>(null!);
    const burstRef = useRef<THREE.InstancedMesh>(null!);
    const particles = useRef<ParticleState[]>([]);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const cfg = ELEMENT_CFG[element];

    // Travel progress 0→1
    const t = useRef(0);
    const exploded = useRef(false);
    const trailTimer = useRef(0);

    useEffect(() => {
        if (!active) {
            t.current = 0;
            exploded.current = false;
            particles.current = [];
            return;
        }
        t.current = 0;
        exploded.current = false;
        particles.current = [];
    }, [active]);

    useFrame((_, delta) => {
        if (!active) {
            if (projRef.current) projRef.current.visible = false;
            if (burstRef.current) {
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    dummy.scale.setScalar(0);
                    dummy.updateMatrix();
                    burstRef.current.setMatrixAt(i, dummy.matrix);
                }
                burstRef.current.instanceMatrix.needsUpdate = true;
            }
            return;
        }

        const fromY = bodyCenter(fromScale);
        const toY = bodyCenter(toScale);
        const start = new THREE.Vector3(fromPos[0], fromPos[1] + fromY, fromPos[2]);
        const end = new THREE.Vector3(toPos[0], toPos[1] + toY, toPos[2]);

        if (!exploded.current) {
            t.current += delta * 1.8; // travel speed
            const progress = Math.min(t.current, 1);

            // Parabolic arc
            const midY = Math.max(start.y, end.y) + 3;
            const p0 = start.clone();
            const p1 = new THREE.Vector3(
                (start.x + end.x) / 2,
                midY,
                (start.z + end.z) / 2
            );
            const p2 = end.clone();
            // Quadratic bezier
            const pos = p0.clone().multiplyScalar((1 - progress) ** 2)
                .addScaledVector(p1, 2 * (1 - progress) * progress)
                .addScaledVector(p2, progress ** 2);

            if (projRef.current) {
                projRef.current.visible = true;
                projRef.current.position.copy(pos);
                // Stretch along travel direction
                const tangent = p1.clone().sub(p0).multiplyScalar(2 * (1 - progress))
                    .add(p2.clone().sub(p1).multiplyScalar(2 * progress)).normalize();
                projRef.current.lookAt(pos.clone().add(tangent));
                const sz = element === 'Angin' ? 0.6 : element === 'Air' ? 0.5 : 0.7;
                projRef.current.scale.set(sz, sz, sz * 2.5);

                // Spin for Angin
                if (element === 'Angin') projRef.current.rotation.z += delta * 12;
                if (element === 'Air') projRef.current.rotation.x += delta * 8;
            }

            if (progress >= 1) {
                exploded.current = true;
                if (projRef.current) projRef.current.visible = false;
                // Spawn burst particles at target
                particles.current = Array.from({ length: PARTICLE_COUNT }, () => {
                    const theta = Math.random() * Math.PI * 2;
                    const phi = (Math.random() - 0.5) * Math.PI;
                    const speed = 0.12 + Math.random() * 0.2;
                    return {
                        pos: end.clone().add(new THREE.Vector3(
                            (Math.random() - 0.5) * 1.5,
                            (Math.random() - 0.5) * 1.5,
                            (Math.random() - 0.5) * 1.5,
                        )),
                        vel: new THREE.Vector3(
                            Math.cos(theta) * Math.cos(phi) * speed,
                            Math.abs(Math.sin(phi)) * speed + 0.05,
                            Math.sin(theta) * Math.cos(phi) * speed,
                        ),
                        life: 1,
                        maxLife: 0.5 + Math.random() * 0.4,
                        scale: 0.22 + Math.random() * 0.35,
                    };
                });
            }
        }

        // Animate burst particles
        if (burstRef.current) {
            const gravity = element === 'Tanah' ? -0.008 : element === 'Angin' ? 0.002 : -0.003;
            particles.current.forEach((p, i) => {
                if (p.life <= 0) {
                    dummy.scale.setScalar(0);
                    dummy.updateMatrix();
                    burstRef.current.setMatrixAt(i, dummy.matrix);
                    return;
                }
                if (element === 'Angin') {
                    const angle = (1 - p.life) * Math.PI * 6;
                    p.vel.x = Math.cos(angle) * 0.1;
                    p.vel.z = Math.sin(angle) * 0.1;
                }
                p.vel.y += gravity;
                p.pos.addScaledVector(p.vel, 1);
                p.life -= delta / p.maxLife;

                const s = p.scale * Math.max(0, p.life);
                dummy.position.copy(p.pos);
                if (element === 'Tanah') dummy.rotation.set(p.life * 4, p.life * 7, 0);
                else if (element === 'Angin') dummy.rotation.set(0, p.life * 10, p.life * 6);
                else dummy.rotation.set(0, 0, 0);
                dummy.scale.setScalar(s);
                dummy.updateMatrix();
                burstRef.current.setMatrixAt(i, dummy.matrix);
            });
            burstRef.current.instanceMatrix.needsUpdate = true;
            (burstRef.current.material as THREE.MeshToonMaterial).color.lerpColors(
                cfg.color, cfg.trail, 0.25
            );
        }
    });

    const geo = useMemo(() => {
        if (element === 'Tanah') return new THREE.BoxGeometry(1, 1, 1);
        if (element === 'Angin') return new THREE.TorusGeometry(0.5, 0.18, 8, 12);
        return new THREE.SphereGeometry(0.5, 10, 10);
    }, [element]);

    const burstGeo = useMemo(() => {
        if (element === 'Tanah') return new THREE.BoxGeometry(1, 1, 1);
        if (element === 'Angin') return new THREE.OctahedronGeometry(0.5);
        return new THREE.SphereGeometry(0.5, 8, 8);
    }, [element]);

    return (
        <>
            {/* Projectile body */}
            <mesh ref={projRef} visible={false} frustumCulled={false}>
                <primitive object={geo} />
                <meshToonMaterial color={cfg.color} emissive={cfg.glow} emissiveIntensity={0.6} />
            </mesh>

            {/* Burst particle cloud */}
            <instancedMesh ref={burstRef} args={[burstGeo, undefined, PARTICLE_COUNT]} frustumCulled={false}>
                <meshToonMaterial color={cfg.color} transparent opacity={0.9} />
            </instancedMesh>
        </>
    );
}

// ─── Impact ring flash at target ─────────────────────────────────────────────
function ImpactRing({
    origin,
    element,
    active,
    targetScale,
}: {
    origin: [number, number, number];
    element: keyof typeof ELEMENT_CFG;
    active: boolean;
    targetScale: number;
}) {
    const ring1 = useRef<THREE.Mesh>(null!);
    const ring2 = useRef<THREE.Mesh>(null!);
    const t = useRef(0);

    useEffect(() => { t.current = 0; }, [active]);

    useFrame((_, delta) => {
        const centerY = origin[1] + bodyCenter(targetScale) * 0.5;
        [ring1, ring2].forEach((r, idx) => {
            if (!r.current) return;
            if (!active) { r.current.visible = false; return; }
            const delay = idx * 0.18;
            const lt = Math.max(0, t.current - delay);
            const scale = Math.min(lt * 8, 6 + targetScale);
            const opacity = Math.max(0, 1 - lt * 1.4);
            r.current.visible = opacity > 0;
            r.current.scale.setScalar(scale);
            r.current.position.set(origin[0], centerY + idx * 0.8, origin[2]);
            (r.current.material as THREE.MeshToonMaterial).opacity = opacity;
        });
        t.current += delta * 2.5;
    });

    const cfg = ELEMENT_CFG[element];

    return (
        <>
            <mesh ref={ring1} position={origin} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.4, 0.75, 32]} />
                <meshToonMaterial color={cfg.color} transparent opacity={1} side={THREE.DoubleSide} />
            </mesh>
            <mesh ref={ring2} position={origin} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.6, 1.0, 32]} />
                <meshToonMaterial color={cfg.trail} transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
        </>
    );
}

// ─── Hit flash — overlay mesh that flashes red/white on the target ────────────
function HitFlash({
    origin,
    active,
    targetScale,
}: {
    origin: [number, number, number];
    active: boolean;
    targetScale: number;
}) {
    const ref = useRef<THREE.Mesh>(null!);
    const t = useRef(0);

    useEffect(() => { if (active) t.current = 0; }, [active]);

    useFrame((_, delta) => {
        if (!ref.current) return;
        if (!active) { ref.current.visible = false; return; }
        t.current += delta * 4;
        const opacity = Math.max(0, 0.85 - t.current * 0.9);
        ref.current.visible = opacity > 0;
        ref.current.position.set(origin[0], origin[1] + bodyCenter(targetScale), origin[2]);
        ref.current.scale.setScalar(targetScale * 1.5 + 1);
        (ref.current.material as THREE.MeshToonMaterial).opacity = opacity;
    });

    return (
        <mesh ref={ref} visible={false} frustumCulled={false}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color="#FF4444" transparent opacity={0} side={THREE.DoubleSide} />
        </mesh>
    );
}

// ─── Defence hexagonal shield ─────────────────────────────────────────────────
function DefenceShield({ origin, active, playerScale }: {
    origin: [number, number, number];
    active: boolean;
    playerScale: number;
}) {
    const outer = useRef<THREE.Mesh>(null!);
    const inner = useRef<THREE.Mesh>(null!);
    const hex = useRef<THREE.Mesh>(null!);
    const t = useRef(0);
    const radius = Math.max(2.2, playerScale * 0.9);

    useFrame((_, delta) => {
        t.current += delta;
        const centerY = origin[1] + bodyCenter(playerScale);

        [outer, inner, hex].forEach((r, idx) => {
            if (!r.current) return;
            r.current.visible = active;
            if (!active) return;
        });

        if (outer.current) {
            outer.current.position.set(origin[0], centerY, origin[2]);
            outer.current.rotation.y = t.current * 1.2;
            outer.current.rotation.z = Math.sin(t.current * 1.5) * 0.15;
            const op = 0.35 + Math.sin(t.current * 5) * 0.12;
            (outer.current.material as THREE.MeshToonMaterial).opacity = op;
        }
        if (inner.current) {
            inner.current.position.set(origin[0], centerY, origin[2]);
            inner.current.rotation.y = -t.current * 2;
            inner.current.rotation.x = Math.sin(t.current * 2) * 0.2;
            const op2 = 0.25 + Math.sin(t.current * 4 + 1) * 0.1;
            (inner.current.material as THREE.MeshToonMaterial).opacity = op2;
        }
        if (hex.current) {
            hex.current.position.set(origin[0], centerY, origin[2]);
            hex.current.rotation.y = t.current * 0.7;
            const op3 = 0.5 + Math.sin(t.current * 6) * 0.2;
            (hex.current.material as THREE.MeshToonMaterial).opacity = op3;
        }
    });

    return (
        <>
            {/* Outer rotating wireframe sphere */}
            <mesh ref={outer} position={origin} visible={false}>
                <sphereGeometry args={[radius, 12, 10]} />
                <meshToonMaterial color="#60A5FA" transparent opacity={0} wireframe side={THREE.DoubleSide} />
            </mesh>
            {/* Inner counter-rotating dodecahedron */}
            <mesh ref={inner} position={origin} visible={false}>
                <dodecahedronGeometry args={[radius * 0.75, 0]} />
                <meshToonMaterial color="#93C5FD" transparent opacity={0} wireframe side={THREE.DoubleSide} />
            </mesh>
            {/* Flat hex ring at waist */}
            <mesh ref={hex} position={origin} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
                <ringGeometry args={[radius * 0.8, radius * 1.05, 6]} />
                <meshToonMaterial color="#BFDBFE" transparent opacity={0} side={THREE.DoubleSide} />
            </mesh>
        </>
    );
}

// ─── Model ────────────────────────────────────────────────────────────────────
function Model({
    url,
    modelScale = 1,
    animationName = 'idle',
    facing = 'right',
    rotationOffset = 0,
}: {
    url: string;
    modelScale?: number;
    animationName?: string;
    facing?: 'left' | 'right';
    rotationOffset?: number;
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

    const finalRotationY = (facing === 'left' ? -Math.PI / 4 : (3 * Math.PI) / 4) + rotationOffset;

    return (
        <group scale={modelScale * 1.0} rotation={[0, finalRotationY, 0]}>
            <primitive ref={ref} object={clone} />
        </group>
    );
}

// ─── Scene content ────────────────────────────────────────────────────────────
function SceneContent({
    playerUrl,
    playerScale,
    playerAnim,
    playerRotationOffset,
    enemyUrl,
    enemyScale,
    enemyAnim,
    enemyRotationOffset,
    attackEffect,
    defenseActive,
}: any) {
    const { viewport, camera } = useThree();
    const isPortrait = viewport.aspect < 1;

    // Fixed positions — don't move models
    const playerPos: [number, number, number] = [isPortrait ? 1 : 2, 0, 15];
    const enemyPos: [number, number, number] = [isPortrait ? -6 : -10, 0, -5];

    useEffect(() => {
        if (camera instanceof THREE.PerspectiveCamera) {
            camera.fov = isPortrait ? 45 : 35;
            camera.position.set(isPortrait ? 5 : 4, isPortrait ? 8 : 6, isPortrait ? 32 : 26);
            camera.lookAt(0, 0, 5);
            camera.updateProjectionMatrix();
        }
    }, [isPortrait, camera]);

    const playerAttacking = !!(attackEffect?.target === 'enemy' && attackEffect?.element);
    const enemyAttacking = !!(attackEffect?.target === 'player' && attackEffect?.element);
    const anyAttack = !!(attackEffect?.element && attackEffect?.target);

    const activeElement = (attackEffect?.element ?? 'Tanah') as keyof typeof ELEMENT_CFG;

    // Projectile travels from attacker → target
    const fromPos = playerAttacking ? playerPos : enemyPos;
    const toPos = playerAttacking ? enemyPos : playerPos;
    const fromSc = playerAttacking ? (playerScale ?? 1) : (enemyScale ?? 1);
    const toSc = playerAttacking ? (enemyScale ?? 1) : (playerScale ?? 1);

    return (
        <>
            <ambientLight intensity={1.5} />
            <directionalLight position={[10, 15, 10]} intensity={2.5} castShadow shadow-bias={-0.001} />
            <directionalLight position={[-10, 5, -10]} intensity={1.5} />

            {/* Arena ground */}
            <mesh receiveShadow position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[20, 64]} />
                <meshToonMaterial color="#689F38" />
            </mesh>
            <mesh receiveShadow position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[22, 64]} />
                <meshToonMaterial color="#558B2F" />
            </mesh>

            {/* Player */}
            <group position={playerPos}>
                <Suspense fallback={null}>
                    <Model url={playerUrl} modelScale={playerScale} animationName={playerAnim} facing="right" rotationOffset={playerRotationOffset ?? 0} />
                </Suspense>
            </group>

            {/* Enemy */}
            <group position={enemyPos}>
                <Suspense fallback={null}>
                    <Model url={enemyUrl} modelScale={enemyScale} animationName={enemyAnim} facing="left" rotationOffset={enemyRotationOffset ?? 0} />
                </Suspense>
            </group>

            {/* ── Attack projectile + burst — precise to model body center ── */}
            {anyAttack && (
                <AttackProjectile
                    key={`proj-${attackEffect.element}-${attackEffect.target}`}
                    fromPos={fromPos}
                    toPos={toPos}
                    element={activeElement}
                    active={anyAttack}
                    fromScale={fromSc}
                    toScale={toSc}
                />
            )}

            {/* ── Impact rings at target body center ── */}
            {anyAttack && (
                <ImpactRing
                    key={`ring-${attackEffect.element}-${attackEffect.target}`}
                    origin={toPos}
                    element={activeElement}
                    active={anyAttack}
                    targetScale={toSc}
                />
            )}

            {/* ── Hit flash on the target ── */}
            {anyAttack && (
                <HitFlash
                    key={`flash-${attackEffect.element}-${attackEffect.target}`}
                    origin={toPos}
                    active={anyAttack}
                    targetScale={toSc}
                />
            )}

            {/* ── Defence shield around player — sized to player model ── */}
            <DefenceShield
                origin={playerPos}
                active={!!defenseActive}
                playerScale={playerScale ?? 1}
            />

            <ContactShadows opacity={0.4} scale={30} blur={2} far={15} color="#000000" />
        </>
    );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function BattleArena({
    playerUrl,
    playerScale = 1,
    playerAnim = 'idle',
    playerRotationOffset = 0,
    enemyUrl,
    enemyScale = 1,
    enemyAnim = 'idle',
    enemyRotationOffset = 0,
    attackEffect,
    defenseActive = false,
}: {
    playerUrl: string;
    playerScale?: number;
    playerAnim?: string;
    playerRotationOffset?: number;
    enemyUrl: string;
    enemyScale?: number;
    enemyAnim?: string;
    enemyRotationOffset?: number;
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
                    playerRotationOffset={playerRotationOffset}
                    enemyUrl={enemyUrl}
                    enemyScale={enemyScale}
                    enemyAnim={enemyAnim}
                    enemyRotationOffset={enemyRotationOffset}
                    attackEffect={attackEffect}
                    defenseActive={defenseActive}
                />
            </Canvas>
        </div>
    );
}
