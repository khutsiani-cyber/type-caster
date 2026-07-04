import type { Spell, TypingPressure } from '../engine/types';
import { ELEMENT_COLORS, TIER_NAMES } from '../engine/spells';
import { PRESSURE_LABELS } from '../engine/enemies';

interface Props {
  spell: Spell;
  nextSpell: Spell;
  target: string;
  caret: number;
  /** increments every wrong keystroke — retriggers the red flash */
  wrongTick: number;
  started: boolean;
  pressure: TypingPressure;
  liveAccuracy: number;
  liveWpm: number;
}

export function TypingPanel({
  spell,
  nextSpell,
  target,
  caret,
  wrongTick,
  started,
  pressure,
  liveAccuracy,
  liveWpm,
}: Props) {
  const color = ELEMENT_COLORS[spell.element];
  const blurred = pressure === 'blur';
  const belowReq =
    started && (liveAccuracy < spell.requiredAccuracy || (caret > 4 && liveWpm < spell.requiredWpm));

  return (
    <div className="typing-panel" style={{ ['--element' as string]: color }}>
      <div className="typing-head">
        <span className="typing-spell-name">{spell.name}</span>
        <span className="typing-tier">{TIER_NAMES[spell.tier]}</span>
        {pressure !== 'none' && (
          <span className="pressure-chip">{PRESSURE_LABELS[pressure]}</span>
        )}
        <span className={`typing-live ${belowReq ? 'danger' : ''}`}>
          {started
            ? `${Math.round(liveAccuracy * 100)}% acc · ${Math.round(liveWpm)} wpm`
            : 'type to cast — Esc skips'}
        </span>
      </div>

      <div className="incantation" key={`w${wrongTick}`}>
        {target.split('').map((ch, i) => {
          let cls = 'ch ';
          if (i < caret) cls += 'done';
          else if (i === caret) cls += 'cur';
          else cls += blurred ? 'todo blurred' : 'todo';
          const flash = i === caret && wrongTick > 0;
          return (
            <span key={i} className={cls + (flash ? ' wrong-flash' : '')}>
              {ch}
            </span>
          );
        })}
      </div>

      <div className="typing-foot">
        <span>
          needs {Math.round(spell.requiredAccuracy * 100)}% acc · {spell.requiredWpm} wpm — or it
          backfires
        </span>
        <span className="next-spell">
          next: <b style={{ color: ELEMENT_COLORS[nextSpell.element] }}>{nextSpell.name}</b>
        </span>
      </div>
    </div>
  );
}
