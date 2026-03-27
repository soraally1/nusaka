'use client'

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Loader2, Sparkles, PawPrint, Star, Wind, Leaf, Droplets, Shield, MapPin, Plus, MoveLeft } from 'lucide-react';
import { useJoystickStore } from '../game/store';
import { useTransitionStore } from '@/app/store/transitionStore';
import CharacterViewer from '@/components/CharacterViewer';
import TrainerInfo from '@/components/CharacterInfo';
import PokemonGrid from '@/components/HewanFlex';
import { useCreatureStore, type CreatureState } from '../nusadex/store';

const Creature3D = dynamic(() => import('../nusadex/Creature3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#374151]/40" />
    </div>
  ),
});

const elementBg: Record<string, string> = {
  Angin: 'bg-[#BAE6FD]',
  Tanah: 'bg-[#D9F5D0]',
  Air: 'bg-[#BFDBFE]',
};

const ElementIcon = ({ element, className }: { element: string; className?: string }) => {
  if (element === 'Angin') return <Wind className={className} />;
  if (element === 'Tanah') return <Leaf className={className} />;
  if (element === 'Air') return <Droplets className={className} />;
  return <Sparkles className={className} />;
};

export default function ProfilePage() {
  const router = useRouter();
  const { startTransition, finishTransition } = useTransitionStore();
  const playerName = useJoystickStore(s => s.playerName);
  const capturedCreatures = useCreatureStore((state: CreatureState) => state.capturedCreatures);
  const firstPartner = useCreatureStore((state: CreatureState) => state.firstPartner);

  const [mounted, setMounted] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  useEffect(() => { setMounted(true) }, []);

  const trainerName = mounted ? (playerName || 'Penjelajah') : '...';
  const displayPokemons = mounted ? capturedCreatures : [];
  const partner = mounted ? firstPartner : null;

  const handleLogout = async () => {
    startTransition(async () => {
      const { auth } = await import('@/lib/firebase');
      await auth.signOut();
      useJoystickStore.getState().reset();
      useCreatureStore.getState().reset();
      router.push('/');
      // Transition will be finished by GlobalTransition on path change
    });
  };

  return (
    <div
      className="min-h-screen bg-[#FFF9E6] p-0 md:p-6 lg:p-8 flex flex-col relative"
      style={{ fontFamily: 'var(--font-nanum-pen)' }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.08]"
        style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '24px 24px' }}
      />

      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="mb-0 md:mb-6 flex items-center justify-between border-b-[4px] border-[#374151] p-4 md:p-0 md:pb-4 bg-[#FFF9E6] sticky top-0 z-50">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => {
              startTransition(() => router.push('/'));
              // Safety: force-finish transition after 1.5s in case path-change listener misses it
              setTimeout(() => finishTransition(), 1500);
            }}
              className="w-12 h-12 md:w-16 md:h-16 bg-white border-4 border-[#374151] rounded-full flex items-center justify-center hover:bg-[#FEF08A] hover:scale-110 transition-transform text-[#374151] text-4xl md:text-5xl font-black cursor-pointer"
            >
              <MoveLeft />
            </button>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-[#374151] tracking-tight mt-1 md:mt-3">
              Info Penjelajah
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 md:gap-6 lg:gap-8 flex-1">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col gap-0 md:gap-6 border-b-4 border-[#374151] md:border-none">
            {/* Character Viewer */}
            <div className="bg-[#FEF08A] border-b-4 md:border-4 border-[#374151] md:rounded-[32px] p-4 md:p-5 relative group">
              <h2 className="text-[#374151] text-3xl font-black uppercase mb-3 tracking-widest pl-2 md:pl-0 flex items-center gap-3">
                <span className="bg-white border-[3px] border-[#374151] rounded-xl px-3 py-1 rotate-[-4deg] inline-block group-hover:rotate-[4deg] transition-transform">
                  <Sparkles className="w-6 h-6 text-[#D97706]" />
                </span>
                Penampilan
              </h2>
              <div className="bg-white border-[4px] border-[#374151] rounded-2xl md:rounded-3xl overflow-hidden isolate">
                <CharacterViewer />
              </div>
            </div>

            <TrainerInfo
              name={trainerName}
              pokemonCount={displayPokemons.length}
            />

            {/* ── First Partner Card ─────────────────── */}
            {partner && (
              <div className="bg-white border-b-4 md:border-4 border-[#374151] md:rounded-[32px] p-4 md:p-5 relative group overflow-hidden">
                {/* Top badge */}
                <div className="absolute -top-1 right-4 bg-[#D97706] text-white text-base font-black px-3 py-0.5 rounded-b-xl border-x-[3px] border-b-[3px] border-[#374151] shadow-[2px_2px_0_#374151] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" strokeWidth={3} />
                  PARTNER PERTAMA
                </div>

                <h2 className="text-[#374151] text-3xl font-black uppercase mb-3 tracking-widest pl-2 md:pl-0 flex items-center gap-3 mt-4">
                  <span className="bg-[#FEF08A] border-[3px] border-[#374151] rounded-xl px-3 py-1 rotate-[-4deg] inline-block group-hover:rotate-[4deg] transition-transform">
                    <PawPrint className="w-6 h-6 text-[#374151]" />
                  </span>
                  Partner Setia
                </h2>

                <div className="flex gap-4 items-stretch">
                  {/* 3D Model preview */}
                  <div
                    className={`w-32 h-32 shrink-0 rounded-[20px] border-[4px] border-[#374151] shadow-[4px_4px_0_#374151] overflow-hidden relative ${elementBg[partner.element] || 'bg-[#E5E7EB]'}`}
                  >
                    <Suspense fallback={
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#374151]/40" />
                      </div>
                    }>
                      <Creature3D
                        modelUrl={partner.modelUrl}
                        autoRotate={true}
                        scale={(partner.scale || 1) * 0.9}
                        position={partner.position || [0, 0, 0]}
                      />
                    </Suspense>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <p className="text-4xl font-black text-[#374151] leading-none">
                        {partner.nickname || partner.name}
                      </p>
                      {partner.nickname && partner.nickname !== partner.name && (
                        <p className="text-xl text-[#374151]/50 mt-0.5 flex items-center gap-1">
                          <PawPrint className="w-3.5 h-3.5" />
                          {partner.name}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-[#FEF08A] border-[2px] border-[#374151] px-2.5 py-0.5 rounded-xl text-xl font-black text-[#374151] shadow-[2px_2px_0_#374151] flex items-center gap-1.5">
                        <ElementIcon element={partner.element} className="w-4 h-4" />
                        {partner.element}
                      </span>
                      <span className="bg-white border-[2px] border-[#374151] px-2.5 py-0.5 rounded-xl text-xl font-black text-[#374151] shadow-[2px_2px_0_#374151] flex items-center gap-1.5">
                        <Shield className="w-4 h-4" />
                        {partner.type}
                      </span>
                      <span className="bg-[#FCA5A5] border-[2px] border-[#374151] px-2.5 py-0.5 rounded-xl text-xl font-black text-[#374151] shadow-[2px_2px_0_#374151] flex items-center gap-1.5">
                        <Star className="w-4 h-4" />
                        Lv.{partner.level}
                      </span>
                    </div>

                    {/* EXP Bar */}
                    <div className="mt-2 text-left">
                      <div className="flex justify-between text-lg text-[#374151]/70 font-bold mb-1">
                        <span>EXP</span>
                        <span>{partner.exp}/{30 + (partner.level || 1) * 20}</span>
                      </div>
                      <div className="w-full h-3 bg-[#374151]/10 border-[2px] border-[#374151] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4ADE80] rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.round(((partner.exp || 0) / (30 + (partner.level || 1) * 20)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pokemon Party */}
          <div className="lg:col-span-7 flex flex-col flex-1">
            <div className="bg-[#A7F3D0] md:border-[4px] border-[#374151] p-4 md:p-6 md:rounded-[40px] h-full flex flex-col relative overflow-hidden flex-1 group/right">
              <div className="flex flex-row justify-between items-center mb-4 md:mb-6 relative z-10 border-b-[4px] border-dashed border-[#374151] pb-4">
                <h2 className="text-3xl md:text-5xl text-[#374151] font-black uppercase tracking-tight pl-2 md:pl-0 flex items-center gap-3">
                  <span className="bg-white border-[4px] border-[#374151] rounded-full p-2 rotate-[4deg] inline-block group-hover/right:-rotate-[4deg] transition-transform">
                    <PawPrint className="w-7 h-7 text-[#374151]" />
                  </span>
                  Daftar Hewan
                </h2>
              </div>

              <div className="relative z-10 flex-1">
                <div className="w-full h-full">
                  <PokemonGrid pokemons={displayPokemons} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out Button - Responsive Position at bottom of content */}
        <div className="mt-8 md:mt-12 mb-8 md:mb-0 flex justify-center md:justify-start w-full">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="px-8 py-3 bg-[#F59E0B] hover:bg-[#D97706] text-white border-4 border-[#374151] rounded-2xl shadow-[4px_4px_0_#374151] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all text-2xl font-black whitespace-nowrap"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="bg-[#FFF9E6] border-[6px] border-[#374151] rounded-[32px] p-8 md:p-10 max-w-md w-full shadow-[0_20px_0_#374151] transform animate-in zoom-in-95 duration-200"
            style={{ fontFamily: 'var(--font-nanum-pen)' }}
          >
            <div className="flex flex-col items-center text-center gap-8">
              <div className="bg-[#FEF08A] border-4 border-[#374151] rounded-full p-4 rotate-[-3deg]">
                <Shield className="w-12 h-12 text-[#F59E0B]" />
              </div>
              
              <h3 className="text-4xl md:text-5xl font-black text-[#374151] leading-tight mt-2">
                Apakah anda yakin ingin sign out dari akun ini?
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
                <button
                  onClick={handleLogout}
                  className="flex-1 py-4 bg-[#F87171] hover:bg-[#EF4444] text-white border-4 border-[#374151] rounded-2xl shadow-[4px_4px_0_#374151] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all text-3xl font-black"
                >
                  Iya
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-4 bg-white hover:bg-gray-100 text-[#374151] border-4 border-[#374151] rounded-2xl shadow-[4px_4px_0_#374151] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all text-3xl font-black"
                >
                  Tidak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
