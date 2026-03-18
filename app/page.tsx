'use client'

import { useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Joystick } from 'react-joystick-component'
import { useJoystickStore } from './game/store'
import { useTransitionStore } from './store/transitionStore'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Loader2, User as UserIcon, Sword, Volume2, VolumeX } from 'lucide-react'
import { useNotifStore } from "./nusadex/notifStore";
import NusadexPopup from "./nusadex/NusadexPopup";
import { useBattleStore } from './game/battleStore';
import { useCreatureStore } from './nusadex/store';
import { useStoneStore } from './game/stoneStore';
import BattleUI from './game/BattleUI';
import BatuQuiz from './game/BatuQuiz';
import AudioPlayerControl from '../components/AudioPlayerControl';
import { MissionHUD, MissionCompleteOverlay } from './game/MissionHUD';
import { useMissionStore } from './game/store';

import AuthOverlay from '../components/AuthOverlay';
import CharacterSelectionOverlay from '../components/CharacterSelectionOverlay';

const GameScene = dynamic(() => import('./game/GameScene'), { ssr: false })

export default function Home() {
  const router = useRouter()

  const menuState = useJoystickStore(s => s.menuState)
  const hasSaveData = useJoystickStore(s => s.hasSaveData)
  const playerName = useJoystickStore(s => s.playerName)
  const setPlayerProfile = useJoystickStore(s => s.setPlayerProfile)
  const setMenuState = useJoystickStore(s => s.setMenuState)
  const setNusadexOpen = useJoystickStore(s => s.setNusadexOpen)

  const { hasNewNotif } = useNotifStore();
  const { startTransition, finishTransition } = useTransitionStore()
  const { clearMission, currentMission, missionStatus, setMission } = useMissionStore();

  const nearbyCreature = useBattleStore(s => s.nearbyCreature)
  const startBattle = useBattleStore(s => s.startBattle)
  const firstPartner = useCreatureStore(s => s.firstPartner)
  const nearbyStoneId = useStoneStore(s => s.nearbyStoneId)
  const nearbyNPC = useJoystickStore(s => s.nearbyNPC)

  // Handle keyboard Interaction "E"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE') return;
      const { menuState } = useJoystickStore.getState();
      const { nearbyCreature, startBattle } = useBattleStore.getState();
      const { firstPartner } = useCreatureStore.getState();
      const { nearbyStoneId, startMinigame } = useStoneStore.getState();

      if (menuState === 'playing') {
        if (nearbyCreature && firstPartner) {
          startBattle(nearbyCreature, firstPartner);
          useJoystickStore.getState().setMenuState('battle');
        } else if (nearbyStoneId !== null) {
          startMinigame();
          useJoystickStore.getState().setMenuState('batu_quiz');
        } else if (useJoystickStore.getState().nearbyNPC) {
          startTransition(() => {
            router.push('/npc/kakek');
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Check Auth & Save Data on Mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await checkSaveData(user)
      } else {
        setMenuState('auth')
      }
    })
    return () => unsubscribe()
  }, [])

  const checkSaveData = async (user: User) => {
    let hasSave = false
    try {
      const docRef = doc(db, 'players', user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data()
        setPlayerProfile(user.uid, data.name, true)
        
        // Sync partner to creature store if exists in firestore
        if (data.partner) {
            useCreatureStore.getState().setFirstPartner(data.partner);
        }
        
        hasSave = true
      } else {
        setPlayerProfile(user.uid, null, false)
      }
    } catch (error) {
      console.error('Firestore error:', error)
    } finally {
      setTimeout(() => {
        // Only set menu state if we are in the initial check or auth flow.
        // If we are already 'playing' (e.g., returning from profile/npc), don't kick back to selection.
        const currentMenu = useJoystickStore.getState().menuState;
        if (currentMenu === 'checking' || currentMenu === 'auth') {
            startTransition(() => {
                useJoystickStore.getState().setMenuState(hasSave ? 'select_character' : 'main')
                setTimeout(() => {
                    finishTransition();
                }, 600);
            });
        }
      }, 800)
    }
  }

  // Joystick handlers
  const handleJoystickMove = useCallback((e: any) => {
    useJoystickStore.getState().setMovement(e.y, e.x)
  }, [])
  const handleJoystickStop = useCallback(() => {
    useJoystickStore.getState().setMovement(0, 0)
  }, [])

  const handleBattleStart = useCallback(() => {
    const { nearbyCreature } = useBattleStore.getState();
    const { firstPartner } = useCreatureStore.getState();
    if (nearbyCreature && firstPartner) {
      startBattle(nearbyCreature, firstPartner);
      setMenuState('battle');
    }
  }, [startBattle, setMenuState])

  const handleStoneMinigameStart = useCallback(() => {
    const { nearbyStoneId, startMinigame } = useStoneStore.getState();
    if (nearbyStoneId !== null) {
      startMinigame();
      setMenuState('batu_quiz');
    }
  }, [setMenuState])
  const handleLogout = async () => {
    startTransition(async () => {
        await auth.signOut();
        useJoystickStore.getState().reset(); // Reset joystick store state
        useCreatureStore.getState().reset(); // Reset creature store state
        setMenuState('auth'); // Go back to auth screen
        setTimeout(() => {
            finishTransition();
        }, 600);
    });
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#87CEEB]">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0">
        <GameScene />
      </div>


      {menuState !== 'playing' && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-[#FFF9E6]/30 backdrop-blur-xl transition-all duration-700 overflow-y-auto">
          <div className="pointer-events-auto w-full flex flex-col items-center justify-center min-h-full max-w-4xl mx-auto px-4 py-8">
            
            {(menuState === 'checking' || menuState === 'auth') && (
               <div className="relative w-80 h-36 md:w-[400px] md:h-48 transition-transform hover:scale-105 duration-300 mb-8">
                  <img src="/Nusaka.svg" alt="Nusaka Logo" className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
               </div>
            )}

            {/* STATE: AUTH */}
            {menuState === 'auth' && <AuthOverlay />}

            {/* STATE: CHECKING DATA */}
            {menuState === 'checking' && (
              <div className="flex flex-col items-center p-12 bg-[#FFF9E6] rounded-[40px] border-[5px] border-[#374151] shadow-[10px_10px_0_#374151] relative overflow-hidden">
                <div
                    className="absolute inset-0 z-0 pointer-events-none opacity-10"
                    style={{ backgroundImage: 'radial-gradient(#374151 2px, transparent 2px)', backgroundSize: '16px 16px' }}
                />
                <Loader2 className="w-16 h-16 text-[#374151] animate-spin mb-6 relative z-10" />
                <p style={{ fontFamily: 'var(--font-nanum-pen)' }} className="text-[#374151] text-5xl tracking-wider animate-pulse relative z-10">
                  Memeriksa Jurnal...
                </p>
              </div>
            )}

            {/* STATE: CHARACTER SELECTION */}
            {menuState === 'select_character' && <CharacterSelectionOverlay />}

            {/* STATE: MAIN MENU (No Character Yet) */}
            {menuState === 'main' && (
              <div className="flex flex-col items-center gap-10">
                  <div className="relative w-80 h-36 md:w-[400px] md:h-48 mb-2">
                    <img src="/Nusaka.svg" alt="Nusaka Logo" className="absolute inset-0 w-full h-full object-contain filter drop-shadow-lg" />
                  </div>
                  
                  <button
                    onClick={() => startTransition(() => router.push('/create-character'))}
                    className="group relative flex flex-col items-center p-10 bg-[#68D77B] border-[6px] border-[#374151] rounded-[48px] shadow-[14px_14px_0_#374151] hover:-translate-y-2 hover:shadow-[14px_20px_0_#374151] transition-all duration-300"
                  >
                    <span style={{ fontFamily: 'var(--font-nanum-pen)' }} className="text-[#374151] text-6xl md:text-8xl drop-shadow-[2px_2px_0_rgba(255,255,255,0.8)] group-hover:text-white transition-colors leading-tight">
                      Mulai Petualangan!
                    </span>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="h-[2px] w-8 bg-[#374151]/20" />
                      <p className="text-[#374151]/50 text-xl md:text-2xl font-sans uppercase tracking-[.3em] font-black">
                        Buat Karakter Baru
                      </p>
                      <div className="h-[2px] w-8 bg-[#374151]/20" />
                    </div>
                  </button>
                  
                  <button 
                    onClick={handleLogout} 
                    className="text-[#374151]/70 hover:text-[#D97706] transition-colors underline underline-offset-8 font-sans text-sm tracking-widest uppercase font-black"
                  >
                    Ganti Akun
                  </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mission UI Overlay - Only show when playing and has active mission */}
      {menuState === 'playing' && currentMission && missionStatus === 'active' && (
        <MissionHUD />
      )}
      
      {/* Mission Complete Modal */}
      {menuState === 'playing' && missionStatus === 'completed' && (
        <MissionCompleteOverlay onClose={() => {
          clearMission();
          // Clear from Firestore too
          const user = auth.currentUser;
          if (user) {
            import('firebase/firestore').then(({ updateDoc, doc }) => {
              updateDoc(doc(db, 'players', user.uid), {
                mission: null,
                missionStatus: null,
                missionObjective: null
              }).catch(console.error);
            });
          }
        }} />
      )}

      {/* Right HUD (ID Card & Nusadex) */}
      <div
        className={`absolute top-6 right-0 md:top-8 md:right-4 z-40 flex flex-col items-end gap-2 md:gap-4 transition-all duration-1000
          ${menuState === 'playing' ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-10 pointer-events-none'}`}
      >
        {/* Audio Toggle */}
        <AudioPlayerControl />

        {/* ID Card */}
        <button
          onClick={() => startTransition(() => router.push('/profile'))}
          className="relative w-36 h-20 md:w-52 md:h-28 hover:scale-110 transition-transform cursor-pointer shrink-0 origin-right"
        >
          <img
            src="/nusadex/Idcard.png"
            alt="ID Card"
            className="absolute inset-0 w-full h-full object-contain object-right"
          />
        </button>

        {/* Nusadex Icon */}
        {menuState === "playing" && (
          <div
            onClick={() => setNusadexOpen(true)}
            className="relative w-28 h-36 md:w-40 md:h-48 hover:scale-[1.05] transition-transform cursor-pointer shrink-0 origin-right"
          >
            <img
              src="/nusadex/nusadexs.png"
              alt="Nusadex"
              className="absolute inset-0 w-full h-full object-contain object-right"
            />
            {/* Notification Dot */}
            {hasNewNotif && (
              <div className="absolute top-2 right-1 md:top-4 md:right-3 w-5 h-5 md:w-6 md:h-6 bg-[#FBBF24] rounded-full border-[3px] border-white shadow-[0_0_10px_#FBBF24] animate-pulse" />
            )}
          </div>
        )}
      </div>

      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 z-40 transition-opacity duration-1000 md:hidden
          ${menuState === 'playing' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <Joystick
          size={120}
          sticky={false}
          baseColor="rgba(255,255,255,0.3)"
          stickColor="rgba(255,255,255,0.8)"
          move={handleJoystickMove}
          stop={handleJoystickStop}
        />
      </div>

      {/* Interaction Prompt (E to Battle) */}
      {menuState === 'playing' && nearbyCreature && firstPartner && (
        <div className="absolute bottom-48 md:bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-full sm:w-auto flex justify-center px-6 sm:px-0">
          <button
            onClick={handleBattleStart}
            className="flex items-center justify-center gap-4 bg-[#FEF08A] hover:bg-[#FDE047] border-4 border-[#374151] w-full max-w-[340px] md:w-auto px-6 py-2 md:px-8 md:py-4 rounded-[24px] md:rounded-[32px] shadow-[6px_6px_0_#374151] md:shadow-[4px_4px_0_#374151] hover:-translate-y-1 transition-transform"
          >
            <Sword className="w-10 h-10 md:w-8 md:h-8 text-[#374151]" strokeWidth={2.5} />
            <div className="flex flex-col items-start leading-none text-[#374151]" style={{ fontFamily: 'var(--font-nanum-pen)' }}>
              <span className="text-3xl md:text-3xl font-black">Lawan {nearbyCreature.name}!</span>
              <span className="text-sm md:text-base font-bold text-[#374151]/70 tracking-widest uppercase">Tekan "E" atau Tap</span>
            </div>
          </button>
        </div>
      )}

      {/* Interaction Prompt (E to Batu Quiz) */}
      {menuState === 'playing' && !nearbyCreature && nearbyStoneId !== null && (
        <div className="absolute bottom-48 md:bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-full sm:w-auto flex justify-center px-6 sm:px-0">
          <button
            onClick={handleStoneMinigameStart}
            className="flex items-center justify-center gap-4 bg-[#6EE7B7] hover:bg-[#34D399] border-4 border-[#064E3B] w-full max-w-[340px] md:w-auto px-6 py-2 md:px-8 md:py-4 rounded-[24px] md:rounded-[32px] shadow-[6px_6px_0_#064E3B] md:shadow-[4px_4px_0_#064E3B] hover:-translate-y-1 transition-transform"
          >
            <div className="text-4xl">🪨</div>
            <div className="flex flex-col items-start leading-none text-[#064E3B]" style={{ fontFamily: 'var(--font-nanum-pen)' }}>
              <span className="text-3xl md:text-3xl font-black">Periksa Batu!</span>
              <span className="text-sm md:text-base font-bold text-[#064E3B]/70 tracking-widest uppercase">Tekan "E" atau Tap</span>
            </div>
          </button>
        </div>
      )}

      {/* Interaction Prompt (E to NPC) */}
      {menuState === 'playing' && !nearbyCreature && nearbyStoneId === null && nearbyNPC && (
        <div className="absolute bottom-48 md:bottom-12 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-full sm:w-auto flex justify-center px-6 sm:px-0">
          <button
            onClick={() => startTransition(() => router.push('/npc/kakek'))}
            className="flex items-center justify-center gap-4 bg-[#FCD34D] hover:bg-[#FBBF24] border-4 border-[#92400E] w-full max-w-[340px] md:w-auto px-6 py-2 md:px-8 md:py-4 rounded-[24px] md:rounded-[32px] shadow-[6px_6px_0_#92400E] md:shadow-[4px_4px_0_#92400E] hover:-translate-y-1 transition-transform"
          >
            <div className="text-4xl">👴</div>
            <div className="flex flex-col items-start leading-none text-[#92400E]" style={{ fontFamily: 'var(--font-nanum-pen)' }}>
              <span className="text-3xl md:text-3xl font-black">Bicara dengan Kakek!</span>
              <span className="text-sm md:text-base font-bold text-[#92400E]/70 tracking-widest uppercase">Tekan "E" atau Tap</span>
            </div>
          </button>
        </div>
      )}

      {/* Battle UI Overlay */}
      {menuState === 'battle' && <BattleUI />}

      {/* Batu Quiz Overlay */}
      {menuState === 'batu_quiz' && <BatuQuiz />}

      {/* Nusadex Popup */}
      <NusadexPopup />
    </div>
  );
}
