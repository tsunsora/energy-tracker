import { chromium } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
const svg = await readFile('public/icon.svg', 'utf8');
for (const size of [192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>body{margin:0}svg{width:100vw;height:100vh}</style>${svg}`);
  await page.screenshot({ path: `public/icon-${size}.png`, omitBackground: true });
}
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>body{margin:0}svg{width:100vw;height:100vh}</style>${svg}`);
  await page.screenshot({ path: `${dir}/ic_launcher.png`, omitBackground: true });
  await page.screenshot({ path: `${dir}/ic_launcher_round.png`, omitBackground: true });
}
await mkdir('screenshots', { recursive: true });
await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto('http://localhost:5173');
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'screenshots/desktop.png', fullPage: true });
await page.setViewportSize({ width: 393, height: 852 });
await page.screenshot({ path: 'screenshots/phone.png', fullPage: true });
await page.getByRole('button', { name: 'Open setup', exact: true }).click();
await page.getByRole('button', { name: '4 players', exact: true }).click();
await page.getByRole('button', { name: 'Close dialog' }).click();
await page.screenshot({ path: 'screenshots/four-player.png', fullPage: true });
await writeFile('screenshots/.gitkeep', '');
await browser.close();
