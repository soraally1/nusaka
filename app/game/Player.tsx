import { useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations, Hud, OrthographicCamera } from '@react-three/drei'
import * as THREE from 'three'
import { PLANET_RADIUS, TREES_DATA, KOMODO_DATA, ORANGUTAN_DATA, RAJAWALI_DATA, BADAK_DATA, BATU_DATA, POS_DATA, NPC_DATA } from './Planet'
import { useJoystickStore } from './store'
import { useBattleStore } from './battleStore'
import { useStoneStore } from './stoneStore'
import { NUSA_CREATURES } from '../nusadex/creatures'

// --- Pre-compute colliders once at module level (never rebuilt at runtime) ---
const COLLIDERS = [
    ...TREES_DATA.map(t => ({ pos: t.position, radius: t.scale * 0.8, type: 'tree' as const, id: null as null })),
    ...BATU_DATA.map((b, i) => ({ pos: b.position, radius: b.scale * 1.2, type: 'stone' as const, id: i })),
    ...KOMODO_DATA.map(k => ({ pos: k.position, radius: 2.5, type: 'animal' as const, id: 2 })),
    ...ORANGUTAN_DATA.map(o => ({ pos: o.position, radius: 2.5, type: 'animal' as const, id: 3 })),
    ...RAJAWALI_DATA.map(r => ({ pos: r.position, radius: 1.5, type: 'animal' as const, id: 1 })),
    ...BADAK_DATA.map(b => ({ pos: b.position, radius: 3.0, type: 'animal' as const, id: 4 })),
    ...POS_DATA.map(p => ({ pos: p.position, radius: p.scale * 0.8, type: 'object' as const, id: null })),
    { pos: NPC_DATA.position, radius: 1.5, type: 'npc' as const, id: null },
];

// --- Pre-allocate reusable THREE objects to prevent per-frame GC pressure ---
const _surfaceNormal = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _inputDir = new THREE.Vector3();
const _nextPos = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _lookPoint = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basisMatrix = new THREE.Matrix4();
const _pUp = new THREE.Vector3();
const _currentCamFwd = new THREE.Vector3();
const _idealCamPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _tempMatrix = new THREE.Matrix4();
const _targetCamQuat = new THREE.Quaternion();
const _slideDir = new THREE.Vector3();
const _miniCamFwd = new THREE.Vector3();
const _miniCamRight = new THREE.Vector3();
const _miniPlayerDir = new THREE.Vector3();
const _miniMatrix = new THREE.Matrix4();
// For minimap cam forward
const _miniCamFwdBase = new THREE.Vector3(0, 0, -1);

