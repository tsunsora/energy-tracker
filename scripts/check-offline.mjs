import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const root = resolve('dist');
const origin = 'http://127.0.0.1:4175';
let revision = 1;
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, origin).pathname;
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let body = await readFile(path);
    // Simulate a new deployment without changing the built assets on disk.
    if (pathname === '/sw.js') body = Buffer.concat([body, Buffer.from(`\n// test deployment ${revision}`)]);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
let browser;
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4175, '127.0.0.1', resolve); });
  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
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
  await context.setOffline(false);
  revision++;
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  const notice = page.getByRole('status', { name: 'App update', exact: true });
  await notice.waitFor({ state: 'visible' });
  await page.setViewportSize({ width: 320, height: 568 });
  assert(await notice.evaluate(el => {
    const box = el.getBoundingClientRect();
    return box.left >= 0 && box.right <= innerWidth && el.scrollWidth <= el.clientWidth;
  }));
  await notice.getByRole('button', { name: 'Later', exact: true }).click();
  assert.equal(await first.locator('.counter-value').textContent(), '15');
  assert(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration()).waiting)));
  await page.reload();
  await notice.waitFor({ state: 'visible' });
  await context.setOffline(true); // Installed updates must also apply without a connection.
  const reload = page.waitForEvent('load');
  await notice.getByRole('button', { name: 'Update', exact: true }).click();
  await reload;
  await first.waitFor();
  assert.equal(await first.locator('.counter-value').textContent(), '15');
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting), null);
  assert.deepEqual(errors, []);
  console.log('Production update prompt, deferral, activation, and preserved game: PASS');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
