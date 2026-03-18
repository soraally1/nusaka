'use client'

import { useRef, Suspense, useEffect, useState, useMemo } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, useTexture, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'
import { useJoystickStore } from '../../game/store'
import { useTransitionStore } from '../../store/transitionStore'
import { ChevronRight, Home, BookOpen, Target, MapPin, Compass, X } from 'lucide-react'
import { SkeletonUtils } from 'three-stdlib'

// Simple direct components for common world elements to bypass Planet LOD for the character page
function SkyBox() {
  const texture = useTexture("/sky.png");
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 3);

  return (
    <mesh scale={2000}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  );
}

function SimplePlanet() {
  return (
    <mesh position={[0, -150, 0]} receiveShadow>
      <sphereGeometry args={[150, 64, 64]} />
      <meshToonMaterial color="#8BC34A" />
    </mesh>
  );
}

function PosModel({ isMobile }: { isMobile: boolean }) {
  const { scene } = useGLTF("/model/Pos.glb");

  const clone = useMemo(() => {
    const clonedScene = SkeletonUtils.clone(scene);
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        const oldMat = child.material as THREE.MeshStandardMaterial;
        child.material = new THREE.MeshToonMaterial({
          map: oldMat?.map,
          color: oldMat?.color || "#ffffff",
          transparent: oldMat?.transparent,
          opacity: oldMat?.opacity,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedScene;
  }, [scene]);

  // Desktop: left side, bigger. Mobile: closer to center, smaller
  const mobilePos = [-2.5, 1, 17] as [number, number, number];
  const desktopPos = [-5.5, -0.2, 17] as [number, number, number];
  const pos = isMobile ? mobilePos : desktopPos;
  const scale = isMobile ? 2.5 : 3.8;

  return (
    <group position={pos} rotation={[0, Math.PI / 4, 0]} scale={scale}>
      <primitive object={clone} />
    </group>
  );
}

function DialogNPC({
  isTyping,
  isMobile,
}: {
  isTyping: boolean;
  isMobile: boolean;
}) {
  const { scene, animations } = useGLTF("/model/Kakek.glb") as any;
  const clone = useMemo(() => {
    const clonedScene = SkeletonUtils.clone(scene);
    clonedScene.traverse((child: any) => {
      if (child.isMesh) {
        const oldMat = child.material as THREE.MeshStandardMaterial;
        child.material = new THREE.MeshToonMaterial({
          map: oldMat?.map,
          color: oldMat?.color || "#ffffff",
          transparent: oldMat?.transparent,
          opacity: oldMat?.opacity,
          alphaTest: 0.5,
          side: THREE.DoubleSide,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clonedScene;
  }, [scene]);

  const { ref, actions, names } = useAnimations(animations, clone);

  // Desktop: right side, bigger. Mobile: closer to center, smaller
  const mobilePos = [1.5, -0.5, 22] as [number, number, number];
  const desktopPos = [3.5, -1.2, 22] as [number, number, number];
  const pos = isMobile ? mobilePos : desktopPos;
  const scale = isMobile ? 2.5 : 3.5;

  useEffect(() => {
    if (!actions) return;
    const talkAnim =
      names.find(
        (n: string) =>
          n.toLowerCase().includes("talk") ||
          n.toLowerCase().includes("bicara") ||
          n.toLowerCase().includes("speak"),
      ) || names[0];

    if (talkAnim && actions[talkAnim]) {
      if (isTyping) {
        actions[talkAnim].reset().fadeIn(0.2).play();
      } else {
        actions[talkAnim].fadeOut(0.5);
      }
    }
  }, [actions, names, isTyping]);

  return (
    <group position={pos} rotation={[0, -Math.PI / 8, 0]} scale={scale}>
      <primitive ref={ref} object={clone} />
    </group>
  );
}

function SceneContent({
  isTyping,
  isMobile,
}: {
  isTyping: boolean;
  isMobile: boolean;
}) {
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    state.camera.position.y = 4 + Math.sin(t * 0.5) * 0.15;
    // Mobile: look at center so both models are in frame. Desktop: slight right
    state.camera.lookAt(isMobile ? 0 : 1.5, 2.5, 0);
  });

  return (
    <Suspense fallback={null}>
      <SkyBox />
      <SimplePlanet />
      <ambientLight intensity={1.5} />
      <hemisphereLight args={["#ffffff", "#8BC34A", 1.0]} />
      <directionalLight position={[10, 20, 10]} intensity={2} castShadow />
      <PosModel isMobile={isMobile} />
      <DialogNPC isTyping={isTyping} isMobile={isMobile} />
    </Suspense>
  );
}

export default function NPCKakekPage() {
    const router = useRouter()
    const playerName = useJoystickStore(s => s.playerName)
    const { startTransition, finishTransition } = useTransitionStore()
    const [dialogStep, setDialogStep] = useState(0)
    const [displayText, setDisplayText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [dialogMode, setDialogMode] = useState<'intro' | 'mission'>('intro')
    const [showMissionOptions, setShowMissionOptions] = useState(false)
    const [storyWatched, setStoryWatched] = useState(false)

    // Check if intro was completed on mount
    useEffect(() => {
        const introComplete = localStorage.getItem('kakek_intro_complete')
        if (introComplete === 'true') {
            setDialogMode('mission')
        }
        const storyStatus = localStorage.getItem('orangutan_story_watched')
        if (storyStatus === 'true') {
            setStoryWatched(true)
        }
    }, [])

    const introDialogs = [
        `Hai ${playerName || 'Petualang'}!`,
        "Wah, kamu sudah sampai di sini rupanya. Selamat datang di dunia Nusaka!",
        "Dunia ini luas dan penuh dengan keajaiban. Ada banyak hewan-hewan unik yang bisa kamu temukan.",
        "Gunakan Nusadex untuk mencatat setiap pertemuanmu. Itu akan membantumu belajar lebih banyak tentang mereka.",
        "Semoga perjalananmu menyenangkan dan penuh berkah. Sampai jumpa lagi!"
    ]

    const missionDialogs = [
        `Ah, ${playerName || 'Petualang'}! Kamu datang lagi.`,
        "Aku punya sesuatu yang penting untukmu. Ada seekor Orang Utan yang tersesat di hutan sebelah barat.",
        "Dia adalah penjaga rimba yang mulia, tetapi kini terancam oleh pemburu liar.",
        "Maukah kamu membantu menangkap dan melindungi Orang Utan tersebut?",
        "Tapi sebelum itu, dengarkanlah dongeng tentang asal-usul Sang Penjaga Rimba ini..."
    ]

    const dialogs = dialogMode === 'intro' ? introDialogs : missionDialogs

    // Typewriter Effect
    useEffect(() => {
        let isCancelled = false
        const text = dialogs[dialogStep]
        setDisplayText('')
        setIsTyping(true)

        let currentText = ''
        let index = 0

        const type = () => {
            if (isCancelled) return
            if (index < text.length) {
                currentText += text[index]
                setDisplayText(currentText)
                index++
                setTimeout(type, 35) // Speed of typing
            } else {
                setIsTyping(false)
            }
        }

        type()
        return () => { isCancelled = true }
    }, [dialogStep])

    const handleNext = () => {
        if (isTyping) {
            // Skip typing
            setDisplayText(dialogs[dialogStep])
            setIsTyping(false)
        } else if (dialogStep < dialogs.length - 1) {
            setDialogStep(prev => prev + 1)
        } else {
            // Last dialog step
            if (dialogMode === 'intro') {
                // Mark intro as complete
                localStorage.setItem('kakek_intro_complete', 'true')
                // Switch to mission mode and show options
                setDialogMode('mission')
                setDialogStep(0)
                setShowMissionOptions(true)
            } else {
                // In mission mode, show options instead of closing
                setShowMissionOptions(true)
            }
        }
    }
  }, [displayText]);

    const handleStartStory = async () => {
        // Auto-accept mission when starting story
        localStorage.setItem('orangutan_story_watched', 'true')
        localStorage.setItem('current_mission', 'orangutan')
        localStorage.setItem('mission_status', 'active')
        localStorage.setItem('mission_objective', 'Tangkap Orang Utan di hutan barat')
        
        startTransition(() => {
            router.push('/dongeng/orangutan')
        })
    }

    const handleAcceptMissionDirect = () => {
        // Skip story, accept mission directly
        localStorage.setItem('orangutan_story_watched', 'true')
        localStorage.setItem('current_mission', 'orangutan')
        localStorage.setItem('mission_status', 'active')
        localStorage.setItem('mission_objective', 'Tangkap Orang Utan di hutan barat')
        localStorage.setItem('orangutan_mission_accepted', 'true')
        
        startTransition(() => {
            router.push('/')
        })
    }

    const handleClose = () => {
        startTransition(() => {
            router.push('/')
        })
    }
  };

  const handleClose = () => {
    startTransition(() => {
      router.push("/");
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB]">
      {/* 3D Canvas - limited to upper portion so characters always stay visible above dialog */}
      <div
        className="absolute inset-0 z-0"
        style={{ bottom: "clamp(160px, 30vh, 260px)" }}
      >
        {/* Desktop and mobile use different FOV via canvas */}
        <Canvas shadows camera={{ position: [0, 4, 32], fov: 30 }}>
          <SceneContent isTyping={isTyping} isMobile={isMobile} />
        </Canvas>
      </div>

      {/* Home Button */}
      <button
        onClick={handleClose}
        className="absolute top-4 sm:top-8 left-4 sm:left-8 z-50 p-2.5 sm:p-4 bg-[#87CEEB]/80 hover:bg-[#87CEEB] backdrop-blur-md rounded-full text-[#283618] transition-all duration-300 shadow-[1px_3px_6px_rgba(40,54,24,0.3)] active:shadow-none cursor-pointer group"
      >
        <Home
          size={22}
          className="sm:hidden group-hover:scale-110 transition-transform"
        />
        <Home
          size={28}
          className="hidden sm:block group-hover:scale-110 transition-transform"
        />
      </button>

      {/* Dialogue UI — fixed at bottom, limited height */}
      <div className="absolute bottom-0 left-0 right-0 z-40 animate-fade-in-bottom pointer-events-none">
        <div className="relative w-full flex flex-col justify-end">
          {/* Character Name Tag */}
          <div className="relative ml-4 sm:ml-12">
            <div
              style={{ fontFamily: "var(--font-nanum-pen)" }}
              className="absolute bottom-full translate-y-1 left-0 px-4 sm:px-8 py-2 sm:py-3 bg-[#606C38] border-4 border-[#283618] rounded-t-3xl text-xl sm:text-3xl font-black text-[#FEFAE0] whitespace-nowrap"
            >
                <Home size={28} />
            </button>

            {/* Dialogue UI - Full Screen Bottom Style */}
            <div className="absolute bottom-0 left-0 right-0 z-40 animate-fade-in-bottom pointer-events-none">
                <div className="relative w-full flex flex-col justify-end">
                    {/* Character Name Tag */}
                    <div className="relative ml-12">
                        <div
                            style={{ fontFamily: 'var(--font-nanum-pen)' }}
                            className="absolute bottom-full translate-y-1 left-0 px-8 py-3 bg-[#606C38] border-4 border-[#283618] rounded-t-3xl text-3xl font-black text-[#FEFAE0]"
                        >
                            Kakek Nusaka
                        </div>
                    </div>

                    {/* Full Width Dialogue Box - Cream/Paper Theme - Reduced height to avoid covering characters */}
                    <div className="bg-[#FEFAE0] border-t-4 border-[#283618] p-8 md:p-10 md:px-20 relative overflow-hidden pointer-events-auto w-full min-h-[200px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                        {/* Paper Texture Overlay */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }} />

                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <p
                                style={{ fontFamily: 'var(--font-nanum-pen)' }}
                                className="text-[#283618] text-5xl md:text-7xl leading-tight"
                            >
                                {displayText}
                                {isTyping && <span className="animate-pulse ml-2 inline-block w-4 h-12 bg-[#283618] vertical-middle" />}
                            </p>

                            <div className="flex justify-end mt-10">
                                <button
                                    onClick={handleNext}
                                    className="group flex items-center gap-6 bg-[#DDA15E] hover:bg-[#BC6C25] border-4 border-[#283618] px-12 py-5 rounded-2xl shadow-[8px_8px_0_#283618] active:translate-y-2 active:shadow-none transition-all cursor-pointer"
                                >
                                    <span style={{ fontFamily: 'var(--font-nanum-pen)' }} className="text-4xl md:text-5xl font-black text-[#FEFAE0]">
                                        {dialogStep === dialogs.length - 1 && dialogMode === 'intro' ? "Misi Baru!" : 
                                         dialogStep === dialogs.length - 1 && dialogMode === 'mission' && !showMissionOptions ? "Lanjutkan" : 
                                         (isTyping ? "Skip" : "Lanjut")}
                                    </span>
                                    <ChevronRight className="w-10 h-10 md:w-12 md:h-12 text-[#FEFAE0] group-hover:translate-x-2 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Dialog Box — fixed height, scrollable text */}
          <div
            className="bg-[#FEFAE0] border-t-4 border-[#283618] px-5 sm:px-10 md:px-20 pt-5 sm:pt-6 pb-4 sm:pb-5 relative pointer-events-auto w-full shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
            style={{ height: "clamp(160px, 30vh, 260px)" }}
          >
            {/* Paper texture */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none mix-blend-multiply"
              style={{
                backgroundImage:
                  'url("https://www.transparenttextures.com/patterns/paper-fibers.png")',
              }}
            />

            {/* Mission Options Overlay - New Design */}
            {showMissionOptions && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
                    <div className="relative bg-[#FEFAE0] border-4 border-[#283618] rounded-3xl p-6 md:p-8 max-w-md w-full mx-4 shadow-[8px_8px_0_#283618]">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowMissionOptions(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-[#283618]/10 rounded-full transition-colors"
                        >
                            <X size={24} className="text-[#283618]" />
                        </button>

                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#BC6C25] rounded-2xl border-4 border-[#283618] mb-4">
                                <Target size={32} className="text-white" />
                            </div>
                            <h2 
                                style={{ fontFamily: 'var(--font-nanum-pen)' }}
                                className="text-3xl font-bold text-[#283618]"
                            >
                                Misi Baru!
                            </h2>
                            <p className="text-[#606C38] mt-1">Penjaga Rimba</p>
                        </div>

                        {/* Mission Card */}
                        <div className="bg-[#BC6C25]/10 border-3 border-[#283618]/30 rounded-2xl p-4 mb-6" style={{ borderWidth: '3px' }}>
                            <div className="flex items-start gap-3">
                                <Compass size={20} className="text-[#BC6C25] mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-[#606C38] font-bold uppercase tracking-wider mb-1">Tujuan</p>
                                    <p className="text-[#283618] font-medium">
                                        Tangkap dan lindungi Orang Utan yang tersesat di hutan barat
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {/* Primary Action - Listen Story */}
                            <button
                                onClick={handleStartStory}
                                className="w-full group relative overflow-hidden bg-[#606C38] hover:bg-[#4A5A28] border-4 border-[#283618] rounded-2xl p-4 transition-all shadow-[4px_4px_0_#283618] hover:shadow-[2px_2px_0_#283618] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-[#FEFAE0] rounded-xl flex items-center justify-center border-3 border-[#283618]" style={{ borderWidth: '3px' }}>
                                        <BookOpen size={24} className="text-[#606C38]" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p 
                                            style={{ fontFamily: 'var(--font-nanum-pen)' }}
                                            className="text-xl font-bold text-[#FEFAE0]"
                                        >
                                            Dengar Dongeng
                                        </p>
                                        <p className="text-[#FEFAE0]/70 text-sm">
                                            + Terima Misi Otomatis
                                        </p>
                                    </div>
                                    <ChevronRight size={24} className="text-[#FEFAE0] group-hover:translate-x-1 transition-transform" />
                                </div>
                            </button>

                            {/* Secondary Action - Skip Story */}
                            <button
                                onClick={handleAcceptMissionDirect}
                                className="w-full group bg-[#D4A574]/30 hover:bg-[#D4A574]/50 border-3 border-[#283618]/50 rounded-2xl p-3 transition-all"
                                style={{ borderWidth: '3px' }}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <MapPin size={18} className="text-[#8B6914]" />
                                    <span 
                                        style={{ fontFamily: 'var(--font-nanum-pen)' }}
                                        className="text-[#8B6914] font-bold"
                                    >
                                        Lewati Dongeng, Langsung ke Hutan
                                    </span>
                                </div>
                            </button>
                        </div>

                        {/* Hint */}
                        <p className="text-center text-[#606C38]/60 text-sm mt-4">
                            💡 Dongeng akan menceritakan asal-usul Orang Utan
                        </p>
                    </div>
                </div>
            )}

            <style jsx global>{`
                @keyframes fade-in-bottom {
                    from { transform: translateY(100px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-fade-in-bottom {
                    animation: fade-in-bottom 0.8s ease-out forwards;
                }
                .vertical-middle {
                    vertical-align: middle;
                }
            `}</style>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in-bottom {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-fade-in-bottom {
          animation: fade-in-bottom 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
