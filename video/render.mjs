// Rend scene.html image par image (chaque image ne dépend que de l'instant t) et envoie les images à ffmpeg.
// Usage : node render.mjs <timeline.json> <sortie.mp4 (sans audio)> <sfx.json> [fps=24] [maxFrames]
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const [timelinePath, out, sfxOut, fpsArg, maxArg] = process.argv.slice(2);
const fps = +(fpsArg ?? 24);
const timeline = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
fs.writeFileSync(path.join(here, 'timeline.js'), `window.TIMELINE = ${JSON.stringify(timeline)};\n`);
const total = timeline.total, frames = Math.min(Math.ceil(total * fps), maxArg ? +maxArg : Infinity);

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/home/agent/.local/bin/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dbus', '--allow-file-access-from-files'] });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await page.goto('file://' + path.join(here, 'scene.html'), { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(500);
fs.writeFileSync(sfxOut, JSON.stringify(await page.evaluate(() => window.SFX)));

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let n = 0; n < frames; n++) {
  await page.evaluate((t) => window.seek(t), n / fps);
  const buf = await page.screenshot({ type: 'jpeg', quality: 94 });
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
  if (n % 48 === 0) console.log(`image ${n}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
ff.stdin.end(); await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('terminé', frames, 'images en', ((Date.now() - t0) / 1000).toFixed(0), 's');
