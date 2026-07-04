import type { Element, Spell, Tier } from './types';

// Tier table: acc / wpm / dmg / price. Higher tier = longer, meaner
// incantations (clauses, punctuation, capitals) and much bigger payoff.
// NOTE: incantations must only use characters on a standard keyboard —
// no em-dashes or curly quotes, ever. Players have to type these.
export const TIER_STATS: Record<Tier, { acc: number; wpm: number; dmg: number; price: number }> = {
  1: { acc: 0.55, wpm: 25, dmg: 12, price: 60 },
  2: { acc: 0.65, wpm: 35, dmg: 20, price: 150 },
  3: { acc: 0.75, wpm: 45, dmg: 32, price: 400 },
  4: { acc: 0.85, wpm: 55, dmg: 52, price: 900 },
  5: { acc: 0.92, wpm: 65, dmg: 85, price: 2000 },
};

export const TIER_NAMES: Record<Tier, string> = {
  1: 'Novice',
  2: 'Adept',
  3: 'Invoker',
  4: 'Archmage',
  5: 'World-Word',
};

export const TIER_COLORS: Record<Tier, string> = {
  1: '#9aa3b2',
  2: '#4fc36b',
  3: '#4aa3e8',
  4: '#b05ce8',
  5: '#e8a13c',
};

function spell(id: string, name: string, incantation: string, element: Element, tier: Tier): Spell {
  const t = TIER_STATS[tier];
  return {
    id,
    name,
    incantation,
    element,
    tier,
    baseDamage: t.dmg,
    requiredAccuracy: t.acc,
    requiredWpm: t.wpm,
    price: t.price,
  };
}

