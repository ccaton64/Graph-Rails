/**
 * Regenerate hazard images with correct prompts — top-down dungeon sprites
 * Run: node tools/gen-hazards-v2.mjs
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const API_KEY = '5b082a80-5392-48b6-95c3-fc240beb0973';
const MCP_URL = 'https://mcp.ludo.ai/mcp';
const OUT = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets/sprites';

async function ludo(tool, args) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Authentication': `ApiKey ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc:'2.0', method:'tools/call', params:{ name:tool, arguments:args }, id:Date.now() })
  });
  const json = await res.json();
  const text = json.result?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return { _raw: text };
}

async function dl(url, path) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const sig = buf.slice(0,4).toString('ascii');
  const out = sig === 'RIFF' ? await sharp(buf).png().toBuffer() : buf;
  writeFileSync(path, out);
  console.log(`  ✓ ${path.split('/').slice(-1)[0]}`);
}

async function gen(name, prompt) {
  console.log(`⚙  ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'sprite',
    prompt,
    art_style: '16-Bit',
    perspective: 'Top-Down',
    aspect_ratio: 'ar_1_1',
    n: 1,
    augment_prompt: false,
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ no url`); return; }
  await dl(url, `${OUT}/${name}.png`);
}

console.log('🧱 Hazard Image Regeneration (v2)\n');

// HOLE: must look like a black bottomless pit when viewed from above
await gen('hazard_hole',
  'Top-down view of a dark bottomless pit hole in a stone dungeon floor. ' +
  'Pure black void in the center. Crumbling broken stone edges around the pit. ' +
  'Dark abyss, no texture inside, darkness. Pixel art 16-bit game asset. No background.');

// LAVA: molten orange-red pool viewed from directly above
await gen('hazard_lava',
  'Top-down bird-eye view of a molten lava pool in a dungeon. ' +
  'Glowing bright orange and red magma surface. Bright glowing cracks, dark rock islands. ' +
  'Intense heat glow. Pixel art 16-bit game asset. No background.');

// ROCK: a dense pile of gray boulders blocking the path, seen from above
await gen('hazard_rock',
  'Top-down view of a pile of large gray boulders and rocks blocking a dungeon floor. ' +
  'Multiple chunky stone boulders packed tightly together. Gray and dark stone. ' +
  'Pixel art 16-bit game asset. No background.');

// MONSTER: a dangerous creature zone seen from above — purple slime/ooze blob
await gen('hazard_monster',
  'Top-down view of a dangerous purple slime monster in a dungeon. ' +
  'Large slimy purple blob creature with two glowing red eyes visible from above. ' +
  'Purple ooze spreading outward. Pixel art 16-bit game asset. No background.');

console.log('\n✅ Done');
