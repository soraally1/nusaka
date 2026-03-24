import { useRef, useMemo, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Animal } from './Animal'
import { useStoneStore } from './stoneStore'
import { NPC } from './NPC'

export const PLANET_RADIUS = 150;

// Simple seeded random to ensure consistent tree positions across files without hydration issues
export function seededRandom(seed: number) {
    return function () {
        seed = Math.sin(seed) * 10000;
        return seed - Math.floor(seed);
    };
}
const rng = seededRandom(42);

export const TREE_COUNT = 1500;
export const TREES_DATA = Array.from({ length: TREE_COUNT }).map(() => {
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const x = PLANET_RADIUS * Math.sin(phi) * Math.cos(theta);
    const y = PLANET_RADIUS * Math.sin(phi) * Math.sin(theta);
    const z = PLANET_RADIUS * Math.cos(phi);

    const position = new THREE.Vector3(x, y, z);
    const normal = position.clone().normalize();
    // Trees grow slightly outward to stay rooted
    position.addScaledVector(normal, 0);

    const scale = 3.0 + rng() * 2.0;
    const rotationY = rng() * Math.PI * 2;

    return { position, normal, scale, rotationY };
}).filter(tree => {
    // Prevent trees from spawning exactly at the player spawn point 
    // Player spawns at (0, PLANET_RADIUS, 0)
    const spawnPoint = new THREE.Vector3(0, PLANET_RADIUS, 0);
    const distanceToSpawn = tree.position.distanceTo(spawnPoint);

    // Clear a safe radius of 25 units around the spawn to keep both player and camera clear
    return distanceToSpawn > 25;
});

function generateAnimalData(count: number, seedStart: number) {
    const rng = seededRandom(seedStart);
    return Array.from({ length: count }).map(() => {
        const u = rng();
        const v = rng();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const x = PLANET_RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = PLANET_RADIUS * Math.sin(phi) * Math.sin(theta);
        const z = PLANET_RADIUS * Math.cos(phi);

        const position = new THREE.Vector3(x, y, z);
        const normal = position.clone().normalize();
        // Animals stay on the ground
        position.addScaledVector(normal, 0);

        const scale = 1.0 + rng() * 0.5;
        const rotationY = rng() * Math.PI * 2;

        return { position, normal, scale, rotationY };
    }).filter(animal => {
        // Clear a safe radius around the player's spawn point
        const spawnPoint = new THREE.Vector3(0, PLANET_RADIUS, 0);
        if (animal.position.distanceToSquared(spawnPoint) < 35 * 35) return false;

        // Ensure animals don't spawn inside trees
        for (let i = 0; i < TREES_DATA.length; i++) {
            const tree = TREES_DATA[i];
            const safeDist = tree.scale * 1.5 + animal.scale * 3.0; // Rough approximation of collision radii
            if (animal.position.distanceToSquared(tree.position) < safeDist * safeDist) {
                return false;
            }
        }

        return true;
    });
}

export const KOMODO_DATA = generateAnimalData(15, 8812);
export const ORANGUTAN_DATA = generateAnimalData(15, 9923);
export const RAJAWALI_DATA = generateAnimalData(15, 1134);
export const BADAK_DATA = generateAnimalData(12, 5511);
export const BATU_DATA = generateAnimalData(20, 4422);

