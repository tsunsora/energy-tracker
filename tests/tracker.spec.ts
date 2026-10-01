import { test, expect, type Page } from '@playwright/test';
async function setup(page: Page) { await page.getByRole('button', { name: 'Open setup', exact: true }).click(); }
async function done(page: Page) { await page.getByRole('button', { name: 'Done', exact: true }).click(); }

test('visible number glyphs stay centered on phone and tablet screens', async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('vanguard-session-v1', JSON.stringify({ board: {
      count: 4,
      players: ['#c9f76f', '#b6a0ff', '#ffac87', '#81dce5'].map((color, id) => ({
        id, name: `Player ${id + 1}`, color, energy: [0, 1, 10, 9999][id], allowAbove10: true
      }))
    }, past: [] }));
  });
  await page.goto('/');
  await page.reload(); // Restore the seeded game through this tab's reload path.
  await expect(page.getByRole('article')).toHaveCount(4);
  for (const size of [{ width: 320, height: 568 }, { width: 393, height: 852 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(size);
    await page.evaluate(() => document.fonts.ready);
    for (const zone of await page.getByRole('article').all()) {
      const number = zone.locator('.counter-value');
      const area = await zone.boundingBox(); const box = await number.boundingBox();
      if (!area || !box) throw new Error('Missing counter');
      expect(Math.abs(box.x + box.width / 2 - area.x - area.width / 2)).toBeLessThan(1);
      expect(Math.abs(box.y + box.height / 2 - area.y - area.height / 2)).toBeLessThan(1);
      // Check the visible ink, not only the centered CSS line box. Cropping the
      // numeral excludes the other controls and works for rotated seats too.
      const png = await number.screenshot({ scale: 'css' });
      const ink = await page.evaluate(async base64 => {
        const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
        const { data } = ctx.getImageData(0, 0, image.width, image.height);
        let left = image.width, right = -1, top = image.height, bottom = -1;
        for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
          const offset = (y * image.width + x) * 4;
          if (data[offset] + data[offset + 1] + data[offset + 2] > 400) {
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
        return { found: right >= left, x: (left + right + 1 - image.width) / 2, y: (top + bottom + 1 - image.height) / 2 };
      }, png.toString('base64'));
      const fontSize = await number.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
      expect(ink.found).toBe(true);
      expect.soft(Math.abs(ink.x), JSON.stringify({ size, value: await number.textContent(), ink, fontSize })).toBeLessThanOrEqual(Math.max(1.5, fontSize * .025));
      expect.soft(Math.abs(ink.y), JSON.stringify({ size, value: await number.textContent(), ink, fontSize })).toBeLessThanOrEqual(Math.max(1.5, fontSize * .025));
    }
  }
});

test('closing and reopening resets every count but preserves player settings', async ({ page, context }) => {
  await page.goto('/'); await setup(page);
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 4', exact: true }).check();
  await done(page);
  for (let i = 1; i <= 4; i++) await page.getByRole('button', { name: `Charge +3 for Player ${i}`, exact: true }).click();
  // Hidden players must reset too.
  await setup(page); await page.getByRole('button', { name: '2 players', exact: true }).click(); await done(page);
  await page.reload();
  await expect(page.locator('.counter-value')).toHaveText(['3', '3']);
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.locator('.counter-value')).toHaveText(['0', '0']);
  const first = reopened.getByRole('article', { name: 'Player 1 tracker', exact: true });
  await expect(first.locator('.rotated')).toHaveCount(1);
  await expect(first).toHaveAttribute('style', /#c9f76f/);
  await setup(reopened); await reopened.getByRole('button', { name: '4 players', exact: true }).click();
  await expect(reopened.getByRole('switch', { name: 'Allow energy above 10 for Player 4', exact: true })).toBeChecked();
  await done(reopened);
  await expect(reopened.locator('.counter-value')).toHaveText(['0', '0', '0', '0']);
});

test('small-screen Setup keeps actions visible while all four player settings remain reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/'); await setup(page);
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Setup', exact: true });
  await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeInViewport();
  await expect(dialog.getByRole('button', { name: /Undo|Reset energy/ })).toHaveCount(0);
  await expect(dialog.getByRole('switch', { name: 'Face opponents', exact: true })).toHaveCount(0);
  await dialog.getByRole('switch', { name: 'Allow energy above 10 for Player 4', exact: true }).check();
  await expect(dialog.getByRole('button', { name: 'Done', exact: true })).toBeInViewport();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await done(page);
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Charge +3 for Player 4' }).click();
  await expect(page.getByRole('article', { name: 'Player 4 tracker', exact: true }).locator('.counter-value')).toHaveText('12');
});

