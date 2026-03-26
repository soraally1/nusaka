import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type Creature } from './creatures';

export interface PartnerCreature extends Creature {
    nickname?: string;
    instanceId: string;
}

export interface CreatureState {
    capturedCreatures: PartnerCreature[];
    firstPartner: PartnerCreature | null;
    hasChosenPartner: boolean;
    seenIds: number[];
    addCreature: (creature: Omit<PartnerCreature, 'instanceId'> & { instanceId?: string }) => void;
    updateCreature: (creature: PartnerCreature) => void;
    nicknameCreature: (instanceId: string, nickname: string) => void;
    setFirstPartner: (creature: Omit<PartnerCreature, 'instanceId'> & { instanceId?: string }) => void;
    markAsSeen: (id: number) => void;
    grantXp: (instanceId: string, xpAmount: number) => { leveledUp: boolean; newLevel: number; newXp: number; xpToNext: number };
    reset: () => void;
}

export const useCreatureStore = create<CreatureState>()(
    persist(
        (set) => ({
            capturedCreatures: [],
            firstPartner: null,
            hasChosenPartner: false,
            seenIds: [],
            addCreature: (creature) =>
                set((state) => {
                    const newCreature = {
                        ...creature,
                        instanceId: creature.instanceId || `${creature.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                    };
                    return {
                        capturedCreatures: [...state.capturedCreatures, newCreature],
                    };
                }),
            updateCreature: (creature) =>
                set((state) => ({
                    capturedCreatures: state.capturedCreatures.map((c) =>
                        c.instanceId === creature.instanceId ? creature : c
                    ),
                    firstPartner:
                        state.firstPartner?.instanceId === creature.instanceId
                            ? creature
                            : state.firstPartner,
                })),
            nicknameCreature: (instanceId, nickname) =>
                set((state) => ({
                    capturedCreatures: state.capturedCreatures.map((c) =>
                        c.instanceId === instanceId ? { ...c, nickname } : c
                    ),
                    firstPartner:
                        state.firstPartner?.instanceId === instanceId
                            ? { ...state.firstPartner, nickname }
                            : state.firstPartner,
                })),
            setFirstPartner: (creature) => {
                const starter: PartnerCreature = {
                    ...creature,
                    level: 0,
                    exp: 0,
                    instanceId: `starter-${creature.id}-${Date.now()}`
                };
                set(() => ({
                    firstPartner: starter,
                    hasChosenPartner: true,
                    capturedCreatures: [starter],
                    seenIds: [starter.id], // Starters are seen by default
                }));
            },
            markAsSeen: (id) =>
                set((state) => ({
                    seenIds: state.seenIds.includes(id)
                        ? state.seenIds
                        : [...state.seenIds, id],
                })),
            grantXp: (instanceId, xpAmount) => {
                // XP needed to reach next level: 30 + level * 20
                const xpToNext = (level: number) => 30 + level * 20;
                let result = { leveledUp: false, newLevel: 1, newXp: 0, xpToNext: 50 };
                set((state) => {
                    const update = (c: PartnerCreature): PartnerCreature => {
                        if (c.instanceId !== instanceId) return c;
                        let level = c.level || 1;
                        let xp = (c.exp || 0) + xpAmount;
                        let leveledUp = false;
                        while (xp >= xpToNext(level)) {
                            xp -= xpToNext(level);
                            level++;
                            leveledUp = true;
                        }
                        result = { leveledUp, newLevel: level, newXp: xp, xpToNext: xpToNext(level) };
                        return { ...c, level, exp: xp };
                    };
                    return {
                        capturedCreatures: state.capturedCreatures.map(update),
                        firstPartner: state.firstPartner?.instanceId === instanceId
                            ? update(state.firstPartner)
                            : state.firstPartner,
                    };
                });
                return result;
            },
            reset: () => set({
                capturedCreatures: [],
                firstPartner: null,
                hasChosenPartner: false,
                seenIds: [],
            }),
        }),
        {
            name: 'creature-storage',
        }
    )
);
