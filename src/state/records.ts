// Local run history — leaderboard-style records persisted per browser.

import type { ClassId } from './profile';

export interface RunStats {
  casts: number;
  crits: number;
  backfires: number;
  bestCombo: number;
  peakWpm: number;
  /** mean accuracy across completed casts, 0..1 */
  avgAcc: number;
  totalDamage: number;
}

export const EMPTY_STATS: RunStats = {
  casts: 0,
  crits: 0,
  backfires: 0,
  bestCombo: 0,
  peakWpm: 0,
  avgAcc: 0,
  totalDamage: 0,
};

export interface RunRecord extends RunStats {
  name: string;
  classId: ClassId;
  wave: number;
  gold: number;
  date: string; // ISO
}

const KEY = 'typecaster_records_v1';
const MAX_RECORDS = 10;

export function loadRecords(): RunRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const arr = JSON.parse(raw) as RunRecord[];
      if (Array.isArray(arr)) return arr;
    }
  } catch {
    /* start fresh */
  }
  return [];
}

/** Insert a run, keep the top MAX_RECORDS by wave (gold breaks ties). */
export function addRecord(rec: RunRecord): RunRecord[] {
  const all = [...loadRecords(), rec]
    .sort((a, b) => b.wave - a.wave || b.gold - a.gold)
    .slice(0, MAX_RECORDS);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* fine */
  }
  return all;
}
