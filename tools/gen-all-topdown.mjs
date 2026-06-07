/**
 * Graph Rails — Full asset regeneration, TOP-DOWN perspective
 * Run: node tools/gen-all-topdown.mjs
 */
import { writeFileSync } from 'node:fs';
import { createCanvas as nodeCreateCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

const API_KEY = '5b082a80-5392-48b6-95c3-fc240beb0973';
const MCP_URL = 'https://mcp.ludo.ai/mcp';
const SPRITES = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets/sprites';
const SHEETS  = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets/sheets';
const BG      = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets/bg';

const ANCHOR = 'Top-down view, educational math game, blocky pixel art, child-friendly bright colors, transparent background, no text, no logos, clean game asset, looking straight down from above';
const BG_ANCHOR = 'Top-down bird\'s eye view, underground mine dungeon floor, tile-based puzzle game, blocky pixel art, child-friendly, crisp pixel textures';

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
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  // Convert WebP → PNG if needed
  const sig = buf.slice(0,4).toString('ascii');
  if (sig === 'RIFF') {
    const png = await sharp(buf).png().toBuffer();
    writeFileSync(path, png);
  } else {
    writeFileSync(path, buf);
  }
  console.log(`  ✓ ${path.split('/').slice(-2).join('/')}`);
}

async function genSprite(name, prompt) {
  console.log(`⚙  Sprite: ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'sprite',
    prompt: `${ANCHOR}. ${prompt}`,
    art_style: '16-Bit',
    perspective: 'Top-Down',
    aspect_ratio: 'ar_1_1',
    n: 1
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ no URL for ${name}`); return null; }
  await dl(url, `${SPRITES}/${name}.png`);
  return url;
}

async function genBg(name, prompt) {
  console.log(`⚙  Background: ${name}`);
  const r = await ludo('createImage', { requestBody: {
    image_type: 'fixed_background',
    prompt: `${BG_ANCHOR}. ${prompt}`,
    art_style: '16-Bit',
    perspective: 'Top-Down',
    aspect_ratio: 'ar_16_9',
    n: 1
  }});
  const url = r.image_urls?.[0] || r.url;
  if (!url) { console.warn(`  ✗ no URL for ${name}`); return; }
  await dl(url, `${BG}/${name}.png`);
}

async function genSheet(name, spriteUrl, motionPrompt) {
  console.log(`⚙  Sheet: ${name}`);
  if (!spriteUrl) { console.warn(`  ✗ skipping ${name} — no base image`); return; }
  const r = await ludo('animateSprite', { requestBody: {
    motion_prompt: motionPrompt,
    initial_image: spriteUrl,
    model: 'eagle',
    frames: 16,
    frame_size: 256,
    duration: 1,
    loop: true,
    image_type: 'sprite',
    individual_frames: true,
  }});

  const frameUrls = r.individual_frame_urls;
  if (!frameUrls?.length) { console.warn(`  ✗ no frames for ${name}`); return; }

  console.log(`  ↓ ${frameUrls.length} frames → stitching PNG…`);
  const pngBufs = await Promise.all(frameUrls.map(async url => {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const sig = buf.slice(0,4).toString('ascii');
    return sig === 'RIFF' ? sharp(buf).png().toBuffer() : buf;
  }));

  const meta = await sharp(pngBufs[0]).metadata();
  const fw = meta.width, fh = meta.height;
  const cols = 4, rows = Math.ceil(pngBufs.length / cols);
  const canvas = nodeCreateCanvas(cols * fw, rows * fh);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const imgs = await Promise.all(pngBufs.map(b => loadImage(b)));
  imgs.forEach((img, i) => {
    ctx.drawImage(img, (i % cols) * fw, Math.floor(i / cols) * fh, fw, fh);
  });

  const outBuf = canvas.toBuffer('image/png');
  writeFileSync(`${SHEETS}/${name}.png`, outBuf);
  console.log(`  ✓ ${name}.png  (${cols}×${rows} grid, ${fw}×${fh}px/frame, ${Math.round(outBuf.length/1024)}KB)`);
  return { frameWidth: fw, frameHeight: fh, cols, rows, count: imgs.length };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
console.log('🚂 Graph Rails — Top-Down Asset Generator');
console.log('==========================================\n');

// Static sprites
const minecartUrl     = await genSprite('minecart',       'Minecart viewed from directly above, on rails, blocky pixel art, gold and brown');
const gemUrl          = await genSprite('gem',            'Glowing diamond gem collectible viewed from above, bright yellow sparkle, pixel art');
const startUrl        = await genSprite('start_station',  'Train station starting pad viewed from above, bright green platform with arrow, pixel art');
const finishUrl       = await genSprite('finish_station', 'Train station finish pad viewed from above, gold platform with checkered flag, pixel art');
                        await genSprite('rock',           'Boulder rock obstacle viewed from above, gray craggy stone, pixel art');
                        await genSprite('lava',           'Lava pool viewed from directly above, glowing orange-red, pixel art');
                        await genSprite('hole',           'Dark pit hole viewed from above, black void with jagged edges, pixel art');
const monsterUrl      = await genSprite('monster',        'Cute blocky monster viewed from above, purple creature with eyes visible from top, pixel art');

// Backgrounds — top-down mine floor tiles
await genBg('bg_cave',        'Stone and dirt mine dungeon floor tiles viewed from above, torch shadows, blue-gray stone, underground mine, dark blue cave floor with cracks and variation');
await genBg('bg_lava_cavern', 'Lava cavern floor viewed from above, glowing orange lava pools between dark stone tiles, underground mine dungeon');
await genBg('bg_rail_yard',   'Rail yard floor viewed from above, multiple train tracks crossing stone floor, wooden ties and metal rails, top-down mine dungeon');

// Animated spritesheets — top-down
const sheets = {};
sheets.minecart_ride  = await genSheet('minecart_ride',  minecartUrl, 'Minecart moving forward from top-down view, wheels spinning, subtle motion blur');
sheets.minecart_crash = await genSheet('minecart_crash', minecartUrl, 'Minecart bumping and stopping from top-down view, shaking left-right');
sheets.gem_spin       = await genSheet('gem_spin',       gemUrl,      'Gem rotating and sparkling from top-down view, glowing pulse');
sheets.monster_idle   = await genSheet('monster_idle',   monsterUrl,  'Monster viewed from above, blinking and slowly bobbing, idle animation');

console.log('\n✅ Done! Frame specs:');
console.log(JSON.stringify(sheets, null, 2));
console.log('\nUpdate BootScene frameWidth/frameHeight if they changed.');