export function randomizeBatuPosition(id: number, playerPos?: THREE.Vector3) {
    if (!BATU_DATA[id]) return;
    
    const MAX_ATTEMPTS = 50;
    const MIN_DIST_FROM_PLAYER = 50; // Minimum distance from player
    const MIN_DIST_FROM_TREES = 8;   // Minimum distance from trees
    const MIN_DIST_FROM_STONES = 15; // Minimum distance from other stones
    
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const x = PLANET_RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = PLANET_RADIUS * Math.sin(phi) * Math.sin(theta);
        const z = PLANET_RADIUS * Math.cos(phi);

        const candidatePos = new THREE.Vector3(x, y, z);
        
        // Check distance from player
        if (playerPos && candidatePos.distanceTo(playerPos) < MIN_DIST_FROM_PLAYER) {
            continue;
        }
        
        // Check distance from trees
        let tooClose = false;
        for (let i = 0; i < TREES_DATA.length; i++) {
            if (candidatePos.distanceTo(TREES_DATA[i].position) < MIN_DIST_FROM_TREES) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;
        
        // Check distance from other stones
        for (let i = 0; i < BATU_DATA.length; i++) {
            if (i === id) continue;
            if (candidatePos.distanceTo(BATU_DATA[i].position) < MIN_DIST_FROM_STONES) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;
        
        // Valid position found
        BATU_DATA[id].position.copy(candidatePos);
        BATU_DATA[id].normal.copy(candidatePos).normalize();
        BATU_DATA[id].rotationY = Math.random() * Math.PI * 2;
        return;
    }
    
    // Fallback: just place it randomly if no valid position found
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const x = PLANET_RADIUS * Math.sin(phi) * Math.cos(theta);
    const y = PLANET_RADIUS * Math.sin(phi) * Math.sin(theta);
    const z = PLANET_RADIUS * Math.cos(phi);
    BATU_DATA[id].position.set(x, y, z);
    BATU_DATA[id].normal.copy(BATU_DATA[id].position).normalize();
    BATU_DATA[id].rotationY = Math.random() * Math.PI * 2;
}

export const POS_DATA = [
    { pos: new THREE.Vector3(35, 0, 15), rot: 0 },
    { pos: new THREE.Vector3(-35, 0, -15), rot: 0 },
    { pos: new THREE.Vector3(15, 0, -40), rot: 0 },
    { pos: new THREE.Vector3(-15, 0, 40), rot: 0 },
].map(d => {
    // Positioned slightly lower (radius - 0.7) to ensure they sit firmly on the ground
    const position = new THREE.Vector3(d.pos.x, PLANET_RADIUS, d.pos.z).normalize().multiplyScalar(PLANET_RADIUS - 0.2);
    const normal = position.clone().normalize();
    return { position, normal, rotationY: d.rot, scale: 6 };
});

export const NPC_DATA = {
    position: new THREE.Vector3(15, PLANET_RADIUS, -32).normalize().multiplyScalar(PLANET_RADIUS),
    normal: new THREE.Vector3(15, PLANET_RADIUS, -32).normalize(),
    rotationY: 0,
    scale: 2
};

// Pre-allocate a stable quaternion for tree orientation to avoid per-frame alloc
const _treeUp = new THREE.Vector3(0, 1, 0);
const _treeQuat = new THREE.Quaternion();

function Trees() {
    const { nodes, materials } = useGLTF('/model/pohon.glb') as any;
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const { camera } = useThree();
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Find the first mesh geometry in the GLTF
    const treeMesh = useMemo(() => {
        return Object.values(nodes).find((n: any) => n.geometry !== undefined) as THREE.Mesh;
    }, [nodes]);

    const toonMaterial = useMemo(() => {
        if (!treeMesh || !treeMesh.material) return new THREE.MeshToonMaterial({ color: '#2d6a4f' });
        const oldMat = treeMesh.material as THREE.MeshStandardMaterial;

        const newMat = new THREE.MeshToonMaterial({
            map: oldMat.map,
            color: oldMat.color,
            transparent: false,
            depthWrite: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });

        // Disable filtering to prevent pixel bleeding (like on the player model)
        if (newMat.map) {
            newMat.map.generateMipmaps = false;
            newMat.map.minFilter = THREE.NearestFilter;
            newMat.map.magFilter = THREE.NearestFilter;
            newMat.map.anisotropy = 1;
            newMat.map.needsUpdate = true;
        }
        return newMat;
    }, [treeMesh]);

    // Optimization: Pre-calculate all 1500 matrices ONLY ONCE.
    // We store the local matrices in a Float32Array for instant access.
    const treeMatrices = useMemo(() => {
        const matrices = new Float32Array(TREES_DATA.length * 16);
        const tempObj = new THREE.Object3D();
        for (let i = 0; i < TREES_DATA.length; i++) {
            const tree = TREES_DATA[i];
            tempObj.position.copy(tree.position);
            _treeQuat.setFromUnitVectors(_treeUp, tree.normal);
            tempObj.quaternion.copy(_treeQuat);
            tempObj.rotateY(tree.rotationY);
            tempObj.scale.setScalar(tree.scale);
            tempObj.updateMatrix();
            tempObj.matrix.toArray(matrices, i * 16);
        }
        return matrices;
    }, []);

    const _frustum = useMemo(() => new THREE.Frustum(), []);
    const _projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
    const _treeSphere = useMemo(() => new THREE.Sphere(new THREE.Vector3(), 5), []);

    const prevUpdatePos = useRef(new THREE.Vector3());
    const prevUpdateQuat = useRef(new THREE.Quaternion());
    const lastVisibleCountShadow = useRef(0);
    const lastVisibleCountNoShadow = useRef(0);

    // Stable buffers to avoid re-allocating memory
    const packedBufferShadow = useMemo(() => new Float32Array(TREES_DATA.length * 16), []);
    const packedBufferNoShadow = useMemo(() => new Float32Array(TREES_DATA.length * 16), []);
    
    const meshShadowRef = useRef<THREE.InstancedMesh>(null);
    const meshNoShadowRef = useRef<THREE.InstancedMesh>(null);

    const renderDist = 170; // Slightly reduced for better mobile horizon
    const shadowDist = 45; // Only trees within 45m cast shadows - HUGE performance boost for mobile

    useFrame((state) => {
        if (!meshShadowRef.current || !meshNoShadowRef.current || !treeMesh) return;
        
        const camPos = state.camera.position;
        const camQuat = state.camera.quaternion;

        // Optimization: Only update visibility if camera moved or rotated significantly
        const distMoved = camPos.distanceToSquared(prevUpdatePos.current);
        const rotDiff = camQuat.angleTo(prevUpdateQuat.current);
        if (distMoved < 0.2 * 0.2 && rotDiff < 0.05) return;

        prevUpdatePos.current.copy(camPos);
        prevUpdateQuat.current.copy(camQuat);

        state.camera.updateMatrixWorld();
        _projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
        _frustum.setFromProjectionMatrix(_projScreenMatrix);

        let vCountShadow = 0;
        let vCountNoShadow = 0;
        const treeCount = TREES_DATA.length;

        for (let i = 0; i < treeCount; i++) {
            const tree = TREES_DATA[i];
            const dSq = camPos.distanceToSquared(tree.position);

            if (dSq < renderDist * renderDist) {
                // If within shadow dist, check if in view
                // Near-field buffer (shadows behind you)
                let inView = dSq < 60 * 60; 
                if (!inView) {
                    _treeSphere.center.copy(tree.position).addScaledVector(tree.normal, tree.scale * 0.5);
                    _treeSphere.radius = tree.scale * 2.0; 
                    inView = _frustum.intersectsSphere(_treeSphere);
                }

                if (inView) {
                    const srcOffset = i * 16;
                    // Split between shadow-casters and non-shadow-casters
                    if (dSq < shadowDist * shadowDist) {
                        const offset = vCountShadow * 16;
                        for (let j = 0; j < 16; j++) packedBufferShadow[offset + j] = treeMatrices[srcOffset + j];
                        vCountShadow++;
                    } else {
                        const offset = vCountNoShadow * 16;
                        for (let j = 0; j < 16; j++) packedBufferNoShadow[offset + j] = treeMatrices[srcOffset + j];
                        vCountNoShadow++;
                    }
                }
            }
        }

        // Apply Shadowed Mesh
        meshShadowRef.current.count = vCountShadow;
        meshShadowRef.current.instanceMatrix.array.set(packedBufferShadow);
        meshShadowRef.current.instanceMatrix.needsUpdate = true;

        // Apply No-Shadow Mesh
        meshNoShadowRef.current.count = vCountNoShadow;
        meshNoShadowRef.current.instanceMatrix.array.set(packedBufferNoShadow);
        meshNoShadowRef.current.instanceMatrix.needsUpdate = true;
    }, 10);

    if (!treeMesh) return null;

    return (
        <group>
            {/* Near trees: Cast & Receive shadows */}
            <instancedMesh
                ref={meshShadowRef}
                args={[treeMesh.geometry, toonMaterial, TREES_DATA.length]}
                castShadow
                receiveShadow
                frustumCulled={false}
            />
            {/* Distant trees: ONLY Receive shadows (Disable CastShadow for perf) */}
            <instancedMesh
                ref={meshNoShadowRef}
                args={[treeMesh.geometry, toonMaterial, TREES_DATA.length]}
                castShadow={false}
                receiveShadow
                frustumCulled={false}
            />
        </group>
    );
}

function Stone({ data }: { data: any }) {
    const { scene } = useGLTF('/model/batuFinal.glb') as any;
    const clone = useMemo(() => {
        const c = scene.clone();
        c.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        return c;
    }, [scene]);
    const quaternion = useMemo(() => {
        const q = new THREE.Quaternion();
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), data.normal);
        return q;
    }, [data.normal]);

    return (
        <group position={data.position} quaternion={quaternion}>
            <group rotation-y={data.rotationY} scale={data.scale * 0.4}>
                <primitive object={clone} />
            </group>
        </group>
    );
}

