'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Home, MapPin, Mountain, Wind, History, Shield, Volume2, VolumeX, Leaf } from 'lucide-react'
import { useTransitionStore } from '../../store/transitionStore'
import { auth } from '../../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

const storyPanels = [
    {
        id: 1,
        title: "Sang Penguasa Langit Biru",
        subtitle: "Bab 1: Jejak Sang Garuda",
        icon: History,
        scene: "Pegunungan Tanah Jawa",
        video: "/dongeng/elangjawa/Panel/Elangjawa1.mp4",
        accentColor: "#3B82F6",
        story: `Tahukah kamu, anak muda? Di puncak-puncak gunung tertinggi di tanah Jawa, hiduplah sang legenda yang kita kenal sebagai Elang Jawa.

Dengan jambul khasnya yang gagah, ia telah lama menjadi simbol keberanian dan kemandirian bagi bangsa kita, sang inspirasi di balik lambang Garuda Pancasila.

Dahulu, kepakan sayapnya yang perkasa menghiasi langit biru dari hutan-hutan Gunung Halimun hingga Gunung Salak. Ia adalah penguasa udara yang menjaga keseimbangan alam, memastikan hutan kita tetap sehat bagi seluruh makhluk hidup. Namun kini, bayangannya di langit semakin jarang terlihat...`,
    },
    {
        id: 2,
        title: "Harapan dalam Dekapan",
        subtitle: "Bab 2: Melindungi Masa Depan",
        icon: Shield,
        scene: "Sarang di Kanopi Rimba",
        video: "/dongeng/elangjawa/Panel/Elangjawa2.mp4",
        accentColor: "#F59E0B",
        story: `Namun, sang penguasa kini sedang berjuang. Elang Jawa adalah sosok yang sangat setia, namun mereka hanya menghasilkan satu butir telur setiap dua tahun sekali.

Lihatlah betapa telatennya sang induk menjaga harta karunnya yang berharga itu... Di dalam telur kecil itu, tersimpan masa depan spesiesnya.

Kini, tempat tinggal mereka semakin sempit. Hutan yang dulu luas telah terbelah-belah, dan ancaman dari mereka yang tak bertanggung jawab selalu mengintai. Tanpa bantuanmu, kepakan sayap terakhir sang legenda mungkin akan hilang selamanya dari cakrawala Jawa.

Dongeng ini belum selesai, anak muda... dan kamulah yang akan menulis bab selanjutnya untuk menyelamatkan sang Garuda.`,
    }
]