function MinimapGlobe({ playerPosition }: { playerPosition: React.MutableRefObject<THREE.Vector3> }) {
    const globeRef = useRef<THREE.Mesh>(null)
    const blipRef = useRef<THREE.Mesh>(null)

    const treeMeshRef = useRef<THREE.InstancedMesh>(null);
    const animalMeshRef = useRef<THREE.InstancedMesh>(null);
    const stoneMeshRef = useRef<THREE.InstancedMesh>(null);
    const { camera } = useThree();

    const _miniDummy = useMemo(() => new THREE.Object3D(), []);

    useLayoutEffect(() => {
        if (treeMeshRef.current) {
            const visibleTrees = TREES_DATA.filter((_, i) => i % 5 === 0);
            visibleTrees.forEach((tree, i) => {
                _miniDummy.position.copy(tree.position).normalize();
                _miniDummy.updateMatrix();
                treeMeshRef.current!.setMatrixAt(i, _miniDummy.matrix);
            });
            treeMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        if (animalMeshRef.current) {
            const animals = [...KOMODO_DATA, ...ORANGUTAN_DATA, ...RAJAWALI_DATA, ...BADAK_DATA];
            animals.forEach((animal, i) => {
                _miniDummy.position.copy(animal.position).normalize();
                _miniDummy.updateMatrix();
                animalMeshRef.current!.setMatrixAt(i, _miniDummy.matrix);
            });
            animalMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        if (stoneMeshRef.current) {
            BATU_DATA.forEach((stone, i) => {
                _miniDummy.position.copy(stone.position).normalize();
                _miniDummy.updateMatrix();
                stoneMeshRef.current!.setMatrixAt(i, _miniDummy.matrix);
            });
            stoneMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [])

    useFrame(() => {
        if (!globeRef.current || !blipRef.current) return;

        _miniPlayerDir.copy(playerPosition.current).normalize();

        _miniCamFwd.copy(_miniCamFwdBase).applyQuaternion(camera.quaternion);
        _miniCamFwd.projectOnPlane(_miniPlayerDir).normalize();

        if (_miniCamFwd.lengthSq() < 0.001) _miniCamFwd.set(1, 0, 0);

        _miniCamRight.crossVectors(_miniCamFwd, _miniPlayerDir).normalize();

        _miniMatrix.makeBasis(_miniCamRight, _miniCamFwd, _miniPlayerDir);
        globeRef.current.quaternion.setFromRotationMatrix(_miniMatrix).invert();

        blipRef.current.position.set(0, 0, 1.15);
        blipRef.current.rotation.set(-Math.PI / 2, 0, 0);
    })

    return (
        <Hud>
            <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={50} />
            <ambientLight intensity={1} />
            <directionalLight position={[2, 5, 2]} intensity={2} />

            <group position={[-window.innerWidth / 100 + 1.5, window.innerHeight / 100 - 1.5, 0]}>
                <mesh ref={globeRef}>
                    <sphereGeometry args={[1, 32, 32]} />
                    <meshStandardMaterial color="#8BC34A" />

                    <instancedMesh ref={treeMeshRef} args={[undefined as any, undefined as any, Math.ceil(TREES_DATA.length / 5)]}>
                        <boxGeometry args={[0.05, 0.05, 0.05]} />
                        <meshBasicMaterial color="#2d6a4f" />
                    </instancedMesh>

                    <instancedMesh ref={stoneMeshRef} args={[undefined as any, undefined as any, BATU_DATA.length]}>
                        <boxGeometry args={[0.08, 0.08, 0.08]} />
                        <meshBasicMaterial color="#9E9E9E" />
                    </instancedMesh>

                    <instancedMesh ref={animalMeshRef} args={[undefined as any, undefined as any, KOMODO_DATA.length + ORANGUTAN_DATA.length + RAJAWALI_DATA.length + BADAK_DATA.length]}>
                        <boxGeometry args={[0.08, 0.08, 0.08]} />
                        <meshBasicMaterial color="#FF5722" />
                    </instancedMesh>
                </mesh>

                <mesh ref={blipRef}>
                    <coneGeometry args={[0.08, 0.25, 16]} />
                    <meshBasicMaterial color="#FFEB3B" />
                </mesh>

                <mesh>
                    <ringGeometry args={[1.1, 1.15, 64]} />
                    <meshBasicMaterial color="rgba(255,255,255,0.5)" transparent />
                </mesh>
            </group>
        </Hud>
    )
}

function CartoonSmoke({ playerPosition, isMovingRef }: { playerPosition: React.MutableRefObject<THREE.Vector3>, isMovingRef: React.MutableRefObject<boolean> }) {
    const COUNT = 25;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const _jitter = useMemo(() => new THREE.Vector3(), []);
    const _up = useMemo(() => new THREE.Vector3(), []);

    const particles = useRef([...Array(COUNT)].map(() => ({
        active: false,
        progress: 0,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        scaleMod: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.5 + 1.0
    })));

    const spawnTimer = useRef(0);
    const particleIndex = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;

        const isMoving = isMovingRef.current;

        spawnTimer.current += delta;
        if (isMoving && spawnTimer.current > 0.01) {
            spawnTimer.current = 0;
            const p = particles.current[particleIndex.current];
            p.active = true;
            p.progress = 0;

            _jitter.set(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();

            _up.copy(playerPosition.current).normalize();
            p.position.copy(playerPosition.current).addScaledVector(_jitter, 0.5).addScaledVector(_up, 0.2);

            if (!p.velocity) p.velocity = new THREE.Vector3();
            p.velocity.copy(_jitter).multiplyScalar(1.5).addScaledVector(_up, 1.0);

            p.scaleMod = Math.random() * 0.5 + 0.5;
            p.speed = Math.random() * 2.0 + 2.0;

            particleIndex.current = (particleIndex.current + 1) % COUNT;
        }

        particles.current.forEach((p, i) => {
            if (p.active) {
                p.progress += delta * p.speed;

                if (p.progress >= 1) {
                    p.active = false;
                    dummy.scale.set(0, 0, 0);
                    dummy.updateMatrix();
                    meshRef.current!.setMatrixAt(i, dummy.matrix);
                } else {
                    if (p.velocity) {
                        p.position.addScaledVector(p.velocity, delta);
                        p.velocity.multiplyScalar(0.95);
                    }

                    const scale = Math.sin(p.progress * Math.PI) * 0.4 * p.scaleMod;
                    dummy.position.copy(p.position);
                    dummy.scale.setScalar(scale);
                    dummy.updateMatrix();
                    meshRef.current!.setMatrixAt(i, dummy.matrix);
                }
            } else {
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]} frustumCulled={false}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshToonMaterial color="#dddddd" transparent opacity={1} depthWrite={false} />
        </instancedMesh>
    );
}

export default function Player({ positionRef }: { positionRef?: React.MutableRefObject<THREE.Vector3> }) {
    const group = useRef<THREE.Group>(null)
    const lightGroupRef = useRef<THREE.Group>(null)

    const { scene, animations } = useGLTF('/model/nasaka.glb')
    const { actions } = useAnimations(animations, group)

    // --- KEY FIX: Use refs instead of useState for movement to AVOID React re-renders on key input ---
    // This is the primary cause of the 900ms INP - setState on keydown triggers full React reconciliation
    const movementRef = useRef({ forward: 0, right: 0 });
    const isMovingRef = useRef(false);

    const internalPosition = useRef(new THREE.Vector3(0, PLANET_RADIUS, 0))
    const playerPosition = positionRef || internalPosition
    const cameraForward = useRef(new THREE.Vector3(0, 0, -1))
    const targetRotation = useRef(new THREE.Quaternion())

    const menuState = useJoystickStore(s => s.menuState)
    const setLastPosition = useJoystickStore(s => s.setLastPosition)

    // Save position to store on unmount
    useEffect(() => {
        return () => {
            if (playerPosition.current) {
                setLastPosition({
                    x: playerPosition.current.x,
                    y: playerPosition.current.y,
                    z: playerPosition.current.z
                });
            }
        };
    }, [setLastPosition, playerPosition]);

    // Animation state (still uses ref to avoid triggering renders)
    const currentAction = useRef<string | null>(null)
    const prevIsMovingAnim = useRef(false);

    // Cache resolved animation actions after first lookup to avoid Object.keys() every frame
    const runningActionRef = useRef<THREE.AnimationAction | null>(null);
    const idleActionRef = useRef<THREE.AnimationAction | null>(null);
    const actionsResolvedRef = useRef(false);

    // Throttle proximity check — only update store max 10x/sec to avoid constant React re-renders
    const proximityTimer = useRef(0);
    const lastNearbyId = useRef<number | null | undefined>(undefined); // undefined = never set

    // Walking SFX
    const audioRefs = useRef<{ walk1: HTMLAudioElement, walk2: HTMLAudioElement } | null>(null);
    useEffect(() => {
        audioRefs.current = {
            walk1: new Audio('/sfx/walk1.mp3'),
            walk2: new Audio('/sfx/walk2.mp3')
        };
        if (audioRefs.current) {
            audioRefs.current.walk1.volume = 0.4;
            audioRefs.current.walk2.volume = 0.4;
        }
    }, []);
    const walkTimer = useRef(0);
    const stepToggle = useRef(false);

    // Handle keyboard - now writes to refs instead of setState → zero INP overhead
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { menuState } = useJoystickStore.getState();
            if (menuState !== 'playing') return;
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': movementRef.current.forward = 1; break;
                case 'KeyS': case 'ArrowDown': movementRef.current.forward = -1; break;
                case 'KeyA': case 'ArrowLeft': movementRef.current.right = -1; break;
                case 'KeyD': case 'ArrowRight': movementRef.current.right = 1; break;
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case 'KeyW': case 'ArrowUp': movementRef.current.forward = 0; break;
                case 'KeyS': case 'ArrowDown': movementRef.current.forward = 0; break;
                case 'KeyA': case 'ArrowLeft': movementRef.current.right = 0; break;
                case 'KeyD': case 'ArrowRight': movementRef.current.right = 0; break;
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, []) // No dependency on menuState — we read it inline from store instead

    // Toon material setup
    useEffect(() => {
        const meshes: THREE.Mesh[] = [];
        scene.traverse((child) => {
            if (child instanceof THREE.Mesh && !child.userData.isOutline) {
                meshes.push(child);
            }
        });

        meshes.forEach((child) => {
            const outlinesToRemove: THREE.Object3D[] = [];
            child.children.forEach(c => {
                if (c.userData && c.userData.isOutline) outlinesToRemove.push(c);
            });
            outlinesToRemove.forEach(c => child.remove(c));
            child.userData.hasOutline = false;
            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
                const oldMat = child.material as THREE.MeshStandardMaterial;
                if (oldMat.map) {
                    oldMat.map.generateMipmaps = false;
                    oldMat.map.minFilter = THREE.NearestFilter;
                    oldMat.map.magFilter = THREE.NearestFilter;
                    oldMat.map.anisotropy = 1;
                    oldMat.map.needsUpdate = true;
                }
                const newMat = new THREE.MeshToonMaterial({
                    map: oldMat.map,
                    color: oldMat.color,
                    transparent: false,
                    depthWrite: true,
                    alphaTest: 0.5,
                    side: oldMat.side !== undefined ? oldMat.side : THREE.DoubleSide
                });
                child.material = newMat;
            }
        });
    }, [scene])

    const { camera } = useThree()

    useFrame((_, delta) => {
        if (!group.current) return;

        // Read store state once per frame (not via hook subscription)
        const { menuState: currentMenuState, forward: jF, right: jR } = useJoystickStore.getState();

        const combinedForward = movementRef.current.forward + jF;
        const combinedRight = movementRef.current.right + jR;

        const isMoving = combinedForward !== 0 || combinedRight !== 0;
        isMovingRef.current = isMoving && currentMenuState === 'playing';

        // --- Animation switching ---
        // Resolve actions once, cache in refs to avoid Object.keys() every frame
        if (!actionsResolvedRef.current && actions && Object.keys(actions).length > 0) {
            const keys = Object.keys(actions);
            runningActionRef.current = actions['running'] || actions['Run'] || actions['run'] ||
                actions[keys.find(k => k.toLowerCase().includes('run')) || ''] || null;
            idleActionRef.current = actions['idle'] || actions['Idle'] || actions['idle_01'] ||
                actions[keys.find(k => k.toLowerCase().includes('idle')) || ''] || null;
            actionsResolvedRef.current = true;
        }

        if (actionsResolvedRef.current) {
            const shouldRun = isMoving && currentMenuState === 'playing';
            if (shouldRun !== prevIsMovingAnim.current) {
                prevIsMovingAnim.current = shouldRun;
                const targetActionName = shouldRun ? 'running' : 'idle';
                const targetAction = shouldRun ? runningActionRef.current : idleActionRef.current;
                const prevAction = shouldRun ? idleActionRef.current : runningActionRef.current;

                if (currentAction.current !== targetActionName) {
                    if (prevAction) prevAction.fadeOut(0.2);
                    if (targetAction) {
                        targetAction.reset().fadeIn(0.2).play();
                        targetAction.setEffectiveTimeScale(1.3);
                    }
                    currentAction.current = targetActionName;
                }
            }
        }

        // --- Walking SFX ---
        if (isMoving && currentMenuState === 'playing') {
            walkTimer.current += delta;
            if (walkTimer.current > 0.35) {
                walkTimer.current = 0;
                if (audioRefs.current) {
                    const stepAudio = stepToggle.current ? audioRefs.current.walk1 : audioRefs.current.walk2;
                    stepToggle.current = !stepToggle.current;
                    stepAudio.currentTime = 0;
                    stepAudio.play().catch(() => { });
                }
            }
        } else {
            walkTimer.current = 0;
        }

        const speed = 12;

        // --- Movement & collision (all reused vectors, zero GC) ---
        _surfaceNormal.copy(playerPosition.current).normalize();
        _camForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
        _camForward.projectOnPlane(_surfaceNormal).normalize();
        _camRight.crossVectors(_camForward, _surfaceNormal).normalize();

        _inputDir.set(0, 0, 0)
            .addScaledVector(_camForward, combinedForward)
            .addScaledVector(_camRight, combinedRight);

        if (_inputDir.lengthSq() > 0) _inputDir.normalize();

        if (isMoving && currentMenuState === 'playing') {
            _nextPos.copy(playerPosition.current).addScaledVector(_inputDir, speed * delta);
            _nextPos.normalize().multiplyScalar(PLANET_RADIUS);

            for (let i = 0; i < COLLIDERS.length; i++) {
                const col = COLLIDERS[i];
                if (col.type !== 'tree' && col.type !== 'stone' && col.type !== 'animal') continue;

                _p1.copy(_nextPos).normalize();
                _p2.copy(col.pos).normalize();
                const distSq = _p1.distanceToSquared(_p2) * PLANET_RADIUS * PLANET_RADIUS;

                if (distSq < col.radius * col.radius) {
                    _slideDir.copy(_nextPos).sub(col.pos).normalize();
                    _nextPos.addScaledVector(_slideDir, speed * delta * 2.5); // Increase repulsion force
                    _nextPos.normalize().multiplyScalar(PLANET_RADIUS);
                }
            }
            playerPosition.current.copy(_nextPos);

            const newUp = _surfaceNormal.copy(playerPosition.current).normalize(); // reuse _surfaceNormal as newUp
            _lookPoint.copy(playerPosition.current).add(_inputDir);
            _fwd.copy(_lookPoint).sub(playerPosition.current).normalize();
            _right.crossVectors(newUp, _fwd).normalize();
            _fwd.crossVectors(_right, newUp).normalize();

            _basisMatrix.makeBasis(_right, newUp, _fwd);
            targetRotation.current.setFromRotationMatrix(_basisMatrix);
        } else {
            _fwd.set(0, 0, 1).applyQuaternion(group.current.quaternion);
            const newUp = _surfaceNormal.copy(playerPosition.current).normalize();
            _right.crossVectors(newUp, _fwd).normalize();
            _fwd.crossVectors(_right, newUp).normalize();

            _basisMatrix.makeBasis(_right, newUp, _fwd);
            targetRotation.current.setFromRotationMatrix(_basisMatrix);
        }

        // --- GLOBAL PROXIMITY CHECK (Always runs, throttled) ---
        proximityTimer.current += delta;
        if (proximityTimer.current >= 0.1) {
            proximityTimer.current = 0;

            let closestAnimalId: number | null = null;
            let closestDistSq = Infinity;
            let nearStoneId: number | null = null;
            let nearNpc = false;

            for (let i = 0; i < COLLIDERS.length; i++) {
                const col = COLLIDERS[i];
                if (col.type !== 'animal' && col.type !== 'stone' && col.type !== 'npc') continue;

                _p1.copy(playerPosition.current).normalize();
                _p2.copy(col.pos).normalize();
                const distSq = _p1.distanceToSquared(_p2) * PLANET_RADIUS * PLANET_RADIUS;

                if (col.type === 'animal') {
                    // Increased radius to 18m to prevent flickering/early disappearance
                    if (distSq < 18 * 18 && distSq < closestDistSq) {
                        closestDistSq = distSq;
                        closestAnimalId = col.id;
                    }
                } else if (col.type === 'stone') {
                    if (distSq < 15 * 15) {
                        nearStoneId = col.id;
                    }
                } else if (col.type === 'npc') {
                    if (distSq < 10 * 10) {
                        nearNpc = true;
                    }
                }
            }


            if (closestAnimalId !== lastNearbyId.current) {
                lastNearbyId.current = closestAnimalId;
                const battleStore = useBattleStore.getState();
                if (closestAnimalId !== null) {
                    const matchingCreature = NUSA_CREATURES.find(c => c.id === closestAnimalId) || null;
                    battleStore.setNearbyCreature(matchingCreature);
                } else {
                    battleStore.setNearbyCreature(null);
                }
            }

            const stoneStore = useStoneStore.getState();
            if (stoneStore.nearbyStoneId !== nearStoneId) {
                stoneStore.setNearbyStoneId(nearStoneId);
            }

            const joystickStore = useJoystickStore.getState();
            if (joystickStore.nearbyNPC !== nearNpc) {
                joystickStore.setNearbyNPC(nearNpc);
            }
        }

        group.current.position.copy(playerPosition.current);
        group.current.quaternion.slerp(targetRotation.current, Math.min(15 * delta, 1));

        // --- Camera ---
        const IsCreating = currentMenuState === 'create_character';
        const offsetDistance = IsCreating ? 6 : 15;
        const offsetHeight = IsCreating ? 1.5 : 10;

        _pUp.copy(playerPosition.current).normalize();

        _currentCamFwd.copy(cameraForward.current).projectOnPlane(_pUp).normalize();
        if (_currentCamFwd.lengthSq() < 0.001) {
            _currentCamFwd.set(1, 0, 0).projectOnPlane(_pUp).normalize();
        }

        if (isMoving && !IsCreating) {
            _currentCamFwd.lerp(_inputDir, 1 * delta).normalize();
        }

        cameraForward.current.copy(_currentCamFwd);

        _idealCamPos.copy(playerPosition.current)
            .addScaledVector(_currentCamFwd, -offsetDistance)
            .addScaledVector(_pUp, offsetHeight);
        camera.position.lerp(_idealCamPos, Math.min(5 * delta, 1));

        _lookTarget.copy(playerPosition.current)
            .addScaledVector(_pUp, IsCreating ? 1.5 : 1)
            .addScaledVector(_currentCamFwd, IsCreating ? 0 : 4);

        _tempMatrix.lookAt(camera.position, _lookTarget, _pUp);
        _targetCamQuat.setFromRotationMatrix(_tempMatrix);
        camera.quaternion.slerp(_targetCamQuat, Math.min(5 * delta, 1));

        // --- Sun light ---
        if (lightGroupRef.current) {
            lightGroupRef.current.position.copy(playerPosition.current);
            lightGroupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _pUp);
        }
    })

    return (
        <>
            <group ref={lightGroupRef}>
                <directionalLight
                    position={[30, 40, 20]}
                    intensity={2.5}
                    castShadow
                    shadow-mapSize={[512, 512]}
                    shadow-camera-left={-40}
                    shadow-camera-right={40}
                    shadow-camera-top={40}
                    shadow-camera-bottom={-40}
                    shadow-camera-near={0.1}
                    shadow-camera-far={100}
                    shadow-bias={-0.001}
                />
            </group>

            <group ref={group}>
                <primitive object={scene} scale={2} position={[0, 0, 0]} />
            </group>

            <CartoonSmoke
                playerPosition={playerPosition}
                isMovingRef={isMovingRef}
            />

            {menuState === 'playing' && <MinimapGlobe playerPosition={playerPosition} />}
        </>
    )
}

useGLTF.preload('/model/nasaka.glb')
