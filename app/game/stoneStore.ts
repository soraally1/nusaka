import { create } from "zustand";
import * as THREE from "three";

interface StoneState {
    nearbyStoneId: number | null;
    setNearbyStoneId: (id: number | null) => void;
    
    isActive: boolean;
    playerPosition: THREE.Vector3 | null;
    startMinigame: (playerPos?: THREE.Vector3) => void;
    endMinigame: () => void;

    respawnTrigger: number;
    triggerRespawn: () => void;
}

export const useStoneStore = create<StoneState>((set) => ({
    nearbyStoneId: null,
    setNearbyStoneId: (id) => set({ nearbyStoneId: id }),
    
    isActive: false,
    playerPosition: null,
    startMinigame: (playerPos) => set({ isActive: true, playerPosition: playerPos || null }),
    endMinigame: () => set({ isActive: false, nearbyStoneId: null, playerPosition: null }),

    respawnTrigger: 0,
    triggerRespawn: () => set((state) => ({ respawnTrigger: state.respawnTrigger + 1 }))
}));
