import { useState } from 'react';
import type { Tier } from '../engine/types';
import { SPELLS, TIER_NAMES, TIER_COLORS, ELEMENT_COLORS } from '../engine/spells';
import { CLASSES, CLASSES_BY_ID, statsFor, UPGRADES, upgradeCost } from '../state/profile';
import { useGame } from '../state/store';
import { sfx } from '../sfx/sfx';

export function HomeScreen() {
  const { profile, records, setName, setClass, buyUpgrade, buySpell, toggleEquip, startBattle, startDuel } =
    useGame();
  const stats = statsFor(profile);
  const [tab, setTab] = useState<'character' | 'spellbook' | 'records'>('character');
  const [muted, setMuted] = useState(!sfx.enabled);
  const [tierFilter, setTierFilter] = useState<Tier | 0>(0);

  const shownSpells = SPELLS.filter((s) => tierFilter === 0 || s.tier === tierFilter);

  return (
    <div className="home-root">
      <header className="home-header">
        <h1 className="game-title">
          <span className="title-rune">✦</span> Type-Caster <span className="title-rune">✦</span>
        </h1>
        <div className="home-meta">
          <span className="hud-gold">🪙 {profile.gold}</span>
          <span className="hud-best">best wave: {profile.bestWave || '—'}</span>
          <button className="sound-btn" title="Toggle sound" onClick={() => setMuted(!sfx.toggle())}>
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      <div className="home-actions">
        <button className="primary-btn start-battle" onClick={startBattle}>
          ⚔ Enter the Arena
        </button>
        <button className="primary-btn duel-btn" onClick={startDuel}>
          🗡 PvP Duel
        </button>
      </div>
      <p className="start-hint">
        Endless waves, real time. Enemies charge their attacks while you type — your typing speed is
        your only shield. Every 5th wave a boss: the Arch-Lich and the Void Tyrant take turns. Death
        costs nothing but pride; gold and upgrades are forever.
      </p>

      <nav className="home-tabs">
        <button className={tab === 'character' ? 'active' : ''} onClick={() => setTab('character')}>
          Character
        </button>
        <button className={tab === 'spellbook' ? 'active' : ''} onClick={() => setTab('spellbook')}>
          Spellbook ({profile.ownedSpellIds.length}/{SPELLS.length} owned)
        </button>
        <button className={tab === 'records' ? 'active' : ''} onClick={() => setTab('records')}>
          Hall of Echoes
        </button>
      </nav>

      {tab === 'character' && (
        <section className="character-panel">
          <div className="name-row">
            <label>
              Name{' '}
              <input
                value={profile.name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                spellCheck={false}
              />
            </label>
            <span className="stat-readout">
              ❤ {stats.maxHp} · ⚔ ×{stats.damageMult.toFixed(2)} · 🪶 {stats.forgiveness}/cast · 🛡{' '}
              {Math.round((1 - stats.damageTakenMult) * 100)}%
            </span>
          </div>

          <div className="class-row">
            {CLASSES.map((c) => (
              <button
                key={c.id}
                className={`class-card ${profile.classId === c.id ? 'selected' : ''}`}
                onClick={() => {
                  sfx.buy();
                  setClass(c.id);
                }}
              >
                <img src={c.art} alt={c.name} draggable={false} />
                <span className="class-name">{c.name}</span>
                <span className="class-perk">{c.perk}</span>
              </button>
            ))}
          </div>

          <h3 className="section-title">Permanent Upgrades</h3>
          <div className="upgrade-row">
            {UPGRADES.map((u) => {
              const level = profile.upgrades[u.id];
              const maxed = level >= u.maxLevel;
              const cost = upgradeCost(u, level);
              return (
                <div key={u.id} className="upgrade-card">
                  <span className="upgrade-icon">{u.icon}</span>
                  <span className="upgrade-name">
                    {u.name} <span className="upgrade-level">lv {level}</span>
                  </span>
                  <span className="upgrade-desc">{u.describe(level)}</span>
                  <span className="upgrade-effect">{u.effectPerLevel}</span>
                  <button
                    className="buy-btn"
                    disabled={maxed || profile.gold < cost}
                    onClick={() => {
                      sfx.buy();
                      buyUpgrade(u.id);
                    }}
                  >
                    {maxed ? 'MAX' : `🪙 ${cost}`}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'spellbook' && (
        <section className="spellbook-panel">
          <p className="spellbook-hint">
            Every equipped spell joins your battle stream — incantations are dealt at random, so
            the more you own, the less you can predict. {profile.equippedSpellIds.length} in your
            stream now.
          </p>
          <div className="tier-filter">
            <button className={tierFilter === 0 ? 'active' : ''} onClick={() => setTierFilter(0)}>
              All ({SPELLS.length})
            </button>
            {([1, 2, 3, 4, 5] as Tier[]).map((t) => (
              <button
                key={t}
                className={tierFilter === t ? 'active' : ''}
                style={{ ['--tier' as string]: TIER_COLORS[t] }}
                onClick={() => setTierFilter(t)}
              >
                {TIER_NAMES[t]}
              </button>
            ))}
          </div>
          <div className="spell-grid">
            {shownSpells.map((s) => {
              const owned = profile.ownedSpellIds.includes(s.id);
              const equipped = profile.equippedSpellIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`shop-spell tier-${s.tier} ${equipped ? 'equipped' : ''} ${owned ? '' : 'locked'}`}
                  style={{ ['--tier' as string]: TIER_COLORS[s.tier] }}
                >
                  <div className="shop-spell-head">
                    <span className="element-dot" style={{ background: ELEMENT_COLORS[s.element] }} />
                    <span className="spell-name">{s.name}</span>
                    <span className="spell-tier">{TIER_NAMES[s.tier]}</span>
                  </div>
                  <p className="spell-incant">“{s.incantation}”</p>
                  <div className="shop-spell-stats">
                    ⚔ {s.baseDamage} · needs {Math.round(s.requiredAccuracy * 100)}% ·{' '}
                    {s.requiredWpm} wpm
                  </div>
                  {owned ? (
                    <button
                      className="equip-btn"
                      onClick={() => {
                        sfx.buy();
                        toggleEquip(s.id);
                      }}
                    >
                      {equipped ? '✓ Equipped — unequip' : 'Equip'}
                    </button>
                  ) : (
                    <button
                      className="buy-btn"
                      disabled={profile.gold < s.price}
                      onClick={() => {
                        sfx.buy();
                        buySpell(s.id);
                      }}
                    >
                      Buy — 🪙 {s.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'records' && (
        <section className="records-panel">
          {records.length === 0 ? (
            <p className="spellbook-hint">No runs recorded yet. The arena remembers everything.</p>
          ) : (
            <table className="records-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Caster</th>
                  <th>Wave</th>
                  <th>Gold</th>
                  <th>Peak WPM</th>
                  <th>Accuracy</th>
                  <th>Crits</th>
                  <th>Best Combo</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={`${r.date}-${i}`}>
                    <td>{i + 1}</td>
                    <td>
                      {r.name}
                      <span className="record-class"> · {CLASSES_BY_ID.get(r.classId)?.name}</span>
                    </td>
                    <td className="record-wave">{r.wave}</td>
                    <td>🪙 {r.gold}</td>
                    <td>{r.peakWpm}</td>
                    <td>{Math.round(r.avgAcc * 100)}%</td>
                    <td>{r.crits}</td>
                    <td>×{r.bestCombo}</td>
                    <td className="record-date">{new Date(r.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
}
