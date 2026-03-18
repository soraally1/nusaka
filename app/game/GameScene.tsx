'use client'

import { Canvas } from '@react-three/fiber'
import { Environment, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import Planet from './Planet'
import Player from './Player'
import { useJoystickStore } from './store'

import { useRef, Suspense } from 'react'

function SkyBox() {
    const texture = useTexture('/sky.png')
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // The image provided is a wide rectangle (~2:1 aspect ratio), 
    // and wrapping it around a sphere causes horizontal stretching.
    // Repeating it more times horizontally (X) than vertically (Y) fixes the squished look.
    texture.repeat.set(6, 3);

    return (
        <mesh scale={4000}>
            <sphereGeometry args={[1, 64, 64]} />
            <meshBasicMaterial map={texture} side={THREE.BackSide} toneMapped={false} />
        </mesh>
    )
}

export default function GameScene() {
    const lastPosition = useJoystickStore(s => s.lastPosition)
    const playerPositionRef = useRef(new THREE.Vector3(
        lastPosition?.x ?? 0,
        lastPosition?.y ?? 150,
        lastPosition?.z ?? 0
    ))

    return (
        <Canvas shadows camera={{ position: [0, 30, 40], fov: 45 }} dpr={[1, 1]} flat gl={{ antialias: false, powerPreference: "high-performance", stencil: false, depth: true }}>
            <Suspense fallback={null}>
                {/* Lights */}
                <ambientLight intensity={1.5} />
                <hemisphereLight args={["#b1e1ff", "#8BC34A", 1]} />

                {/* Environment */}
                <SkyBox />

                {/* World */}
                <Planet playerRef={playerPositionRef} />

                {/* Player */}
                <Player positionRef={playerPositionRef} />
            </Suspense>
        </Canvas>
    )
}
