import { create } from 'zustand';
import { SPELLS_BY_ID } from '../engine/spells';
import {
  loadProfile,
  saveProfile,
  upgradeCost,
  UPGRADES_BY_ID,
  type ClassId,
  type Profile,
  type UpgradeId,
} from './profile';
import { addRecord, loadRecords, type RunRecord, type RunStats } from './records';

export type Screen = 'home' | 'battle' | 'dead' | 'duel';

interface LastBattle {
  wave: number;
  goldEarned: number;
  newBest: boolean;
  stats: RunStats;
}

interface GameState {
  screen: Screen;
  profile: Profile;
  lastBattle: LastBattle | null;
  records: RunRecord[];

  setName(name: string): void;
  setClass(id: ClassId): void;
  buyUpgrade(id: UpgradeId): void;
  buySpell(spellId: string): void;
  toggleEquip(spellId: string): void;
  startBattle(): void;
  startDuel(): void;
  /** Called by the battle when the player dies or retreats. */
  endBattle(wave: number, goldEarned: number, stats: RunStats): void;
  goHome(): void;
}

function persist(profile: Profile): Profile {
  saveProfile(profile);
  return profile;
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'home',
  profile: loadProfile(),
  lastBattle: null,
  records: loadRecords(),

  setName(name) {
    set({ profile: persist({ ...get().profile, name: name.slice(0, 20) }) });
  },

  setClass(id) {
    set({ profile: persist({ ...get().profile, classId: id }) });
  },

  buyUpgrade(id) {
    const p = get().profile;
    const def = UPGRADES_BY_ID.get(id)!;
    const level = p.upgrades[id];
    const cost = upgradeCost(def, level);
    if (level >= def.maxLevel || p.gold < cost) return;
    set({
      profile: persist({
        ...p,
        gold: p.gold - cost,
        upgrades: { ...p.upgrades, [id]: level + 1 },
      }),
    });
  },

  buySpell(spellId) {
    const p = get().profile;
    const spell = SPELLS_BY_ID.get(spellId);
    if (!spell || p.ownedSpellIds.includes(spellId) || p.gold < spell.price) return;
    set({
      profile: persist({
        ...p,
        gold: p.gold - spell.price,
        ownedSpellIds: [...p.ownedSpellIds, spellId],
        // new spells join the stream immediately
        equippedSpellIds: [...p.equippedSpellIds, spellId],
      }),
    });
  },

  toggleEquip(spellId) {
    const p = get().profile;
    if (!p.ownedSpellIds.includes(spellId)) return;
    const on = p.equippedSpellIds.includes(spellId);
    if (on && p.equippedSpellIds.length <= 1) return; // never fight empty-handed
    set({
      profile: persist({
        ...p,
        equippedSpellIds: on
          ? p.equippedSpellIds.filter((id) => id !== spellId)
          : [...p.equippedSpellIds, spellId],
      }),
    });
  },

  startBattle() {
    set({ screen: 'battle' });
  },

  startDuel() {
    set({ screen: 'duel' });
  },

  endBattle(wave, goldEarned, stats) {
    const p = get().profile;
    const newBest = wave > p.bestWave;
    const records = addRecord({
      ...stats,
      name: p.name,
      classId: p.classId,
      wave,
      gold: goldEarned,
      date: new Date().toISOString(),
    });
    set({
      lastBattle: { wave, goldEarned, newBest, stats },
      records,
      profile: persist({
        ...p,
        gold: p.gold + goldEarned,
        bestWave: Math.max(p.bestWave, wave),
      }),
      screen: 'dead',
    });
  },

  goHome() {
    set({ screen: 'home' });
  },
}));
