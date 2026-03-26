'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Home, MapPin, Trees, Mountain, Maximize2, Volume2, VolumeX, Leaf, PawPrint } from 'lucide-react'
import { useTransitionStore } from '../../store/transitionStore'
import { auth } from '../../../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

const storyPanels = [
    {
        id: 1,
        title: "Cahaya di Istana Hijau",
        subtitle: "Bab 1: Zaman Keemasan",
        icon: Trees,
        scene: "Hutan Purba Asia",
        video: "/dongeng/orangutan/Panel/Panel1.mp4",
        accentColor: "#10B981",
        story: `Dengarlah, anak muda... Jauh sebelum peta-peta modern digambar, dunia kita adalah hamparan hijau yang tak bertepi. Di masa itu, hiduplah para Penjaga Rimba.

Mereka bukan sekadar hewan, mereka adalah kerabat kita, berbagi 97% jalinan kehidupan yang sama dalam DNA mereka.

Lihatlah ke atas kanopi itu! Itulah Zaman Keemasan. Pohon-pohon raksasa setinggi langit menjadi istana mereka. Di sana, hiduplah tiga bersaudara: Kala yang kekar, Sumara yang ramping, dan si bungsu Tapa yang berbulu keriting.

Mereka adalah penguasa "jembatan alam". Tahukah kalian? Di masa purba itu, leluhur mereka menjelajahi daratan yang sangat luas, mulai dari China Selatan hingga Vietnam. Mereka hidup bebas di bawah sinar matahari yang menembus celah daun, berayun dengan tangan-tangan panjang yang kuat. Namun, alam mulai berbisik tentang perubahan besar...`,
    },
    {
        id: 2,
        title: "Langkah di Atas Tanah Harapan",
        subtitle: "Bab 2: Migrasi Besar",
        icon: MapPin,
        scene: "Paparan Sunda",
        video: "/dongeng/orangutan/Panel/Panel2.mp4",
        accentColor: "#D4A574",
        story: `Suatu ketika, hutan mulai mengering. Kelompok besar Penjaga Rimba ini harus membuat keputusan yang berani: Migrasi Besar.

Mereka turun dari singgasana pohon dan mulai berjalan di atas tanah — sesuatu yang sangat melelahkan bagi kaum mereka.

Bayangkan barisan panjang itu... Induk-induk menggendong bayi mereka erat-erat di punggung. Mereka melintasi Paparan Sunda, daratan luas yang dulu menyambungkan Asia dengan pulau-pulau kita saat air laut masih surut di zaman es.

Angin kencang menerpa bulu merah mereka, membawa aroma laut dari selatan. Meski lelah, mata mereka tetap menatap cakrawala dengan tekad baja. Mereka mencari rumah baru di mana pohon-pohon selalu berbuah.

Namun, takdir memiliki rencana lain...`,
    },
    {
        id: 3,
        title: "Perpisahan di Tepi Tiga Dunia",
        subtitle: "Bab 3: Perpisahan Tiga Saudara",
        icon: Mountain,
        scene: "Nusantara",
        video: "/dongeng/orangutan/Panel/Panel3.mp4",
        accentColor: "#8B6914",
        story: `Saat mereka tiba di tanah Nusantara, air laut mulai naik perlahan, menenggelamkan daratan yang mereka lalui. Tiga bersaudara itu menyadari bahwa mereka harus berpisah agar seluruh kaumnya bisa bertahan hidup.

Di tepi hutan rawa yang luas, Kala berhenti. "Aku akan menjaga tempat ini," ucapnya. Ia menetap di Kalimantan, tumbuh menjadi raksasa yang kekar dengan bantalan pipi yang gagah.

Sumara memilih perbukitan hijau yang rimbun. "Aku akan memanjat hingga ke puncak tertinggi," katanya. Ia pergi ke Sumatra, menjadi sosok yang lebih ramping dan lincah agar mudah berpindah di antara dahan yang rapat.

Dan si bungsu Tapa, ia memilih hutan pegunungan yang berkabut dan dingin di Batang Toru. Dengan bulu yang lebih keriting untuk menahan hawa sejuk, ia menjadi penjaga rahasia yang baru kita temukan kembali identitasnya di tahun 2017.

Mereka saling bertukar tatap untuk terakhir kalinya sebelum laut benar-benar memisahkan pulau-pulau itu. Sejak saat itulah, satu keluarga besar itu terbagi menjadi tiga spesies yang berbeda.

───

Kini, ketiga bersaudara itu sedang menangis. Rumah yang mereka perjuangkan ribuan tahun lalu kini perlahan sirna karena api dan mesin manusia. Mereka berstatus Kritis, selangkah lagi menuju keheningan abadi.

Ingatlah, mereka adalah "Petani Hutan". Tanpa mereka yang menyebarkan biji-bijian, hutan kita akan mati. Dan jika hutan mati, kita pun akan kehilangan napas.

Dongeng ini belum selesai, anak muda... dan kamulah yang akan menulis bab selanjutnya.`,
    }
]

export default function DongengOrangutanPage() {
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
        const user = auth.currentUser
        if (user) {
            try {
                await updateDoc(doc(db, 'players', user.uid), {
                    currentMission: 'orangutan'
                })
            } catch (e) {
                console.error('Error saving mission to Firestore:', e)
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

                        {/* Story Text - Compact, scrollable */}
                        <div className="mb-3 overflow-y-auto pr-2 custom-scrollbar" style={{ maxHeight: 'clamp(80px, 22vh, 150px)' }}>
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
                <Leaf size={36} className="text-[#10B981] opacity-20" />
            </div>
            <div className="absolute bottom-36 right-4 hidden xl:block z-20">
                <PawPrint size={36} className="text-[#10B981] opacity-20" />
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
