import { useGame } from './state/store';
import { HomeScreen } from './components/HomeScreen';
import { BattleScreen } from './components/BattleScreen';
import { DeathScreen } from './components/DeathScreen';
import { DuelScreen } from './components/DuelScreen';

export default function App() {
  const screen = useGame((s) => s.screen);

  return (
    <div className="app-root">
      {screen === 'home' && <HomeScreen />}
      {screen === 'battle' && <BattleScreen />}
      {screen === 'dead' && <DeathScreen />}
      {screen === 'duel' && <DuelScreen />}
    </div>
  );
}
