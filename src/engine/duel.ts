// Pure duel rules shared verbatim by the client and the authoritative
// Node/WebSocket server (server/duel-server.ts imports this file).
// Both players type the SAME seeded spell sequence — a pure typing race.

import { createRng } from './rng';
import { DUEL_DECK, SPELLS_BY_ID } from './spells';
import type { Spell } from './types';

export const DUEL_HP = 100;
export const DUEL_PORT = 8787;

/** Deterministic spell for cast #index of a duel with this seed. */
export function duelSpellAt(seed: number, index: number): Spell {
  const rng = createRng(seed);
  let id = DUEL_DECK[0];
  for (let i = 0; i <= index; i++) id = DUEL_DECK[rng.int(DUEL_DECK.length)];
  return SPELLS_BY_ID.get(id)!;
}

// ── wire protocol ─────────────────────────────────────────────────

export interface DuelCastMetrics {
  typedChars: number;
  correctChars: number;
  elapsedSeconds: number;
  completed: boolean;
}

export type ClientMsg =
  | { t: 'create'; name: string; classId: string }
  | { t: 'join'; code: string; name: string; classId: string }
  | { t: 'cast'; index: number; metrics: DuelCastMetrics }
  | { t: 'progress'; frac: number };

export interface DuelEvent {
  who: 'you' | 'foe';
  outcome: 'backfire' | 'hit' | 'crit';
  dmg: number;
  spellName: string;
  wpm: number;
}

export type ServerMsg =
  | { t: 'created'; code: string }
  | { t: 'start'; seed: number; foeName: string; foeClassId: string; hp: number }
  | { t: 'state'; you: number; foe: number; event: DuelEvent }
  | { t: 'progress'; frac: number }
  | { t: 'end'; won: boolean; reason: 'ko' | 'disconnect' }
  | { t: 'error'; message: string };
