'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useBattleStore } from './battleStore';
import { useCreatureStore, PartnerCreature } from '../nusadex/store';
import { useJoystickStore, useMissionStore } from './store';
import { completeTask } from './MissionHUD';
import dynamic from 'next/dynamic';
import {
    Sword, Shield, Wind, Droplets, Mountain, Watch, Footprints,
    ChevronLeft, ChevronRight, CheckCircle2, Pencil, Star, X
} from 'lucide-react';

const BattleArena = dynamic(() => import('./BattleArena'), { ssr: false });

// ─── Element config ───────────────────────────────────────────────────────────
const ELEMENT_CFG: Record<string, {
    color: string; textColor: string;
    Icon: React.FC<any>; attackName: string;
}> = {
    Tanah: { color: '#8B5E3C', textColor: '#fff', Icon: Mountain,  attackName: 'Ground Slam' },
    Angin: { color: '#3B82F6', textColor: '#fff', Icon: Wind,      attackName: 'Gust Strike' },
    Air:   { color: '#06B6D4', textColor: '#fff', Icon: Droplets,  attackName: 'Aqua Jet'   },
};

// ─── Shared sub-components ────────────────────────────────────────────────────
function HpBar({ pct }: { pct: number }) {
    const color = pct > 50 ? '#4ADE80' : pct > 20 ? '#FBBF24' : '#EF4444';
    return (
        <div style={{ height: 10, background: '#D1D5DB', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
    );
}

function ElementBadge({ element }: { element?: string }) {
    if (!element) return null;
    const cfg = ELEMENT_CFG[element];
    if (!cfg) return null;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: '0.6rem', fontWeight: 800,
            padding: '2px 7px', borderRadius: 99,
            background: cfg.color, color: cfg.textColor, letterSpacing: '0.05em',
        }}>
            <cfg.Icon size={10} strokeWidth={2.5} />
            {element.toUpperCase()}
        </span>
    );
}

function CreatureCard({
    name, level, element, hpPct, hp, maxHp, showHpNum, shake,
}: {
    name: string; level: number; element?: string; hpPct: number;
    hp?: number; maxHp?: number; showHpNum?: boolean; shake?: boolean;
}) {
    return (
        <div style={{
            background: '#fff', border: '2px solid #374151', borderRadius: 14,
            padding: '10px 14px', minWidth: 200,
            animation: shake ? 'shakeAnim 0.45s ease' : 'none',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: '1rem', fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: 1 }}>{name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <ElementBadge element={element} />
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#FEF08A', color: '#374151', padding: '1px 7px', borderRadius: 8, border: '1.5px solid #374151' }}>Lv.{level}</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#374151', background: '#FCA5A5', padding: '1px 5px', borderRadius: 5, border: '1px solid #374151', letterSpacing: 1 }}>HP</span>
                <div style={{ flex: 1 }}><HpBar pct={hpPct} /></div>
            </div>
            {showHpNum && hp !== undefined && maxHp !== undefined && (
                <div style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 900, color: '#374151', marginTop: 3 }}>{Math.ceil(hp)} / {maxHp}</div>
            )}
        </div>
    );
}

