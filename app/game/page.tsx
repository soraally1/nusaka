'use client'

import dynamic from 'next/dynamic'
import { MissionHUD, MissionCompleteOverlay } from './MissionHUD'
import { useMissionStore } from './store'
import { useRouter } from 'next/navigation'

const GameScene = dynamic(() => import('./GameScene'), { ssr: false })

export default function GamePage() {
  const router = useRouter()
  const { clearMission } = useMissionStore()

  const handleMissionComplete = () => {
    clearMission()
    router.push('/npc/kakek')
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <GameScene />
      
      {/* Mission UI Overlay */}
      <MissionHUD />
      
      {/* Mission Complete Modal */}
      <MissionCompleteOverlay onClose={handleMissionComplete} />
    </div>
  )
}
