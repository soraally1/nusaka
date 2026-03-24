'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { Sword, LogOut, AlertTriangle, Zap } from 'lucide-react';

// ─── Tiger 3D Model ───────────────────────────────────────────────────────────
function TigerModel({ phase }: { phase: 'enter' | 'roar' | 'idle' }) {
  const { scene, animations } = useGLTF('/model/HarimauSumatera.glb') as any;
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const groupRef = useRef<THREE.Group>(null!);

  const clone = React.useMemo(() => {
    const c = SkeletonUtils.clone(scene);
    c.traverse((node: any) => {
      node.visible = true;
      if (node.isMesh) {
        const old = node.material as THREE.MeshStandardMaterial;
        if (old) {
          node.material = new THREE.MeshStandardMaterial({
            map: old.map,
            color: old.color,
            roughness: 0.6,
            metalness: 0.1,
          });
          node.castShadow = true;
          node.receiveShadow = true;
        }
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    if (!animations?.length) return;
    const mixer = new THREE.AnimationMixer(clone);
    mixerRef.current = mixer;

    const names: string[] = animations.map((a: any) => a.name.toLowerCase());
    const findAnim = (kw: string) => animations.find((_: any, i: number) => names[i].includes(kw));

    let clip = findAnim('idle') || findAnim('walk') || animations[0];
    if (phase === 'roar') clip = findAnim('attack') || findAnim('roar') || clip;

    const action = mixer.clipAction(clip);
    action.reset().play();
    return () => { mixer.stopAllAction(); mixer.uncacheRoot(clone); };
  }, [clone, animations, phase]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={groupRef} scale={4.5} rotation={[0, Math.PI, 0]} position={[0, -1.05, 0]}>
      <primitive object={clone} />
    </group>
  );
}

// ─── Cinematic camera ─────────────────────────────────────────────────────────
function CinematicCamera({ phase, shaking }: { phase: string; shaking: boolean }) {
  const { camera, viewport } = useThree();
  const isPortrait = viewport.aspect < 1;
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    const cam = camera as THREE.PerspectiveCamera;
    
    // Responsive FOV, matching normal fights
    cam.fov = isPortrait ? 45 : 35;
    
    const progress = Math.min(t.current / 2.5, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    // If portrait, start further away and travel a bit more
    const startZ = isPortrait ? 22 : 15;
    const travelZ = isPortrait ? 7 : 5;

    cam.position.set(isPortrait ? 2 : 0, 2 + (1 - eased) * 3, startZ - eased * travelZ);
    cam.lookAt(0, 1, 0);
    if (shaking) {
      cam.position.x += (Math.random() - 0.5) * 0.06;
      cam.position.y += (Math.random() - 0.5) * 0.06;
    }
    cam.updateProjectionMatrix();
  });
  return null;
}

// ─── Arena Scene ─────────────────────────────────────────────────────────────
function ArenaScene({ phase, shaking }: { phase: 'enter' | 'roar' | 'idle'; shaking: boolean }) {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={3} castShadow />
      <directionalLight position={[-5, 5, -3]} intensity={1.5} color="#FF6B35" />
      <pointLight position={[0, 6, -6]} intensity={4} color="#DC2626" distance={18} />
      <pointLight position={[0, 8, 6]} intensity={2} color="#FFF9E6" distance={20} />
      {/* Ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[12, 64]} />
        <meshStandardMaterial color="#1C1917" roughness={1} />
      </mesh>
      <Suspense fallback={null}>
        <TigerModel phase={phase} />
      </Suspense>
      <ContactShadows position={[0, -1.05, 0]} opacity={0.6} scale={14} blur={2.5} far={8} color="#DC2626" />
      <CinematicCamera phase={phase} shaking={shaking} />
    </>
  );
}

// ─── Main Boss Reveal ─────────────────────────────────────────────────────────
interface BossRevealProps {
  onFightNow: () => void;
  onFlee: () => void;
}

export default function BossReveal({ onFightNow, onFlee }: BossRevealProps) {
  const [phase, setPhase] = useState<'enter' | 'roar' | 'idle'>('enter');
  const [textPhase, setTextPhase] = useState<0 | 1 | 2 | 3>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const t1 = setTimeout(() => setTextPhase(1), 400);
    const t2 = setTimeout(() => { setPhase('roar'); setTextPhase(2); }, 1800);
    const t3 = setTimeout(() => { setPhase('idle'); setTextPhase(3); }, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const shaking = phase === 'roar';

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      fontFamily: 'var(--font-nanum-pen)',
      overflow: 'hidden',
      opacity: mounted ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bossTextIn {
          from { opacity: 0; transform: translateY(-24px) skewY(-2deg); }
          to   { opacity: 1; transform: translateY(0) skewY(0); }
        }
        @keyframes bossSubIn {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes bossCtaIn {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bossShake {
          0%,100% { transform: translate(0,0); }
          15%  { transform: translate(-5px,-3px); }
          30%  { transform: translate(5px,3px); }
          45%  { transform: translate(-7px,2px); }
          60%  { transform: translate(7px,-2px); }
          75%  { transform: translate(-3px,5px); }
          90%  { transform: translate(3px,-5px); }
        }
        @keyframes warningStripe {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        @keyframes bossGlitch {
          0%,94%,100% { clip-path: none; transform: none; }
          95% { clip-path: inset(15% 0 65% 0); transform: translateX(-4px); }
          96% { clip-path: inset(60% 0 10% 0); transform: translateX(4px); }
          97% { clip-path: inset(35% 0 35% 0); transform: translateX(-2px); }
          98% { clip-path: none; transform: none; }
        }
        @keyframes flashRed {
          0%,100% { opacity: 0; }
          50%     { opacity: 0.28; }
        }
        @keyframes warnBlink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.5; }
        }
        @keyframes breathe {
          0%,100% { box-shadow: 0 0 24px rgba(220,38,38,0.4), 4px 4px 0 rgba(0,0,0,0.5); }
          50%     { box-shadow: 0 0 48px rgba(220,38,38,0.7), 4px 4px 0 rgba(0,0,0,0.5); }
        }
      `}} />

      {/* Dark bg */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 70%, #1a0a0a 0%, #050505 100%)',
      }} />

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
      }} />

      {/* Red flash on roar */}
      {shaking && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          animation: 'flashRed 0.5s ease-in-out infinite',
          background: 'rgba(220,38,38,0.2)',
        }} />
      )}

      {/* Screen shake wrapper — contains 3D and overlay text */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 3,
        animation: shaking ? 'bossShake 0.14s linear infinite' : 'none',
      }}>
        {/* 3D Canvas — takes ~70% height from top, centered */}
        <div style={{ position: 'absolute', inset: 0, bottom: '28%' }}>
          <Canvas
            shadows
            camera={{ position: [0, 3.5, 15], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
          >
            <ArenaScene phase={phase} shaking={shaking} />
          </Canvas>
        </div>
      </div>

      {/* Warning stripe top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 10, zIndex: 20,
        background: 'repeating-linear-gradient(90deg, #DC2626 0, #DC2626 20px, #111 20px, #111 40px)',
        animation: 'warningStripe 0.55s linear infinite',
      }} />

      {/* Boss name — top section */}
      <div style={{
        position: 'absolute', top: '5%', left: 0, right: 0, zIndex: 15,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        opacity: textPhase >= 1 ? 1 : 0,
        transition: 'opacity 0.4s ease',
        animation: textPhase >= 1 ? 'bossTextIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        pointerEvents: 'none',
      }}>
        {/* Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#DC2626',
          border: '3px solid #FFF9E6',
          borderRadius: '8px',
          padding: '5px 18px',
          marginBottom: '10px',
          animation: 'warnBlink 1s ease-in-out infinite',
          boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
        }}>
          <AlertTriangle size={14} color="#FFF9E6" strokeWidth={2.5} />
          <span style={{ fontWeight: 900, fontSize: '12px', color: '#FFF9E6', letterSpacing: '5px', textTransform: 'uppercase' }}>
            BOSS FIGHT
          </span>
          <AlertTriangle size={14} color="#FFF9E6" strokeWidth={2.5} />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(40px, 9vw, 88px)',
          fontWeight: 900, margin: 0,
          lineHeight: 0.9,
          color: '#FFF9E6',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '6px 6px 0 #DC2626, 10px 10px 0 rgba(0,0,0,0.6)',
          animation: shaking ? 'bossGlitch 3s ease-in-out infinite' : 'none',
          textAlign: 'center', padding: '0 12px',
        }}>
          Harimau<br />
          <span style={{ color: '#FCA5A5' }}>Sumatera</span>
        </h1>
      </div>

      {/* Stats badges */}
      {textPhase >= 2 && (
        <div style={{
          position: 'absolute', top: '34%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 15, display: 'flex', gap: '8px', whiteSpace: 'nowrap',
          animation: 'bossSubIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          pointerEvents: 'none',
        }}>
          {[
            { label: 'Level', value: '40', color: '#FCA5A5' },
            { label: 'Element', value: 'Tanah', color: '#D97706' },
            { label: 'Status', value: 'SANGAT KRITIS', color: '#A7F3D0' },
          ].map((s, i) => (
            <div key={i} style={{
              background: 'rgba(15,15,15,0.92)',
              border: '2px solid rgba(255,249,230,0.18)',
              borderRadius: '10px',
              padding: '6px 14px',
              textAlign: 'center',
              backdropFilter: 'blur(6px)',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '2px', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: '13px', fontWeight: 900, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA panel — always rendered but hidden until textPhase 3 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
        background: 'linear-gradient(0deg, rgba(5,5,5,0.99) 65%, transparent 100%)',
        padding: '20px 24px 28px',
        opacity: textPhase >= 3 ? 1 : 0,
        pointerEvents: textPhase >= 3 ? 'auto' : 'none',
        transition: 'opacity 0.5s ease',
        animation: textPhase >= 3 ? 'bossCtaIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
      }}>
        {/* Description */}
        <div style={{
          maxWidth: '520px', margin: '0 auto 18px',
          background: 'rgba(220,38,38,0.1)',
          border: '2px solid rgba(220,38,38,0.35)',
          borderRadius: '14px',
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <Zap size={18} color="#FCA5A5" strokeWidth={2.5} style={{ flexShrink: 0 }} />
          <p style={{
            margin: 0, fontSize: '13px', fontWeight: 700,
            color: 'rgba(255,249,230,0.85)', lineHeight: 1.6,
            fontStyle: 'italic',
          }}>
            "Pengetahuanmu telah membangunkan sang predator puncak Sumatera. Kini bersiaplah menghadapi pertarungan sesungguhnya!"
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', maxWidth: '520px', margin: '0 auto' }}>
          {/* Flee */}
          <button
            onClick={onFlee}
            style={{
              flex: 1, padding: '14px 12px',
              background: 'transparent',
              border: '3px solid rgba(255,249,230,0.25)',
              borderRadius: '14px',
              color: 'rgba(255,249,230,0.55)',
              fontWeight: 800, fontSize: '15px',
              cursor: 'pointer',
              fontFamily: 'var(--font-nanum-pen)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              const b = e.currentTarget;
              b.style.background = 'rgba(255,249,230,0.1)';
              b.style.color = '#FFF9E6';
              b.style.borderColor = 'rgba(255,249,230,0.5)';
            }}
            onMouseLeave={e => {
              const b = e.currentTarget;
              b.style.background = 'transparent';
              b.style.color = 'rgba(255,249,230,0.55)';
              b.style.borderColor = 'rgba(255,249,230,0.25)';
            }}
          >
            <LogOut size={16} strokeWidth={2.5} />
            Kabur
          </button>

          {/* Fight */}
          <button
            onClick={onFightNow}
            style={{
              flex: 3, padding: '16px',
              background: 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',
              border: '3px solid #FFF9E6',
              borderRadius: '14px',
              color: '#FFF9E6',
              fontWeight: 900, fontSize: '20px',
              cursor: 'pointer',
              letterSpacing: '2px', textTransform: 'uppercase',
              fontFamily: 'var(--font-nanum-pen)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              animation: 'breathe 2s ease-in-out infinite',
              transition: 'transform 0.12s ease, filter 0.12s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = ''; }}
          >
            <Sword size={22} strokeWidth={2.5} />
            Lawan Sekarang!
          </button>
        </div>
      </div>

      {/* Warning stripe bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, zIndex: 21,
        background: 'repeating-linear-gradient(90deg, #DC2626 0, #DC2626 20px, #111 20px, #111 40px)',
        animation: 'warningStripe 0.55s linear infinite reverse',
      }} />
    </div>
  );
}
