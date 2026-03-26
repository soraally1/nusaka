'use client'

import { useEffect, useState } from 'react'
import { useMissionStore } from './store'
import { CheckCircle2, MapPin, ChevronDown, ChevronUp, Scroll } from 'lucide-react'
import { auth, db } from '../../lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'

// ─── Mission task definitions ─────────────────────────────────────────────────
export const MISSION_TASKS: Record<string, { id: string; label: string }[]> = {
  orangutan: [
    { id: 'find_orangutan', label: 'Temukan Orang Utan di hutan barat' },
    { id: 'battle_orangutan', label: 'Hadapi Orang Utan dalam pertarungan' },
    { id: 'catch_orangutan', label: 'Tangkap dan lindungi Orang Utan' },
  ],
  komodo: [
    { id: 'find_komodo', label: 'Temukan jejak Naga Timur' },
    { id: 'battle_komodo', label: 'Hadapi sang Naga dalam pertarungan' },
    { id: 'catch_komodo', label: 'Tangkap dan lindungi Komodo' },
  ],
  elangjawa: [
    { id: 'find_elangjawa', label: 'Temukan Elang Jawa di puncak langit' },
    { id: 'battle_elangjawa', label: 'Hadapi penguasa sayap langit' },
    { id: 'catch_elangjawa', label: 'Tangkap dan lindungi Elang Jawa' },
  ],
  badak: [
    { id: 'find_badak', label: 'Temukan badak yang pemalu' },
    { id: 'battle_badak', label: 'Hadapi badak bercula satu tertangguh' },
    { id: 'catch_badak', label: 'Tangkap dan lindungi Badak Jawa' },
  ],
}

// ─── Firestore task helpers ───────────────────────────────────────────────────
// Store completed task IDs in Firestore under missionTasks_{missionId} array
let _cachedTasks: Record<string, Set<string>> = {}

export async function completeTask(mission: string, taskId: string) {
  try {
    // Update in-memory cache immediately
    if (!_cachedTasks[mission]) _cachedTasks[mission] = new Set()
    _cachedTasks[mission].add(taskId)

    // Notify HUD to refresh
    window.dispatchEvent(new CustomEvent('mission_task_update', { detail: { mission, taskId } }))

    // Write to Firestore
    const user = auth.currentUser
    if (user) {
      await updateDoc(doc(db, 'players', user.uid), {
        [`missionTasks_${mission}`]: arrayUnion(taskId),
      })
    }
  } catch (e) {
    console.error('completeTask error', e)
  }
}

async function loadCompletedTasks(mission: string): Promise<Set<string>> {
  // Return cache if available
  if (_cachedTasks[mission]) return _cachedTasks[mission]

  const user = auth.currentUser
  if (!user) return new Set()

  try {
    const snap = await getDoc(doc(db, 'players', user.uid))
    if (snap.exists()) {
      const arr: string[] = snap.data()[`missionTasks_${mission}`] || []
      _cachedTasks[mission] = new Set(arr)
      return _cachedTasks[mission]
    }
  } catch (e) {
    console.error('loadCompletedTasks error', e)
  }
  return new Set()
}

