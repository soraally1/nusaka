'use client'

import { useEffect, useState } from 'react'
import { useMissionStore } from './store'
import { CheckCircle2, MapPin, ChevronDown, ChevronUp, Scroll } from 'lucide-react'
import { auth } from '../../lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'

// Mission tasks definition per mission type
const MISSION_TASKS: Record<string, { id: string; label: string }[]> = {
  orangutan: [
    { id: 'find_orangutan', label: 'Temukan Orang Utan di hutan barat' },
    { id: 'battle_orangutan', label: 'Hadapi Orang Utan dalam pertarungan' },
    { id: 'catch_orangutan', label: 'Tangkap dan lindungi Orang Utan' },
  ],
}

// Track completed tasks via localStorage
function getCompletedTasks(mission: string): Set<string> {
  try {
    const raw = localStorage.getItem(`mission_tasks_${mission}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

// Exported helper — call this from anywhere to mark a task complete
export function completeTask(mission: string, taskId: string) {
  try {
    const done = getCompletedTasks(mission)
    done.add(taskId)
    localStorage.setItem(`mission_tasks_${mission}`, JSON.stringify([...done]))
    // Notify the HUD to re-read localStorage
    window.dispatchEvent(new CustomEvent('mission_task_update', { detail: { mission, taskId } }))
  } catch { /* silent */ }
}

export function MissionHUD() {
  const { currentMission, missionStatus, setMission, completeMission } = useMissionStore()
  const [isVisible, setIsVisible] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set())
  const [animateIn, setAnimateIn] = useState(false)

  // Load mission from Firestore on mount (priority) then fallback to localStorage
  useEffect(() => {
    const loadMission = async () => {
      const user = auth.currentUser

      // Try Firestore first if user is logged in
      if (user) {
        try {
          const docRef = doc(db, 'players', user.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const data = docSnap.data()
            if (data.mission && data.missionStatus) {
              setMission(data.mission, data.missionObjective || '')
              if (data.missionStatus === 'completed') {
                completeMission()
              }
              return
            }
          }
        } catch (error) {
          console.error('Error loading mission from Firestore:', error)
        }
      }

      const storedMission = localStorage.getItem('current_mission')
      const storedStatus = localStorage.getItem('mission_status') as 'inactive' | 'active' | 'completed'
      const storedObjective = localStorage.getItem('mission_objective')

      if (storedMission && storedStatus && storedObjective) {
        setMission(storedMission, storedObjective)
        if (storedStatus === 'completed') {
          completeMission()
        }

        if (user) {
          try {
            await updateDoc(doc(db, 'players', user.uid), {
              mission: storedMission,
              missionStatus: storedStatus,
              missionObjective: storedObjective,
            })
          } catch (e) {
            console.error('Error syncing mission to Firestore:', e)
          }
        }
      }
    }

    loadMission()
  }, [setMission, completeMission])

  // Show HUD when there's an active mission
  useEffect(() => {
    const visible = currentMission !== null && missionStatus === 'active'
    setIsVisible(visible)
    if (visible) {
      setTimeout(() => setAnimateIn(true), 50)
    } else {
      setAnimateIn(false)
    }
  }, [currentMission, missionStatus])

  // Load completed tasks when mission changes + listen for task updates
  useEffect(() => {
    if (currentMission) {
      setCompletedTasks(getCompletedTasks(currentMission))
    }
    const handler = () => {
      if (currentMission) setCompletedTasks(getCompletedTasks(currentMission))
    }
    window.addEventListener('mission_task_update', handler)
    return () => window.removeEventListener('mission_task_update', handler)
  }, [currentMission])

  if (!isVisible || !currentMission) return null

  const tasks = MISSION_TASKS[currentMission] || []
  const completedCount = tasks.filter(t => completedTasks.has(t.id)).length
  const progressPct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0

  const missionNames: Record<string, string> = {
    orangutan: 'Penjaga Rimba',
  }
  const missionName = missionNames[currentMission] || 'Misi Aktif'

  return (
    <>
      {/* Quest Tracker Panel - Top Left */}
      <div
        className="absolute left-4 sm:left-6 z-50 select-none"
        style={{
          top: '160px', // Lowered slightly so it stays clear of the minimap
          width: '260px',
          transform: animateIn ? 'translateX(0)' : 'translateX(-280px)',
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Panel */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(254, 250, 224, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '3px solid #283618',
            boxShadow: '4px 4px 0 #283618',
          }}
        >
          {/* Header - clickable to collapse */}
          <button
            onClick={() => setIsCollapsed(c => !c)}
            className="w-full flex items-center gap-2 px-3 py-2.5 cursor-pointer group"
            style={{ background: '#606C38' }}
          >
            <div
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 28, height: 28, background: '#BC6C25', border: '2px solid #283618' }}
            >
              <Scroll size={14} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-[10px] font-bold text-[#FEFAE0]/70 uppercase tracking-wider leading-none">Misi Aktif</p>
              <p className="text-sm font-bold text-[#FEFAE0] leading-tight">{missionName}</p>
            </div>
            {isCollapsed
              ? <ChevronDown size={16} className="text-[#FEFAE0]/70 group-hover:text-[#FEFAE0] transition-colors flex-shrink-0" />
              : <ChevronUp size={16} className="text-[#FEFAE0]/70 group-hover:text-[#FEFAE0] transition-colors flex-shrink-0" />
            }
          </button>

          {/* Collapsible body */}
          <div
            style={{
              maxHeight: isCollapsed ? 0 : '300px',
              overflow: 'hidden',
              transition: 'max-height 0.35s ease',
            }}
          >
            {/* Progress bar */}
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-[#606C38] uppercase tracking-wider">Progres</span>
                <span className="text-[10px] font-bold text-[#BC6C25]">{completedCount}/{tasks.length}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(40,54,24,0.15)' }}>
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

            {/* Divider */}
            <div className="mx-3 my-2" style={{ height: 1, background: 'rgba(40,54,24,0.12)' }} />

            {/* Task list */}
            <div className="px-3 pb-3 space-y-2">
              {tasks.map((task, idx) => {
                const done = completedTasks.has(task.id)
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 group"
                    style={{
                      opacity: done ? 0.55 : 1,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    {/* Step number or check */}
                    <div className="flex-shrink-0 mt-0.5">
                      {done ? (
                        <CheckCircle2
                          size={18}
                          style={{ color: '#10B981' }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center rounded-full"
                          style={{
                            width: 18,
                            height: 18,
                            border: '2px solid #BC6C25',
                            background: 'transparent',
                          }}
                        >
                          <span style={{ fontSize: 9, fontWeight: 900, color: '#BC6C25', lineHeight: 1 }}>
                            {idx + 1}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Task label */}
                    <p
                      className="text-xs leading-snug"
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
              })}

              {tasks.length === 0 && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#BC6C25] flex-shrink-0" />
                  <p className="text-xs text-[#5C4033] font-medium leading-snug">
                    Jelajahi dunia Nusaka!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mission Complete Overlay is separate */}
    </>
  )
}

// Mission Complete Overlay
export function MissionCompleteOverlay({ onClose }: { onClose: () => void }) {
  const { missionStatus } = useMissionStore()

  if (missionStatus !== 'completed') return null

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-[#FEFAE0] border-4 border-[#283618] rounded-3xl p-8 max-w-md w-full mx-4 shadow-[8px_8px_0_#283618]">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-[#283618]">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#283618] mb-2" style={{ fontFamily: 'var(--font-nanum-pen), cursive' }}>
            Misi Selesai!
          </h2>
          <p className="text-[#5C4033] mb-6">
            Kamu berhasil menemukan dan melindungi Orang Utan. Terima kasih telah menjadi penjaga rimba!
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#BC6C25] hover:bg-[#A05A1F] text-[#FEFAE0] font-bold rounded-xl border-4 border-[#283618] transition-all"
          >
            Kembali ke Kakek Nusaka
          </button>
        </div>
      </div>
    </div>
  )
}