test('holding minus clears only that player and persists', async ({ page }) => {
  await page.goto('/'); await setup(page);
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true }).check(); await done(page);
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  await page.getByRole('button', { name: 'Charge +3 for Player 2' }).click();
  const value = page.getByRole('article', { name: 'Player 1 tracker', exact: true }).locator('.counter-value');
  const minus = page.getByRole('button', { name: 'Remove 1 energy from Player 1' });
  await minus.click({ delay: 800 });
  await expect(value).toHaveText('0');
  await expect(page.getByRole('article', { name: 'Player 2 tracker', exact: true }).locator('.counter-value')).toHaveText('3');
  await page.reload(); await expect(value).toHaveText('0');
  await page.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  await minus.click(); await expect(value).toHaveText('2');
});

test('moving or cancelling a minus hold leaves energy unchanged', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Charge +3 for Player 2' }).click();
  const zone = page.getByRole('article', { name: 'Player 2 tracker', exact: true });
  const minus = zone.getByRole('button', { name: 'Remove 1 energy from Player 2' });
  const box = await minus.boundingBox();
  if (!box) throw new Error('Missing minus area');
  await page.mouse.move(box.x + box.width / 4, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 4 + 30, box.y + 20);
  await page.waitForTimeout(750);
  await page.mouse.up();
  await expect(zone.locator('.counter-value')).toHaveText('3');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 9, x: box.x + 20, y: box.y + 20 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await page.waitForTimeout(750);
  await expect(zone.locator('.counter-value')).toHaveText('3');
  await minus.click({ delay: 800 });
  await expect(zone.locator('.counter-value')).toHaveText('0');
  await cdp.detach();
});

test('a local-storage failure still saves the current game in session storage', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === localStorage) throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Charge +3 for Player 2', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Player settings cannot be saved for the next game.');
  await page.reload();
  await expect(page.locator('.counter-value')).toHaveText(['0', '3']);
});

test('a session-storage failure still saves player preferences and explains count loss', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (this === sessionStorage) throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.goto('/'); await setup(page);
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 2', exact: true }).check(); await done(page);
  await page.getByRole('button', { name: 'Charge +3 for Player 2', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Energy cannot be saved. Keep the app open to retain your energy.');
  await page.reload();
  await expect(page.locator('.counter-value')).toHaveText(['0', '0']);
  await setup(page);
  await expect(page.getByRole('switch', { name: 'Allow energy above 10 for Player 2', exact: true })).toBeChecked();
});

test('a new tab with an opener starts fresh, preserves preferences, and reloads independently', async ({ page }) => {
  await page.goto('/'); await setup(page);
  await page.getByRole('button', { name: '4 players', exact: true }).click();
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 4', exact: true }).check(); await done(page);
  await page.getByRole('button', { name: 'Charge +3 for Player 2', exact: true }).click();
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => { window.open('/', '_blank'); });
  const child = await popupPromise;
  await expect(child.locator('.counter-value')).toHaveText(['0', '0', '0', '0']);
  await setup(child);
  await expect(child.getByRole('switch', { name: 'Allow energy above 10 for Player 4', exact: true })).toBeChecked(); await done(child);
  await child.getByRole('button', { name: 'Charge +3 for Player 1', exact: true }).click();
  await child.reload();
  await expect(child.locator('.counter-value')).toHaveText(['3', '0', '0', '0']);
  await expect(page.locator('.counter-value')).toHaveText(['0', '3', '0', '0']);
});

