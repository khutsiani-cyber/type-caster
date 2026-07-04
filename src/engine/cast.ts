// Pure cast-resolution logic. Deterministic: same inputs always produce the
// same resolution. No randomness, no side effects, no DOM. This is the module
// an authoritative PvP server would import verbatim.

import type { CastMetrics, CastResolution, Spell } from './types';

const CHARS_PER_WORD = 5;
const BACKFIRE_FACTOR = 0.6;
const QUALITY_ACC_WEIGHT = 0.65;
const QUALITY_SPD_WEIGHT = 0.35;
const QUALITY_DAMAGE_SCALE = 1.5;
const CRIT_ACCURACY = 0.98;
const CRIT_WPM_FACTOR = 1.5;
const CRIT_MULTIPLIER = 2;

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function computeAccuracy(metrics: CastMetrics): number {
  if (metrics.typedChars <= 0) return 0;
  return metrics.correctChars / metrics.typedChars;
}

export function computeWpm(metrics: CastMetrics): number {
  const elapsed = Math.max(metrics.elapsedSeconds, 0.001);
  return (metrics.typedChars / CHARS_PER_WORD) / (elapsed / 60);
}

/**
 * Resolve one cast attempt.
 * @param comboBonus additive damage bonus (e.g. 0.2 = +20%) from the clean-cast
 *        combo chain; does not affect backfire self-damage.
 */
export function resolveCast(
  spell: Spell,
  metrics: CastMetrics,
  comboBonus = 0,
): CastResolution {
  const accuracy = computeAccuracy(metrics);
  const wpm = computeWpm(metrics);

  const failed =
    !metrics.completed ||
    accuracy < spell.requiredAccuracy ||
    wpm < spell.requiredWpm;

  if (failed) {
    const accShortfall = Math.max(0, spell.requiredAccuracy - accuracy);
    return {
      outcome: 'backfire',
      accuracy,
      wpm,
      quality: 0,
      damageToEnemy: 0,
      damageToSelf: Math.round(
        spell.baseDamage * BACKFIRE_FACTOR * (1 + accShortfall),
      ),
    };
  }

  const accScore =
    spell.requiredAccuracy >= 1
      ? 1
      : (accuracy - spell.requiredAccuracy) / (1 - spell.requiredAccuracy);
  const spdScore = clamp((wpm - spell.requiredWpm) / spell.requiredWpm, 0, 1);
  const quality =
    QUALITY_ACC_WEIGHT * clamp(accScore, 0, 1) + QUALITY_SPD_WEIGHT * spdScore;

  const isCrit =
    accuracy >= CRIT_ACCURACY && wpm >= spell.requiredWpm * CRIT_WPM_FACTOR;

  let damage = spell.baseDamage * (1 + quality * QUALITY_DAMAGE_SCALE);
  if (isCrit) damage *= CRIT_MULTIPLIER;
  damage *= 1 + comboBonus;

  return {
    outcome: isCrit ? 'crit' : 'hit',
    accuracy,
    wpm,
    quality,
    damageToEnemy: Math.round(damage),
    damageToSelf: 0,
  };
}
