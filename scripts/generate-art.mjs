// Generates game art via the Gemini image API into public/art/.
// Usage:  GEMINI_API_KEY=... node scripts/generate-art.mjs [only-id ...]
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('Set GEMINI_API_KEY');
  process.exit(1);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'art');
mkdirSync(OUT, { recursive: true });

const STYLE =
  'Dark arcane fantasy digital painting, painterly brushwork, glowing purple and gold rune accents, ' +
  'dramatic rim lighting, deep shadows, rich saturated detail, AAA game art quality. No text, no watermark, no UI.';

const ASSETS = [
  {
    id: 'bg-arena',
    aspect: '16:9',
    prompt:
      `Epic wide game background: the ruined interior of an ancient arcane tower used as a dueling arena at night. ` +
      `Cracked stone floor with a huge glowing rune circle in the center, floating shattered masonry, drifting purple mist, ` +
      `gold ember sparks in the air, tall broken arched windows showing a void sky. No characters, empty arena. ${STYLE}`,
  },
  {
    id: 'wizard-pyromancer',
    aspect: '1:1',
    prompt:
      `Character portrait of a fierce human pyromancer battle-wizard, waist up, facing slightly right. ` +
      `Scarred face lit by fire, ember-orange eyes, dark crimson robes with gold flame embroidery, ` +
      `both hands wreathed in swirling flame and floating burning glyphs. ${STYLE}`,
  },
  {
    id: 'wizard-chronomancer',
    aspect: '1:1',
    prompt:
      `Character portrait of an elegant chronomancer time-wizard, waist up, facing slightly right. ` +
      `Silver hair, cold blue-violet glow, dark indigo robes with clockwork gold filigree, ` +
      `a floating shattered hourglass and rotating rings of temporal runes around their hands. ${STYLE}`,
  },
  {
    id: 'wizard-runescribe',
    aspect: '1:1',
    prompt:
      `Character portrait of a scholarly runescribe war-mage, waist up, facing slightly right. ` +
      `Ink-stained fingers, spectacles glinting, deep violet robes hung with scroll cases, ` +
      `a storm of glowing golden written glyphs and a floating quill orbiting them. ${STYLE}`,
  },
  {
    id: 'enemy-imp',
    aspect: '1:1',
    prompt:
      `Monster portrait of a small vicious ash-imp demon, full body, crouched and grinning. ` +
      `Charcoal-black cracked skin glowing orange from within, oversized ears, tiny bat wings, burning eyes. ${STYLE}`,
  },
  {
    id: 'enemy-raven',
    aspect: '1:1',
    prompt:
      `Monster portrait of a hex-raven: a large sinister supernatural raven mid-shriek, wings spread. ` +
      `Feathers dissolving into black smoke, glowing violet sigils burned into its wings, three eyes. ${STYLE}`,
  },
  {
    id: 'enemy-golem',
    aspect: '1:1',
    prompt:
      `Monster portrait of a massive rune-golem, full body, towering and heavy. ` +
      `Ancient cracked stone body covered in carved glowing gold runes, purple energy leaking from joints, ` +
      `one huge fist raised. ${STYLE}`,
  },
  {
    id: 'enemy-wraith',
    aspect: '1:1',
    prompt:
      `Monster portrait of a mirror-wraith: a tall spectral ghost made of floating shattered mirror shards ` +
      `and pale blue mist, a distorted reflection of a wizard visible in the shards, long grasping hands. ${STYLE}`,
  },
  {
    id: 'enemy-maw',
    aspect: '1:1',
    prompt:
      `Monster portrait of a void-maw horror: a swirling tear in reality shaped like a huge circular mouth ` +
      `ringed with countless teeth and staring golden eyes, purple void tendrils reaching out. ${STYLE}`,
  },
  {
    id: 'enemy-djinn',
    aspect: '1:1',
    prompt:
      `Monster portrait of a storm djinn: a whirlwind spirit of black cloud and white lightning, ` +
      `upper body of a muscular genie made of storm, crackling electric eyes, four arms mid-strike, no legs — ` +
      `its lower half a tornado. ${STYLE}`,
  },
  {
    id: 'enemy-choir',
    aspect: '1:1',
    prompt:
      `Monster portrait of a bone choir: a cluster of five screaming skeletal torsos fused into one mass, ` +
      `jaws unhinged mid-howl, sound made visible as concentric glowing gold rings, tattered choir vestments. ${STYLE}`,
  },
  {
    id: 'enemy-leech',
    aspect: '1:1',
    prompt:
      `Monster portrait of a grave leech: an enormous bloated lamprey-worm coiled upright, ` +
      `circular tooth-ringed mouth open, translucent crimson skin showing stolen glowing life-force swirling inside, ` +
      `grave soil and roots clinging to it. ${STYLE}`,
  },
  {
    id: 'enemy-tyrant',
    aspect: '1:1',
    prompt:
      `Boss monster portrait of the Void Tyrant: a colossal armored emperor of living darkness, ` +
      `obsidian plate armor with molten gold seams, a crown of floating black spikes, ` +
      `one huge gauntlet crushing a dying star, cape made of torn night sky. ${STYLE}`,
  },
  {
    id: 'enemy-lich',
    aspect: '1:1',
    prompt:
      `Boss monster portrait of an arch-lich necromancer king, waist up, imperious pose. ` +
      `Desiccated regal corpse in black and gold funeral robes, floating shattered crown, ` +
      `green-violet soulfire in empty eye sockets, orbiting grimoires and chains of runes. ${STYLE}`,
  },
];

async function generate(asset) {
  const body = {
    contents: [{ parts: [{ text: asset.prompt }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: asset.aspect },
    },
  };
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`${asset.id}: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error(`${asset.id}: no image in response: ${JSON.stringify(json).slice(0, 400)}`);
  const file = join(OUT, `${asset.id}.png`);
  writeFileSync(file, Buffer.from(part.inlineData.data, 'base64'));
  console.log(`ok ${asset.id} (${(part.inlineData.data.length * 0.75 / 1024).toFixed(0)} KB)`);
}

const only = process.argv.slice(2);
const todo = ASSETS.filter((a) => (only.length ? only.includes(a.id) : true)).filter(
  (a) => only.length || !existsSync(join(OUT, `${a.id}.png`)),
);
console.log(`generating ${todo.length} asset(s)...`);
for (const a of todo) {
  try {
    await generate(a);
  } catch (e) {
    console.error(String(e).slice(0, 500));
  }
}
