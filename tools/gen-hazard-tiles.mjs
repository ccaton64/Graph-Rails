/**
 * Generate high-quality tileable hazard textures for Graph Rails
 * Run: node tools/gen-hazard-tiles.mjs
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

async function genTile(name, prompt) {
  console.log(`⚙  Tile: ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'tile',
    prompt: `Top-down view, dungeon mine floor hazard tile, pixel art 16-bit style, seamlessly tileable, ${prompt}. No text, no logos.`,
    art_style: '16-Bit',
    perspective: 'Top-Down',
    aspect_ratio: 'ar_1_1',
    n: 1,
    augment_prompt: false,
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ no URL for ${name}`); return; }
  await dl(url, `${OUT}/${name}.png`);
}

console.log('🧱 Graph Rails — Hazard Tile Generator');
console.log('========================================\n');

await genTile('hazard_rock',    'gray jagged boulders and rubble filling the floor, rough stone chunks, dark crevices, mine debris');
await genTile('hazard_lava',    'molten orange-red glowing lava floor, bright magma cracks, glowing heat, underground lava lake');
await genTile('hazard_hole',    'dark bottomless pit floor, black void with jagged crumbling edges, dirt and stone rim, abyss');
await genTile('hazard_monster', 'purple slime monster pattern, gooey alien floor covering, bubbling purple ooze, bio-hazard');

console.log('\n✅ Hazard tiles generated!');
