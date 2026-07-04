import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Spell, TypingPressure, WaveEnemy } from '../engine/types';
import { resolveCast, clamp } from '../engine/cast';
import { ELEMENT_COLORS, SPELLS_BY_ID } from '../engine/spells';
import {
  spawnForWave,
  activePressure,
  isBossWave,
  PRESSURE_LABELS,
  LEECH_REGEN_FRAC,
} from '../engine/enemies';
import { CLASSES_BY_ID, statsFor } from '../state/profile';
import { EMPTY_STATS, type RunStats } from '../state/records';
import { useGame } from '../state/store';
import { vfx } from '../vfx/vfx';
import { sfx } from '../sfx/sfx';
import { VfxCanvas } from '../vfx/VfxCanvas';
import { TypingPanel } from './TypingPanel';

const COMBO_STEP = 0.08;
const COMBO_CAP = 0.4;
const WAVE_HEAL_FRAC = 0.12;
const ENRAGE_FACTOR = 0.75;

function applyPressure(incantation: string, pressure: TypingPressure): string {
  if (pressure === 'backwards') return incantation.split('').reverse().join('');
  if (pressure === 'caps') return incantation.toUpperCase();
  return incantation;
}

interface CastView {
  spell: Spell;
  next: Spell;
  target: string;
  pressure: TypingPressure;
  caret: number;
  wrongTick: number;
  started: boolean;
  liveAccuracy: number;
  liveWpm: number;
}

interface FloatNum {
  id: number;
  side: 'player' | 'enemy';
  text: string;
  kind: 'dmg' | 'self' | 'crit' | 'heal' | 'info';
}

let floatId = 0;

