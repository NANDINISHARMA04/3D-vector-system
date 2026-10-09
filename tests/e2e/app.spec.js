import { test, expect } from '@playwright/test';

const URL = '/?autostart=nocamera&particles=20000';

const state = (page) => page.evaluate(() => window.__vector.state);

// Feeds a synthetic hand (built in the page from src/synthHand.js) into the gesture pipeline.
async function hand(page, pose, opts = {}) {
  await page.evaluate(
    async ({ pose, opts }) => {
      const { poseHand } = await import('/src/synthHand.js');
      let lm = poseHand(pose, { x: 900, y: 560, size: 110, ...opts });
      if (opts.tipAt) {
        // Move the whole hand so the index fingertip lands on a screen point.
        const [tx, ty] = opts.tipAt;
        const dx = tx - lm[8][0];
        const dy = ty - lm[8][1];
        lm = lm.map(([x, y, z]) => [x + dx, y + dy, z]);
      }
      window.__vector.injectHands(opts.second ? [lm, poseHand(pose, opts.second)] : [lm]);
    },
    { pose, opts },
  );
}

async function ready(page) {
  await page.goto(URL);
  await page.waitForFunction(() => window.__vector?.state.model === 'human-body');
  await page.waitForFunction(() => window.__vector.state.form > 0.9, null, { timeout: 30_000 });
}

