import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '4175', '--strictPort'], { stdio: 'ignore', windowsHide: true });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://localhost:4175')).ok) { ready = true; break; } } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert(ready, 'Preview did not start');
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://localhost:4175');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const first = page.getByRole('article', { name: 'Player 1 tracker', exact: true });
  await page.getByRole('button', { name: 'Open setup' }).click();
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true }).check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (let i = 0; i < 4; i++) await first.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  await context.setOffline(true);
  await page.reload();
  await first.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  assert.equal(await first.locator('.counter-value').textContent(), '15');
  await page.evaluate(() => document.fonts.ready);
  assert(await page.evaluate(async () => (await document.fonts.load('600 16px "Energy Digits"')).length > 0));
  assert.deepEqual(errors, []);
  console.log('Production offline reload, saved state, counters, and bundled fonts: PASS');
} finally {
  await browser?.close();
  server.kill();
}
