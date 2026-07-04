// Shared engine types. This module (and everything under src/engine) is pure
// TypeScript with no DOM/React imports, so it can be lifted into a shared
// package and executed on an authoritative Node server for PvP later.

export type Element = 'fire' | 'frost' | 'arcane' | 'storm' | 'shadow';

export type Tier = 1 | 2 | 3 | 4 | 5;

export interface Spell {
  id: string;
  name: string;
  incantation: string;
  element: Element;
  tier: Tier;
  baseDamage: number;
  requiredAccuracy: number; // 0..1 — below this the cast backfires
  requiredWpm: number; // below this the cast backfires
  price: number; // shop gold; 0 = starter spell
}

/** Raw measurements of a single typing attempt. */
export interface CastMetrics {
  /** Every counted keystroke (correct + incorrect, after forgiveness). */
  typedChars: number;
  /** Keystrokes that matched the target character. */
  correctChars: number;
  elapsedSeconds: number;
  /** Did the caret reach the end of the incantation? (false = skipped/failed) */
  completed: boolean;
}

export type CastOutcome = 'backfire' | 'hit' | 'crit';

export interface CastResolution {
  outcome: CastOutcome;
  accuracy: number;
  wpm: number;
  /** 0..1 cast quality (0 when backfired). */
  quality: number;
  damageToEnemy: number;
  damageToSelf: number;
}

/** Real-time typing pressure an enemy puts on the player. */
export type TypingPressure =
  | 'none'
  | 'blur' // untyped letters are blurred
  | 'backwards' // incantations must be typed reversed
  | 'caps' // incantation becomes ALL CAPS
  | 'enrage' // attacks 25% faster below half HP
  | 'leech' // regenerates HP over time — a DPS check
  | 'cycle'; // boss: rotates through its cycleSet each attack

export interface EnemyDef {
  id: string;
  name: string;
  title: string; // short flavor line shown under the name
  art: string; // /art/*.png
  baseHp: number;
  baseDamage: number;
  /** Seconds between attacks at wave 1 (shrinks as waves scale). */
  attackInterval: number;
  pressure: TypingPressure;
  /** For pressure 'cycle': the pressures rotated through per attack. */
  cycleSet?: TypingPressure[];
  boss: boolean;
}

/** A concrete enemy instance scaled for a wave. */
export interface WaveEnemy {
  def: EnemyDef;
  wave: number;
  maxHp: number;
  damage: number;
  attackInterval: number;
  goldReward: number;
}
