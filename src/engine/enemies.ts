import type { EnemyDef, TypingPressure, WaveEnemy } from './types';

export const ENEMIES: EnemyDef[] = [
  {
    id: 'ash-imp',
    name: 'Ash Imp',
    title: 'kindling with a grudge',
    art: '/art/enemy-imp.webp',
    baseHp: 45,
    baseDamage: 7,
    attackInterval: 5.0,
    pressure: 'none',
    boss: false,
  },
  {
    id: 'hex-raven',
    name: 'Hex Raven',
    title: 'it pecks at your sight — letters blur',
    art: '/art/enemy-raven.webp',
    baseHp: 60,
    baseDamage: 9,
    attackInterval: 4.4,
    pressure: 'blur',
    boss: false,
  },
  {
    id: 'rune-golem',
    name: 'Rune Golem',
    title: 'slow, patient, extremely heavy',
    art: '/art/enemy-golem.webp',
    baseHp: 130,
    baseDamage: 15,
    attackInterval: 6.5,
    pressure: 'none',
    boss: false,
  },
  {
    id: 'mirror-wraith',
    name: 'Mirror Wraith',
    title: 'your words come back reversed',
    art: '/art/enemy-wraith.webp',
    baseHp: 85,
    baseDamage: 11,
    attackInterval: 4.6,
    pressure: 'backwards',
    boss: false,
  },
  {
    id: 'void-maw',
    name: 'Void Maw',
    title: 'hungrier as it bleeds — attacks speed up',
    art: '/art/enemy-maw.webp',
    baseHp: 150,
    baseDamage: 16,
    attackInterval: 5.4,
    pressure: 'enrage',
    boss: false,
  },
  {
    id: 'storm-djinn',
    name: 'Storm Djinn',
    title: 'it does not pause between blows',
    art: '/art/enemy-djinn.webp',
    baseHp: 95,
    baseDamage: 12,
    attackInterval: 3.2,
    pressure: 'none',
    boss: false,
  },
  {
    id: 'bone-choir',
    name: 'Bone Choir',
    title: 'IT ONLY SCREAMS IN CAPITALS',
    art: '/art/enemy-choir.webp',
    baseHp: 120,
    baseDamage: 14,
    attackInterval: 5.2,
    pressure: 'caps',
    boss: false,
  },
  {
    id: 'grave-leech',
    name: 'Grave Leech',
    title: 'drinks its wounds closed — kill it fast',
    art: '/art/enemy-leech.webp',
    baseHp: 160,
    baseDamage: 13,
    attackInterval: 5.0,
    pressure: 'leech',
    boss: false,
  },
  {
    id: 'arch-lich',
    name: 'The Arch-Lich',
    title: 'BOSS — alternates blur and reversal',
    art: '/art/enemy-lich.webp',
    baseHp: 280,
    baseDamage: 20,
    attackInterval: 5.0,
    pressure: 'cycle',
    cycleSet: ['blur', 'backwards'],
    boss: true,
  },
  {
    id: 'void-tyrant',
    name: 'The Void Tyrant',
    title: 'BOSS — caps, mirrors, and blur in turn',
    art: '/art/enemy-tyrant.webp',
    baseHp: 340,
    baseDamage: 24,
    attackInterval: 4.6,
    pressure: 'cycle',
    cycleSet: ['caps', 'backwards', 'blur'],
    boss: true,
  },
];

/** HP fraction per second a leech enemy regenerates. */
export const LEECH_REGEN_FRAC = 0.015;

export const ENEMIES_BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

export const PRESSURE_LABELS: Record<TypingPressure, string> = {
  none: '',
  blur: '🌫 Blurred Runes',
  backwards: '⮌ Mirrored Words',
  caps: '📢 CAPS-LOCK CURSE',
  enrage: '🩸 Enrages When Bleeding',
  leech: '🩹 Regenerating',
  cycle: '♻ Shifting Curse',
};

// ── wave scaling ──────────────────────────────────────────────────
// Every 5th wave is a boss (Arch-Lich and Void Tyrant alternate).
// Pools widen as waves climb; each ~10-wave band brings a new threat.
const POOLS: { fromWave: number; ids: string[] }[] = [
  { fromWave: 1, ids: ['ash-imp'] },
  { fromWave: 2, ids: ['ash-imp', 'hex-raven'] },
  { fromWave: 4, ids: ['hex-raven', 'rune-golem', 'mirror-wraith'] },
  { fromWave: 7, ids: ['rune-golem', 'mirror-wraith', 'void-maw', 'storm-djinn'] },
  { fromWave: 11, ids: ['mirror-wraith', 'void-maw', 'storm-djinn', 'bone-choir'] },
  { fromWave: 14, ids: ['void-maw', 'storm-djinn', 'bone-choir', 'grave-leech'] },
  { fromWave: 18, ids: ['storm-djinn', 'bone-choir', 'grave-leech', 'mirror-wraith', 'void-maw'] },
];

export function isBossWave(wave: number): boolean {
  return wave % 5 === 0;
}

export function spawnForWave(wave: number, pick: () => number): WaveEnemy {
  let def: EnemyDef;
  if (isBossWave(wave)) {
    def = ENEMIES_BY_ID.get((wave / 5) % 2 === 1 ? 'arch-lich' : 'void-tyrant')!;
  } else {
    const pool = [...POOLS].reverse().find((p) => wave >= p.fromWave)!.ids;
    def = ENEMIES_BY_ID.get(pool[Math.floor(pick() * pool.length)])!;
  }
  // Bosses scale off their own curve; the +15%/+8% per wave keeps pace with
  // shop upgrades without turning early waves into sponges.
  const hpScale = 1 + 0.15 * (wave - 1);
  const dmgScale = 1 + 0.08 * (wave - 1);
  const speedScale = Math.max(0.55, 1 - 0.018 * (wave - 1));
  return {
    def,
    wave,
    maxHp: Math.round(def.baseHp * hpScale),
    damage: Math.round(def.baseDamage * dmgScale),
    attackInterval: def.attackInterval * speedScale,
    goldReward: Math.round((20 + 9 * wave) * (def.boss ? 2.5 : 1)),
  };
}

/** Resolve 'cycle' into a concrete pressure for the Nth attack the enemy makes. */
export function activePressure(def: EnemyDef, attackCount: number): TypingPressure {
  if (def.pressure !== 'cycle') return def.pressure;
  const set = def.cycleSet ?? ['blur', 'backwards'];
  return set[attackCount % set.length];
}
