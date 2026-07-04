// Synthesized SFX via WebAudio — zero audio assets, instant load.
// Everything is built from oscillators and filtered noise at call time.

import type { Element } from '../engine/types';

const STORAGE_KEY = 'typecaster_sound';

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled: boolean;

  constructor() {
    let on = true;
    try {
      on = localStorage.getItem(STORAGE_KEY) !== 'off';
    } catch {
      /* default on */
    }
    this.enabled = on;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem(STORAGE_KEY, this.enabled ? 'on' : 'off');
    } catch {
      /* fine */
    }
    return this.enabled;
  }

  /** Must be called from a user gesture at least once (autoplay policy). */
  private ensure(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      gain?: number;
      glideTo?: number;
      delay?: number;
      attack?: number;
    } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = 'sine', gain = 0.2, glideTo, delay = 0, attack = 0.004 } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(
    dur: number,
    opts: { gain?: number; filterFrom?: number; filterTo?: number; type?: BiquadFilterType; delay?: number } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { gain = 0.25, filterFrom = 800, filterTo, type = 'lowpass', delay = 0 } = opts;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(filterFrom, t0);
    if (filterTo !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(1, filterTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  // ── game events ────────────────────────────────────────────────

  /** Soft mechanical tick per correct keystroke; pitch wobbles so it never drones. */
  key() {
    this.tone(1150 + Math.random() * 350, 0.035, { type: 'square', gain: 0.045 });
  }

  /** Dull thunk for a typo. */
  typo() {
    this.tone(140, 0.09, { type: 'square', gain: 0.12 });
    this.noise(0.05, { gain: 0.08, filterFrom: 500 });
  }

  /** Whoosh when a spell fires, tinted per element. */
  cast(element: Element) {
    const base: Record<Element, number> = {
      fire: 500,
      frost: 900,
      arcane: 700,
      storm: 1100,
      shadow: 350,
    };
    this.noise(0.22, { gain: 0.14, filterFrom: base[element], filterTo: base[element] * 4, type: 'bandpass' });
    this.tone(base[element] * 0.5, 0.18, { gain: 0.06, glideTo: base[element] * 1.4 });
  }

  /** Impact thump on the enemy. */
  impact(big = false) {
    this.tone(big ? 170 : 140, big ? 0.24 : 0.16, { glideTo: 45, gain: big ? 0.4 : 0.28 });
    this.noise(big ? 0.18 : 0.1, { gain: big ? 0.22 : 0.14, filterFrom: 2400, filterTo: 300 });
  }

  /** Bright chime stack for a critical hit. */
  crit() {
    this.impact(true);
    this.tone(880, 0.14, { gain: 0.12, delay: 0.02 });
    this.tone(1318, 0.16, { gain: 0.1, delay: 0.07 });
    this.tone(1760, 0.22, { gain: 0.08, delay: 0.12 });
  }

  /** Backfire explosion on the player. */
  backfire() {
    this.noise(0.5, { gain: 0.35, filterFrom: 3000, filterTo: 120 });
    this.tone(90, 0.4, { glideTo: 35, gain: 0.35, type: 'sawtooth' });
  }

  /** Enemy's attack landing on you. */
  enemyHit() {
    this.tone(220, 0.12, { glideTo: 70, gain: 0.22, type: 'triangle' });
    this.noise(0.08, { gain: 0.12, filterFrom: 1200, filterTo: 200 });
  }

  /** Ascending arpeggio on wave clear. */
  waveClear() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { gain: 0.1, delay: i * 0.07 }));
  }

  /** Ominous low hit for a boss entrance. */
  boss() {
    this.tone(65, 0.9, { gain: 0.3, type: 'sawtooth', glideTo: 55 });
    this.tone(98, 0.9, { gain: 0.18, type: 'sawtooth', delay: 0.05 });
    this.noise(0.6, { gain: 0.1, filterFrom: 400, filterTo: 80 });
  }

  /** Descending fall on death. */
  death() {
    this.tone(440, 1.1, { glideTo: 55, gain: 0.2, type: 'triangle' });
    this.tone(330, 1.2, { glideTo: 41, gain: 0.14, type: 'triangle', delay: 0.08 });
  }

  /** Soft pop for shop purchases / equips. */
  buy() {
    this.tone(660, 0.08, { gain: 0.1 });
    this.tone(990, 0.1, { gain: 0.09, delay: 0.06 });
  }
}

export const sfx = new SfxEngine();