export const SPELLS: Spell[] = [
  // ══ Tier 1 · Novice ══════════════════════════════════════════════
  spell('cinder-snap', 'Cinder Snap', 'Wake, little flame, and bite.', 'fire', 1),
  spell('frost-needle', 'Frost Needle', 'Cold finds the cracks in everything.', 'frost', 1),
  spell('arc-spark', 'Arc Spark', 'The storm still owes me a debt.', 'storm', 1),
  spell('candle-thief', 'Candle Thief', 'Your light belongs to me now.', 'shadow', 1),
  spell('glyph-dart', 'Glyph Dart', 'One rune, thrown like a knife.', 'arcane', 1),
  spell('ember-flick', 'Ember Flick', 'Go on, little spark: catch.', 'fire', 1),
  spell('mote-burn', 'Mote Burn', 'Even a spark dreams of arson.', 'fire', 1),
  spell('soot-spit', 'Soot Spit', 'The chimney remembers every fire.', 'fire', 1),
  spell('hail-pinch', 'Hail Pinch', 'Winter fits inside my fist.', 'frost', 1),
  spell('rime-kiss', 'Rime Kiss', 'The first frost never asks permission.', 'frost', 1),
  spell('sleet-fling', 'Sleet Fling', 'Rude weather, delivered by hand.', 'frost', 1),
  spell('static-bite', 'Static Bite', 'Small lightning, surprisingly sharp teeth.', 'storm', 1),
  spell('volt-snap', 'Volt Snap', 'Thunder, but in a hurry.', 'storm', 1),
  spell('spark-toll', 'Spark Toll', 'Pay the sky its small change.', 'storm', 1),
  spell('dusk-pin', 'Dusk Pin', 'A pin made of pure midnight.', 'shadow', 1),
  spell('shade-nip', 'Shade Nip', 'The dark has small teeth too.', 'shadow', 1),
  spell('gloom-tap', 'Gloom Tap', 'Knock once upon the night.', 'shadow', 1),
  spell('wisp-lash', 'Wisp Lash', 'Light bends; so will you.', 'arcane', 1),
  spell('rune-jab', 'Rune Jab', 'Grammar, briefly weaponized.', 'arcane', 1),
  spell('sigil-flick', 'Sigil Flick', 'A signature that leaves a scar.', 'arcane', 1),

  // ══ Tier 2 · Adept ═══════════════════════════════════════════════
  spell('ember-whip', 'Ember Whip', 'Lash of cinders, carve your mark across their hide.', 'fire', 2),
  spell('riptide-hex', 'Riptide Hex', 'Drown slowly; the tide keeps what it takes.', 'frost', 2),
  spell('grave-chill', 'Grave Chill', 'Every warm thing forgets its name in the dark.', 'shadow', 2),
  spell('kindled-oath', 'Kindled Oath', 'I promised the fire a feast; kindly hold still.', 'fire', 2),
  spell('undertow', 'Undertow', 'The deep does not negotiate with the drowning.', 'frost', 2),
  spell('ash-veil', 'Ash Veil', 'Breathe in the bonfire; keep it as a secret.', 'fire', 2),
  spell('pyre-song', 'Pyre Song', 'Hum along; the kindling already knows this tune.', 'fire', 2),
  spell('cinder-tithe', 'Cinder Tithe', 'The flame takes ten percent of everything soft.', 'fire', 2),
  spell('frostbrand', 'Frostbrand', 'A sword of January, drawn across their summer.', 'frost', 2),
  spell('black-ice', 'Black Ice', 'The road was never your friend in winter.', 'frost', 2),
  spell('hoarfrost-net', 'Hoarfrost Net', 'Patience, crystallized; a net of slow white teeth.', 'frost', 2),
  spell('galvanic-noose', 'Galvanic Noose', 'Lightning learns knots quickly when I ask nicely.', 'storm', 2),
  spell('thunder-debt', 'Thunder Debt', 'Interest compounds; the sky collects in volts.', 'storm', 2),
  spell('arc-lattice', 'Arc Lattice', 'I weave the lightning into a cage of angles.', 'storm', 2),
  spell('umbral-hook', 'Umbral Hook', 'The shadow under your bed grew up hungry.', 'shadow', 2),
  spell('night-toll', 'Night Toll', 'Midnight charges admission, and you look expensive.', 'shadow', 2),
  spell('sorrow-leech', 'Sorrow Leech', 'Your worst memory, sharpened to a fine point.', 'shadow', 2),
  spell('rune-shear', 'Rune Shear', 'I edit their outline with a sharpened rune.', 'arcane', 2),
  spell('glyph-storm', 'Glyph Storm', 'A paragraph of knives, punctuated by screams.', 'arcane', 2),
  spell('axiom-cut', 'Axiom Cut', 'Proof by injury: therefore, you bleed.', 'arcane', 2),

  // ══ Tier 3 · Invoker ═════════════════════════════════════════════
  spell('pyroclasm', 'Pyroclasm', 'Mountains dreamed of this fire; now the sky will learn it too.', 'fire', 3),
  spell('mirror-lance', 'Mirror Lance', 'Shatter, silver truth: a thousand edges, one intention.', 'arcane', 3),
  spell('chain-lightning', 'Chain Lightning', 'Sky-script, written in white heat: strike, and strike, and strike again.', 'storm', 3),
  spell('ember-choir', 'Ember Choir', 'Sing, embers: a hundred small hungers become one roar.', 'fire', 3),
  spell('void-stitch', 'Void Stitch', 'Needle of nothing, sew their shadow to the floor.', 'shadow', 3),
  spell('flashover', 'Flashover', 'The room does not catch fire; the fire catches the room.', 'fire', 3),
  spell('cinder-cyclone', 'Cinder Cyclone', 'Round and round the bonfire goes; where it stops, you know.', 'fire', 3),
  spell('magma-script', 'Magma Script', "I write my grievances in the planet's oldest ink.", 'fire', 3),
  spell('glacier-calving', 'Glacier Calving', 'Listen: that crack is a century deciding to fall on you.', 'frost', 3),
  spell('permafrost-maw', 'Permafrost Maw', 'The ground has been cold so long it learned to chew.', 'frost', 3),
  spell('absolute-shiver', 'Absolute Shiver', 'There is a cold below cold; I keep it on a leash.', 'frost', 3),
  spell('ion-cascade', 'Ion Cascade', 'First one spark defects, then the whole sky follows.', 'storm', 3),
  spell('storm-harpoon', 'Storm Harpoon', 'I fish for giants with a spear of weather.', 'storm', 3),
  spell('tempest-quill', 'Tempest Quill', 'The hurricane dictates; I merely hold the pen.', 'storm', 3),
  spell('gloaming-tide', 'Gloaming Tide', 'Dusk comes early today, and it is not empty-handed.', 'shadow', 3),
  spell('eclipse-bite', 'Eclipse Bite', 'For one held breath, the sun is mine to aim.', 'shadow', 3),
  spell('shadow-parliament', 'Shadow Parliament', 'All your darker halves have voted, and it was unanimous.', 'shadow', 3),
  spell('rune-cascade', 'Rune Cascade', 'One rune wakes the next; the sentence finishes itself in blood.', 'arcane', 3),
  spell('lexical-guillotine', 'Lexical Guillotine', 'The sentence ends here; so, regrettably, do you.', 'arcane', 3),
  spell('theorem-of-thorns', 'Theorem of Thorns', 'What grows from a proof? Consequences, with points.', 'arcane', 3),

  // ══ Tier 4 · Archmage ════════════════════════════════════════════
  spell('black-sun-brand', 'Black Sun Brand', 'I hang a dead star over their heads; let its shadow do the burning.', 'shadow', 4),
  spell('hollowing-word', 'Hollowing Word', 'There is a word older than bone. I speak it now: be Nothing.', 'arcane', 4),
  spell('tempest-court', 'Tempest Court', "Rise, thunder-court of the shattered sky! Pass judgment; I'll sign it in lightning.", 'storm', 4),
  spell('glacier-tomb', 'Glacier Tomb', 'Winter writes no eulogies; it simply closes the book.', 'frost', 4),
  spell('star-fall', 'Star Fall', 'I subpoena the heavens: one star, delivered at terminal velocity.', 'arcane', 4),
  spell('phoenix-lash', 'Phoenix Lash', 'Borrowed from a burning god: one feather, still furious, still falling.', 'fire', 4),
  spell('world-vein-tap', 'World-Vein Tap', 'Somewhere below, the magma heard its name and started climbing.', 'fire', 4),
  spell('cremation-of-hours', 'Cremation of Hours', 'Burn the calendar; today is the only day you have left.', 'fire', 4),
  spell('stillheart', 'Stillheart', 'I vote we skip your next heartbeat; the ice seconds the motion.', 'frost', 4),
  spell('aurora-blade', 'Aurora Blade', 'The northern lights, folded seven times and given an edge.', 'frost', 4),
  spell('zero-kelvin-psalm', 'Zero Kelvin Psalm', 'A hymn so cold the molecules stop to listen forever.', 'frost', 4),
  spell('heavens-fuse', "Heaven's Fuse", 'I light the long fuse that runs from horizon to horizon.', 'storm', 4),
  spell('voltaic-communion', 'Voltaic Communion', 'Hold hands with the storm; it has been dying to meet you.', 'storm', 4),
  spell('sky-fracture', 'Sky Fracture', 'The firmament was load-bearing; observe what happens when I remove it.', 'storm', 4),
  spell('midnight-verdict', 'Midnight Verdict', 'The night court finds you guilty of being made of light.', 'shadow', 4),
  spell('entropy-kiss', 'Entropy Kiss', 'Everything ends; I am merely the introduction.', 'shadow', 4),
  spell('penumbral-crown', 'Penumbral Crown', 'I crown you monarch of nothing; long may you not reign.', 'shadow', 4),
  spell('unwriting', 'The Unwriting', 'I found the sentence that describes you, and I brought an eraser.', 'arcane', 4),
  spell('babel-collapse', 'Babel Collapse', 'Every language ever spoken, dropped on you from a great height.', 'arcane', 4),
  spell('counterspell-of-being', 'Counterspell of Being', 'Existence made a claim; I am filing the objection now.', 'arcane', 4),

  // ══ Tier 5 · World-Word ══════════════════════════════════════════
  spell('worldsplitter', 'Worldsplitter', 'By the first rune and the last regret, I divide this moment from mercy: BREAK!', 'arcane', 5),
  spell('requiem-of-embers', 'Requiem of Embers', "O Phoenix, who taught death to dance: sing once more; scour Heaven's margins clean.", 'fire', 5),
  spell('null-crown', 'Null Crown', 'Crown of Zero, Throne of None: unmake the theorem of their flesh, Q.E.D.', 'shadow', 5),
  spell('last-syllable', 'Last Syllable', 'Every ending ever written rehearsed for this: the last syllable of a dying world.', 'shadow', 5),
  spell('storm-sovereign', 'Storm Sovereign', 'Kneel, weather. Your king is speaking, and the sentence is lightning.', 'storm', 5),
  spell('sun-swallower', 'Sun Swallower', "I taught my hunger the sun's true name, and now it will not stop asking.", 'fire', 5),
  spell('pyre-of-empires', 'Pyre of Empires', 'Rome, Carthage, Heaven: all kindling eventually. Add one more name to the fire.', 'fire', 5),
  spell('heat-death-hymn', 'Heat-Death Hymn', 'When the last star tires, it will hum this; I simply hum it early.', 'fire', 5),
  spell('winter-without-end', 'Winter Without End', 'I postpone spring indefinitely. Appeals may be filed with the glacier.', 'frost', 5),
  spell('absolute-archive', 'Absolute Archive', 'Every moment freezes eventually; yours simply files itself under Now.', 'frost', 5),
  spell('finale-of-thunder', 'Finale of Thunder', 'The orchestra of the sky has one conductor tonight, and the baton is lightning.', 'storm', 5),
  spell('voltage-of-gods', 'Voltage of Gods', 'Measured in heartbeats per heaven; yours is about to spike.', 'storm', 5),
  spell('skyfall-covenant', 'Skyfall Covenant', 'I signed a treaty with gravity: everything above you is now mine to drop.', 'storm', 5),
  spell('devourer-whisper', "Devourer's Whisper", "Zho'gath v'Xul, Devourer: RISE and CONSUME what little they were saving.", 'shadow', 5),
  spell('total-eclipse', 'Total Eclipse of Being', 'The moon apologizes; this darkness is entirely on purpose.', 'shadow', 5),
  spell('omega-shade', 'Omega Shade', 'After the last light dies, something still moves. I asked it here tonight.', 'shadow', 5),
  spell('rewrite-of-heaven', 'Rewrite of Heaven', 'The stars were a first draft. Watch closely while I revise.', 'arcane', 5),
  spell('proof-of-annihilation', 'Proof of Annihilation', 'Lemma one: you exist. Lemma two: not for long. The proof is an exercise.', 'arcane', 5),
  spell('grand-unravel', 'The Grand Unravel', 'Pull one thread of the world hard enough and everything learns what unraveling means.', 'arcane', 5),
  spell('crown-of-the-worldword', 'Crown of the World-Word', 'In the beginning was the Word; it has been seeking a worthy sentence ever since.', 'arcane', 5),
];

export const SPELLS_BY_ID = new Map(SPELLS.map((s) => [s.id, s]));

// Six free starters — one taste of each element plus two extra fire/frost.
export const STARTER_SPELLS = [
  'cinder-snap',
  'frost-needle',
  'arc-spark',
  'candle-thief',
  'glyph-dart',
  'ember-flick',
];

/**
 * Fair, fixed deck used for PvP duels: every tier 1-3 spell. Both players
 * type the same seeded sequence drawn from this pool.
 */
export const DUEL_DECK = SPELLS.filter((s) => s.tier <= 3).map((s) => s.id);

export const ELEMENT_COLORS: Record<Element, string> = {
  fire: '#ff7a3c',
  frost: '#5cd6ff',
  arcane: '#b06cff',
  storm: '#ffd94a',
  shadow: '#8a5cf5',
};
