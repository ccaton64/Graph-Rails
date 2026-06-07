/**
 * Regenerate sprite sheets as proper PNG grids using individual frames
 * Run: node tools/gen-sheets.mjs
 */
import { writeFileSync } from 'node:fs';
import { createCanvas as nodeCreateCanvas, loadImage } from 'canvas';
import sharp from 'sharp';

const API_KEY = '5b082a80-5392-48b6-95c3-fc240beb0973';
const MCP_URL = 'https://mcp.ludo.ai/mcp';
const OUT = 'C:/Users/charl/OneDrive/Documents/graph-rails/public/assets/sheets';

const ANCHOR = 'Original blocky voxel educational math game, Minecraft-inspired but legally distinct, chunky pixel blocks, friendly colorful minecart rail world, child-friendly bright educational tone, no text, no logos';

async function ludo(tool, args) {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Authentication': `ApiKey ${API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', params: { name: tool, arguments: args }, id: Date.now() })
  });
  const json = await res.json();
  const text = json.result?.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return { _raw: text };
}

async function fetchBuf(url) {
  const r = await fetch(url);
  return Buffer.from(await r.arrayBuffer());
}

async function genSheet(name, spriteUrl, motionPrompt, cols = 5, rows = 5) {
  const FRAMES = cols * rows; // 25
  const FRAME_PX = 192;

  console.log(`⚙ Generating ${FRAMES} frames for: ${name}`);
  const r = await ludo('animateSprite', { requestBody: {
    motion_prompt: motionPrompt,
    initial_image: spriteUrl,
    model: 'eagle',
    frames: FRAMES,
    frame_size: FRAME_PX,
    duration: 1,
    loop: true,
    image_type: 'sprite',
    individual_frames: true,  // get individual PNG frames
  }});

  const frameUrls = r.individual_frame_urls;
  if (!frameUrls || frameUrls.length === 0) {
    console.warn(`  ✗ No individual frames for ${name}:`, JSON.stringify(r).slice(0, 200));
    return;
  }

  console.log(`  ↓ Downloading ${frameUrls.length} frames…`);

  // Download all frames and convert WebP → PNG using sharp
  console.log(`  Converting ${frameUrls.length} WebP frames to PNG…`);
  const framePngBufs = await Promise.all(
    frameUrls.map(async (url) => {
      const webpBuf = await fetchBuf(url);
      // Convert WebP to PNG with sharp
      const pngBuf = await sharp(webpBuf).png().toBuffer();
      return pngBuf;
    })
  );

  // Get dimensions from first frame
  const meta = await sharp(framePngBufs[0]).metadata();
  const fw = meta.width;
  const fh = meta.height;
  console.log(`  Frame size: ${fw}×${fh} px`);

  // Load all frames into canvas images
  const frameImages = await Promise.all(framePngBufs.map(buf => loadImage(buf)));

  // Stitch into grid
  const canvas = nodeCreateCanvas(cols * fw, rows * fh);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  frameImages.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(img, col * fw, row * fh, fw, fh);
  });

  // Save as PNG
  const outPath = `${OUT}/${name}.png`;
  const pngBuf = canvas.toBuffer('image/png');
  writeFileSync(outPath, pngBuf);
  console.log(`  ✓ Saved ${name}.png (${Math.round(pngBuf.length/1024)}KB, grid ${cols}×${rows} @ ${fw}×${fh})`);

  return { frameWidth: fw, frameHeight: fh, cols, rows, totalFrames: frameImages.length };
}

// First get sprite base images from the API
async function getLatestSpriteUrl(requestId) {
  const r = await ludo('getImageResults', { request_id: requestId });
  return r?.results?.[0]?.image_urls?.[0];
}

async function genSprite(prompt) {
  const r = await ludo('createImage', { requestBody: {
    image_type: 'sprite',
    prompt: `${ANCHOR}. ${prompt}`,
    art_style: '16-Bit',
    perspective: 'Side-Scroll',
    n: 1
  }});
  return r.image_urls?.[0] || r.url;
}

console.log('🚂 Graph Rails — Sprite Sheet Generator (PNG grids)');
console.log('====================================================\n');

// Get base sprite URLs (re-generate fresh)
const minecartUrl = await genSprite('Chunky blocky minecart on rails, wood and iron, side view, simple pixel art, no background');
const gemUrl      = await genSprite('Glowing yellow diamond gem collectible, pixel art, bright sparkle, no background');
const monsterUrl  = await genSprite('Cute friendly purple block creature with big eyes, smiling, pixel art, no background');

// Generate properly stitched PNG sheets
const results = {};
results.minecart_ride  = await genSheet('minecart_ride',  minecartUrl, 'Wheels spinning, small dust puffs, cart bouncing while rolling on rails');
results.minecart_crash = await genSheet('minecart_crash', minecartUrl, 'Cart bumping and bouncing back comically, pieces wobbling, surprised motion');
results.gem_spin       = await genSheet('gem_spin',       gemUrl,      'Diamond gem rotating and sparkling, glowing light pulses outward');
results.monster_idle   = await genSheet('monster_idle',   monsterUrl,  'Cute block creature blinking slowly, bobbing gently up and down, friendly');

console.log('\n✅ All sprite sheets generated as PNG grids!');
console.log('Frame sizes:', JSON.stringify(results, null, 2));
