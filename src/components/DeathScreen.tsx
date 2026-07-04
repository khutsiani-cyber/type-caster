import { useGame } from '../state/store';
import { CLASSES_BY_ID } from '../state/profile';

export function DeathScreen() {
  const { lastBattle, profile, startBattle, goHome } = useGame();
  const cls = CLASSES_BY_ID.get(profile.classId)!;
  if (!lastBattle) return null;
  const s = lastBattle.stats;

  return (
    <div className="death-root">
      <div className="death-card">
        <img className="death-portrait" src={cls.art} alt={cls.name} draggable={false} />
        <h2>The arena keeps your echo.</h2>
        <div className="death-stats">
          <div>
            <span className="death-num">{lastBattle.wave}</span>
            <span className="death-label">wave reached{lastBattle.newBest ? ' · NEW BEST' : ''}</span>
          </div>
          <div>
            <span className="death-num">🪙 {lastBattle.goldEarned}</span>
            <span className="death-label">gold banked</span>
          </div>
        </div>
        <div className="death-detail-grid">
          <div><b>{s.casts}</b> casts</div>
          <div><b>{s.crits}</b> crits</div>
          <div><b>{s.backfires}</b> backfires</div>
          <div><b>×{s.bestCombo}</b> best combo</div>
          <div><b>{s.peakWpm}</b> peak wpm</div>
          <div><b>{Math.round(s.avgAcc * 100)}%</b> avg accuracy</div>
        </div>
        <p className="death-hint">Gold, spells and upgrades persist. Spend, sharpen, return.</p>
        <div className="death-actions">
          <button className="primary-btn" onClick={startBattle}>
            ⚔ Fight Again
          </button>
          <button className="skip-btn" onClick={goHome}>
            Character &amp; Shop
          </button>
        </div>
      </div>
    </div>
  );
}
