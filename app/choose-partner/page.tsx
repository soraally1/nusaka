'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
    Loader2, ChevronRight, ChevronLeft, Sparkles,
    PawPrint, Star, Wind, Leaf, Droplets,
    Heart, Zap, Sun, Flame, Mountain, Bird,
    Check, Pencil, MapPin, Shield,
} from 'lucide-react'
import { NUSA_CREATURES, type Creature } from '../nusadex/creatures'
import { useCreatureStore } from '../nusadex/store'
import { useTransitionStore } from '../store/transitionStore'
import { useJoystickStore } from '../game/store'

const Creature3D = dynamic(() => import('../nusadex/Creature3D'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#374151]/40" />
        </div>
    ),
})

// Element color & icon map
const elementBg: Record<string, string> = {
    Angin: 'bg-[#BAE6FD]',
    Tanah: 'bg-[#D9F5D0]',
    Air: 'bg-[#BFDBFE]',
}
const elementAccent: Record<string, string> = {
    Angin: '#38BDF8',
    Tanah: '#68D77B',
    Air: '#60A5FA',
}
// JSX icon components per element
const ElementIcon = ({ element, className }: { element: string; className?: string }) => {
    if (element === 'Angin') return <Wind className={className} />
    if (element === 'Tanah') return <Leaf className={className} />
    if (element === 'Air') return <Droplets className={className} />
    return <Sparkles className={className} />
}

// Decorative scatter icons for the reveal screen
const SCATTER_ICONS = [Star, Sparkles, Zap, Heart, Leaf, Wind, Droplets, Sun]

// Steps
type Step = 'intro' | 'choose' | 'name' | 'reveal'

