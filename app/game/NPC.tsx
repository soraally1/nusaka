import React, { useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Html } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

// Shared LOD tools - only render what is in camera view
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _npcSphere = new THREE.Sphere(new THREE.Vector3(), 2);

interface NPCProps {
    path: string
    position: THREE.Vector3
    normal: THREE.Vector3
    rotationY: number
    scale?: number
    playerRef: React.MutableRefObject<THREE.Vector3>
}

export function NPC({ path, position, normal, rotationY, scale = 1, playerRef }: NPCProps) {
    const { scene, animations } = useGLTF(path) as any
    const clone = useMemo(() => {
        const clonedScene = SkeletonUtils.clone(scene)
        clonedScene.traverse((node: any) => {
            if (node.isMesh) {
                const oldMat = node.material as THREE.MeshStandardMaterial;
                if (oldMat) {
                    const newMat = new THREE.MeshToonMaterial({
                        map: oldMat.map,
                        color: oldMat.color,
                        transparent: oldMat.transparent,
                        opacity: oldMat.opacity,
                        alphaTest: 0.5,
                        side: THREE.DoubleSide
                    });
                    if (newMat.map) {
                        newMat.map.generateMipmaps = false;
                        newMat.map.minFilter = THREE.NearestFilter;
                        newMat.map.magFilter = THREE.NearestFilter;
                    }
                    node.material = newMat;
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            }
        });
        return clonedScene
    }, [scene])

    const { ref, actions, names, mixer } = useAnimations(animations)
    const groupRef = useRef<THREE.Group>(null)
    const currentAction = useRef<string>('')

    // Track proximity for "!" indicator — only triggers setState on transition
    const [isNear, setIsNear] = useState(false)
    const prevIsNear = useRef(false)

    useFrame((state) => {
        if (!groupRef.current) return;

        // Proximity check for animations
        const distSq = playerRef.current.distanceToSquared(position);
        let targetAction = 'idle';

        // If player is very close (within 8m), wave "hai"
        if (distSq < 8 * 8) {
            targetAction = names.find((n: string) => n.toLowerCase().includes('hai')) || 'idle';
        } else {
            targetAction = names.find((n: string) => n.toLowerCase().includes('idle')) || names[0];
        }

        if (currentAction.current !== targetAction) {
            const prev = actions[currentAction.current];
            const next = actions[targetAction];
            if (prev) prev.fadeOut(0.5);
            if (next) {
                next.reset().fadeIn(0.5).play();
            }
            currentAction.current = targetAction;
        }

        // Update "!" indicator — only call setState on state transition to avoid re-renders every frame
        const nowNear = distSq < 20 * 20;
        if (nowNear !== prevIsNear.current) {
            prevIsNear.current = nowNear;
            setIsNear(nowNear);
        }

        // LOD: Only render if model is in camera view (pandangan kamera) OR very close
        const camDistSq = state.camera.position.distanceToSquared(position);
        let isVisible = false;

        if (camDistSq < 200 * 200) {
            // Near-field is always visible (for shadows/greeting)
            if (camDistSq < 60 * 60) {
                isVisible = true;
            } else {
                // Determine if inside camera view using frustum
                state.camera.updateMatrixWorld();
                _projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
                _frustum.setFromProjectionMatrix(_projScreenMatrix);

                _npcSphere.center.copy(position);
                _npcSphere.radius = scale * 5.0; // Margin to prevent popping at screen edges
                isVisible = _frustum.intersectsSphere(_npcSphere);
            }
        }

        if (groupRef.current.visible !== isVisible) {
            groupRef.current.visible = isVisible;
            if (mixer) mixer.timeScale = isVisible ? 1 : 0;
        }
    }, 10)

    const quaternion = useMemo(() => {
        const q = new THREE.Quaternion()
        q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
        return q
    }, [normal])

    // Height offset for the "!" bubble above NPC's head (in local space, after surface orientation)
    const exclamationOffset: [number, number, number] = [0, scale * 4.5, 0]

    return (
        <group ref={groupRef} position={position} quaternion={quaternion}>
            <group rotation-y={rotationY} scale={scale}>
                <primitive ref={ref} object={clone} />
            </group>

            {/* Floating "!" indicator — appears when player is within 20m */}
            {isNear && (
                <Html
                    position={exclamationOffset}
                    center
                    zIndexRange={[10, 0]}
                    distanceFactor={12}
                    occlude={false}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            animation: 'npc-bounce 0.7s ease-in-out infinite alternate',
                        }}
                    >
                        <div
                            style={{
                                fontSize: '28px',
                                fontWeight: 900,
                                color: '#FFD700',
                                textShadow: '0 0 6px #92400E, 2px 2px 0 #283618',
                                lineHeight: 1,
                                fontFamily: 'Arial Black, sans-serif',
                            }}
                        >
                            !
                        </div>
                        <div
                            style={{
                                width: 0,
                                height: 0,
                                borderLeft: '6px solid transparent',
                                borderRight: '6px solid transparent',
                                borderTop: '8px solid #FFD700',
                                filter: 'drop-shadow(0 1px 2px #283618)',
                            }}
                        />
                    </div>
                    <style>{`
                        @keyframes npc-bounce {
                            from { transform: translateY(0px); }
                            to   { transform: translateY(-8px); }
                        }
                    `}</style>
                </Html>
            )}
        </group>
    )
}