function BattleBtn({ onClick, color, Icon, label, disabled }: {
    onClick?: () => void; color: string; Icon: React.FC<any>; label: string; disabled?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                background: disabled ? '#9CA3AF' : color,
                border: '2px solid #374151', borderRadius: 12,
                color: '#fff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, fontWeight: 900,
                fontSize: '1rem', letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1, transition: 'transform 0.1s',
                padding: '0 12px', height: '100%', minHeight: 48,
            }}
            onPointerDown={e => { if (!disabled) (e.currentTarget as HTMLElement).style.transform = 'scale(0.94)'; }}
            onPointerUp={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            onPointerLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        >
            <Icon size={18} strokeWidth={2.5} />
            {label}
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 1: Creature selector (shown before battle starts)
// ─────────────────────────────────────────────────────────────────────────────
function CreatureSelectorScreen({
    creatures,
    wildName,
    wildElement,
    onSelect,
    onCancel,
}: {
    creatures: PartnerCreature[];
    wildName: string;
    wildElement: string;
    onSelect: (c: PartnerCreature) => void;
    onCancel: () => void;
}) {
    const [idx, setIdx] = useState(0);
    const current = creatures[idx];
    const total = creatures.length;

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 60,
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(160deg,#1e293b 0%,#0f172a 100%)',
            fontFamily: 'var(--font-nanum-pen)',
            animation: 'fadeSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px 12px',
                borderBottom: '2px solid #334155',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        Musuh muncul!
                    </p>
                    <h2 style={{ margin: '2px 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: 2 }}>
                        {wildName}
                        <ElementBadge element={wildElement} />
                    </h2>
                </div>
                <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
                    <X size={22} strokeWidth={2.5} />
                </button>
            </div>

            {/* Subtitle */}
            <div style={{ padding: '14px 24px 8px' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#CBD5E1', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Pilih hewanmu untuk bertarung
                </p>
            </div>

            {/* Creature carousel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
                {total === 0 ? (
                    <p style={{ color: '#94A3B8', fontWeight: 700, textAlign: 'center' }}>Kamu belum punya hewan!</p>
                ) : (
                    <>
                        {/* Card */}
                        <div key={current.instanceId} style={{
                            background: '#1E293B',
                            border: '2px solid #334155',
                            borderRadius: 20,
                            padding: '20px 24px',
                            width: '100%',
                            maxWidth: 320,
                            animation: 'cardIn 0.25s ease-out',
                        }}>
                            {/* Name + element */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {current.nickname ? 'Nickname' : 'Nama'}
                                    </p>
                                    <p style={{ margin: '2px 0 0', fontSize: '1.4rem', fontWeight: 900, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: 1 }}>
                                        {current.nickname || current.name}
                                    </p>
                                    {current.nickname && (
                                        <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>({current.name})</p>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                    <ElementBadge element={current.element} />
                                    <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#FEF08A', color: '#374151', padding: '1px 8px', borderRadius: 8, border: '1.5px solid #374151' }}>
                                        Lv.{current.level || 1}
                                    </span>
                                </div>
                            </div>

                            {/* Type tag */}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', background: '#0F172A', padding: '3px 8px', borderRadius: 99, border: '1px solid #334155' }}>
                                    {current.type}
                                </span>
                                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', background: '#0F172A', padding: '3px 8px', borderRadius: 99, border: '1px solid #334155' }}>
                                    {current.habitat}
                                </span>
                            </div>

                            {/* HP bar */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.55rem', fontWeight: 900, color: '#fff', background: '#EF4444', padding: '1px 6px', borderRadius: 5, letterSpacing: 1 }}>HP</span>
                                <div style={{ flex: 1 }}><HpBar pct={100} /></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8' }}>{50 + (current.level || 1) * 5}</span>
                            </div>
                        </div>

                        {/* Pagination */}
                        {total > 1 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
                                <button
                                    onClick={() => setIdx(i => Math.max(0, i - 1))}
                                    disabled={idx === 0}
                                    style={{ background: idx === 0 ? '#1E293B' : '#334155', border: '2px solid #475569', borderRadius: 10, color: '#CBD5E1', padding: '8px 14px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1 }}
                                >
                                    <ChevronLeft size={18} strokeWidth={2.5} />
                                </button>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94A3B8' }}>
                                    {idx + 1} / {total}
                                </span>
                                <button
                                    onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
                                    disabled={idx === total - 1}
                                    style={{ background: idx === total - 1 ? '#1E293B' : '#334155', border: '2px solid #475569', borderRadius: 10, color: '#CBD5E1', padding: '8px 14px', cursor: idx === total - 1 ? 'not-allowed' : 'pointer', opacity: idx === total - 1 ? 0.4 : 1 }}
                                >
                                    <ChevronRight size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Select CTA */}
            <div style={{ padding: '16px 24px 28px', display: 'flex', gap: 10 }}>
                <button
                    onClick={onCancel}
                    style={{
                        flex: 0, padding: '14px 20px',
                        background: 'none', border: '2px solid #475569',
                        borderRadius: 14, color: '#94A3B8', fontWeight: 800,
                        fontSize: '0.9rem', cursor: 'pointer', letterSpacing: '0.05em',
                    }}
                >
                    Kabur
                </button>
                <button
                    onClick={() => current && onSelect(current)}
                    disabled={!current}
                    style={{
                        flex: 1, padding: '14px 0',
                        background: current ? '#EF4444' : '#374151',
                        border: '2px solid #374151',
                        borderRadius: 14, color: '#fff',
                        fontWeight: 900, fontSize: '1rem',
                        cursor: current ? 'pointer' : 'not-allowed',
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'background 0.2s',
                    }}
                >
                    <Sword size={18} strokeWidth={2.5} />
                    Pilih {current?.nickname || current?.name || '—'}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 2: Catch success transition
// ─────────────────────────────────────────────────────────────────────────────
function CatchSuccessScreen({
    creature,
    onContinue,
}: {
    creature: PartnerCreature;
    onContinue: () => void;
}) {
    const [step, setStep] = useState<'burst' | 'card'>('burst');

    useEffect(() => {
        const t = setTimeout(() => setStep('card'), 1400);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 65,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-nanum-pen)',
            background: 'radial-gradient(ellipse at 50% 40%, #1a3a1a 0%, #0a0a0a 100%)',
            overflow: 'hidden',
        }}>
            {/* Burst rings */}
            {step === 'burst' && (
                <>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {[0, 1, 2].map(i => (
                            <div key={i} style={{
                                position: 'absolute',
                                width: 120 + i * 120,
                                height: 120 + i * 120,
                                border: `3px solid rgba(74,222,128,${0.6 - i * 0.15})`,
                                borderRadius: '50%',
                                animation: `burstRing 1.2s ${i * 0.15}s ease-out forwards`,
                            }} />
                        ))}
                    </div>
                    <div style={{
                        width: 80, height: 80,
                        background: 'linear-gradient(135deg,#4ADE80,#22C55E)',
                        borderRadius: '50%',
                        border: '4px solid #fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                        zIndex: 2,
                    }}>
                        <CheckCircle2 size={40} color="#fff" strokeWidth={2.5} />
                    </div>
                    <p style={{
                        marginTop: 24, fontWeight: 900, fontSize: '1.5rem',
                        color: '#4ADE80', textTransform: 'uppercase', letterSpacing: 3,
                        animation: 'fadeUp 0.5s 0.3s ease-out both', zIndex: 2,
                    }}>
                        Gotcha!
                    </p>
                    <p style={{
                        marginTop: 8, fontWeight: 700, fontSize: '1rem',
                        color: '#86EFAC', letterSpacing: 1, zIndex: 2,
                        animation: 'fadeUp 0.5s 0.5s ease-out both',
                    }}>
                        {creature.name} berhasil ditangkap!
                    </p>
                </>
            )}

            {/* Info card */}
            {step === 'card' && (
                <div style={{
                    width: '90%', maxWidth: 360,
                    background: '#0F172A',
                    border: '2px solid #22C55E',
                    borderRadius: 24,
                    padding: '28px 24px',
                    animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#4ADE80,#22C55E)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                            <Star size={22} color="#fff" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Ditangkap!</p>
                            <p style={{ margin: '2px 0 0', fontSize: '1.3rem', fontWeight: 900, color: '#F8FAFC', textTransform: 'uppercase' }}>
                                {creature.name}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <ElementBadge element={creature.element} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94A3B8', background: '#1E293B', padding: '2px 8px', borderRadius: 99, border: '1px solid #334155' }}>
                            {creature.type}
                        </span>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#FEF08A', color: '#374151', padding: '2px 8px', borderRadius: 99, border: '1.5px solid #374151' }}>
                            Lv.1
                        </span>
                    </div>

                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600, lineHeight: 1.5, marginBottom: 20 }}>
                        {creature.description}
                    </p>

                    <button
                        onClick={onContinue}
                        style={{
                            width: '100%', padding: '14px 0',
                            background: '#22C55E',
                            border: '2px solid #374151',
                            borderRadius: 14, color: '#fff',
                            fontWeight: 900, fontSize: '1rem',
                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        <Pencil size={18} strokeWidth={2.5} />
                        Beri Nama!
                    </button>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN 3: Nickname page
// ─────────────────────────────────────────────────────────────────────────────
function NicknameScreen({
    creature,
    onDone,
}: {
    creature: PartnerCreature;
    onDone: (nickname: string) => void;
}) {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const submit = () => {
        const trimmed = name.trim();
        onDone(trimmed || creature.name);
    };

    const elementCfg = ELEMENT_CFG[creature.element] || ELEMENT_CFG['Tanah'];

    return (
        <div style={{
            position: 'absolute', inset: 0, zIndex: 70,
            display: 'flex', flexDirection: 'column',
            background: '#0F172A',
            fontFamily: 'var(--font-nanum-pen)',
            animation: 'fadeSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
            {/* Top decoration stripe */}
            <div style={{ height: 6, background: elementCfg.color }} />

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 28px', gap: 24 }}>

                {/* Icon */}
                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: elementCfg.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #1E293B',
                    animation: 'popIn 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <Pencil size={32} color="#fff" strokeWidth={2} />
                </div>

                {/* Heading */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        Beri nama untuk
                    </p>
                    <h2 style={{ margin: '4px 0 0', fontSize: '2rem', fontWeight: 900, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: 2 }}>
                        {creature.name}
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8 }}>
                        <ElementBadge element={creature.element} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, background: '#FEF08A', color: '#374151', padding: '2px 8px', borderRadius: 99, border: '1.5px solid #374151' }}>Lv.1</span>
                    </div>
                </div>

                {/* Input field */}
                <div style={{ width: '100%', maxWidth: 320 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        background: '#1E293B',
                        border: '2px solid #475569',
                        borderRadius: 14,
                        padding: '4px 16px 4px 4px',
                        gap: 10,
                    }}>
                        <input
                            ref={inputRef}
                            maxLength={20}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                            placeholder={creature.name}
                            style={{
                                flex: 1,
                                background: 'none',
                                border: 'none',
                                outline: 'none',
                                color: '#F8FAFC',
                                fontFamily: 'var(--font-nanum-pen)',
                                fontSize: '1.4rem',
                                fontWeight: 900,
                                padding: '10px 12px',
                                textTransform: 'uppercase',
                                letterSpacing: 2,
                            }}
                        />
                        {name && (
                            <button
                                onClick={() => setName('')}
                                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={16} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                    <p style={{
                        margin: '6px 0 0 4px', fontSize: '0.65rem',
                        color: '#475569', fontWeight: 600,
                    }}>
                        Kosongkan untuk menggunakan nama asli
                    </p>
                </div>
            </div>

            {/* CTA */}
            <div style={{ padding: '16px 28px 32px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <button
                    onClick={submit}
                    style={{
                        width: '100%', maxWidth: 320,
                        padding: '16px 0',
                        background: elementCfg.color,
                        border: '2px solid #374151',
                        borderRadius: 16, color: '#fff',
                        fontWeight: 900, fontSize: '1.1rem',
                        cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'opacity 0.15s',
                    }}
                >
                    <CheckCircle2 size={20} strokeWidth={2.5} />
                    {name.trim() ? `Simpan "${name.trim()}"` : `Gunakan "${creature.name}"`}
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function BattleUI() {
    const {
        isActive, wildCreature, wildHp, wildMaxHp,
        playerCreature, playerHp, playerMaxHp,
        phase, message, setPhase, damageWild, damagePlayer, endBattle,
        setPlayerCreature, pendingCaughtCreature, setPendingCaughtCreature,
    } = useBattleStore();

    const setMenuState = useJoystickStore(s => s.setMenuState);
    const { capturedCreatures, nicknameCreature, addCreature } = useCreatureStore();

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [enemyShake, setEnemyShake] = useState(false);
    const [playerShake, setPlayerShake] = useState(false);
    const [defenseActive, setDefenseActive] = useState(false);
    const [attackEffect, setAttackEffect] = useState<{
        element: 'Tanah' | 'Angin' | 'Air' | null;
        target: 'enemy' | 'player' | null;
    }>({ element: null, target: null });

    // UI screens: 'select' | 'battle' | 'catch_success' | 'nickname'
    const [screen, setScreen] = useState<'select' | 'battle' | 'catch_success' | 'nickname'>('select');

    // Caught creature waiting for a name
    const [justCaught, setJustCaught] = useState<PartnerCreature | null>(null);

    // Audio
    useEffect(() => {
        if (isActive) {
            audioRef.current = new Audio('/sfx/battlebgm.mp3');
            audioRef.current.loop = true;
            audioRef.current.volume = 0.5;
            audioRef.current.play().catch(() => {});
        }
        return () => {
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        };
    }, [isActive]);

    // Reset to select screen when a new battle starts
    useEffect(() => {
        if (isActive) {
            setScreen('select');
            setMenuOpen(false);
        }
    }, [isActive]);

    // Mission trigger when battle starts vs target
    useEffect(() => {
        if (!isActive || !wildCreature) return;
        const targetId = 
            wildCreature.id === 3 ? 'orangutan' :
            wildCreature.id === 8 ? 'komodo' :
            wildCreature.id === 4 ? 'elangjawa' :
            wildCreature.id === 5 ? 'badak' : null;

        if (targetId) {
            completeTask(targetId, `find_${targetId}`);
        }
    }, [isActive, wildCreature]);

    if (!isActive || !wildCreature) return null;

    const enemyHpPct  = Math.max(0, (wildHp / wildMaxHp) * 100);
    const playerHpPct = playerCreature ? Math.max(0, (playerHp / playerMaxHp) * 100) : 100;
    const playerElement = ((playerCreature as any)?.element || 'Tanah') as 'Tanah' | 'Angin' | 'Air';
    const wildElement   = (wildCreature.element || 'Tanah') as 'Tanah' | 'Angin' | 'Air';

    function triggerAttack(attackerElement: 'Tanah' | 'Angin' | 'Air', target: 'enemy' | 'player') {
        setAttackEffect({ element: attackerElement, target });
        const setShake = target === 'enemy' ? setEnemyShake : setPlayerShake;
        setTimeout(() => { setShake(true); }, 400);
        setTimeout(() => { setShake(false); }, 800);
        setTimeout(() => { setAttackEffect({ element: null, target: null }); }, 1400);
    }

    // ── Creature selector handlers ──
    const handleSelectCreature = (c: PartnerCreature) => {
        setPlayerCreature(c);
        setScreen('battle');
        setTimeout(() => {
            setPhase('select_action', `Apa yang akan dilakukan ${c.nickname || c.name}?`);
            setMenuOpen(true);
        }, 300);
    };

    const handleCancelSelector = () => {
        endBattle();
        setMenuState('playing');
    };

    // ── Battle action handlers ──
    const handleAttack = () => {
        if (!playerCreature) return;
        setMenuOpen(false);
        const attackName = ELEMENT_CFG[playerElement]?.attackName || 'Tackle';
        setPhase('player_attack', `${playerCreature.nickname || playerCreature.name} menggunakan ${attackName}!`);
        const targetId = 
            wildCreature.id === 3 ? 'orangutan' :
            wildCreature.id === 8 ? 'komodo' :
            wildCreature.id === 4 ? 'elangjawa' :
            wildCreature.id === 5 ? 'badak' : null;
        if (targetId) completeTask(targetId, `battle_${targetId}`);
        triggerAttack(playerElement, 'enemy');

        setTimeout(() => {
            const dmg = 10 + Math.floor(Math.random() * 10);
            damageWild(dmg);
            if (wildHp - dmg <= 0) {
                setTimeout(() => {
                    setPhase('win', `${wildCreature.name} tidak bisa bertarung lagi!`);
                    setTimeout(() => { endBattle(); setMenuState('playing'); }, 2000);
                }, 1000);
            } else {
                setTimeout(() => {
                    const eName = ELEMENT_CFG[wildElement]?.attackName || 'Strike';
                    setPhase('enemy_attack', `${wildCreature.name} membalas dengan ${eName}!`);
                    triggerAttack(wildElement, 'player');
                    setTimeout(() => {
                        const eDmg = 5 + Math.floor(Math.random() * 8);
                        damagePlayer(eDmg);
                        if (playerHp - eDmg <= 0) {
                            setTimeout(() => {
                                setPhase('flee', 'Kamu pingsan! Mundur dulu...');
                                setTimeout(() => { endBattle(); setMenuState('playing'); }, 2000);
                            }, 1000);
                        } else {
                            setTimeout(() => {
                                setPhase('select_action', `Apa yang akan dilakukan ${playerCreature.nickname || playerCreature.name}?`);
                                setMenuOpen(true);
                            }, 1000);
                        }
                    }, 1500);
                }, 1500);
            }
        }, 1500);
    };

    const handleDefend = () => {
        if (!playerCreature) return;
        setMenuOpen(false);
        setDefenseActive(true);
        setPhase('select_action', `${playerCreature.nickname || playerCreature.name} mengambil posisi bertahan!`);

        setTimeout(() => {
            const eName = ELEMENT_CFG[wildElement]?.attackName || 'Strike';
            setPhase('enemy_attack', `${wildCreature.name} menggunakan ${eName}!`);
            triggerAttack(wildElement, 'player');

            setTimeout(() => {
                const rawDmg = 5 + Math.floor(Math.random() * 8);
                const reducedDmg = Math.max(1, Math.floor(rawDmg * 0.4));
                damagePlayer(reducedDmg);

                setTimeout(() => {
                    setDefenseActive(false);
                    if (playerHp - reducedDmg <= 0) {
                        setPhase('flee', 'Kamu pingsan! Mundur dulu...');
                        setTimeout(() => { endBattle(); setMenuState('playing'); }, 2000);
                    } else {
                        setPhase('select_action', `Diblokir! Hanya ${reducedDmg} damage.`);
                        setMenuOpen(true);
                    }
                }, 1200);
            }, 1500);
        }, 1200);
    };

    const handleCatch = () => {
        setMenuOpen(false);
        setPhase('catch_attempt', 'Kamu melempar Arloji!');

        setTimeout(() => {
            const chance = 1 - (wildHp / wildMaxHp);
            if (Math.random() < chance + 0.2) {
                // Generate instanceId immediately so we can reference it for nicknaming
                const instanceId = `${wildCreature.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                const caught: PartnerCreature = { ...wildCreature, level: 1, exp: 0, instanceId };

                setPhase('catch_success', `Gotcha! ${wildCreature.name} berhasil ditangkap!`);
                addCreature(caught);

                const targetId = 
                    wildCreature.id === 3 ? 'orangutan' :
                    wildCreature.id === 8 ? 'komodo' :
                    wildCreature.id === 4 ? 'elangjawa' :
                    wildCreature.id === 5 ? 'badak' : null;
                if (targetId) completeTask(targetId, `catch_${targetId}`);

                // Show catch success screen
                setTimeout(() => {
                    setJustCaught(caught);
                    setScreen('catch_success');
                }, 600);
            } else {
                setPhase('enemy_attack', `${wildCreature.name} berhasil melepaskan diri!`);
                setTimeout(() => {
                    setPhase('select_action', `Apa yang akan dilakukan ${playerCreature?.nickname || playerCreature?.name}?`);
                    setMenuOpen(true);
                }, 2000);
            }
        }, 2000);
    };

    const handleRun = () => {
        setMenuOpen(false);
        setPhase('flee', 'Berhasil melarikan diri!');
        setTimeout(() => { endBattle(); setMenuState('playing'); }, 1500);
    };

    // ── Nickname done ──
    const handleNicknameDone = (nickname: string) => {
        if (!justCaught) return;
        const trimmed = nickname.trim();
        const finalNickname = trimmed && trimmed !== justCaught.name ? trimmed : '';
        if (finalNickname) {
            nicknameCreature(justCaught.instanceId, finalNickname);
        }

        // Add the caught creature to Firestore
        import('../../lib/firebase').then(({ db, auth }) => {
            import('firebase/firestore').then(({ arrayUnion, doc, updateDoc }) => {
                const user = auth.currentUser;
                if (user) {
                    const caughtData = { ...justCaught, nickname: finalNickname || justCaught.name };
                    updateDoc(doc(db, 'players', user.uid), {
                        capturedCreatures: arrayUnion(caughtData)
                    }).catch(e => console.error('Error saving catch to firestore', e));
                }
            });
        }).catch(e => console.error(e));

        endBattle();
        setMenuState('playing');
    };

    const wildAnim   = phase === 'enemy_attack' ? 'attack' : 'idle';
    const playerAnim = phase === 'player_attack' ? 'attack' : 'idle';

    return (
        <>
            <style>{`
                @keyframes shakeAnim {
                    0%,100% { transform: translateX(0); }
                    15% { transform: translateX(-10px); }
                    30% { transform: translateX(10px); }
                    45% { transform: translateX(-6px); }
                    60% { transform: translateX(6px); }
                    80% { transform: translateX(-3px); }
                }
                @keyframes msgIn {
                    from { opacity: 0; transform: translateY(5px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeSlideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes cardIn {
                    from { opacity: 0; transform: scale(0.94); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes popIn {
                    from { opacity: 0; transform: scale(0.5); }
                    to   { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes burstRing {
                    0%   { opacity: 1; transform: scale(0.3); }
                    100% { opacity: 0; transform: scale(2.5); }
                }
            `}</style>

            <div style={{
                position: 'absolute', inset: 0, zIndex: 50,
                fontFamily: 'var(--font-nanum-pen)',
                pointerEvents: 'auto',
            }}>

                {/* ── Screen: Creature Selector ── */}
                {screen === 'select' && (
                    <CreatureSelectorScreen
                        creatures={capturedCreatures}
                        wildName={wildCreature.name}
                        wildElement={wildCreature.element}
                        onSelect={handleSelectCreature}
                        onCancel={handleCancelSelector}
                    />
                )}

                {/* ── Screen: Battle ── */}
                {screen === 'battle' && playerCreature && (
                    <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', flexDirection: 'column',
                        background: 'linear-gradient(180deg,#87CEEB 0%,#b0ddf7 55%,#8BC34A 100%)',
                    }}>
                        {/* 3D Arena */}
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            <BattleArena
                                playerUrl={playerCreature.modelUrl}
                                playerScale={playerCreature.scale}
                                playerAnim={playerAnim}
                                enemyUrl={wildCreature.modelUrl}
                                enemyScale={wildCreature.scale}
                                enemyAnim={wildAnim}
                                attackEffect={attackEffect}
                                defenseActive={defenseActive}
                            />

                            {/* Enemy HUD */}
                            <div style={{ position: 'absolute', top: 16, left: 16 }}>
                                <CreatureCard
                                    name={wildCreature.name}
                                    level={wildCreature.level || 5}
                                    element={wildCreature.element}
                                    hpPct={enemyHpPct}
                                    shake={enemyShake}
                                />
                            </div>

                            {/* Player HUD */}
                            <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                                <CreatureCard
                                    name={playerCreature.nickname || playerCreature.name}
                                    level={playerCreature.level || 5}
                                    element={playerElement}
                                    hpPct={playerHpPct}
                                    hp={playerHp}
                                    maxHp={playerMaxHp}
                                    showHpNum
                                    shake={playerShake}
                                />
                            </div>
                        </div>

                        {/* Bottom dialog */}
                        <div style={{
                            minHeight: 148,
                            background: '#E5E7EB',
                            borderTop: '3px solid #374151',
                            display: 'flex', flexDirection: 'row',
                            alignItems: 'stretch', gap: 12, padding: '10px 12px',
                        }}>
                            {/* Message */}
                            <div style={{
                                flex: 1, background: '#fff',
                                border: '2px solid #374151', borderRadius: 14,
                                padding: '14px 18px', display: 'flex', alignItems: 'center', overflow: 'hidden',
                            }}>
                                <p key={message} style={{
                                    margin: 0, fontSize: 'clamp(1rem,2.5vw,1.5rem)',
                                    fontWeight: 900, color: '#374151',
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                    lineHeight: 1.4, animation: 'msgIn 0.25s ease-out',
                                }}>
                                    {message}
                                </p>
                            </div>

                            {/* Buttons */}
                            {menuOpen && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: 280, flexShrink: 0 }}>
                                    <BattleBtn onClick={handleAttack} color="#EF4444" Icon={Sword}      label="Fight"  />
                                    <BattleBtn onClick={handleCatch}  color="#3B82F6" Icon={Watch}      label="Arloji" />
                                    <BattleBtn onClick={handleDefend} color="#10B981" Icon={Shield}     label="Defend" />
                                    <BattleBtn onClick={handleRun}    color="#F59E0B" Icon={Footprints} label="Run"    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Screen: Catch success transition ── */}
                {screen === 'catch_success' && justCaught && (
                    <CatchSuccessScreen
                        creature={justCaught}
                        onContinue={() => setScreen('nickname')}
                    />
                )}

                {/* ── Screen: Nickname page ── */}
                {screen === 'nickname' && justCaught && (
                    <NicknameScreen
                        creature={justCaught}
                        onDone={handleNicknameDone}
                    />
                )}
            </div>
        </>
    );
}
