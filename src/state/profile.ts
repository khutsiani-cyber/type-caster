// Persistent character profile: class, upgrades, spell collection, gold.
// Everything survives death — dying only ends the current battle.

import { SPELLS_BY_ID, STARTER_SPELLS } from '../engine/spells';

export type ClassId = 'pyromancer' | 'chronomancer' | 'runescribe';

export interface ClassDef {
  id: ClassId;
  name: string;
  art: string;
  perk: string;
  /** multiplier on spell damage */
  damageMult: number;
  /** multiplier on enemy attack interval (higher = slower enemies) */
  enemySlowMult: number;
  /** typos forgiven per cast */
  forgiveness: number;
}

export const CLASSES: ClassDef[] = [
  {
    id: 'pyromancer',
    name: 'Pyromancer',
    art: '/art/wizard-pyromancer.webp',
    perk: '+15% spell damage. Subtlety is for people with time.',
    damageMult: 1.15,
    enemySlowMult: 1,
    forgiveness: 0,
  },
  {
    id: 'chronomancer',
    name: 'Chronomancer',
    art: '/art/wizard-chronomancer.webp',
    perk: 'Enemies attack 12% slower. You always have a moment more.',
    damageMult: 1,
    enemySlowMult: 1.12,
    forgiveness: 0,
  },
  {
    id: 'runescribe',
    name: 'Runescribe',
    art: '/art/wizard-runescribe.webp',
    perk: 'One typo forgiven every cast. The quill edits as you write.',
    damageMult: 1,
    enemySlowMult: 1,
    forgiveness: 1,
  },
];

export const CLASSES_BY_ID = new Map(CLASSES.map((c) => [c.id, c]));

export type UpgradeId = 'vitality' | 'power' | 'precision' | 'ward';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  describe: (level: number) => string;
  effectPerLevel: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'vitality',
    name: 'Vitality',
    icon: '❤',
    describe: (lv) => `Max HP: ${100 + lv * 25}`,
    effectPerLevel: '+25 max HP',
    baseCost: 100,
    costGrowth: 1.5,
    maxLevel: 10,
  },
  {
    id: 'power',
    name: 'Power',
    icon: '⚔',
    describe: (lv) => `Spell damage: +${lv * 8}%`,
    effectPerLevel: '+8% spell damage',
    baseCost: 120,
    costGrowth: 1.5,
    maxLevel: 10,
  },
  {
    id: 'precision',
    name: 'Precision',
    icon: '🪶',
    describe: (lv) => `${lv} typo${lv === 1 ? '' : 's'} forgiven per cast`,
    effectPerLevel: '+1 typo forgiven per cast',
    baseCost: 300,
    costGrowth: 2.2,
    maxLevel: 2,
  },
  {
    id: 'ward',
    name: 'Ward',
    icon: '🛡',
    describe: (lv) => `Damage taken: -${lv * 6}%`,
    effectPerLevel: '-6% damage taken',
    baseCost: 150,
    costGrowth: 1.6,
    maxLevel: 5,
  },
];

export const UPGRADES_BY_ID = new Map(UPGRADES.map((u) => [u.id, u]));

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round(def.baseCost * Math.pow(def.costGrowth, level));
}

export interface Profile {
  name: string;
  classId: ClassId;
  gold: number;
  upgrades: Record<UpgradeId, number>;
  ownedSpellIds: string[];
  equippedSpellIds: string[];
  bestWave: number;
}

export interface DerivedStats {
  maxHp: number;
  damageMult: number;
  enemySlowMult: number;
  forgiveness: number;
  damageTakenMult: number;
}

export function statsFor(p: Profile): DerivedStats {
  const cls = CLASSES_BY_ID.get(p.classId)!;
  return {
    maxHp: 100 + p.upgrades.vitality * 25,
    damageMult: cls.damageMult * (1 + p.upgrades.power * 0.08),
    enemySlowMult: cls.enemySlowMult,
    forgiveness: cls.forgiveness + p.upgrades.precision,
    damageTakenMult: 1 - p.upgrades.ward * 0.06,
  };
}

const KEY = 'typecaster_profile_v2';

export function defaultProfile(): Profile {
  return {
    name: 'Caster',
    classId: 'pyromancer',
    gold: 0,
    upgrades: { vitality: 0, power: 0, precision: 0, ward: 0 },
    ownedSpellIds: [...STARTER_SPELLS],
    equippedSpellIds: [...STARTER_SPELLS],
    bestWave: 0,
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = { ...defaultProfile(), ...(JSON.parse(raw) as Profile) };
      // Drop ids from older spell rosters; make sure starters stay owned.
      p.ownedSpellIds = [
        ...new Set([...STARTER_SPELLS, ...p.ownedSpellIds.filter((id) => SPELLS_BY_ID.has(id))]),
      ];
      p.equippedSpellIds = p.equippedSpellIds.filter((id) => SPELLS_BY_ID.has(id));
      if (p.equippedSpellIds.length === 0) p.equippedSpellIds = [...STARTER_SPELLS];
      return p;
    }
  } catch {
    // corrupted storage — start fresh
  }
  return defaultProfile();
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage unavailable — profile just won't persist
  }
}