export default function ChoosePartnerPage() {
    const router = useRouter()
    const { startTransition } = useTransitionStore()
    const { setFirstPartner, hasChosenPartner } = useCreatureStore()

    const [step, setStep] = useState<Step>('intro')
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [nickname, setNickname] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const STARTER_IDS = [1, 2, 3] // Elang Jawa, Komodo, OrangUtan
    const creatures = NUSA_CREATURES.filter(c => STARTER_IDS.includes(c.id))

    // If already chosen, redirect only if entering directly
    useEffect(() => {
        if (hasChosenPartner && step === 'intro') {
            router.replace('/')
        }
    }, [hasChosenPartner, step, router])

    const selectedCreature: Creature | null =
        selectedIndex !== null ? creatures[selectedIndex] : null

    /* ── Handlers ───────────────────────────────── */
    const handleSelectCreature = (index: number) => {
        setSelectedIndex(index)
        setNickname(creatures[index].name)
    }

    const handleConfirmChoice = () => {
        if (selectedIndex === null) return
        setStep('name')
    }

    const handleSave = async () => {
        if (!selectedCreature) return
        setIsSaving(true)
        const partner = {
            ...selectedCreature,
            nickname: nickname.trim() || selectedCreature.name,
        }
        
        try {
            const { db, auth } = await import('../../lib/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            const user = auth.currentUser;
            // Build the partner with an instanceId (matches setFirstPartner logic)
            const partnerWithId = {
                ...partner,
                level: 1,
                exp: 0,
                instanceId: `starter-${selectedCreature.id}-${Date.now()}`,
            };
            if (user) {
                await updateDoc(doc(db, 'players', user.uid), {
                    partner: partnerWithId,
                    capturedCreatures: [partnerWithId],
                });
            }
            setFirstPartner(partnerWithId)
            setStep('reveal')
        } catch (err) {
            console.error('Error saving partner:', err);
            // Fallback to local store only if firestore fails
            setFirstPartner(partner)
            setStep('reveal')
        } finally {
            setIsSaving(false)
        }
    }

    const handleFinish = () => {
        useJoystickStore.getState().setMenuState('playing')
        window.location.href = '/'
    }

    /* ── STEP: INTRO ────────────────────────────── */
    if (step === 'intro') {
        return (
            <div
                className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-[#FFF9E6]"
                style={{ fontFamily: 'var(--font-nanum-pen)' }}
            >
                {/* Dot grid bg */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '24px 24px' }}
                />

                {/* Decorative scatter icons */}
                <Leaf className="absolute top-10 right-14 w-10 h-10 text-[#374151] opacity-20 rotate-12" />
                <Mountain className="absolute bottom-16 left-10 w-12 h-12 text-[#374151] opacity-15 -rotate-6" />
                <Star className="absolute top-24 left-16 w-8 h-8 text-[#374151] opacity-20 rotate-6" />
                <Wind className="absolute bottom-24 right-20 w-8 h-8 text-[#374151] opacity-15 rotate-3" />

                <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-xl gap-6">
                    {/* Icon badge */}
                    <div className="relative">
                        <div className="w-28 h-28 bg-[#FEF08A] border-[5px] border-[#374151] rounded-[32px] shadow-[6px_6px_0_#374151] flex items-center justify-center animate-bounce">
                            <PawPrint className="w-14 h-14 text-[#374151]" strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-3 -right-3 w-9 h-9 bg-white border-[3px] border-[#374151] rounded-full flex items-center justify-center shadow-[2px_2px_0_#374151]">
                            <Sparkles className="w-4 h-4 text-[#D97706]" />
                        </div>
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black text-[#374151] leading-tight">
                        Selamat Datang,<br />
                        <span className="text-[#D97706]">Penjelajah!</span>
                    </h1>

                    <div className="bg-white border-[4px] border-[#374151] rounded-[24px] shadow-[6px_6px_0_#374151] p-5 text-left">
                        <p className="text-2xl sm:text-3xl text-[#374151] leading-relaxed">
                            Nusantara menyimpan makhluk-makhluk luar biasa yang menunggu untuk berpetualang bersamamu.
                        </p>
                        <p className="text-2xl sm:text-3xl text-[#374151] mt-3 leading-relaxed">
                            Setiap penjelajah sejati memulai dengan satu <strong>partner setia</strong>. Saatnya kamu memilih!
                        </p>
                    </div>

                    <button
                        onClick={() => setStep('choose')}
                        className="group flex items-center gap-3 bg-[#374151] text-white text-4xl font-black px-8 py-4 rounded-[20px] shadow-[6px_6px_0_#D97706] hover:-translate-y-1 hover:shadow-[6px_10px_0_#D97706] transition-all"
                    >
                        <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                        Pilih Partner
                        <ChevronRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        )
    }

    /* ── STEP: CHOOSE ───────────────────────────── */
    if (step === 'choose') {
        return (
            <div
                className="relative w-screen min-h-screen overflow-auto flex flex-col items-center bg-[#FFF9E6] pb-16 pt-10"
                style={{ fontFamily: 'var(--font-nanum-pen)' }}
            >
                {/* Dot grid bg */}
                <div
                    className="fixed inset-0 z-0 pointer-events-none opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '24px 24px' }}
                />

                <div className="relative z-10 w-full max-w-5xl px-4 sm:px-8 flex flex-col items-center gap-8">
                    {/* Back button */}
                    <div className="w-full flex items-center">
                        <button
                            onClick={() => setStep('intro')}
                            className="flex items-center gap-2 text-[#374151] text-2xl font-black hover:text-[#D97706] transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6" />
                            Kembali
                        </button>
                    </div>

                    {/* Header */}
                    <div className="text-center">
                        <h1 className="text-5xl sm:text-7xl font-black text-[#374151]">Pilih Partner-mu!</h1>
                        <p className="text-2xl text-[#374151]/70 mt-2">Pilih satu makhluk Nusantara untuk menemanimu</p>
                    </div>

                    {/* Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                        {creatures.map((creature, i) => {
                            const isSelected = selectedIndex === i
                            const bgClass = elementBg[creature.element] || 'bg-[#E5E7EB]'
                            return (
                                <button
                                    key={creature.id}
                                    onClick={() => handleSelectCreature(i)}
                                    className={`relative flex flex-col rounded-[32px] border-[5px] transition-all duration-200 overflow-hidden group text-left
                                        ${isSelected
                                            ? 'border-[#374151] shadow-[8px_8px_0_#D97706] -translate-y-2'
                                            : 'border-[#374151] shadow-[6px_6px_0_#374151] hover:-translate-y-1 hover:shadow-[6px_8px_0_#374151]'
                                        }`}
                                >
                                    {/* Selected badge */}
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 z-10 bg-[#D97706] text-white text-xl font-black px-3 py-1 rounded-xl border-[2px] border-[#374151] shadow-[2px_2px_0_#374151] rotate-3 flex items-center gap-1.5">
                                            <Check className="w-4 h-4" strokeWidth={3} />
                                            Dipilih
                                        </div>
                                    )}

                                    {/* Number badge */}
                                    <div className="absolute top-3 left-3 z-10 bg-white text-[#374151] text-xl font-black px-2 py-0.5 rounded-lg border-[2px] border-[#374151] shadow-[2px_2px_0_#374151]">
                                        #{creature.id.toString().padStart(3, '0')}
                                    </div>

                                    {/* 3D Model */}
                                    <div className={`w-full aspect-square ${bgClass} border-b-[4px] border-[#374151]`}>
                                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#374151]/40" /></div>}>
                                            <Creature3D
                                                modelUrl={creature.modelUrl}
                                                autoRotate={true}
                                                scale={creature.scale || 1}
                                                position={creature.position || [0, 0, 0]}
                                            />
                                        </Suspense>
                                    </div>

                                    {/* Info */}
                                    <div className="bg-white p-4 flex flex-col gap-2">
                                        <h2 className="text-4xl font-black text-[#374151]">{creature.name}</h2>
                                        <div className="flex items-center gap-2">
                                            <ElementIcon element={creature.element} className="w-5 h-5 text-[#374151]/60" />
                                            <span className="text-2xl font-bold text-[#374151]/70">{creature.element}</span>
                                            <span className="ml-auto bg-[#FEF08A] border-[2px] border-[#374151] px-3 py-0.5 rounded-xl text-lg font-black text-[#374151]">
                                                {creature.type}
                                            </span>
                                        </div>
                                        <p className="text-xl text-[#374151]/70 leading-snug line-clamp-3">
                                            {creature.description}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Confirm */}
                    <button
                        onClick={handleConfirmChoice}
                        disabled={selectedIndex === null}
                        className="flex items-center gap-3 bg-[#374151] text-white text-4xl font-black px-10 py-4 rounded-[20px] shadow-[6px_6px_0_#D97706] hover:-translate-y-1 hover:shadow-[6px_10px_0_#D97706] transition-all disabled:opacity-40 disabled:pointer-events-none mt-2"
                    >
                        {selectedIndex !== null ? (
                            <>
                                Pilih {creatures[selectedIndex].name}!
                                <ChevronRight className="w-7 h-7" />
                            </>
                        ) : (
                            <>
                                <PawPrint className="w-6 h-6 opacity-50" />
                                Pilih dulu...
                            </>
                        )}
                    </button>
                </div>
            </div>
        )
    }

    /* ── STEP: NAME ─────────────────────────────── */
    if (step === 'name' && selectedCreature) {
        const bgClass = elementBg[selectedCreature.element] || 'bg-[#E5E7EB]'
        return (
            <div
                className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-[#FFF9E6]"
                style={{ fontFamily: 'var(--font-nanum-pen)' }}
            >
                {/* Dot grid */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '24px 24px' }}
                />

                {/* LEFT/TOP: 3D Model */}
                <div className={`w-full h-[40%] md:w-1/2 md:h-full ${bgClass} border-b-[5px] md:border-b-0 md:border-r-[5px] border-[#374151] relative`}>
                    <div className="absolute inset-0">
                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-[#374151]/40" /></div>}>
                            <Creature3D
                                modelUrl={selectedCreature.modelUrl}
                                autoRotate={true}
                                scale={(selectedCreature.scale || 1) * 1.3}
                                position={selectedCreature.position || [0, 0, 0]}
                            />
                        </Suspense>
                    </div>
                    {/* Element badge overlay */}
                    <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white border-[3px] border-[#374151] px-4 md:px-5 py-1 md:py-2 rounded-2xl shadow-[4px_4px_0_#374151]">
                        <ElementIcon element={selectedCreature.element} className="w-5 h-5 md:w-6 md:h-6 text-[#374151]" />
                        <span className="text-2xl md:text-3xl font-black text-[#374151]">{selectedCreature.element}</span>
                    </div>
                </div>

                {/* RIGHT/BOTTOM: Name Form */}
                <div className="w-full h-[60%] md:w-1/2 md:h-full flex flex-col justify-start md:justify-center px-6 sm:px-14 py-6 md:py-0 gap-4 md:gap-6 relative z-10 overflow-y-auto">
                    <div>
                        <p className="text-xl md:text-2xl text-[#374151]/60 font-bold uppercase tracking-widest flex items-center gap-2">
                            <Star className="w-4 h-4 md:w-5 md:h-5" />
                            Partner Pertamamu
                        </p>
                        <h1 className="text-4xl sm:text-7xl font-black text-[#374151] leading-tight">{selectedCreature.name}</h1>
                    </div>

                    <div className="bg-white border-[4px] border-[#374151] rounded-[24px] shadow-[6px_6px_0_#374151] p-4 md:p-5">
                        <div className="flex items-start gap-2">
                            <MapPin className="w-5 h-5 md:w-6 md:h-6 text-[#374151]/50 mt-1 shrink-0" />
                            <p className="text-xl md:text-2xl text-[#374151] leading-relaxed line-clamp-4 md:line-clamp-none">
                                {selectedCreature.description}
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-2xl md:text-3xl font-black text-[#374151] mb-1 md:mb-2 flex items-center gap-2">
                            <Pencil className="w-6 h-6 md:w-7 md:h-7" />
                            Beri nama panggilannya!
                        </p>
                        <input
                            type="text"
                            value={nickname}
                            onChange={e => setNickname(e.target.value)}
                            placeholder={selectedCreature.name}
                            maxLength={16}
                            className="w-full bg-transparent border-b-[4px] border-[#374151] text-[#374151] text-4xl md:text-5xl placeholder-[#374151]/30 focus:outline-none pb-1 md:pb-2 transition-colors"
                            style={{ fontFamily: 'var(--font-nanum-pen)' }}
                        />
                        <p className="text-lg md:text-xl text-[#374151]/50 mt-1">{nickname.length}/16 karakter</p>
                    </div>

                    <div className="flex gap-4 mt-2 mb-6">
                        <button
                            onClick={() => { setStep('choose'); setSelectedIndex(null) }}
                            className="text-[#374151]/70 text-2xl md:text-3xl font-black hover:text-[#374151] transition-colors flex items-center gap-1"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            Ganti
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-[#374151] text-white text-3xl md:text-4xl font-black px-6 md:px-8 py-2 md:py-3 rounded-[20px] shadow-[6px_6px_0_#D97706] hover:-translate-y-1 hover:shadow-[6px_10px_0_#D97706] transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                            {isSaving
                                ? <><Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> Menyimpan...</>
                                : <>Jadikan Partner! <Heart className="w-5 h-5 md:w-6 md:h-6" /></>
                            }
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    /* ── STEP: REVEAL ───────────────────────────── */
    if (step === 'reveal' && selectedCreature) {
        const bgClass = elementBg[selectedCreature.element] || 'bg-[#E5E7EB]'
        const accentColor = elementAccent[selectedCreature.element] || '#374151'
        const displayName = nickname.trim() || selectedCreature.name

        return (
            <div
                className="relative w-screen h-screen overflow-hidden flex flex-col items-center justify-center bg-[#FFF9E6] gap-8"
                style={{ fontFamily: 'var(--font-nanum-pen)' }}
            >
                {/* Dot grid */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '24px 24px' }}
                />

                {/* Scatter icon decorations */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {SCATTER_ICONS.map((Icon, i) => (
                        <Icon
                            key={i}
                            className="absolute animate-bounce text-[#374151]"
                            style={{
                                left: `${8 + i * 12}%`,
                                top: `${6 + (i % 3) * 16}%`,
                                animationDelay: `${i * 0.18}s`,
                                animationDuration: `${1.4 + (i % 3) * 0.4}s`,
                                opacity: 0.18,
                                width: 32,
                                height: 32,
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 flex flex-col items-center text-center gap-4 md:gap-6 max-w-lg px-6 py-8 md:py-0 overflow-y-auto">
                    <p className="text-2xl md:text-3xl font-bold text-[#374151]/60 uppercase tracking-widest flex items-center gap-2">
                        <Star className="w-5 h-5 md:w-6 md:h-6" />
                        Partner Pertamamu adalah
                        <Star className="w-5 h-5 md:w-6 md:h-6" />
                    </p>

                    {/* Creature Card */}
                    <div className={`w-40 h-40 sm:w-64 sm:h-64 ${bgClass} border-[4px] md:border-[5px] border-[#374151] rounded-[24px] md:rounded-[32px] shadow-[6px_6px_0_#374151] md:shadow-[8px_8px_0_#374151] relative overflow-hidden shrink-0`}>
                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#374151]/40" /></div>}>
                            <Creature3D
                                modelUrl={selectedCreature.modelUrl}
                                autoRotate={true}
                                scale={(selectedCreature.scale || 1) * 1.2}
                                position={selectedCreature.position || [0, 0, 0]}
                            />
                        </Suspense>
                    </div>

                    <div>
                        <h1 className="text-5xl sm:text-8xl font-black text-[#374151]" style={{ textShadow: `4px 4px 0 ${accentColor}` }}>
                            {displayName}
                        </h1>
                        {displayName !== selectedCreature.name && (
                            <p className="text-xl md:text-2xl text-[#374151]/60 mt-1 flex items-center justify-center gap-1">
                                <PawPrint className="w-4 h-4" />
                                {selectedCreature.name}
                            </p>
                        )}
                    </div>

                    <div className="bg-white border-[4px] border-[#374151] rounded-[24px] shadow-[6px_6px_0_#374151] p-4 md:p-5">
                        <p className="text-xl md:text-3xl text-[#374151] leading-relaxed flex items-start gap-2 md:gap-3 text-left md:text-center">
                            <Heart className="w-6 h-6 md:w-7 md:h-7 shrink-0 mt-1 text-[#F87171]" />
                            Selamat! <strong>{displayName}</strong> senang bisa bertemu denganmu. Petualangan Nusantara kalian dimulai!
                        </p>
                    </div>

                    <button
                        onClick={handleFinish}
                        className="group flex items-center gap-3 bg-[#374151] text-white text-3xl md:text-4xl font-black px-8 md:px-10 py-3 md:py-4 rounded-[20px] shadow-[6px_6px_0_#D97706] hover:-translate-y-1 hover:shadow-[6px_10px_0_#D97706] transition-all whitespace-nowrap"
                    >
                        Mulai Petualangan!
                        <ChevronRight className="w-6 h-6 md:w-7 md:h-7 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        )
    }

    return null
}
