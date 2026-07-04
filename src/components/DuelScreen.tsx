import { useCallback, useEffect, useRef, useState } from 'react';
import type { Spell } from '../engine/types';
import {
  duelSpellAt,
  DUEL_HP,
  DUEL_PORT,
  type ServerMsg,
  type ClientMsg,
  type DuelEvent,
} from '../engine/duel';
import { CLASSES_BY_ID, type ClassId } from '../state/profile';
import { useGame } from '../state/store';
import { vfx } from '../vfx/vfx';
import { sfx } from '../sfx/sfx';
import { VfxCanvas } from '../vfx/VfxCanvas';
import { TypingPanel } from './TypingPanel';

const DUEL_URL =
  (import.meta.env.VITE_DUEL_SERVER as string | undefined) ?? `ws://localhost:${DUEL_PORT}`;
// Same server over plain HTTP — used to nudge free-tier hosting awake.
const HEALTH_URL = DUEL_URL.replace(/^ws/, 'http');
const IS_LOCAL_SERVER = DUEL_URL.includes('localhost');
const MAX_CONNECT_ATTEMPTS = 14;
const RETRY_DELAY_MS = 5000;

type Phase = 'menu' | 'waiting' | 'fight' | 'end';

interface CastView {
  spell: Spell;
  next: Spell;
  caret: number;
  wrongTick: number;
  started: boolean;
  liveAccuracy: number;
  liveWpm: number;
}

interface FloatNum {
  id: number;
  side: 'you' | 'foe';
  text: string;
  kind: 'dmg' | 'self' | 'crit' | 'info';
}

let floatId = 0;