export default function DongengElangPage() {
    const router = useRouter()
    const { startTransition } = useTransitionStore()
    const [currentPanel, setCurrentPanel] = useState(0)
    const [displayText, setDisplayText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)

    const panel = storyPanels[currentPanel]
    const IconComponent = panel.icon

    // Auto-play video when panel changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0
            videoRef.current.play().catch(() => {
                // Autoplay prevented, user needs to interact
            })
        }
    }, [currentPanel])

    // Sync mute state
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted
        }
    }, [isMuted])

    // Typewriter Effect for story text
    useEffect(() => {
        let isCancelled = false
        const text = panel.story
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
                setTimeout(type, 15)
            } else {
                setIsTyping(false)
            }
        }

        type()
        return () => { isCancelled = true }
    }, [currentPanel])

    const handleNext = () => {
        if (isTyping) {
            setDisplayText(panel.story)
            setIsTyping(false)
        } else if (currentPanel < storyPanels.length - 1) {
            setCurrentPanel(prev => prev + 1)
        }
    }

    const handlePrev = () => {
        if (currentPanel > 0) {
            setCurrentPanel(prev => prev - 1)
        }
    }

    const handleClose = () => {
        startTransition(() => {
            router.push('/npc/kakek')
        })
    }

    const handleGoToMission = async () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('elangja_story_watched', 'true')
            localStorage.setItem('current_mission', 'elangjawa')
            localStorage.setItem('mission_status', 'active')
            localStorage.setItem('mission_objective', 'Temukan sarang Elang Jawa di puncak gunung')
            
            // Sync to Firestore if user is logged in
            const user = auth.currentUser
            if (user) {
                try {
                    await updateDoc(doc(db, 'players', user.uid), {
                        mission: 'elangjawa',
                        missionStatus: 'active',
                        missionObjective: 'Temukan sarang Elang Jawa di puncak gunung'
                    })
                } catch (e) {
                    console.error('Error saving mission to Firestore:', e)
                }
            }
        }
        startTransition(() => {
            router.push('/')
        })
    }

    const toggleMute = () => {
        setIsMuted(!isMuted)
    }

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#1a1a1a]">
            {/* Video Background - Full Screen */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    key={panel.video}
                    src={panel.video}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-[60vh] md:h-full object-cover"
                    onError={(e) => {
                        console.error('Video failed to load:', e)
                    }}
                />
                {/* Video Overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />
            </div>

            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-between items-center">
                <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all border border-white/20"
                >
                    <Home size={18} />
                    <span className="font-medium text-sm">Kembali</span>
                </button>

                {/* Panel Progress Dots */}
                <div className="flex items-center gap-3 px-5 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20">
                    {storyPanels.map((p, idx) => (
                        <button
                            key={p.id}
                            onClick={() => setCurrentPanel(idx)}
                            className={`w-3 h-3 rounded-full transition-all ${
                                idx === currentPanel
                                    ? 'bg-white scale-125 w-8'
                                    : 'bg-white/40 hover:bg-white/60'
                            }`}
                        />
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Mute Toggle */}
                    <button
                        onClick={toggleMute}
                        className="flex items-center gap-2 px-4 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-full text-white transition-all border border-white/20"
                    >
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    </button>
                    
                    <div 
                        className="px-4 py-2 bg-black/50 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-medium"
                        style={{ color: panel.accentColor }}
                    >
                        {currentPanel + 1} / {storyPanels.length}
                    </div>
                </div>
            </div>

            {/* Main Content - Story Overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-40">
                {/* Story Card */}
                <div className="bg-[#FEFAE0]/95 backdrop-blur-md border-t-4 border-[#283618] p-4 md:p-6">
                    {/* Paper Texture */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-multiply" 
                        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")' }} 
                    />
                    
                    <div className="relative z-10 max-w-5xl mx-auto">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-2">
                            <div 
                                className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl border-3 border-[#283618]"
                                style={{ backgroundColor: panel.accentColor, borderWidth: '3px' }}
                            >
                                <IconComponent size={20} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-xs font-bold text-[#606C38] uppercase tracking-wider">
                                        {panel.subtitle}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-[#606C38]" />
                                    <span className="text-xs text-[#606C38]/70">{panel.scene}</span>
                                </div>
                                <h1 
                                    style={{ fontFamily: 'var(--font-nanum-pen), cursive' }}
                                    className="text-xl md:text-3xl font-bold text-[#283618] leading-tight"
                                >
                                    {panel.title}
                                </h1>
                            </div>
                        </div>

                        {/* Story Text - Compact */}
                        <div className="mb-3 max-h-[120px] md:max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                            <p
                                style={{ fontFamily: 'var(--font-nanum-pen), cursive' }}
                                className="text-base md:text-lg text-[#5C4033] leading-relaxed whitespace-pre-line"
                            >
                                {displayText}
                                {isTyping && (
                                    <span className="animate-pulse ml-1 inline-block w-0.5 h-4 bg-[#5C4033]" />
                                )}
                            </p>
                        </div>

                        {/* Navigation Footer - Compact */}
                        <div className="flex items-center justify-between pt-3 border-t-2 border-[#283618]/20">
                            <button
                                onClick={handlePrev}
                                disabled={currentPanel === 0}
                                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-[#BC6C25]/20 hover:bg-[#BC6C25]/40 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-all text-[#283618] font-bold border-2 border-[#283618]/30 text-sm"
                            >
                                <ChevronLeft size={18} />
                                <span className="hidden sm:inline">Sebelumnya</span>
                            </button>

                            {/* Skip Button */}
                            {isTyping && (
                                <button
                                    onClick={() => {
                                        setDisplayText(panel.story)
                                        setIsTyping(false)
                                    }}
                                    className="px-3 py-1 text-[#606C38] hover:text-[#283618] font-semibold transition-colors text-sm"
                                >
                                    <ChevronRight size={16} />
                                    Skip
                                </button>
                            )}

                            {currentPanel === storyPanels.length - 1 ? (
                                <button
                                    onClick={handleGoToMission}
                                    className="flex items-center gap-2 px-5 py-2 md:px-6 md:py-3 bg-[#BC6C25] hover:bg-[#A05A1F] text-[#FEFAE0] rounded-lg transition-all font-bold border-3 border-[#283618] shadow-[3px_3px_0_#283618] hover:shadow-[1px_1px_0_#283618] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
                                    style={{ borderWidth: '3px' }}
                                >
                                    <span className="text-sm md:text-base">Mulai Petualangan!</span>
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="flex items-center gap-2 px-5 py-2 md:px-6 md:py-3 bg-[#606C38] hover:bg-[#4A5A28] text-[#FEFAE0] rounded-lg transition-all font-bold border-3 border-[#283618] shadow-[3px_3px_0_#283618] hover:shadow-[1px_1px_0_#283618] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
                                    style={{ borderWidth: '3px' }}
                                >
                                    <span className="text-sm md:text-base">{isTyping ? 'Skip' : 'Lanjut'}</span>
                                    <ChevronRight size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Panel Indicators */}
            <div className="absolute left-4 top-[45%] -translate-y-1/2 hidden lg:flex flex-col gap-4 z-30">
                {storyPanels.map((p, idx) => (
                    <button
                        key={p.id}
                        onClick={() => setCurrentPanel(idx)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border-3 ${
                            idx === currentPanel 
                                ? 'bg-[#FEFAE0] border-[#283618] scale-110' 
                                : 'bg-black/40 border-white/20 hover:bg-black/60'
                        }`}
                        style={{ borderWidth: '3px' }}
                    >
                        <p.icon 
                            size={20} 
                            className={idx === currentPanel ? 'text-[#283618]' : 'text-white'} 
                        />
                    </button>
                ))}
            </div>

            {/* Corner Decorations */}
            <div className="absolute top-24 left-4 hidden xl:block z-20">
                <Mountain size={36} className="text-[#3B82F6] opacity-20" />
            </div>
            <div className="absolute bottom-36 right-4 hidden xl:block z-20">
                <Wind size={36} className="text-[#F59E0B] opacity-20" />
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(40, 54, 24, 0.1);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(40, 54, 24, 0.3);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(40, 54, 24, 0.5);
                }
            `}</style>
        </div>
    )
}