// ─── MissionHUD ───────────────────────────────────────────────────────────────
export function MissionHUD() {
  const { currentMission, missionStatus, setMission, completeMission } = useMissionStore()
  const [isVisible, setIsVisible] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [animateIn, setAnimateIn] = useState(false)

  // Load mission from Firestore on mount
  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser
      if (!user) return
      try {
        const snap = await getDoc(doc(db, 'players', user.uid))
        if (!snap.exists()) return
        const data = snap.data()

        // Determine active mission from Firestore booleans
        if (data.currentMission && !data[getMissionDoneKey(data.currentMission)]) {
          const objective = getMissionObjective(data.currentMission)
          setMission(data.currentMission, objective)
          // Also load completed tasks for this mission
          const tasks = await loadCompletedTasks(data.currentMission)
          setCompletedTasks(new Set(tasks))
        }
      } catch (e) {
        console.error('MissionHUD load error', e)
      }
    }
    load()
  }, [setMission])

  // Show HUD when there's an active or completed mission
  useEffect(() => {
    const visible = currentMission !== null && (missionStatus === 'active' || missionStatus === 'completed')
    setIsVisible(visible)
    if (visible) {
      setTimeout(() => setAnimateIn(true), 50)
    } else {
      setAnimateIn(false)
    }
  }, [currentMission, missionStatus])

  // Listen for task updates
  useEffect(() => {
    if (!currentMission) return
    const handler = async () => {
      _cachedTasks[currentMission] = undefined as any // invalidate cache
      const tasks = await loadCompletedTasks(currentMission)
      setCompletedTasks(new Set(tasks))
    }
    window.addEventListener('mission_task_update', handler)
    return () => window.removeEventListener('mission_task_update', handler)
  }, [currentMission])

  const tasks = currentMission ? MISSION_TASKS[currentMission] || [] : []
  const completedCount = tasks.filter(t => completedTasks.has(t.id)).length
  const progressPct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  // Auto-complete when 100%
  useEffect(() => {
    if (progressPct >= 100 && tasks.length > 0 && missionStatus === 'active' && currentMission) {
      completeMission()
    }
  }, [progressPct, missionStatus, completeMission, currentMission, tasks.length])

  if (!isVisible || !currentMission) return null

  const missionNames: Record<string, string> = {
    orangutan: 'Penjaga Rimba',
    komodo: 'Naga Timur',
    elangjawa: 'Penguasa Langit',
    badak: 'Ksatria Ujung Kulon',
  }
  const missionName = missionNames[currentMission] || 'Misi Aktif'

  return (
    <>
      {/* Quest Tracker Panel - Top Left */}
      <div
        className="absolute left-2 z-50 select-none"
        style={{
          top: 'max(160px, 18vh)',
          width: 'min(210px, calc(50vw - 8px))',
          transform: animateIn ? 'translateX(0)' : 'translateX(-120%)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(254, 250, 224, 0.95)',
            backdropFilter: 'blur(12px)',
            border: 'max(2px, 0.25rem) solid #283618',
            borderWidth: '3px',
            boxShadow: '4px 4px 0 #283618',
          }}
        >
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 cursor-pointer group"
            style={{ background: '#606C38' }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 18, height: 18, background: '#BC6C25', border: '2px solid #283618' }}
            >
              <Scroll size={9} className="text-white" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[8px] font-bold text-[#FEFAE0]/70 uppercase tracking-wider leading-none">Misi Aktif</p>
              <p className="text-[10px] font-bold text-[#FEFAE0] leading-tight truncate">{missionName}</p>
            </div>
            {isCollapsed
              ? <ChevronDown size={12} className="text-[#FEFAE0]/70 group-hover:text-[#FEFAE0] transition-colors flex-shrink-0" />
              : <ChevronUp size={12} className="text-[#FEFAE0]/70 group-hover:text-[#FEFAE0] transition-colors flex-shrink-0" />
            }
          </button>

          <div
            style={{
              maxHeight: isCollapsed ? 0 : '300px',
              overflow: 'hidden',
              transition: 'max-height 0.35s ease',
            }}
          >
            <div className="px-2 pt-1.5 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-bold text-[#606C38] uppercase tracking-wider">Prog</span>
                <span className="text-[8px] font-bold text-[#BC6C25]">{completedCount}/{tasks.length}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(40,54,24,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${progressPct}%`,
                    background: progressPct === 100
                      ? 'linear-gradient(90deg, #10B981, #34D399)'
                      : 'linear-gradient(90deg, #BC6C25, #DDA15E)',
                  }}
                />
              </div>
            </div>

            <div className="mx-2 my-1" style={{ height: 1, background: 'rgba(40,54,24,0.12)' }} />

            <div className="px-2 pb-2 space-y-1">
              {missionStatus === 'completed' ? (
                <div className="flex items-center gap-2 bg-[#10B981]/10 p-1.5 rounded-xl border-2 border-[#10B981]/30">
                  <CheckCircle2 size={18} className="text-[#10B981] flex-shrink-0" />
                  <p className="text-[10px] text-[#283618] font-bold leading-tight">
                    Misi Selesai! Lapor ke Kakek.
                  </p>
                </div>
              ) : (
                tasks.map((task, idx) => {
                  const done = completedTasks.has(task.id)
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-1.5 group"
                      style={{ opacity: done ? 0.55 : 1, transition: 'opacity 0.3s ease' }}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {done ? (
                          <CheckCircle2 size={14} style={{ color: '#10B981' }} />
                        ) : (
                          <div
                            className="flex items-center justify-center rounded-full"
                            style={{ width: 14, height: 14, border: '2px solid #BC6C25', background: 'transparent' }}
                          >
                            <span style={{ fontSize: 7, fontWeight: 900, color: '#BC6C25', lineHeight: 1 }}>
                              {idx + 1}
                            </span>
                          </div>
                        )}
                      </div>
                      <p
                        className="text-[10px] leading-snug"
                        style={{
                          color: done ? '#606C38' : '#283618',
                          textDecoration: done ? 'line-through' : 'none',
                          fontWeight: done ? 400 : 600,
                        }}
                      >
                        {task.label}
                      </p>
                    </div>
                  )
                })
              )}

              {tasks.length === 0 && (
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-[#BC6C25] flex-shrink-0" />
                  <p className="text-[10px] text-[#5C4033] font-medium leading-snug">
                    Jelajahi dunia Nusaka!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── MissionCompleteOverlay ───────────────────────────────────────────────────
// ─── MissionCompleteOverlay ───────────────────────────────────────────────────
export function MissionCompleteOverlay({ onClose }: { onClose: () => void }) {
  const { currentMission, missionStatus } = useMissionStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (missionStatus !== 'completed' || !currentMission) return null

  const handleLapor = async () => {
    setIsSubmitting(true)
    const user = auth.currentUser
    if (user && currentMission) {
      try {
        await updateDoc(doc(db, 'players', user.uid), {
          [getMissionDoneKey(currentMission)]: true,
          currentMission: null,
        })
      } catch (e) {
        console.error('Final mission update error:', e)
      }
    }
    setIsSubmitting(false)
    if (onClose) onClose()
  }

  const desc: Record<string, string> = {
    orangutan: 'Kamu berhasil menemukan dan melindungi Orang Utan. Segera lapor ke Kakek Nusaka untuk tugas selanjutnya!',
    komodo: 'Kamu berhasil menelusuri jejak Naga Timur. Temui Kakek Nusaka tentang keberhasilanmu!',
    elangjawa: 'Kamu berhasil menolong penguasa langit biru. Kabari Kakek Nusaka atas pencapaian ini.',
    badak: 'Makhluk bercula satu ini kini aman dari ancaman perburuan! Temui Kakek Nusaka untuk sebuah penghargaan.',
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 pointer-events-auto">
      <div className="bg-[#FEFAE0] border-4 border-[#283618] rounded-[2rem] p-6 sm:p-8 w-full max-w-[95vw] sm:max-w-md mx-auto shadow-[6px_6px_0_#283618] sm:shadow-[8px_8px_0_#283618]">
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#283618]">
            <CheckCircle2 className="text-white w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#283618] mb-2" style={{ fontFamily: 'var(--font-nanum-pen), cursive' }}>
            Misi Selesai!
          </h2>
          <p className="text-[#5C4033] mb-6">
            {desc[currentMission] || 'Kamu berhasil menyelesaikan misi ini. Segera temui dan laporkan ke Kakek Nusaka!'}
          </p>
          <button
            onClick={handleLapor}
            disabled={isSubmitting}
            className="w-full py-3 bg-[#BC6C25] hover:bg-[#A05A1F] disabled:opacity-50 text-[#FEFAE0] font-bold rounded-xl border-4 border-[#283618] transition-all cursor-pointer"
          >
            {isSubmitting ? 'Menyimpan...' : 'Lapor ke Kakek'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helper utilities (shared) ────────────────────────────────────────────────
export function getMissionDoneKey(mission: string): string {
  const map: Record<string, string> = {
    orangutan: 'orangutanDone',
    komodo: 'komodoDone',
    elangjawa: 'elangDone',
    badak: 'badakDone',
  }
  return map[mission] || `${mission}Done`
}

export function getMissionObjective(mission: string): string {
  const map: Record<string, string> = {
    orangutan: 'Tangkap Orang Utan di hutan barat',
    komodo: 'Temukan jejak Naga Purba di pulau timur',
    elangjawa: 'Temukan sarang Elang Jawa di puncak gunung',
    badak: 'Temukan Badak Jawa di hutan Ujung Kulon',
  }
  return map[mission] || ''
}
