import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';

// One vector design supplies web, legacy Android, adaptive, and themed icons.
const background = '#101217';
const lime = '#c9f76f';
const polar = angle => [256 + 132 * Math.cos(angle * Math.PI / 180), 256 + 132 * Math.sin(angle * Math.PI / 180)].map(n => n.toFixed(2));
const arc = (start, end) => `M${polar(start).join(' ')} A132 132 0 0 1 ${polar(end).join(' ')}`;
const paths = [
  { d: arc(135, 215), color: lime, stroke: true },
  { d: arc(230, 310), color: lime, stroke: true },
  { d: arc(325, 405), color: '#52623d', stroke: true },
  { d: 'M276 176 L210 270 L253 270 L237 337 L304 240 L261 240 Z', color: lime }
];
const mark = paths.map(p => `<path d="${p.d}" ${p.stroke ? `fill="none" stroke="${p.color}" stroke-width="28" stroke-linecap="round"` : `fill="${p.color}"`}/>`).join('');
const svg = content => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${content}</svg>`;
const foreground = svg(mark);
const icon = svg(`<rect width="512" height="512" rx="112" fill="${background}"/>${mark}`);
const maskable = svg(`<rect width="512" height="512" fill="${background}"/>${mark}`);
const round = svg(`<circle cx="256" cy="256" r="256" fill="${background}"/>${mark}`);
await writeFile('public/icon.svg', icon + '\n');
for (const size of [192, 512]) await sharp(Buffer.from(icon)).resize(size, size).png().toFile(`public/icon-${size}.png`);
await sharp(Buffer.from(maskable)).png().toFile('public/icon-maskable-512.png');
const res = 'android/app/src/main/res';
const vector = monochrome => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="512" android:viewportHeight="512">\n${paths.map(p => `    <path android:pathData="${p.d}" ${p.stroke ? `android:fillColor="#00000000" android:strokeColor="${monochrome ? '#ffffff' : p.color}" android:strokeWidth="28" android:strokeLineCap="round"` : `android:fillColor="${monochrome ? '#ffffff' : p.color}"`}/>`).join('\n')}\n</vector>\n`;
await writeFile(`${res}/drawable/energy_foreground.xml`, vector(false));
await writeFile(`${res}/drawable/energy_monochrome.xml`, vector(true));
await writeFile(`${res}/drawable-v24/ic_launcher_foreground.xml`, vector(false));
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = `${res}/mipmap-${density}`;
  await mkdir(dir, { recursive: true });
  await sharp(Buffer.from(icon)).resize(size, size).png().toFile(`${dir}/ic_launcher.png`);
  await sharp(Buffer.from(round)).resize(size, size).png().toFile(`${dir}/ic_launcher_round.png`);
  await sharp(Buffer.from(foreground)).resize(Math.round(size * 108 / 48)).png().toFile(`${dir}/ic_launcher_foreground.png`);
}
// Keep legacy splash resources consistent with the Android 12+ vector splash.
for (const dir of await readdir(res)) {
  if (!dir.startsWith('drawable')) continue;
  const file = `${res}/${dir}/splash.png`;
  if (!(await readdir(`${res}/${dir}`)).includes('splash.png')) continue;
  const { width, height } = await sharp(file).metadata();
  const size = Math.min(256, Math.round(Math.min(width, height) * .3));
  const logo = await sharp(Buffer.from(foreground)).resize(size, size).png().toBuffer();
  const output = await sharp({ create: { width, height, channels: 4, background } }).composite([{ input: logo, gravity: 'centre' }]).png().toBuffer();
  await writeFile(file, output);
}
console.log('Generated Vanguard Energy web, Android, themed, and splash assets.');