test('returning through this tab history keeps its current game', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Charge +3 for Player 2', exact: true }).click();
  await page.goto('about:blank');
  await page.goBack();
  await expect(page.locator('.counter-value')).toHaveText(['0', '3']);
});

test('keyboard activation adjusts energy exactly once', async ({ page }) => {
  await page.goto('/');
  const plus = page.getByRole('button', { name: 'Add 1 energy to Player 2', exact: true });
  const minus = page.getByRole('button', { name: 'Remove 1 energy from Player 2', exact: true });
  await plus.focus(); await page.keyboard.press('Space'); await page.keyboard.press('Enter');
  await expect(page.locator('.counter-value')).toHaveText(['0', '2']);
  await minus.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
  await expect(page.locator('.counter-value')).toHaveText(['0', '0']);
});

test('simultaneous player touches support independent taps, holds, and cancellation', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  for (const id of [1, 2]) await page.getByRole('button', { name: `Charge +3 for Player ${id}`, exact: true }).click();
  const cdp = await page.context().newCDPSession(page);
  const pointsFor = async (action: 'Add' | 'Remove') => Promise.all([1, 2].map(async id => {
    const box = await page.getByRole('button', { name: `${action} 1 energy ${action === 'Add' ? 'to' : 'from'} Player ${id}`, exact: true }).boundingBox();
    if (!box) throw new Error('Missing tap area');
    return { id, x: box.x + box.width * .15, y: box.y + box.height * .35 };
  }));
  const plus = await pointsFor('Add');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [plus[0]] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: plus });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [plus[1]] });
  await expect(page.locator('.counter-value')).toHaveText(['3', '4']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.counter-value')).toHaveText(['4', '4']);
  const minus = await pointsFor('Remove');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [minus[0]] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: minus });
  await expect(page.locator('.counter-value')).toHaveText(['0', '0']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  for (const id of [1, 2]) await page.getByRole('button', { name: `Charge +3 for Player ${id}`, exact: true }).click();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [minus[0]] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: minus });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [minus[0], { ...minus[1], x: minus[1].x + 30 }] });
  await expect(page.locator('.counter-value')).toHaveText(['0', '3']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('.counter-value')).toHaveText(['0', '3']);
  await cdp.detach();
});

test('only energy controls remain, normal energy stops at 10', async ({ page }) => {
  await page.goto('/');
  const p = page.getByRole('article', { name: 'Player 1 tracker', exact: true });
  for (let i = 0; i < 4; i++) await p.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  await expect(p.locator('.counter-value')).toHaveText('10');
  await expect(p.getByRole('button', { name: 'Add 1 energy to Player 1' })).toBeDisabled();
  await expect(p.getByRole('button', { name: 'Charge +3 for Player 1' })).toBeDisabled();
  await p.getByRole('button', { name: 'Remove 1 energy from Player 1' }).click();
  await expect(p.locator('.counter-value')).toHaveText('9');
  await expect(page.getByText(/damage|soul|turn|timer|high roll|nation|wins|theme/i)).toHaveCount(0);
  await setup(page);
  await expect(page.getByText(/damage|soul|turn|timer|high roll|nation|wins|theme|activity/i)).toHaveCount(0);
});

test('per-player above-10 option, +1, +3, reload, and switching back safely', async ({ page }) => {
  await page.goto('/'); await setup(page);
  await page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true }).check(); await done(page);
  const p = page.getByRole('article', { name: 'Player 1 tracker', exact: true });
  for (let i = 0; i < 4; i++) await p.getByRole('button', { name: 'Charge +3 for Player 1' }).click();
  await p.getByRole('button', { name: 'Add 1 energy to Player 1' }).click();
  await expect(p.locator('.counter-value')).toHaveText('13');
  await expect(p.locator('.counter-label')).toHaveCount(0);
  const other = page.getByRole('article', { name: 'Player 2 tracker', exact: true });
  for (let i = 0; i < 4; i++) await other.getByRole('button', { name: 'Charge +3 for Player 2' }).click();
  await expect(other.locator('.counter-value')).toHaveText('10');
  await expect(other.getByRole('button', { name: 'Add 1 energy to Player 2' })).toBeDisabled();
  await page.reload(); await expect(p.locator('.counter-value')).toHaveText('13');
  await setup(page);
  await expect(page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true })).toBeDisabled();
  await expect(page.getByText('Lower energy to 10 before switching off.')).toBeVisible(); await done(page);
  for (let i = 0; i < 3; i++) await p.getByRole('button', { name: 'Remove 1 energy from Player 1' }).click();
  await setup(page); await page.getByRole('switch', { name: 'Allow energy above 10 for Player 1', exact: true }).uncheck(); await done(page);
  await expect(p.locator('.counter-value')).toHaveText('10');
  await expect(p.getByRole('button', { name: 'Add 1 energy to Player 1' })).toBeDisabled();
});


