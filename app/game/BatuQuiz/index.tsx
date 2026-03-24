import React, { useState, useEffect, useRef } from 'react';
import { Timer, Star, Award, ChevronRight, CheckCircle2, XCircle, Sparkles, AlertCircle, Zap, Target, Brain } from 'lucide-react';
import { useStoneStore } from '../stoneStore';
import { useJoystickStore } from '../store';
import { QUIZ_DATA, TOTAL_TIME, XP_PER_QUESTION, QUESTIONS_PER_ROUND } from './data';
import { randomizeBatuPosition } from '../Planet';
import { useBattleStore } from '../battleStore';
import { useCreatureStore } from '../../nusadex/store';
import { NUSA_CREATURES } from '../../nusadex/creatures';
import dynamic from 'next/dynamic';

const BossReveal = dynamic(() => import('./BossReveal'), { ssr: false });

// ─────────────────────────────────────────────
// 3D Stone component (pure CSS)
// ─────────────────────────────────────────────
function Stone3D({ onClick, isAnimating }: { onClick: () => void; isAnimating?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setRotX(((e.clientY - cy) / rect.height) * -30);
    setRotY(((e.clientX - cx) / rect.width) * 30);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setRotX(0);
    setRotY(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className="cursor-pointer select-none"
      style={{ perspective: '600px' }}
    >
      <div
        style={{
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) ${hovered ? 'translateY(-8px) scale(1.05)' : 'translateY(0) scale(1)'}`,
          transition: isAnimating ? 'none' : 'transform 0.15s ease-out',
          transformStyle: 'preserve-3d',
          animation: isAnimating ? 'none' : 'stoneBob 3s ease-in-out infinite',
        }}
      >
        {/* Main stone body */}
        <div
          style={{
            width: '160px',
            height: '160px',
            background: 'linear-gradient(145deg, #6B7280 0%, #374151 40%, #1F2937 100%)',
            borderRadius: '40% 60% 55% 45% / 50% 45% 55% 50%',
            border: '4px solid #111827',
            boxShadow: hovered
              ? '0 20px 40px rgba(0,0,0,0.6), inset 2px 2px 0 rgba(255,255,255,0.15), inset -2px -2px 0 rgba(0,0,0,0.3)'
              : '8px 8px 0px #111827, 0 4px 20px rgba(0,0,0,0.4), inset 2px 2px 0 rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shine overlay */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: '35%',
            height: '30%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 100%)',
            borderRadius: '50%',
            transform: 'rotate(-30deg)',
          }} />
          {/* Rune marks */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: '48px', lineHeight: 1 }}>🪨</div>
            <div style={{
              marginTop: '4px',
              fontSize: '10px',
              letterSpacing: '3px',
              color: 'rgba(167,243,208,0.8)',
              fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(167,243,208,0.6)',
            }}>KUIS</div>
          </div>
          {/* Glowing particles */}
          {hovered && [0,1,2].map(i => (
            <div key={i} style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#A7F3D0',
              top: `${20 + i * 25}%`,
              left: `${15 + i * 30}%`,
              animation: `particle ${0.8 + i * 0.3}s ease-out infinite`,
              boxShadow: '0 0 6px #A7F3D0',
            }} />
          ))}
        </div>
        {/* Bottom face for 3D illusion */}
        <div style={{
          width: '160px',
          height: '12px',
          background: '#111827',
          borderRadius: '0 0 50% 50%',
          marginTop: '-6px',
          opacity: 0.5,
          filter: 'blur(2px)',
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Answer Button 3D
// ─────────────────────────────────────────────
function AnswerButton({
  alphabet, option, onClick, disabled, state
}: {
  alphabet: string;
  option: string;
  onClick: () => void;
  disabled: boolean;
  state: 'default' | 'correct' | 'wrong' | 'dimmed';
}) {
  const [pressed, setPressed] = useState(false);

  const configs = {
    default: {
      bg: 'linear-gradient(180deg, #FFFDE8 0%, #FFF9E6 100%)',
      border: '#374151',
      shadow: '4px 4px 0 #374151',
      textColor: '#374151',
      badgeBg: '#FEF08A',
    },
    correct: {
      bg: 'linear-gradient(180deg, #DCFCE7 0%, #A7F3D0 100%)',
      border: '#374151',
      shadow: '4px 4px 0 #374151',
      textColor: '#065F46',
      badgeBg: '#6EE7B7',
    },
    wrong: {
      bg: 'linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)',
      border: '#374151',
      shadow: '4px 4px 0 #374151',
      textColor: '#991B1B',
      badgeBg: '#FCA5A5',
    },
    dimmed: {
      bg: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)',
      border: '#9CA3AF',
      shadow: '4px 4px 0 #9CA3AF',
      textColor: '#9CA3AF',
      badgeBg: '#D1D5DB',
    },
  };

  const cfg = configs[state];

  return (
    <button
      disabled={disabled}
      onClick={() => { if (!disabled) { setPressed(true); onClick(); } }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        background: cfg.bg,
        border: `3px solid ${cfg.border}`,
        boxShadow: pressed || state !== 'default' ? '1px 1px 0 ' + cfg.border : cfg.shadow,
        transform: pressed || state === 'wrong' ? 'translate(3px, 3px)' : 'translate(0,0)',
        transition: 'all 0.12s ease',
        borderRadius: '16px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'default' : 'pointer',
        width: '100%',
        textAlign: 'left',
        animation: state === 'correct' ? 'correctPulse 0.4s ease-out' : state === 'wrong' ? 'wrongShake 0.4s ease-out' : 'none',
      }}
    >
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        background: cfg.badgeBg,
        border: `3px solid ${cfg.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 900,
        fontSize: '18px',
        color: cfg.textColor,
        flexShrink: 0,
      }}>
        {state === 'correct' ? <CheckCircle2 size={20} /> : state === 'wrong' ? <XCircle size={20} /> : alphabet}
      </div>
      <span style={{ fontWeight: 700, fontSize: '16px', color: cfg.textColor, flex: 1 }}>
        {option}
      </span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function BatuQuiz() {
  const { endMinigame, nearbyStoneId, triggerRespawn, playerPosition } = useStoneStore();
  const setMenuState = useJoystickStore(s => s.setMenuState);
  const startBattle = useBattleStore(s => s.startBattle);
  const { capturedCreatures, firstPartner } = useCreatureStore();

  const [gameState, setGameState] = useState<'intro' | 'animating' | 'playing' | 'feedback' | 'finished' | 'timeout' | 'boss_reveal' | 'fading_out'>('intro');
  const [activeQuestions, setActiveQuestions] = useState<typeof QUIZ_DATA>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [xp, setXp] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [introMounted, setIntroMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIntroMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('timeout');
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  const handleStoneClick = () => {
    setGameState('animating');
    setTimeout(() => startQuiz(), 1200);
  };

  const startQuiz = () => {
    const shuffled = [...QUIZ_DATA].sort(() => 0.5 - Math.random());
    setActiveQuestions(shuffled.slice(0, QUESTIONS_PER_ROUND));
    setCurrentQuestionIdx(0);
    setTimeLeft(TOTAL_TIME);
    setXp(0);
    setStats({ correct: 0, wrong: 0 });
    setUserAnswers([]);
    setGameState('playing');
  };

  const handleAnswerClick = (option: string) => {
    if (gameState !== 'playing' || activeQuestions.length === 0) return;
    const question = activeQuestions[currentQuestionIdx];
    const correct = option === question.correctAnswer;
    setSelectedOption(option);
    setIsCorrect(correct);
    setGameState('feedback');
    if (correct) {
      setXp(prev => prev + XP_PER_QUESTION);
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
    setUserAnswers(prev => [...prev, { questionId: question.id, selected: option, isCorrect: correct }]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < QUESTIONS_PER_ROUND - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setGameState('playing');
    } else {
      // Trigger boss reveal after last question!
      setGameState('boss_reveal');
    }
  };

  const quitMinigame = () => { endMinigame(); setMenuState('playing'); };

  const finishAndRespawn = () => {
    setGameState('fading_out');
    setTimeout(() => {
      if (nearbyStoneId !== null) { randomizeBatuPosition(nearbyStoneId, playerPosition ?? undefined); triggerRespawn(); }
      quitMinigame();
    }, 800);
  };

  // ── Boss Fight Handlers ──
  const handleBossFight = () => {
    const harimau = NUSA_CREATURES.find(c => c.id === 5);
    if (!harimau) return;

    // Pick the player's best creature
    const playerPartner = firstPartner ||
      (capturedCreatures.length > 0 ? capturedCreatures[0] : null);

    if (!playerPartner) {
      // No partner — just finish normally
      finishAndRespawn();
      return;
    }

    // Start battle data FIRST, then switch menu state
    // This ensures BattleUI has data when it mounts
    startBattle(harimau, playerPartner);
    endMinigame(); // clears stone state
    setMenuState('battle'); // BattleUI mounts, BatuQuiz unmounts
  };

  const handleBossFlee = () => {
    setGameState('finished');
  };

  // ── Screens ─────────────────────────────────

  const renderAnimating = () => (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFF9E6', zIndex: 10,
      animation: 'zoomIn 1.2s cubic-bezier(0.22,1,0.36,1) forwards',
    }}>
      <div style={{ animation: 'spinScale 1.2s ease-in-out forwards' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: '#374151', border: '4px solid #111827',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '4px 4px 0 #111827',
        }}>
          <Sparkles size={40} color="#FEF08A" strokeWidth={2.5} />
        </div>
      </div>
      <div style={{ marginTop: '16px', fontWeight: 900, fontSize: '24px', color: '#374151', letterSpacing: '4px' }}>
        MEMUAT...
      </div>
    </div>
  );

  const renderIntro = () => (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', pointerEvents: 'auto',
      opacity: introMounted ? 1 : 0,
      transform: introMounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{
        maxWidth: '420px', width: '100%',
        background: '#FFF9E6',
        border: '4px solid #374151',
        borderRadius: '32px',
        boxShadow: '8px 8px 0 #374151',
        padding: '32px 28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Top badge */}
        <div style={{
          position: 'absolute', top: '-2px', left: '50%', transform: 'translateX(-50%)',
          background: '#FEF08A', border: '4px solid #374151', borderTop: 'none',
          borderRadius: '0 0 16px 16px',
          padding: '4px 20px',
          fontWeight: 900, fontSize: '13px', color: '#374151', letterSpacing: '3px',
          boxShadow: '0 4px 0 #374151',
        }}>
          BATU KUNO
        </div>

        <div style={{ textAlign: 'center', paddingTop: '24px' }}>
          {/* 3D Stone */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <Stone3D onClick={handleStoneClick} />
          </div>

          <h2 style={{ fontSize: '40px', fontWeight: 900, color: '#374151', margin: '0 0 8px', letterSpacing: '-1px' }}>
            Batu Quiz
          </h2>
          <p style={{ color: '#6B7280', fontStyle: 'italic', fontSize: '14px', margin: '0 0 4px' }}>
            "Batu ini menyimpan rahasia alam Nusantara."
          </p>
          <p style={{ color: '#374151', fontSize: '14px', fontWeight: 700, margin: '0 0 24px' }}>
            Jawab <span style={{ color: '#D97706', background: '#FEF08A', padding: '0 6px', borderRadius: '6px', border: '2px solid #374151' }}>{QUESTIONS_PER_ROUND} soal</span> dalam{' '}
            <span style={{ color: '#059669', background: '#A7F3D0', padding: '0 6px', borderRadius: '6px', border: '2px solid #374151' }}>60 detik</span>
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            {[
              { icon: <Brain size={18} />, label: `${QUESTIONS_PER_ROUND} Soal`, bg: '#BFDBFE' },
              { icon: <Zap size={18} />, label: `+${XP_PER_QUESTION} XP/soal`, bg: '#FEF08A' },
              { icon: <Target size={18} />, label: `${TOTAL_TIME} Detik`, bg: '#A7F3D0' },
            ].map((item, i) => (
              <div key={i} style={{
                flex: 1, background: item.bg, border: '3px solid #374151',
                borderRadius: '14px', padding: '10px 6px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                boxShadow: '3px 3px 0 #374151', color: '#374151', fontWeight: 800, fontSize: '12px',
              }}>
                {item.icon}
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleStoneClick}
            style={{
              width: '100%', padding: '16px',
              background: 'linear-gradient(180deg, #374151 0%, #1F2937 100%)',
              border: '4px solid #111827',
              borderRadius: '16px',
              boxShadow: '4px 4px 0 #111827',
              color: '#FFF9E6', fontWeight: 900, fontSize: '18px',
              cursor: 'pointer', letterSpacing: '1px',
              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
            }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(4px,4px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0px 0px 0 #111827'; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111827'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111827'; }}
          >
            <Sparkles size={20} strokeWidth={2.5} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
            Eksplor Batu
          </button>
          <button
            onClick={quitMinigame}
            style={{
              width: '100%', padding: '14px',
              background: 'transparent',
              border: '3px solid #374151',
              borderRadius: '16px',
              color: '#374151', fontWeight: 800, fontSize: '16px',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#F3F4F6'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            Tinggalkan
          </button>
        </div>
      </div>
    </div>
  );

  const renderQuiz = () => {
    if (activeQuestions.length === 0) return null;
    const question = activeQuestions[currentQuestionIdx];
    const isFeedback = gameState === 'feedback';
    const timerPct = (timeLeft / TOTAL_TIME) * 100;
    const timerColor = timeLeft <= 10 ? '#EF4444' : timeLeft <= 20 ? '#F59E0B' : '#059669';
    const progressPct = ((currentQuestionIdx) / QUESTIONS_PER_ROUND) * 100;

    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        padding: '16px', pointerEvents: 'auto', overflowY: 'auto',
      }}>
        <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100%' }}>

          {/* Header */}
          <div style={{
            background: '#FFF9E6', border: '4px solid #374151', borderRadius: '20px',
            boxShadow: '4px 4px 0 #374151', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
          }}>
            {/* Progress */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 900, fontSize: '13px', color: '#374151' }}>SOAL {currentQuestionIdx + 1}/{QUESTIONS_PER_ROUND}</span>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#6B7280' }}>{Math.round(progressPct)}%</span>
              </div>
              <div style={{ height: '8px', background: '#E5E7EB', border: '2px solid #374151', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #A7F3D0, #059669)',
                  borderRadius: '999px', transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            {/* Timer */}
            <div style={{
              flexShrink: 0, width: '64px', height: '64px',
              border: `4px solid ${timerColor}`,
              borderRadius: '50%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: timeLeft <= 10 ? 'rgba(239,68,68,0.1)' : '#fff',
              boxShadow: `0 0 0 3px ${timerColor}33`,
              animation: timeLeft <= 10 ? 'timerPulse 1s ease-in-out infinite' : 'none',
              position: 'relative',
            }}>
              <span style={{ fontWeight: 900, fontSize: '20px', color: timerColor, lineHeight: 1 }}>{timeLeft}</span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: timerColor, opacity: 0.7 }}>DETIK</span>
            </div>
            {/* XP */}
            <div style={{
              background: '#FEF08A', border: '3px solid #374151', borderRadius: '14px',
              padding: '8px 12px', textAlign: 'center', boxShadow: '3px 3px 0 #374151',
              flexShrink: 0,
            }}>
              <div style={{ fontWeight: 900, fontSize: '18px', color: '#374151' }}>{xp}</div>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#92400E' }}>XP</div>
            </div>
          </div>

          {/* Question Card */}
          <div style={{
            background: 'linear-gradient(135deg, #374151 0%, #1F2937 100%)',
            border: '4px solid #111827', borderRadius: '24px',
            boxShadow: '6px 6px 0 #111827',
            padding: '24px', position: 'relative', overflow: 'hidden', flexShrink: 0,
          }}>
            {/* Decorative dot grid */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.05,
              backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
              backgroundSize: '16px 16px', pointerEvents: 'none',
            }} />
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', position: 'relative',
            }}>
              <div style={{
                background: '#FEF08A', border: '3px solid #FFF9E6', borderRadius: '12px',
                padding: '8px 12px', fontWeight: 900, fontSize: '14px', color: '#374151',
                flexShrink: 0, letterSpacing: '1px',
              }}>
                Q{currentQuestionIdx + 1}
              </div>
              <h2 style={{
                fontSize: 'clamp(16px, 3vw, 22px)', fontWeight: 800, color: '#FFF9E6',
                lineHeight: 1.4, margin: 0,
              }}>
                {question.question}
              </h2>
            </div>
          </div>

          {/* Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', flexShrink: 0 }}>
            {question.options.map((option, idx) => {
              const alphabet = ['A', 'B', 'C', 'D'][idx];
              let state: 'default' | 'correct' | 'wrong' | 'dimmed' = 'default';
              if (isFeedback) {
                if (option === question.correctAnswer) state = 'correct';
                else if (option === selectedOption) state = 'wrong';
                else state = 'dimmed';
              }
              return (
                <AnswerButton
                  key={idx}
                  alphabet={alphabet}
                  option={option}
                  onClick={() => handleAnswerClick(option)}
                  disabled={isFeedback}
                  state={state}
                />
              );
            })}
          </div>

          {/* Feedback Card */}
          {isFeedback && (
            <div style={{
              background: isCorrect ? '#DCFCE7' : '#FEE2E2',
              border: `4px solid ${isCorrect ? '#059669' : '#DC2626'}`,
              borderRadius: '20px',
              boxShadow: `6px 6px 0 ${isCorrect ? '#059669' : '#DC2626'}`,
              padding: '20px',
              animation: 'feedbackSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{
                  background: isCorrect ? '#059669' : '#DC2626',
                  borderRadius: '50%', padding: '6px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isCorrect
                    ? <CheckCircle2 size={20} color="white" />
                    : <XCircle size={20} color="white" />
                  }
                </div>
                <div>
                  <h3 style={{
                    fontWeight: 900, fontSize: '18px', margin: 0,
                    color: isCorrect ? '#065F46' : '#991B1B',
                  }}>
                    {isCorrect ? 'Luar Biasa! +10 XP' : 'Kurang Tepat'}
                  </h3>
                  {!isCorrect && (
                    <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                      Jawaban: {question.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: isCorrect ? '#065F46' : '#991B1B', lineHeight: 1.5 }}>
                {question.explanation}
              </p>
              <button
                onClick={handleNextQuestion}
                style={{
                  width: '100%', marginTop: '12px', padding: '12px 16px',
                  background: 'linear-gradient(180deg, #374151 0%, #1F2937 100%)',
                  border: '3px solid #111827', borderRadius: '12px',
                  boxShadow: '3px 3px 0 #111827',
                  color: '#FFF9E6', fontWeight: 800, fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                }}
                onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(3px,3px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 #111827'; }}
                onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0 #111827'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '3px 3px 0 #111827'; }}
              >
                Lanjutkan <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const isTimeout = gameState === 'timeout';
    const accuracy = QUESTIONS_PER_ROUND > 0 ? Math.round((stats.correct / QUESTIONS_PER_ROUND) * 100) : 0;
    const grade = accuracy >= 80 ? { label: 'Luar Biasa!', color: '#059669', bg: '#A7F3D0', Icon: Award }
      : accuracy >= 60 ? { label: 'Bagus!', color: '#D97706', bg: '#FEF08A', Icon: Star }
      : { label: 'Terus Belajar!', color: '#DC2626', bg: '#FCA5A5', Icon: Zap };

    return (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', pointerEvents: 'auto',
      }}>
        <div style={{
          maxWidth: '420px', width: '100%',
          background: '#FFF9E6', border: '4px solid #374151',
          borderRadius: '32px', boxShadow: '8px 8px 0 #374151',
          padding: '32px 28px',
          animation: 'resultPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {isTimeout ? (
              <>
                <div style={{ animation: 'shake 0.5s ease-out', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
                  <Timer size={64} color="#DC2626" strokeWidth={2} />
                </div>
                <h2 style={{ fontWeight: 900, fontSize: '32px', color: '#DC2626', margin: '8px 0 4px' }}>Waktu Habis!</h2>
                <p style={{ color: '#6B7280', fontStyle: 'italic', margin: 0 }}>Kamu kehabisan waktu.</p>
              </>
            ) : (
              <>
                <div style={{
                  display: 'inline-flex',
                  background: grade.bg, border: '4px solid #374151',
                  borderRadius: '999px', padding: '16px 24px',
                  boxShadow: '4px 4px 0 #374151', marginBottom: '12px',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <grade.Icon size={48} color={grade.color} strokeWidth={2} />
                </div>
                <h2 style={{ fontWeight: 900, fontSize: '32px', color: '#374151', margin: '8px 0 4px' }}>
                  {grade.label}
                </h2>
                <p style={{ color: '#6B7280', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>
                  "Kamu telah menjelajahi Batu Quiz!"
                </p>
              </>
            )}
          </div>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'EXP', value: `+${xp}`, bg: '#FEF08A', Icon: Star },
              { label: 'Benar', value: stats.correct, bg: '#A7F3D0', Icon: CheckCircle2 },
              { label: 'Salah', value: stats.wrong, bg: '#FCA5A5', Icon: XCircle },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.bg, border: '3px solid #374151',
                borderRadius: '16px', padding: '12px 8px',
                textAlign: 'center', boxShadow: '3px 3px 0 #374151',
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}><s.Icon size={20} color="#374151" strokeWidth={2.5} /></div>
                <div style={{ fontWeight: 900, fontSize: '22px', color: '#374151' }}>{s.value}</div>
                <div style={{ fontWeight: 700, fontSize: '11px', color: '#374151', opacity: 0.7 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Accuracy bar */}
          {!isTimeout && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#374151' }}>Akurasi</span>
                <span style={{ fontWeight: 900, fontSize: '13px', color: '#374151' }}>{accuracy}%</span>
              </div>
              <div style={{ height: '12px', background: '#E5E7EB', border: '3px solid #374151', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${accuracy}%`,
                  background: accuracy >= 80 ? '#059669' : accuracy >= 60 ? '#D97706' : '#DC2626',
                  borderRadius: '999px', transition: 'width 1s ease',
                }} />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={finishAndRespawn}
              style={{
                width: '100%', padding: '16px',
                background: 'linear-gradient(180deg, #374151 0%, #1F2937 100%)',
                border: '4px solid #111827', borderRadius: '16px',
                boxShadow: '4px 4px 0 #111827',
                color: '#FFF9E6', fontWeight: 900, fontSize: '18px',
                cursor: 'pointer', letterSpacing: '1px',
              }}
              onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translate(4px,4px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 #111827'; }}
              onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111827'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = '4px 4px 0 #111827'; }}
            >
              Selesaikan Penjelajahan
            </button>

          </div>
        </div>
      </div>
    );
  };

  // ── Root ────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes stoneBob {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes particle {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-20px) scale(0); opacity: 0; }
        }
        @keyframes zoomIn {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spinScale {
          0% { transform: scale(0) rotate(-180deg); }
          70% { transform: scale(1.2) rotate(10deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes correctPulse {
          0% { transform: scale(1); }
          30% { transform: scale(1.05) translateY(-3px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes wrongShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes feedbackSlideIn {
          0% { transform: translateY(20px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes resultPop {
          0% { transform: scale(0.8) translateY(20px); opacity: 0; }
          70% { transform: scale(1.03) translateY(-4px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .batu-quiz-bg {
          background: #FFF9E6;
          background-image: radial-gradient(#374151 1.5px, transparent 1.5px);
          background-size: 24px 24px;
        }
      `}} />

      {/* Background overlay */}
      <div
        className="batu-quiz-bg"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: gameState !== 'fading_out' ? 'auto' : 'none',
          opacity: gameState === 'fading_out' ? 0 : 1,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Screens */}
      {gameState === 'animating' && renderAnimating()}
      {gameState === 'intro' && renderIntro()}
      {(gameState === 'playing' || gameState === 'feedback') && renderQuiz()}
      {(gameState === 'finished' || gameState === 'timeout' || gameState === 'fading_out') && renderResult()}
      {gameState === 'boss_reveal' && (
        <BossReveal
          onFightNow={handleBossFight}
          onFlee={handleBossFlee}
        />
      )}
    </div>
  );
}