export default function Planet({ playerRef }: { playerRef?: React.MutableRefObject<THREE.Vector3> }) {
    const planetRef = useRef<THREE.Mesh>(null)
    // Force re-render of stones when respawn triggered
    const respawnTrigger = useStoneStore(s => s.respawnTrigger);

    const grassTexture = useMemo(() => {
        if (typeof document === 'undefined') return null; // SSR safety

        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Base bright green grass color
        ctx.fillStyle = '#8BC34A';
        ctx.fillRect(0, 0, 128, 128);

        // Darker grass pattern (Animal Crossing style triangles)
        ctx.fillStyle = '#7CB342';

        // Helper to draw a small triangle
        const drawTriangle = (x: number, y: number) => {
            ctx.beginPath();
            ctx.moveTo(x, y - 10);
            ctx.lineTo(x - 10, y + 10);
            ctx.lineTo(x + 10, y + 10);
            ctx.fill();
        }

        // Helper to draw a small circle
        const drawCircle = (x: number, y: number) => {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        drawTriangle(32, 32);
        drawTriangle(96, 96);
        drawCircle(32, 96);
        drawCircle(96, 32);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        // Repeat the pattern many times across the massive 150-radius sphere
        texture.repeat.set(100, 100);

        texture.generateMipmaps = false;
        // Use NearestFilter to strictly keep the pixelated/sharp look preventing blurring
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;

        return texture;
    }, []);

    return (
        <group>
            <mesh ref={planetRef} position={[0, 0, 0]} receiveShadow>
                <sphereGeometry args={[PLANET_RADIUS, 64, 64]} />
                {grassTexture ? (
                    <meshToonMaterial map={grassTexture} color="#ffffff" />
                ) : (
                    <meshToonMaterial color="#8BC34A" />
                )}
            </mesh>
            <Trees />
            {BATU_DATA.map((data, i) => (
                <Stone key={`batu-${i}-${respawnTrigger}`} data={data} />
            ))}
            {KOMODO_DATA.map((data, i) => (
                <Animal key={`komodo-${i}`} path="/model/Komodo.glb" position={data.position.clone().addScaledVector(data.normal, 0)} normal={data.normal} rotationY={data.rotationY} scale={data.scale * 0.3} />
            ))}
            {ORANGUTAN_DATA.map((data, i) => (
                <Animal key={`orangutan-${i}`} path="/model/OrangUtan.glb" position={data.position.clone().addScaledVector(data.normal, 0)} normal={data.normal} rotationY={data.rotationY} scale={data.scale * 0.6} />
            ))}
            {RAJAWALI_DATA.map((data, i) => (
                <Animal key={`rajawali-${i}`} path="/model/rajawali.glb" position={data.position.clone().addScaledVector(data.normal, 3)} normal={data.normal} rotationY={data.rotationY} scale={data.scale * 0.6} />
            ))}
            {BADAK_DATA.map((data, i) => (
                <Animal key={`badak-${i}`} path="/model/badag.glb" position={data.position.clone().addScaledVector(data.normal, 0)} normal={data.normal} rotationY={data.rotationY} scale={data.scale * 0.4} />
            ))}
            {POS_DATA.map((data, i) => (
                <Animal key={`pos-${i}`} path="/model/Pos.glb" position={data.position} normal={data.normal} rotationY={data.rotationY} scale={data.scale} />
            ))}
            {playerRef && (
                <NPC 
                    path="/model/Kakek.glb" 
                    position={NPC_DATA.position} 
                    normal={NPC_DATA.normal} 
                    rotationY={NPC_DATA.rotationY} 
                    scale={NPC_DATA.scale}
                    playerRef={playerRef}
                />
            )}
        </group>
    )
}

useGLTF.preload('/model/pohon.glb');
useGLTF.preload('/model/komodo.glb');
useGLTF.preload('/model/OrangUtan.glb');
useGLTF.preload('/model/rajawali.glb');
useGLTF.preload('/model/badag.glb');
useGLTF.preload('/model/batuFinal.glb');
useGLTF.preload('/model/Pos.glb');
useGLTF.preload('/model/Kakek.glb');
