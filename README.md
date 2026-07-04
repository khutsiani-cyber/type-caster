# Type-Caster

A fast, real-time typing battle game. Enemies charge their attacks on visible
timers while you type incantations — **your typing speed is your only shield.**
No turns, no map: endless waves, permanent character progression.

## Run it

```bash
npm install
npm run dev            # game — http://localhost:5173
npm run duel-server    # PvP server — ws://localhost:8787 (only needed for duels)
```

## How it plays

- An incantation appears; type it. Finishing it fires the spell.
- Accuracy below the spell's requirement, or typing slower than its WPM
  requirement → the spell **backfires** onto you.
- ≥98% accuracy at 1.5× the required WPM → **critical hit** (×2 damage).
- Clean casts chain a combo: +8% damage each, up to +40%. A typo breaks it.
- `Esc` skips a bad incantation (breaks combo). Retreat any time — gold is kept.
- Every 5th wave: the Arch-Lich. Waves scale forever.
- Death loses nothing: gold, spells, and upgrades are permanent.

## Character

Three classes (AI-generated portraits in `public/art/`):
**Pyromancer** +15% damage · **Chronomancer** enemies 12% slower ·
**Runescribe** 1 typo forgiven per cast.

Permanent upgrades bought with gold: Vitality (max HP), Power (damage),
Precision (typo forgiveness), Ward (damage reduction).

**100 spells** across 5 tiers (20 each) — higher tiers have longer, harder
incantations and much bigger damage. Every equipped spell joins your battle
stream and incantations are dealt at random, so the bigger your collection,
the less you can memorize. All incantations use only standard-keyboard
characters.

## Enemy pressure

| Enemy | Waves | Trick |
|---|---|---|
| Ash Imp | 1+ | none — a warm-up |
| Hex Raven | 2+ | blurs untyped letters |
| Rune Golem | 4+ | slow but very heavy hits |
| Mirror Wraith | 4+ | incantations arrive reversed |
| Void Maw | 7+ | attacks 25% faster below half HP |
| Storm Djinn | 7+ | attacks very fast |
| Bone Choir | 11+ | CAPS-LOCK CURSE |
| Grave Leech | 14+ | regenerates — a DPS check |
| The Arch-Lich (boss) | 5, 15, 25… | alternates blur / reversal |
| The Void Tyrant (boss) | 10, 20, 30… | rotates caps / reversal / blur |

## PvP duels

`npm run duel-server`, then **PvP Duel** in the game. One player creates a room
and shares the 4-letter code; the other joins. Both type the **same seeded
spell sequence** — no upgrades, no class perks, pure typing race to 0 HP.
The server is authoritative: it resolves every cast with the same pure
`resolveCast` the single-player game uses. To duel over the internet, host
`server/duel-server.ts` somewhere (Fly/Render/VPS) and set `VITE_DUEL_SERVER`.

## Sound

All SFX are synthesized live with WebAudio (`src/sfx/sfx.ts`) — key ticks,
typos, element-tinted cast whooshes, impacts, crit chimes, backfire booms,
wave-clear arpeggios. No audio files. Toggle with the 🔊 button.

## Records

Every run is scored (peak WPM, average accuracy, crits, best combo, damage)
and the top 10 land in the **Hall of Echoes** tab. Death screen shows the
full stat line of the run that just ended.

## Architecture

```
src/
  engine/          PURE logic — no DOM/React. The duel server imports these
                   files directly; they are the single source of truth.
    cast.ts        resolveCast(): accuracy/wpm/quality/backfire/crit math
    spells.ts      tier table + 100 spells + the fair duel deck
    enemies.ts     enemy defs, wave bands, typing pressure
    duel.ts        duel rules + wire protocol types
    rng.ts         seeded deterministic PRNG
  state/
    profile.ts     persistent character (class/upgrades/spells/gold)
    records.ts     local top-10 run leaderboard
    store.ts       zustand screens + profile actions
  sfx/sfx.ts       WebAudio synthesized sound effects
  vfx/vfx.ts       Canvas-2D particle engine (swappable for PixiJS)
  components/      BattleScreen (real-time loop), DuelScreen, HomeScreen, DeathScreen
server/
  duel-server.ts   authoritative WebSocket PvP server (npm run duel-server)
scripts/
  generate-art.mjs   regenerate art via Gemini image API (GEMINI_API_KEY env)
  optimize-art.mjs   downscale + convert to WebP
```
