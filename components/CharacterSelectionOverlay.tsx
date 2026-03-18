'use client'

import { useJoystickStore } from '../app/game/store'
import { useCreatureStore } from '../app/nusadex/store'
import { User, Play, Plus, PawPrint, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransitionStore } from '../app/store/transitionStore'

const elementBg: Record<string, string> = {
    Angin: 'bg-[#BAE6FD]',
    Tanah: 'bg-[#D9F5D0]',
    Air: 'bg-[#BFDBFE]',
}

export default function CharacterSelectionOverlay() {
    const { playerName, setMenuState } = useJoystickStore()
    const { firstPartner } = useCreatureStore()
    const router = useRouter()
    const { startTransition, finishTransition } = useTransitionStore()

    const handleLogout = async () => {
        const { auth } = await import('../lib/firebase');
        await auth.signOut();
        setMenuState('auth');
        useCreatureStore.getState().reset();
    }

    const handleEnterGame = () => {
        startTransition(() => {
            setMenuState('playing');
            setTimeout(() => {
                finishTransition();
            }, 800);
        });
    }

    const cardBg = firstPartner ? (elementBg[firstPartner.element] || 'bg-[#FEF08A]') : 'bg-[#FEF08A]'

    return (
        <div
            className="flex flex-col items-center gap-8 sm:gap-10 animate-in fade-in zoom-in duration-700 pointer-events-auto w-full max-w-xl sm:max-w-2xl px-4 sm:px-6 py-8 sm:py-12"
            style={{ fontFamily: 'var(--font-nanum-pen)' }}
        >
            {/* Header */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <div className="h-[2px] w-8 sm:w-12 bg-[#374151]/20" />
                    <Sparkles className="text-[#D97706] w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
                    <div className="h-[2px] w-8 sm:w-12 bg-[#374151]/20" />
                </div>
                <h2 className="text-5xl sm:text-7xl md:text-8xl text-[#374151] drop-shadow-[4px_4px_0_rgba(255,255,255,0.8)] leading-tight px-2">
                    Pilih Penjelajah
                </h2>
                <p className="text-[#374151]/60 font-sans tracking-[0.3em] sm:tracking-[0.4em] text-[10px] sm:text-sm uppercase font-black">
                    SIAPA YANG AKAN BERPETUALANG HARI INI?
                </p>
            </div>

            {/* Card Area */}
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 w-full">
                {playerName ? (
                    <button
                        onClick={handleEnterGame}
                        className="group relative w-full max-w-sm transition-all duration-300 hover:scale-[1.03] active:translate-y-1"
                    >
                        <div className={`${cardBg} rounded-[36px] sm:rounded-[48px] border-4 sm:border-8 border-[#374151] p-6 sm:p-10 flex flex-col items-center gap-6 sm:gap-8 overflow-hidden relative shadow-[8px_8px_0_#374151] sm:shadow-[12px_12px_0_#374151] w-full`}>
                            {/* Decorative blob */}
                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/40 rounded-full blur-3xl group-hover:bg-white/60 transition-colors" />

                            {/* Avatar */}
                            <div className="w-24 h-24 sm:w-36 sm:h-36 rounded-2xl sm:rounded-3xl bg-white border-[3px] sm:border-4 border-[#374151] flex items-center justify-center shadow-[4px_4px_0_#374151] sm:shadow-[6px_6px_0_#374151] relative z-10 rotate-[-3deg] group-hover:rotate-[3deg] transition-transform">
                                <User className="w-14 h-14 sm:w-20 sm:h-20 text-[#374151]" />
                            </div>

                            {/* Info */}
                            <div className="text-center relative z-10 w-full px-1">
                                <p className="text-4xl sm:text-6xl md:text-7xl text-[#374151] mb-2 group-hover:text-[#D97706] transition-colors truncate">
                                    {playerName}
                                </p>
                                <div className="flex flex-col items-center gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2 bg-white/50 px-3 sm:px-4 py-1.5 rounded-2xl border-2 sm:border-[3px] border-[#374151] rotate-1">
                                        <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-[#68D77B] animate-pulse" />
                                        <p className="text-[#374151] text-xs sm:text-sm font-sans uppercase tracking-[0.2em] font-black">
                                            Data Tersimpan
                                        </p>
                                    </div>
                                    {firstPartner && (
                                        <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl border-2 sm:border-[3px] border-[#374151] -rotate-1 shadow-[3px_3px_0_#374151] sm:shadow-[4px_4px_0_#374151]">
                                            <PawPrint className="w-4 sm:w-5 h-4 sm:h-5 text-[#374151]" />
                                            <p className="text-[#374151] text-lg sm:text-xl font-bold">
                                                {firstPartner.nickname || firstPartner.name}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="w-full h-14 sm:h-18 bg-[#68D77B] hover:bg-[#5bbd6b] rounded-xl sm:rounded-2xl border-[3px] sm:border-4 border-[#374151] flex items-center justify-center gap-3 sm:gap-4 text-[#374151] font-black font-sans text-xl sm:text-2xl shadow-[4px_4px_0_#374151] sm:shadow-[6px_6px_0_#374151] active:shadow-none active:translate-y-1 transition-all cursor-pointer">
                                <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
                                <span>MASUK WORLD</span>
                            </div>
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={() => startTransition(() => router.push('/create-character'))}
                        className="group relative w-full max-w-[300px] sm:max-w-sm transition-all duration-300 hover:scale-[1.03] active:translate-y-1"
                    >
                        <div className="bg-white rounded-[36px] sm:rounded-[40px] border-4 sm:border-5 border-[#374151] p-6 sm:p-8 flex flex-col items-center gap-5 sm:gap-6 overflow-hidden relative shadow-[8px_8px_0_#374151] sm:shadow-[10px_10px_0_#374151]">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-gray-100 border-[3px] sm:border-[4px] border-dashed border-[#374151]/40 flex items-center justify-center relative z-10 group-hover:rotate-[-2deg] transition-transform">
                                <Plus className="w-12 h-12 sm:w-16 sm:h-16 text-[#374151]/40" />
                            </div>

                            <div className="text-center relative z-10">
                                <p className="text-4xl sm:text-5xl text-[#374151]/40 mb-1">
                                    Karakter Baru
                                </p>
                                <p className="text-[#374151]/30 text-xs sm:text-sm font-sans uppercase tracking-widest font-black">
                                    Mulai Kisahmu
                                </p>
                            </div>

                            <div className="w-full h-13 sm:h-16 bg-white border-[3px] sm:border-4 border-[#374151] rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 sm:gap-3 text-[#374151] font-black font-sans text-lg sm:text-xl shadow-[3px_3px_0_#374151] sm:shadow-[4px_4px_0_#374151] group-hover:bg-gray-50 transition-colors">
                                <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                                <span>BUAT BARU</span>
                            </div>
                        </div>
                    </button>
                )}
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="mt-2 sm:mt-4 flex items-center gap-2 text-xl sm:text-2xl md:text-3xl text-[#374151]/50 hover:text-[#D97706] transition-all font-black underline underline-offset-4 decoration-[#D97706]/20 cursor-pointer"
            >
                Keluar & Ganti Akun
            </button>
        </div>
    )
}
