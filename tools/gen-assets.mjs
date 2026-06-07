/**
 * Graph Rails — Ludo AI asset generator
 * Run: node tools/gen-assets.mjs
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_KEY = '5b082a80-5392-48b6-95c3-fc240beb0973';
const MCP_URL = 'https://mcp.ludo.ai/mcp';
const OUT = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets';

const ANCHOR = 'Original blocky voxel educational math game, Minecraft-inspired but legally distinct, chunky pixel blocks, friendly colorful minecart rail world, child-friendly bright educational tone, transparent background, no text, no logos, no copyrighted Minecraft assets';

async function ludo(tool, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', method: 'tools/call',
    params: { name: tool, arguments: args },
    id: Date.now()
  });
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Authentication': `ApiKey ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  const text = json.result?.content?.[0]?.text ?? '';
  // Extract JSON from response text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return { _raw: text };
}

async function download(url, path) {
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  console.log(`  ✓ saved ${path.split('/').slice(-2).join('/')}`);
}

async function genImage(name, prompt, dir = 'sprites') {
  console.log(`⚙ Generating image: ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'sprite',
    prompt: `${ANCHOR}. ${prompt}`,
    art_style: '16-Bit',
    perspective: 'Side-Scroll',
    aspect_ratio: 'ar_1_1',
    n: 1
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ No URL for ${name}:`, JSON.stringify(r).slice(0, 200)); return null; }
  await download(url, `${OUT}/${dir}/${name}.png`);
  return url;
}

async function genBg(name, prompt) {
  console.log(`⚙ Generating background: ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'side_scrolling_background',
    prompt: `${prompt}. Blocky voxel pixel art style, child-friendly educational math game background, bright and colorful, crisp pixel-like textures`,
    art_style: '16-Bit',
    perspective: 'Side-Scroll',
    aspect_ratio: 'ar_16_9',
    n: 1
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ No URL for ${name}:`, JSON.stringify(r).slice(0, 200)); return null; }
  await download(url, `${OUT}/bg/${name}.png`);
  return url;
}

async function genSheet(name, prompt, spriteUrl) {
  console.log(`⚙ Animating sprite: ${name}`);
  if (!spriteUrl) { console.warn(`  ✗ Skipping ${name} — no base image`); return; }
  const r = await ludo('animateSprite', { requestBody: {
    motion_prompt: prompt,
    initial_image: spriteUrl,
    model: 'eagle',
    frames: 25,
    frame_size: 192,
    duration: 1,
    loop: true,
    image_type: 'sprite'
  }});
  const url = r.spritesheet_url || r.url;
  if (!url) { console.warn(`  ✗ No spritesheet for ${name}:`, JSON.stringify(r).slice(0, 200)); return; }
  await download(url, `${OUT}/sheets/${name}.png`);
}

async function genSfx(name, desc, loop = false) {
  console.log(`⚙ Generating SFX: ${name}`);
  const r = await ludo('createSoundEffect', { requestBody: {
    description: desc,
    duration: loop ? 3 : 0,
    loop
  }});
  const url = r.url || r.audio_url;
  if (!url) { console.warn(`  ✗ No audio for ${name}:`, JSON.stringify(r).slice(0, 200)); return; }
  await download(url, `${OUT}/audio/${name}.mp3`);
}

async function genMusic(name, desc) {
  console.log(`⚙ Generating music: ${name}`);
  const r = await ludo('createMusic', { requestBody: { description: desc }});
  const url = r.url || r.audio_url;
  if (!url) { console.warn(`  ✗ No audio for ${name}:`, JSON.stringify(r).slice(0, 200)); return; }
  await download(url, `${OUT}/audio/${name}.mp3`);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
console.log('🚂 Graph Rails — Ludo AI Asset Generator');
console.log('==========================================\n');

// Generate base sprites first (needed for animation)
const minecartUrl  = await genImage('minecart',       'Chunky blocky minecart on rails, wood and iron, side view, simple pixel art, no background');
const gemUrl       = await genImage('gem',            'Glowing yellow diamond gem collectible, pixel art, bright sparkle, no background');
const startUrl     = await genImage('start_station',  'Green wooden train station platform with a green flag, side view pixel art, no background');
const finishUrl    = await genImage('finish_station', 'Golden train station platform with a gold flag, side view pixel art, no background');
const rockUrl      = await genImage('rock',           'Gray boulder rock pile obstacle, chunky pixel art, no background');
const lavaUrl      = await genImage('lava',           'Glowing orange lava pool with bubbles, pixel art, no background');
const holeUrl      = await genImage('hole',           'Dark pit ravine hole in the ground with jagged edges, pixel art, no background');
const monsterUrl   = await genImage('monster',        'Cute friendly purple block creature with big eyes, smiling, pixel art, no background');

// Backgrounds
await genBg('bg_overworld',    'Sunny grassy hills with blocky terrain, blue sky with clouds, voxel world side scrolling, bright greens and blues');
await genBg('bg_cave',         'Underground cave with glowing torches on stone walls, cozy dark blue cavern, pixel art, warm torch light accents');
await genBg('bg_lava_cavern',  'Underground lava cavern with glowing orange lava rivers, dark cave walls, dramatic but safe and friendly');
await genBg('bg_rail_yard',    'Blocky rail yard with multiple train tracks, stone ground, industrial but friendly pixel art, warm lighting');

// Animations (run after sprites)
await genSheet('minecart_ride',  'Wheels spinning fast, small dust puffs from sides, cart bouncing slightly while rolling on rails', minecartUrl);
await genSheet('minecart_crash', 'Cart bumping into wall and bouncing back comically, pieces wobbling, surprised motion', minecartUrl);
await genSheet('gem_spin',       'Diamond gem rotating and sparkling, glowing light pulses outward', gemUrl);
await genSheet('monster_idle',   'Cute block creature blinking slowly, bobbing gently up and down, friendly bounce', monsterUrl);

// Sound effects
await genSfx('cart_roll',      'Wooden minecart rolling on metal rails, rhythmic clacking, medium speed', true);
await genSfx('gem_collect',    'Bright cheerful coin collect chime, sparkle sound effect, satisfying ding');
await genSfx('cart_crash',     'Comical cartoon crash bump, boing sound, light and funny not scary');
await genSfx('level_complete', 'Cheerful victory fanfare, short upbeat musical sting, celebration');
await genSfx('wrong_answer',   'Soft buzzer wrong answer sound, gentle not harsh, educational game style');
await genSfx('button_click',   'Soft wooden block click button press sound');

// Background music
await genMusic('music_learning', 'Cheerful upbeat children educational adventure game music, marimba and light percussion, playful blocky feel, looping');
await genMusic('music_freeplay', 'Energetic upbeat time pressure game music, fun and exciting, marimba synth, not stressful');

console.log('\n✅ All assets generated!');