test('four players fit without scrolling in portrait and landscape', async ({ page }) => {
  await page.goto('/');
  for (const size of [{ width: 320, height: 568 }, { width: 393, height: 852 }, { width: 852, height: 393 }]) {
    await page.setViewportSize(size);
    for (const count of [2, 4]) {
      await setup(page); await page.getByRole('button', { name: `${count} ${count === 1 ? 'player' : 'players'}`, exact: true }).click(); await done(page);
      await expect(page.getByRole('article')).toHaveCount(count);
      for (let i = 1; i <= count; i++) {
        await page.getByRole('button', { name: `Add 1 energy to Player ${i}`, exact: true }).locator('svg').click();
        await expect(page.getByRole('article', { name: `Player ${i} tracker`, exact: true }).locator('.counter-value')).toHaveText('1');
        await page.getByRole('button', { name: `Remove 1 energy from Player ${i}`, exact: true }).locator('svg').click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('player labels are inert and sliding does not change energy', async ({ page }) => {
  await page.goto('/');
  for (const count of [2, 4]) {
    await setup(page); await page.getByRole('button', { name: `${count} players`, exact: true }).click(); await done(page);
    await expect(page.getByRole('button', { name: /^Edit Player/ })).toHaveCount(0);
    for (const label of await page.locator('.player-name').all()) await label.click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.counter-value')).toHaveText(Array(count).fill('0'));
  }
  const p = page.getByRole('article', { name: 'Player 1 tracker', exact: true });
  await expect(p.locator('.rotated')).toHaveCount(1);
  const box = await p.locator('.energy-control').boundingBox();
  if (!box) throw new Error('No counter area');
  await page.mouse.move(box.x + box.width * .6, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(p.locator('.counter-value')).toHaveText('0');
  await page.reload(); await expect(p).toBeVisible(); await expect(p.locator('.rotated')).toHaveCount(1);
});

test('edge taps cover both full player halves, including rotated seats', async ({ page }) => {
  await page.goto('/');
  for (const count of [2, 4]) {
    await setup(page); await page.getByRole('button', { name: `${count} players`, exact: true }).click(); await done(page);
    for (let i = 1; i <= count; i++) {
      const zone = page.getByRole('article', { name: `Player ${i} tracker`, exact: true });
      const plus = zone.getByRole('button', { name: `Add 1 energy to Player ${i}`, exact: true });
      const minus = zone.getByRole('button', { name: `Remove 1 energy from Player ${i}`, exact: true });
      const area = await zone.boundingBox(); const hit = await plus.boundingBox();
      if (!area || !hit) throw new Error('Missing player hit area');
      expect(Math.abs(hit.width - area.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(hit.height * 2 - area.height)).toBeLessThanOrEqual(2);
      // Avoid the separate name/+3 controls and the central setup button.
      await plus.click({ position: { x: hit.width / 4, y: 8 } });
      await plus.click({ position: { x: hit.width / 4, y: hit.height - 8 } });
      await expect(zone.locator('.counter-value')).toHaveText('2');
      const rotated = await zone.locator('.rotated').count() > 0;
      // The bottom-docked +3 occupies the middle of the outer edge.
      await minus.click({ position: { x: rotated ? 8 : hit.width / 4, y: 8 } });
      await minus.click({ position: { x: rotated ? hit.width / 4 : 8, y: hit.height - 8 } });
      await expect(zone.locator('.counter-value')).toHaveText('0');
    }
  }
});
