import { create } from "zustand";
import { Creature } from "../nusadex/creatures";
import { PartnerCreature } from "../nusadex/store";

export type BattlePhase =
    | 'intro'
    | 'select_action'
    | 'player_attack'
    | 'enemy_attack'
    | 'catch_attempt'
    | 'win'
    | 'catch_success'
    | 'flee';

interface BattleState {
    // Proximity
    nearbyCreature: Creature | null;
    setNearbyCreature: (creature: Creature | null) => void;

    // Battle instance
    isActive: boolean;
    wildCreature: Creature | null;
    wildHp: number;
    wildMaxHp: number;

    playerCreature: PartnerCreature | null;
    playerHp: number;
    playerMaxHp: number;

    phase: BattlePhase;
    message: string;

    // Pending creature from wild — set after catch success, cleared after naming
    pendingCaughtCreature: (Omit<PartnerCreature, 'instanceId'> & { instanceId?: string }) | null;
    setPendingCaughtCreature: (c: (Omit<PartnerCreature, 'instanceId'> & { instanceId?: string }) | null) => void;

    startBattle: (wild: Creature, playerPartner: PartnerCreature) => void;
    setPlayerCreature: (creature: PartnerCreature) => void;
    setPhase: (phase: BattlePhase, message?: string) => void;
    damageWild: (amount: number) => void;
    damagePlayer: (amount: number) => void;
    endBattle: () => void;
}

export const useBattleStore = create<BattleState>((set, get) => ({
    nearbyCreature: null,
    setNearbyCreature: (creature) => set({ nearbyCreature: creature }),

    isActive: false,
    wildCreature: null,
    wildHp: 100,
    wildMaxHp: 100,

    playerCreature: null,
    playerHp: 100,
    playerMaxHp: 100,

    phase: 'intro',
    message: '',

    pendingCaughtCreature: null,
    setPendingCaughtCreature: (c) => set({ pendingCaughtCreature: c }),

    startBattle: (wild, playerPartner) => {
        const wildMax = 35 + Math.floor(Math.random() * 15);
        const playerMax = 50 + (playerPartner?.level || 1) * 5;

        set({
            isActive: true,
            wildCreature: wild,
            wildHp: wildMax,
            wildMaxHp: wildMax,
            playerCreature: playerPartner,
            playerHp: playerMax,
            playerMaxHp: playerMax,
            phase: 'intro',
            message: `Seekor ${wild.name} liar muncul!`,
        });
    },

    setPlayerCreature: (creature) => {
        const playerMax = 50 + (creature?.level || 1) * 5;
        set({ playerCreature: creature, playerHp: playerMax, playerMaxHp: playerMax });
    },

    setPhase: (phase, message) =>
        set((state) => ({ phase, message: message ?? state.message })),

    damageWild: (amount) =>
        set((state) => ({ wildHp: Math.max(0, state.wildHp - amount) })),

    damagePlayer: (amount) =>
        set((state) => ({ playerHp: Math.max(0, state.playerHp - amount) })),

    endBattle: () =>
        set({
            isActive: false,
            wildCreature: null,
            playerCreature: null,
            phase: 'intro',
        }),
}));