export function DuelScreen() {
  const profile = useGame((s) => s.profile);
  const goHome = useGame((s) => s.goHome);
  const cls = CLASSES_BY_ID.get(profile.classId)!;

  const [phase, setPhase] = useState<Phase>('menu');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [foe, setFoe] = useState<{ name: string; classId: ClassId } | null>(null);
  const [myHp, setMyHp] = useState(DUEL_HP);
  const [foeHp, setFoeHp] = useState(DUEL_HP);
  const [foeProgress, setFoeProgress] = useState(0);
  const [cast, setCast] = useState<CastView | null>(null);
  const [floats, setFloats] = useState<FloatNum[]>([]);
  const [result, setResult] = useState<{ won: boolean; reason: string } | null>(null);
  const [shake, setShake] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const seedRef = useRef(0);
  const indexRef = useRef(0);
  const session = useRef({ typed: 0, correct: 0, start: 0 });
  const myRef = useRef<HTMLDivElement>(null);
  const foeRef = useRef<HTMLDivElement>(null);
  const castRef = useRef<CastView | null>(null);
  castRef.current = cast;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const sendMsg = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const addFloat = useCallback((side: FloatNum['side'], text: string, kind: FloatNum['kind']) => {
    const id = ++floatId;
    setFloats((f) => [...f, { id, side, text, kind }]);
    window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 1100);
  }, []);

  const nextIncantation = useCallback((index: number) => {
    session.current = { typed: 0, correct: 0, start: 0 };
    setCast({
      spell: duelSpellAt(seedRef.current, index),
      next: duelSpellAt(seedRef.current, index + 1),
      caret: 0,
      wrongTick: 0,
      started: false,
      liveAccuracy: 1,
      liveWpm: 0,
    });
  }, []);

  const handleServer = useCallback(
    (msg: ServerMsg) => {
      switch (msg.t) {
        case 'created':
          setRoomCode(msg.code);
          setPhase('waiting');
          break;
        case 'start':
          seedRef.current = msg.seed;
          indexRef.current = 0;
          setFoe({ name: msg.foeName, classId: msg.foeClassId as ClassId });
          setMyHp(msg.hp);
          setFoeHp(msg.hp);
          setPhase('fight');
          sfx.boss();
          nextIncantation(0);
          break;
        case 'state': {
          setMyHp(msg.you);
          setFoeHp(msg.foe);
          const e: DuelEvent = msg.event;
          const mine = e.who === 'you';
          if (e.outcome === 'backfire') {
            const target = mine ? myRef.current : foeRef.current;
            if (target) {
              const p = vfx.anchorOf(target);
              vfx.explosion(p.x, p.y);
            }
            if (mine) sfx.backfire();
            addFloat(mine ? 'you' : 'foe', `-${e.dmg} backfire`, 'self');
          } else {
            const [fromEl, toEl] = mine
              ? [myRef.current, foeRef.current]
              : [foeRef.current, myRef.current];
            if (fromEl && toEl) {
              const from = vfx.anchorOf(fromEl);
              const to = vfx.anchorOf(toEl);
              vfx.projectile(from, to, mine ? '#9d6bff' : '#ff4d4d', {
                size: e.outcome === 'crit' ? 13 : 9,
                duration: 0.28,
                onArrive: () => {
                  if (e.outcome === 'crit') vfx.crit(to.x, to.y, '#ffd94a');
                },
              });
            }
            window.setTimeout(() => {
              if (e.outcome === 'crit') sfx.crit();
              else sfx.impact(false);
              if (!mine) {
                setShake(true);
                window.setTimeout(() => setShake(false), 450);
              }
              addFloat(mine ? 'foe' : 'you', `-${e.dmg}`, e.outcome === 'crit' ? 'crit' : 'dmg');
            }, 260);
          }
          if (!mine) setFoeProgress(0);
          break;
        }
        case 'progress':
          setFoeProgress(msg.frac);
          break;
        case 'end':
          setResult({ won: msg.won, reason: msg.reason });
          setPhase('end');
          if (msg.won) sfx.waveClear();
          else sfx.death();
          wsRef.current?.close();
          break;
        case 'error':
          setError(msg.message);
          setPhase('menu');
          break;
      }
    },
    [addFloat, nextIncantation],
  );

  // Free hosting naps when idle; connecting can need several retries while it
  // boots. We keep the intent (create/join) and retry until it answers.
  const pendingRef = useRef<ClientMsg | null>(null);
  const attemptRef = useRef(0);
  const retryTimer = useRef(0);

  const tryConnect = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    const attempt = attemptRef.current;
    setError(null);
    setStatus(
      attempt === 0
        ? 'Connecting…'
        : `Waking the duel server — it naps when nobody is fighting. Attempt ${attempt + 1}/${MAX_CONNECT_ATTEMPTS}, hold on…`,
    );
    // HTTP nudge helps the host start booting even if the socket is refused.
    if (!IS_LOCAL_SERVER) fetch(HEALTH_URL, { mode: 'no-cors' }).catch(() => {});

    const ws = new WebSocket(DUEL_URL);
    wsRef.current = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      setStatus(null);
      const msg = pendingRef.current;
      if (msg) ws.send(JSON.stringify(msg));
    };
    ws.onmessage = (ev) => {
      try {
        handleServer(JSON.parse(String(ev.data)) as ServerMsg);
      } catch {
        /* ignore malformed */
      }
    };
    ws.onclose = () => {
      if (opened || !pendingRef.current) return; // normal close or cancelled
      attemptRef.current += 1;
      if (attemptRef.current < MAX_CONNECT_ATTEMPTS) {
        retryTimer.current = window.setTimeout(tryConnect, RETRY_DELAY_MS);
      } else {
        setStatus(null);
        setError(
          IS_LOCAL_SERVER
            ? `Can't reach the duel server at ${DUEL_URL}. Start it with: npm run duel-server`
            : "The duel server isn't answering. Give it a minute and try again.",
        );
        pendingRef.current = null;
      }
    };
  }, [handleServer]);

  const connect = useCallback(
    (msg: ClientMsg) => {
      pendingRef.current = msg;
      attemptRef.current = 0;
      clearTimeout(retryTimer.current);
      tryConnect();
    },
    [tryConnect],
  );

  const cancelConnect = useCallback(() => {
    pendingRef.current = null;
    clearTimeout(retryTimer.current);
    setStatus(null);
    wsRef.current?.close();
  }, []);

  // Pre-warm the host the moment the duel screen opens, so the server is
  // usually awake by the time someone clicks Create/Join.
  useEffect(() => {
    if (!IS_LOCAL_SERVER) fetch(HEALTH_URL, { mode: 'no-cors' }).catch(() => {});
  }, []);

  useEffect(
    () => () => {
      clearTimeout(retryTimer.current);
      wsRef.current?.close();
    },
    [],
  );

  // ---------- typing (no pressures in duels — pure speed) ----------

  const finishCast = useCallback(() => {
    const s = session.current;
    const elapsed = s.start ? (performance.now() - s.start) / 1000 : 0.001;
    const c = castRef.current;
    if (c) sfx.cast(c.spell.element);
    sendMsg({
      t: 'cast',
      index: indexRef.current,
      metrics: {
        typedChars: s.typed,
        correctChars: s.correct,
        elapsedSeconds: elapsed,
        completed: true,
      },
    });
    indexRef.current += 1;
    nextIncantation(indexRef.current);
  }, [nextIncantation, sendMsg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (phaseRef.current !== 'fight') return;
      if (e.key.length !== 1) return;
      e.preventDefault();
      const c = castRef.current;
      if (!c) return;
      const s = session.current;
      const now = performance.now();
      if (!s.start) s.start = now;
      const elapsed = Math.max((now - s.start) / 1000, 0.001);
      const target = c.spell.incantation;
      const expected = target[c.caret];

      if (e.key === expected) {
        sfx.key();
        s.typed++;
        s.correct++;
        const nextCaret = c.caret + 1;
        if (nextCaret % 4 === 0) sendMsg({ t: 'progress', frac: nextCaret / target.length });
        setCast({
          ...c,
          caret: nextCaret,
          started: true,
          liveAccuracy: s.correct / s.typed,
          liveWpm: s.typed / 5 / (elapsed / 60),
        });
        if (nextCaret >= target.length) finishCast();
      } else {
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
  }, [finishCast, sendMsg]);

  // ---------- render ----------

  if (phase === 'menu' || phase === 'waiting') {
    return (
      <div className="duel-root">
        <h2 className="duel-title">⚔ PvP Duel</h2>
        <p className="duel-sub">
          Same incantations, same order, no upgrades — a pure typing race. First caster to drop the
          other wins.
        </p>
        {error && <p className="duel-error">{error}</p>}
        {phase === 'menu' ? (
          <div className="duel-menu">
            {status ? (
              <>
                <p className="duel-status">{status}</p>
                <button className="skip-btn" onClick={cancelConnect}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-btn"
                  onClick={() => connect({ t: 'create', name: profile.name, classId: profile.classId })}
                >
                  Create Duel
                </button>
                <div className="duel-join">
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    maxLength={4}
                    spellCheck={false}
                  />
                  <button
                    className="primary-btn"
                    disabled={joinCode.length !== 4}
                    onClick={() => connect({ t: 'join', code: joinCode, name: profile.name, classId: profile.classId })}
                  >
                    Join
                  </button>
                </div>
              </>
            )}
            <button className="skip-btn" onClick={goHome}>
              Back
            </button>
          </div>
        ) : (
          <div className="duel-menu">
            <p>Share this code with your opponent:</p>
            <div className="duel-code">{roomCode}</div>
            <p className="duel-sub">Waiting for them to join…</p>
            <button className="skip-btn" onClick={() => { wsRef.current?.close(); goHome(); }}>
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  const foeCls = foe ? CLASSES_BY_ID.get(foe.classId) : null;

  return (
    <div className={`battle-root ${shake ? 'shake-sm' : 'shake-none'}`}>
      <div className="battle-hud">
        <span className="wave-badge">DUEL</span>
        <span className="hud-best">first to 0 HP loses</span>
        <button className="retreat-btn" onClick={() => { wsRef.current?.close(); goHome(); }}>
          Forfeit
        </button>
      </div>

      <div className="battle-arena">
        <VfxCanvas />
        <div className="fighter player-fighter">
          <div ref={myRef} className="portrait">
            <img src={cls.art} alt={cls.name} draggable={false} />
          </div>
          <div className="fighter-info">
            <div className="fighter-name">{profile.name}</div>
            <div className="bar hp">
              <div style={{ width: `${(myHp / DUEL_HP) * 100}%` }} />
              <span>{myHp}/{DUEL_HP}</span>
            </div>
          </div>
          {floats.filter((f) => f.side === 'you').map((f) => (
            <div key={f.id} className={`float-num ${f.kind}`}>{f.text}</div>
          ))}
        </div>

        {phase === 'end' && result && (
          <div className="battle-banner">
            {result.won
              ? result.reason === 'disconnect'
                ? 'Opponent fled — you win!'
                : 'VICTORY!'
              : 'Defeated…'}
          </div>
        )}

        <div className="fighter enemy-fighter">
          <div ref={foeRef} className="portrait enemy">
            {foeCls && <img src={foeCls.art} alt={foeCls.name} draggable={false} />}
          </div>
          <div className="fighter-info">
            <div className="fighter-name">{foe?.name ?? '???'}</div>
            <div className="bar hp enemy">
              <div style={{ width: `${(foeHp / DUEL_HP) * 100}%` }} />
              <span>{foeHp}/{DUEL_HP}</span>
            </div>
            <div className="attack-track" title="Opponent's typing progress">
              <div className="attack-bar" style={{ width: `${foeProgress * 100}%` }} />
            </div>
          </div>
          {floats.filter((f) => f.side === 'foe').map((f) => (
            <div key={f.id} className={`float-num ${f.kind}`}>{f.text}</div>
          ))}
        </div>
      </div>

      {phase === 'fight' && cast && (
        <TypingPanel
          spell={cast.spell}
          nextSpell={cast.next}
          target={cast.spell.incantation}
          caret={cast.caret}
          wrongTick={cast.wrongTick}
          started={cast.started}
          pressure="none"
          liveAccuracy={cast.liveAccuracy}
          liveWpm={cast.liveWpm}
        />
      )}
      {phase === 'end' && (
        <div className="duel-end-actions">
          <button className="primary-btn" onClick={goHome}>
            Back to Sanctum
          </button>
        </div>
      )}
    </div>
  );
}