export function BattleScreen() {
  const profile = useGame((s) => s.profile);
  const endBattle = useGame((s) => s.endBattle);
  const stats = useMemo(() => statsFor(profile), [profile]);
  const cls = CLASSES_BY_ID.get(profile.classId)!;
  const equipped = useMemo(
    () =>
      profile.equippedSpellIds
        .map((id) => SPELLS_BY_ID.get(id))
        .filter((s): s is Spell => !!s),
    [profile.equippedSpellIds],
  );

  const [wave, setWave] = useState(1);
  const [enemy, setEnemy] = useState<WaveEnemy>(() => spawnForWave(1, Math.random));
  const [enemyHp, setEnemyHp] = useState(() => enemy.maxHp);
  const [playerHp, setPlayerHp] = useState(stats.maxHp);
  const [gold, setGold] = useState(0);
  const [combo, setCombo] = useState(0);
  const [phase, setPhase] = useState<'fight' | 'clear' | 'dead'>('fight');
  const [cast, setCast] = useState<CastView | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [shake, setShake] = useState<'none' | 'sm' | 'lg'>('none');
  const [playerFlash, setPlayerFlash] = useState(0);
  const [enemyFlash, setEnemyFlash] = useState(0);
  const [muted, setMuted] = useState(!sfx.enabled);

  const playerRef = useRef<HTMLDivElement>(null);
  const enemyRef = useRef<HTMLDivElement>(null);
  const attackBarRef = useRef<HTMLDivElement>(null);

  // Authoritative real-time values live in refs; state mirrors them for render.
  const live = useRef({
    playerHp: stats.maxHp,
    enemyHp: enemy.maxHp,
    attackProgress: 0,
    attackCount: 0,
    leechAcc: 0,
    wave: 1,
    gold: 0,
    combo: 0,
  });
  const session = useRef({ typed: 0, correct: 0, start: 0, forgivenessLeft: 0 });
  const run = useRef<RunStats & { accSum: number }>({ ...EMPTY_STATS, accSum: 0 });
  const timeouts = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  const runStats = useCallback((): RunStats => {
    const r = run.current;
    return {
      casts: r.casts,
      crits: r.crits,
      backfires: r.backfires,
      bestCombo: r.bestCombo,
      peakWpm: Math.round(r.peakWpm),
      avgAcc: r.casts > 0 ? r.accSum / r.casts : 0,
      totalDamage: r.totalDamage,
    };
  }, []);

  const addFloat = useCallback(
    (side: FloatNum['side'], text: string, kind: FloatNum['kind']) => {
      const id = ++floatId;
      setFloats((f) => [...f, { id, side, text, kind }]);
      window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
    },
    [],
  );

  const doShake = useCallback((size: 'sm' | 'lg') => {
    setShake('none');
    requestAnimationFrame(() => setShake(size));
    window.setTimeout(() => setShake('none'), 450);
  }, []);

  const flashBanner = useCallback(
    (text: string, ms = 1300) => {
      setBanner(text);
      later(() => setBanner((b) => (b === text ? null : b)), ms);
    },
    [later],
  );

  // ---------- incantation stream ----------

  const pickSpell = useCallback(
    (avoid?: string): Spell => {
      const pool = equipped.length > 1 ? equipped.filter((s) => s.id !== avoid) : equipped;
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [equipped],
  );

  const nextIncantation = useCallback(
    (enemyNow: WaveEnemy, prev?: CastView | null) => {
      const spell = prev?.next ?? pickSpell();
      const next = pickSpell(spell.id);
      const pressure = activePressure(enemyNow.def, live.current.attackCount);
      session.current = {
        typed: 0,
        correct: 0,
        start: 0,
        forgivenessLeft: stats.forgiveness,
      };
      setCast({
        spell,
        next,
        target: applyPressure(spell.incantation, pressure),
        pressure,
        caret: 0,
        wrongTick: 0,
        started: false,
        liveAccuracy: 1,
        liveWpm: 0,
      });
    },
    [pickSpell, stats.forgiveness],
  );

  const castRef = useRef<CastView | null>(null);
  castRef.current = cast;
  const enemyStateRef = useRef(enemy);
  enemyStateRef.current = enemy;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // ---------- damage plumbing ----------

  const hurtPlayer = useCallback(
    (amount: number, kind: 'self' | 'dmg') => {
      const hp = Math.max(0, live.current.playerHp - amount);
      live.current.playerHp = hp;
      setPlayerHp(hp);
      setPlayerFlash((v) => v + 1);
      addFloat('player', `-${amount}`, kind === 'self' ? 'self' : 'dmg');
      if (hp <= 0 && phaseRef.current === 'fight') {
        setPhase('dead');
        sfx.death();
        flashBanner('You fall…', 1400);
        later(() => endBattle(live.current.wave, live.current.gold, runStats()), 1500);
      }
      return hp;
    },
    [addFloat, endBattle, flashBanner, later, runStats],
  );

  const clearWave = useCallback(
    (killed: WaveEnemy) => {
      setPhase('clear');
      sfx.waveClear();
      const reward = killed.goldReward;
      live.current.gold += reward;
      setGold(live.current.gold);
      const heal = Math.round(stats.maxHp * WAVE_HEAL_FRAC);
      live.current.playerHp = Math.min(stats.maxHp, live.current.playerHp + heal);
      setPlayerHp(live.current.playerHp);
      addFloat('player', `+${heal}`, 'heal');
      flashBanner(`Wave ${killed.wave} cleared  ·  +${reward} gold`, 1500);
      later(() => {
        const nextWave = killed.wave + 1;
        live.current.wave = nextWave;
        live.current.attackProgress = 0;
        live.current.attackCount = 0;
        live.current.leechAcc = 0;
        const spawned = spawnForWave(nextWave, Math.random);
        live.current.enemyHp = spawned.maxHp;
        setWave(nextWave);
        setEnemy(spawned);
        setEnemyHp(spawned.maxHp);
        setPhase('fight');
        if (isBossWave(nextWave)) {
          sfx.boss();
          flashBanner(`☠ ${spawned.def.name} ☠`, 1600);
        }
        nextIncantation(spawned, null);
      }, 1600);
    },
    [addFloat, flashBanner, later, nextIncantation, stats.maxHp],
  );

  const hurtEnemy = useCallback(
    (amount: number, crit: boolean) => {
      const hp = Math.max(0, live.current.enemyHp - amount);
      live.current.enemyHp = hp;
      setEnemyHp(hp);
      setEnemyFlash((v) => v + 1);
      addFloat('enemy', `-${amount}`, crit ? 'crit' : 'dmg');
      if (hp <= 0 && phaseRef.current === 'fight') clearWave(enemyStateRef.current);
      return hp;
    },
    [addFloat, clearWave],
  );

  // ---------- enemy attack + leech loop (real time) ----------

  useEffect(() => {
    if (phase !== 'fight') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const en = enemyStateRef.current;

      // leech regen — a DPS check
      if (en.def.pressure === 'leech' && live.current.enemyHp > 0) {
        live.current.leechAcc += en.maxHp * LEECH_REGEN_FRAC * dt;
        if (live.current.leechAcc >= 1) {
          const heal = Math.floor(live.current.leechAcc);
          live.current.leechAcc -= heal;
          const hp = Math.min(en.maxHp, live.current.enemyHp + heal);
          if (hp !== live.current.enemyHp) {
            live.current.enemyHp = hp;
            setEnemyHp(hp);
          }
        }
      }

      const enraged =
        en.def.pressure === 'enrage' && live.current.enemyHp < en.maxHp / 2;
      const interval =
        en.attackInterval * stats.enemySlowMult * (enraged ? ENRAGE_FACTOR : 1);
      live.current.attackProgress += dt / interval;
      if (attackBarRef.current) {
        const frac = Math.min(1, live.current.attackProgress);
        attackBarRef.current.style.width = `${frac * 100}%`;
        attackBarRef.current.classList.toggle('imminent', frac > 0.8);
      }
      if (live.current.attackProgress >= 1) {
        live.current.attackProgress = 0;
        live.current.attackCount += 1;
        const dmg = Math.max(1, Math.round(en.damage * stats.damageTakenMult));
        doShake('sm');
        sfx.enemyHit();
        if (playerRef.current && enemyRef.current) {
          const from = vfx.anchorOf(enemyRef.current);
          const to = vfx.anchorOf(playerRef.current);
          vfx.projectile(from, to, '#ff4d4d', { size: 7, duration: 0.25 });
        }
        hurtPlayer(dmg, 'dmg');
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, stats.enemySlowMult, stats.damageTakenMult, doShake, hurtPlayer]);

  // ---------- typing ----------

  const finishCast = useCallback(() => {
    const c = castRef.current;
    if (!c) return;
    const s = session.current;
    const elapsed = s.start ? (performance.now() - s.start) / 1000 : 0.001;
    const comboBonus = clamp(live.current.combo * COMBO_STEP, 0, COMBO_CAP);
    const res = resolveCast(
      c.spell,
      { typedChars: s.typed, correctChars: s.correct, elapsedSeconds: elapsed, completed: true },
      comboBonus,
    );
    const color = ELEMENT_COLORS[c.spell.element];

    const r = run.current;
    r.casts += 1;
    r.accSum += res.accuracy;
    r.peakWpm = Math.max(r.peakWpm, res.wpm);

    if (res.outcome === 'backfire') {
      r.backfires += 1;
      live.current.combo = 0;
      setCombo(0);
      sfx.backfire();
      if (playerRef.current) {
        const p = vfx.anchorOf(playerRef.current);
        vfx.explosion(p.x, p.y);
      }
      doShake('sm');
      flashBanner('BACKFIRE!', 900);
      hurtPlayer(res.damageToSelf, 'self');
    } else {
      if (res.outcome === 'crit') r.crits += 1;
      const clean = s.typed === s.correct;
      live.current.combo = clean ? live.current.combo + 1 : 0;
      r.bestCombo = Math.max(r.bestCombo, live.current.combo);
      setCombo(live.current.combo);
      const dmg = Math.round(res.damageToEnemy * stats.damageMult);
      r.totalDamage += dmg;
      sfx.cast(c.spell.element);
      if (playerRef.current && enemyRef.current) {
        const from = vfx.anchorOf(playerRef.current);
        const to = vfx.anchorOf(enemyRef.current);
        vfx.projectile(from, to, color, {
          size: res.outcome === 'crit' ? 13 : 9,
          duration: 0.28,
          onArrive: () => {
            if (res.outcome === 'crit') vfx.crit(to.x, to.y, color);
          },
        });
      }
      later(() => {
        if (res.outcome === 'crit') sfx.crit();
        else sfx.impact(dmg >= 60);
        doShake(res.outcome === 'crit' || dmg >= 60 ? 'lg' : 'sm');
        hurtEnemy(dmg, res.outcome === 'crit');
      }, 260);
      if (res.outcome === 'crit') flashBanner('CRITICAL!', 700);
    }

    // Keep the stream moving — next incantation almost immediately.
    later(() => {
      if (phaseRef.current === 'fight') nextIncantation(enemyStateRef.current, castRef.current);
    }, 220);
  }, [doShake, flashBanner, hurtEnemy, hurtPlayer, later, nextIncantation, stats.damageMult]);

  const skipIncantation = useCallback(() => {
    live.current.combo = 0;
    setCombo(0);
    addFloat('player', 'skipped', 'info');
    nextIncantation(enemyStateRef.current, castRef.current);
  }, [addFloat, nextIncantation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (phaseRef.current !== 'fight') return;
      if (e.key === 'Escape') {
        e.preventDefault();
        skipIncantation();
        return;
      }
      if (e.key.length !== 1) return;
      e.preventDefault();
      const c = castRef.current;
      if (!c) return;
      const s = session.current;
      const now = performance.now();
      if (!s.start) s.start = now;
      const elapsed = Math.max((now - s.start) / 1000, 0.001);
      const expected = c.target[c.caret];

      if (e.key === expected) {
        sfx.key();
        s.typed++;
        s.correct++;
        const nextCaret = c.caret + 1;
        setCast({
          ...c,
          caret: nextCaret,
          started: true,
          liveAccuracy: s.correct / s.typed,
          liveWpm: s.typed / 5 / (elapsed / 60),
        });
        if (nextCaret >= c.target.length) finishCast();
      } else {
        if (s.forgivenessLeft > 0) {
          s.forgivenessLeft--;
          addFloat('player', '🪶 forgiven', 'info');
          return;
        }
        sfx.typo();
        s.typed++;
        setCast({
          ...c,
          wrongTick: c.wrongTick + 1,
          started: true,
          liveAccuracy: s.correct / s.typed,
          liveWpm: s.typed / 5 / (elapsed / 60),
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [addFloat, finishCast, skipIncantation]);

  // First incantation on mount.
  useEffect(() => {
    nextIncantation(enemyStateRef.current, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- render ----------

  const pressureNow = cast?.pressure ?? 'none';
  const comboBonusNow = Math.round(clamp(combo * COMBO_STEP, 0, COMBO_CAP) * 100);

  return (
    <div className={`battle-root shake-${shake}`}>
      <div className="battle-hud">
        <span className={`wave-badge ${isBossWave(wave) ? 'boss' : ''}`}>Wave {wave}</span>
        <span className="hud-gold">🪙 {gold}</span>
        {combo > 1 && (
          <span className="hud-combo">🔥 ×{combo} combo (+{comboBonusNow}% dmg)</span>
        )}
        <span className="hud-best">best: {Math.max(profile.bestWave, wave)}</span>
        <button
          className="sound-btn"
          title="Toggle sound"
          onClick={() => setMuted(!sfx.toggle())}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          className="retreat-btn"
          onClick={() => endBattle(live.current.wave, live.current.gold, runStats())}
        >
          Retreat (keep gold)
        </button>
      </div>

      <div className="battle-arena">
        <VfxCanvas />

        <div className="fighter player-fighter">
          <div ref={playerRef} key={`pf${playerFlash}`} className={`portrait ${playerFlash ? 'hit-flash' : ''}`}>
            <img src={cls.art} alt={cls.name} draggable={false} />
          </div>
          <div className="fighter-info">
            <div className="fighter-name">{profile.name} · {cls.name}</div>
            <div className="bar hp">
              <div style={{ width: `${(playerHp / stats.maxHp) * 100}%` }} />
              <span>{playerHp}/{stats.maxHp}</span>
            </div>
          </div>
          {floats.filter((f) => f.side === 'player').map((f) => (
            <div key={f.id} className={`float-num ${f.kind}`}>{f.text}</div>
          ))}
        </div>

        {banner && <div className="battle-banner">{banner}</div>}

        <div className="fighter enemy-fighter">
          <div
            ref={enemyRef}
            key={`ef${enemyFlash}`}
            className={`portrait enemy ${enemyFlash ? 'hit-flash' : ''} ${enemy.def.boss ? 'boss' : ''}`}
          >
            <img src={enemy.def.art} alt={enemy.def.name} draggable={false} />
          </div>
          <div className="fighter-info">
            <div className="fighter-name">{enemy.def.name}</div>
            <div className="fighter-title">{enemy.def.title}</div>
            <div className="bar hp enemy">
              <div style={{ width: `${(enemyHp / enemy.maxHp) * 100}%` }} />
              <span>{enemyHp}/{enemy.maxHp}</span>
            </div>
            <div className="attack-track" title="Enemy attacks when this fills">
              <div ref={attackBarRef} className="attack-bar" />
            </div>
            {pressureNow !== 'none' && (
              <div className="pressure-chip">{PRESSURE_LABELS[pressureNow]}</div>
            )}
          </div>
          {floats.filter((f) => f.side === 'enemy').map((f) => (
            <div key={f.id} className={`float-num ${f.kind}`}>{f.text}</div>
          ))}
        </div>
      </div>

      {cast && phase === 'fight' && (
        <TypingPanel
          spell={cast.spell}
          nextSpell={cast.next}
          target={cast.target}
          caret={cast.caret}
          wrongTick={cast.wrongTick}
          started={cast.started}
          pressure={cast.pressure}
          liveAccuracy={cast.liveAccuracy}
          liveWpm={cast.liveWpm}
        />
      )}
      {phase !== 'fight' && <div className="typing-panel placeholder" />}
    </div>
  );
}