test.describe('Vector', () => {
  test('boots with WebGL2, HUD and the default model', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await ready(page);
    await expect(page.locator('#model-name')).toHaveText('Human Body');
    await expect(page.locator('#pcount')).toHaveText('20k');
    await expect(page.locator('#scene-state')).toHaveText(/Formed|Forming/);
    await expect(page.locator('#start')).toBeHidden();
    const hasGl2 = await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2'));
    expect(hasGl2).toBe(true);
    await expect(page.locator('#labels .label')).toHaveCount(13);
    expect(errors).toEqual([]);
  });

  test('the dock switches categories and models', async ({ page }) => {
    await ready(page);
    await page.locator('#tabs button', { hasText: 'Engines' }).click();
    await page.locator('#chips button', { hasText: 'Jet Engine' }).click();
    await expect(page.locator('#model-name')).toHaveText('Jet Engine');
    await expect(page.locator('#category')).toHaveText('Engines');
    expect(page.url()).toContain('model=jet-engine');
  });

  test('keyboard: space dissolves/summons, N goes to the next model', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('Space');
    expect((await state(page)).formTarget).toBe(0);
    await expect(page.locator('#scene-state')).toHaveText(/Dissolv/);
    await page.keyboard.press('Space');
    expect((await state(page)).formTarget).toBe(1);
    await page.keyboard.press('n');
    await page.waitForFunction(() => window.__vector.state.model === 'jet-engine' || window.__vector.state.model !== 'human-body');
    expect((await state(page)).model).not.toBe('human-body');
  });

  test('exploded-view slider pulls the model apart', async ({ page }) => {
    await ready(page);
    await page.locator('#explode').fill('100');
    await page.waitForFunction(() => window.__vector.state.explode > 0.9);
    await expect(page.locator('#scene-state')).toHaveText('Exploded');
    await expect(page.locator('#explode-val')).toHaveText('100%');
  });

  test('gestures: open hand explodes, fist assembles', async ({ page }) => {
    await ready(page);
    await hand(page, 'open');
    await page.waitForFunction(() => window.__vector.state.pose === 'open');
    await page.waitForFunction(() => window.__vector.state.explodeTarget > 0.8);
    await expect(page.locator('#hand-state')).toContainText('Open');
    await expect(page.locator('#gestures li[data-g="open"]')).toHaveClass(/active/);

    await hand(page, 'fist');
    await page.waitForFunction(() => window.__vector.state.pose === 'fist');
    await page.waitForFunction(() => window.__vector.state.explodeTarget === 0);
    await expect(page.locator('#gestures li[data-g="fist"]')).toHaveClass(/active/);
  });

  test('gestures: snap dissolves, fist re-forms', async ({ page }) => {
    await ready(page);
    await hand(page, 'snapReady');
    await page.waitForTimeout(150);
    await hand(page, 'snapDone');
    await page.waitForFunction(() => window.__vector.state.formTarget === 0);
    await hand(page, 'fist');
    await page.waitForFunction(() => window.__vector.state.formTarget === 1);
  });

  test('gestures: holding a peace sign jumps to the next model', async ({ page }) => {
    await ready(page);
    await hand(page, 'peace');
    await page.waitForFunction(() => window.__vector.state.model !== 'human-body', null, { timeout: 10_000 });
  });

  test('gestures: point identifies a part, pinch pulls it out', async ({ page }) => {
    await ready(page);
    // Explode first so the brain sits clear of the skin around it.
    await page.locator('#explode').fill('100');
    await page.waitForFunction(() => window.__vector.state.explode > 0.98);
    const parts = (await state(page)).parts;
    const brain = parts.indexOf('Brain');
    const tip = await page.evaluate((i) => window.__vector.partScreenPosition(i), brain);
    await hand(page, 'point', { tipAt: [tip[0], tip[1]] });
    await page.waitForFunction((i) => window.__vector.state.hover === i, brain);
    await expect(page.locator('#partcard')).toBeVisible();
    await expect(page.locator('#partcard-name')).toHaveText('Brain');
    await expect(page.locator('.label.hot b')).toHaveText('Brain');

    await hand(page, 'pinch', { tipAt: [tip[0], tip[1]] });
    await page.waitForFunction((i) => window.__vector.state.grabActive && window.__vector.state.grabPart === i, brain);
    await hand(page, 'pinch', { tipAt: [tip[0] + 160, tip[1] - 40] });
    // The pinched part follows the hand.
    await page.waitForFunction(([i, x0]) => window.__vector.partScreenPosition(i)[0] - x0 > 100, [brain, tip[0]]);

    await page.evaluate(() => window.__vector.injectHands(null));
    await page.waitForFunction(() => !window.__vector.state.grabActive);
  });

  test('gestures: two hands zoom', async ({ page }) => {
    await ready(page);
    const before = (await state(page)).dist;
    await hand(page, 'open', { x: 560, second: { x: 760, y: 560, size: 110 } });
    await page.waitForTimeout(300);
    await hand(page, 'open', { x: 360, second: { x: 960, y: 560, size: 110 } });
    await page.waitForFunction((d) => window.__vector.state.dist < d * 0.7, before);
    await expect(page.locator('#hand-state')).toContainText('Two hands');
  });

  test('mouse: drag rotates, wheel zooms', async ({ page }) => {
    await ready(page);
    await page.keyboard.press('a'); // stop auto-rotate
    const s0 = await state(page);
    await page.mouse.move(1100, 650);
    await page.mouse.down();
    await page.mouse.move(900, 650, { steps: 5 });
    await page.mouse.up();
    const s1 = await state(page);
    expect(Math.abs(s1.yaw - s0.yaw)).toBeGreaterThan(0.5);
    await page.mouse.wheel(0, 600);
    await page.waitForFunction((d) => window.__vector.state.dist > d * 1.5, s0.dist);
  });

  test('help dialog opens and closes', async ({ page }) => {
    await ready(page);
    await page.locator('[data-action="help"]').click();
    await expect(page.locator('#help')).toBeVisible();
    await page.locator('#help-close').click();
    await expect(page.locator('#help')).toBeHidden();
  });

  test('start screen offers camera and mouse modes', async ({ page }) => {
    await page.goto('/?particles=20000');
    await expect(page.locator('#start')).toBeVisible();
    await page.locator('#start-nocam').click();
    await expect(page.locator('#start')).toBeHidden();
    await page.waitForFunction(() => window.__vector.state.formTarget === 1);
  });
});
