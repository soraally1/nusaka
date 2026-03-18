'use client'

import React, { useEffect, useRef, useState } from 'react';
import { useBattleStore } from './battleStore';
import { useCreatureStore } from '../nusadex/store';
import { useJoystickStore, useMissionStore } from './store';
import { completeTask } from './MissionHUD';
import dynamic from 'next/dynamic';

const BattleArena = dynamic(() => import('./BattleArena'), { ssr: false });

export default function BattleUI() {
    const {
        isActive,
        wildCreature,
        wildHp,
        wildMaxHp,
        playerCreature,
        playerHp,
        playerMaxHp,
        phase,
        message,
        setPhase,
        damageWild,
        damagePlayer,
        endBattle
    } = useBattleStore();

    const setMenuState = useJoystickStore(s => s.setMenuState);
    const { setFirstPartner, capturedCreatures } = useCreatureStore(); // We'll just push to array manually or use setFirstPartner for simplicity if they don't have it.

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(true);

    useEffect(() => {
        if (isActive) {
            audioRef.current = new Audio('/sfx/battlebgm.mp3');
            audioRef.current.loop = true;
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, [isActive]);

    if (!isActive || !wildCreature || !playerCreature) return null;

    const enemyHpPercent = Math.max(0, (wildHp / wildMaxHp) * 100);
    const playerHpPercent = Math.max(0, (playerHp / playerMaxHp) * 100);

    const getHpColor = (percent: number) => {
        if (percent > 50) return 'bg-[#4ADE80]'; // Green
        if (percent > 20) return 'bg-[#FBBF24]'; // Yellow
        return 'bg-[#EF4444]'; // Red
    };

    // Mark mission tasks as 'find_orangutan' when encountering Orang Utan
    useEffect(() => {
        if (isActive && wildCreature?.id === 3) {
            completeTask('orangutan', 'find_orangutan');
        }
    }, [isActive, wildCreature]);

    const handleRun = () => {
        setMenuOpen(false);
        setPhase('flee', 'Got away safely!');
        setTimeout(() => {
            endBattle();
            setMenuState('playing');
        }, 1500);
    };

    const handleAttack = () => {
        setMenuOpen(false);
        setPhase('player_attack', `${playerCreature.nickname || playerCreature.name} used Tackle!`);

        if (wildCreature.id === 3) {
            completeTask('orangutan', 'battle_orangutan');
        }

        // Simple attack animation delay
        setTimeout(() => {
            const damage = 10 + Math.floor(Math.random() * 10);
            damageWild(damage);

            if (wildHp - damage <= 0) {
                setTimeout(() => {
                    setPhase('win', `Wild ${wildCreature.name} fainted!`);
                    setTimeout(() => {
                        endBattle();
                        setMenuState('playing');
                    }, 2000);
                }, 1000);
            } else {
                // Enemy turn
                setTimeout(() => {
                    setPhase('enemy_attack', `Wild ${wildCreature.name} strikes back!`);
                    setTimeout(() => {
                        const enemyDmg = 5 + Math.floor(Math.random() * 8);
                        damagePlayer(enemyDmg);

                        if (playerHp - enemyDmg <= 0) {
                            setTimeout(() => {
                                setPhase('flee', 'You blacked out!');
                                setTimeout(() => {
                                    endBattle();
                                    setMenuState('playing'); // Simple respawn
                                }, 2000);
                            }, 1000);
                        } else {
                            setTimeout(() => {
                                setPhase('select_action', `What will ${playerCreature.nickname || playerCreature.name} do?`);
                                setMenuOpen(true);
                            }, 1000);
                        }
                    }, 1500);
                }, 1500);
            }
        }, 1500);
    };

    const handleCatch = () => {
        setMenuOpen(false);
        setPhase('catch_attempt', 'You threw an Arloji!');

        setTimeout(() => {
            // Simple catch rate logic: lower HP = better chance
            const chance = 1 - (wildHp / wildMaxHp);
            const roll = Math.random();

            // Baseline 20% catch rate, up to 100% if 1 HP
            if (roll < chance + 0.2) {
                setPhase('catch_success', `Gotcha! ${wildCreature.name} was caught!`);
                useCreatureStore.getState().addCreature({ ...wildCreature, level: 1, exp: 0 });
                
                if (wildCreature.id === 3) {
                    completeTask('orangutan', 'catch_orangutan');
                }

                setTimeout(() => {
                    endBattle();
                    setMenuState('playing');
                    
                    if (wildCreature.id === 3 && useMissionStore.getState().currentMission === 'orangutan') {
                        useMissionStore.getState().completeMission();
                    }
                }, 2500);
            } else {
                setPhase('enemy_attack', `Oh no! The wild ${wildCreature.name} broke free!`);
                setTimeout(() => {
                    setPhase('select_action', `What will ${playerCreature.nickname || playerCreature.name} do?`);
                    setMenuOpen(true);
                }, 2000);
            }
        }, 2000);
    };

    const wildAnim = phase === 'enemy_attack' ? 'attack' : 'idle';
    const playerAnim = phase === 'player_attack' ? 'attack' : 'idle';

    return (
        <div className="absolute inset-0 z-50 flex flex-col bg-linear-to-b from-[#87CEEB] to-[#8BC34A] pointer-events-auto" style={{ fontFamily: 'var(--font-nanum-pen)' }}>

            {/* Action Area */}
            <div className="flex-1 relative overflow-hidden">
                {/* Full Screen 3D Arena */}
                <BattleArena
                    playerUrl={playerCreature.modelUrl}
                    playerScale={playerCreature.scale}
                    playerAnim={playerAnim}
                    enemyUrl={wildCreature.modelUrl}
                    enemyScale={wildCreature.scale}
                    enemyAnim={wildAnim}
                />

                {/* --- TOP LEFT: Enemy HUD --- */}
                <div className="absolute top-4 left-4 sm:top-8 sm:left-8 bg-white border-[3px] sm:border-4 border-[#374151] rounded-tl-2xl sm:rounded-tl-3xl rounded-br-2xl sm:rounded-br-3xl px-4 sm:px-6 py-2 sm:py-3 w-[85vw] max-w-[320px] sm:w-80 shadow-[4px_4px_0_#374151] sm:shadow-[6px_6px_0_#374151]">
                    <div className="flex justify-between items-center border-b-2 border-dashed border-[#9CA3AF] pb-1 mb-2">
                        <span className="text-xl sm:text-3xl font-black uppercase text-[#374151] truncate mr-2">{wildCreature.name}</span>
                        <span className="text-sm sm:text-xl font-bold bg-[#FEF08A] px-1.5 sm:px-2 py-0.5 rounded-lg border-2 border-[#374151] shadow-sm shrink-0">Lv.{wildCreature.level || 5}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-sm font-black text-[#374151] bg-[#FCA5A5] px-1 sm:px-1.5 py-0.5 rounded border border-[#374151]">HP</span>
                        <div className="flex-1 h-3 sm:h-4 bg-[#374151] p-[2px] sm:p-[3px] rounded-full border-2 border-[#374151]">
                            <div className="w-full h-full bg-white rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ease-out ${getHpColor(enemyHpPercent)}`} style={{ width: `${enemyHpPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BOTTOM RIGHT: Player HUD --- */}
                <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 bg-[#E5E7EB] border-[3px] sm:border-4 border-[#374151] rounded-tl-2xl sm:rounded-tl-3xl rounded-br-2xl sm:rounded-br-3xl px-4 sm:px-6 py-3 sm:py-4 w-[85vw] max-w-[360px] sm:w-96 shadow-[4px_4px_0_#374151] sm:shadow-[6px_6px_0_#374151] z-20">
                    <div className="flex justify-between items-center border-b-2 border-solid border-[#9CA3AF] pb-1 mb-2">
                        <span className="text-xl sm:text-3xl font-black uppercase text-[#374151] truncate mr-2">{playerCreature.nickname || playerCreature.name}</span>
                        <span className="text-sm sm:text-xl font-bold bg-[#FEF08A] px-1.5 sm:px-2 py-0.5 rounded-lg border-2 border-[#374151] shadow-sm shrink-0">Lv.{playerCreature.level || 5}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] sm:text-sm font-black text-[#374151] bg-[#FCA5A5] px-1 sm:px-1.5 py-0.5 rounded border border-[#374151]">HP</span>
                        <div className="flex-1 h-3.5 sm:h-5 bg-[#374151] p-[3px] sm:p-[4px] rounded-full border-2 border-[#374151]">
                            <div className="w-full h-full bg-white rounded-full overflow-hidden">
                                <div className={`h-full transition-all duration-500 ease-out ${getHpColor(playerHpPercent)}`} style={{ width: `${playerHpPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="text-right mt-1 text-lg sm:text-2xl font-black text-[#374151]">
                        {Math.ceil(playerHp)} / {playerMaxHp}
                    </div>
                </div>

                {/* Visual Effect overlays */}
                {phase === 'player_attack' && <div className="absolute inset-0 bg-white/40 animate-pulse pointer-events-none z-10"></div>}
                {phase === 'catch_attempt' && <div className="absolute top-1/2 left-1/2 w-8 h-8 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full border-4 border-white shadow-xl animate-bounce z-20"></div>}
            </div>

            {/* Bottom Dialog Box (Menu Area) */}
            <div className="min-h-[160px] sm:h-48 bg-[#E5E7EB] border-t-[6px] sm:border-t-8 border-[#374151] flex flex-col sm:flex-row items-center sm:items-stretch sm:justify-start p-2 sm:p-0">
                {/* Left: Message Log */}
                <div className="w-[calc(100%-0.5rem)] sm:flex-1 bg-white m-1 sm:m-4 border-[3px] sm:border-4 border-[#374151] rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-inner flex items-center overflow-hidden">
                    <p className="text-2xl sm:text-4xl text-[#374151] font-black uppercase tracking-wide leading-tight sm:leading-relaxed animate-pulse">{message}</p>
                </div>

                {/* Right: Command Buttons */}
                {menuOpen && (
                    <div className="w-[calc(100%-0.5rem)] sm:w-[400px] m-1 sm:m-4 sm:ml-0 grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
                        <button onClick={handleAttack} className="bg-[#EF4444] border-[3px] sm:border-4 border-[#B91C1C] rounded-xl sm:rounded-2xl h-12 sm:h-auto flex items-center justify-center text-xl sm:text-3xl font-black text-white uppercase active:scale-95 sm:hover:scale-105 transition-transform shadow-[2px_2px_0_#B91C1C] sm:shadow-[4px_4px_0_#B91C1C]">
                            FIGHT
                        </button>
                        <button onClick={handleCatch} className="bg-[#3B82F6] border-[3px] sm:border-4 border-[#1D4ED8] rounded-xl sm:rounded-2xl h-12 sm:h-auto flex items-center justify-center text-xl sm:text-3xl font-black text-white uppercase active:scale-95 sm:hover:scale-105 transition-transform shadow-[2px_2px_0_#1D4ED8] sm:shadow-[4px_4px_0_#1D4ED8]">
                            ARLOJI
                        </button>
                        <button className="bg-[#10B981] border-[3px] sm:border-4 border-[#047857] rounded-xl sm:rounded-2xl h-12 sm:h-auto flex items-center justify-center text-xl sm:text-3xl font-black text-white uppercase opacity-50 cursor-not-allowed">
                            POKÉMON
                        </button>
                        <button onClick={handleRun} className="bg-[#F59E0B] border-[3px] sm:border-4 border-[#B45309] rounded-xl sm:rounded-2xl h-12 sm:h-auto flex items-center justify-center text-xl sm:text-3xl font-black text-white uppercase active:scale-95 sm:hover:scale-105 transition-transform shadow-[2px_2px_0_#B45309] sm:shadow-[4px_4px_0_#B45309]">
                            RUN
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

}
