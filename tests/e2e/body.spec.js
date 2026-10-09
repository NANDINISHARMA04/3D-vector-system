import { test, expect } from '@playwright/test';

const URL = '/body.html?particles=20000';
const state = (page) => page.evaluate(() => window.__body.state);
const lastSpoken = async (page) => (await state(page)).spoken.at(-1) ?? '';

async function ready(page, query = '') {
  await page.goto(`${URL}&autostart=1${query}`);
  await page.waitForFunction(() => window.__body?.state.parts.length > 0);
}

// Waits until a part's label anchor is on screen (model formed / exploded) and returns it.
async function partPoint(page, i) {
  await page.waitForTimeout(1500);
  const box = await page.locator('#stage').boundingBox();
  const p = await page.evaluate((i) => window.__body.partScreenPosition(i), i);
  return [box.x + p[0], box.y + p[1]];
}

test.describe('Body Explorer', () => {
  test('welcome screen introduces the app and narrates on start', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL);
    await expect(page.locator('#welcome')).toBeVisible();
    await expect(page.locator('#welcome h1')).toHaveText('Body Explorer');
    await page.waitForFunction(() => window.__body?.state.parts.length > 0);
    await page.locator('#get-started').click();
    await expect(page.locator('#welcome')).toBeHidden();
    expect(await lastSpoken(page)).toContain('human body');
    expect(errors).toEqual([]);
  });

  test('sidebar lists body systems and organs', async ({ page }) => {
    await ready(page);
    await expect(page.locator('#systems .row')).toHaveCount(13);
    await page.locator('#systems .row', { hasText: 'Digestive System' }).click();
    await expect(page.locator('#title')).toHaveText('Digestive System');
    await expect(page.locator('#eyebrow')).toHaveText('Body Systems');
    await expect(page.locator('#part-list .part-row')).toHaveCount(10);
    await expect.poll(() => lastSpoken(page)).toContain('digestive system');
  });

  test('choosing a part shows its card and reads it aloud', async ({ page }) => {
    await ready(page);
    await page.locator('.part-row', { hasText: 'Heart' }).click();
    await expect(page.locator('#detail')).toBeVisible();
    await expect(page.locator('#detail-name')).toHaveText('Heart');
    await expect(page.locator('#detail-summary')).toContainText('pumps blood');
    await expect(page.locator('#detail-fact')).toContainText('hundred thousand');
    const spoken = await lastSpoken(page);
    expect(spoken).toMatch(/^Heart\. .*Did you know\?/);

    await page.locator('#next-part').click();
    await expect(page.locator('#detail-name')).toHaveText('Liver');
    expect(await lastSpoken(page)).toMatch(/^Liver\./);
  });

  test('tapping a part on the 3D model selects and narrates it', async ({ page }) => {
    await ready(page);
    await page.locator('#view-seg button', { hasText: 'Apart' }).click();
    await page.waitForFunction(() => window.__body.state.explode > 0.97, null, { timeout: 30_000 });
    const brain = (await state(page)).parts.indexOf('Brain');
    const [x, y] = await partPoint(page, brain);
    await page.mouse.click(x, y);
    await expect(page.locator('#detail-name')).toHaveText('Brain');
    expect(await lastSpoken(page)).toMatch(/^Brain\./);
  });

  test('search finds a system by one of its parts', async ({ page }) => {
    await ready(page);
    await page.locator('#search').fill('cochlea');
    await expect(page.locator('#systems li:not([hidden]) .row')).toHaveCount(1);
    await page.locator('#systems li:not([hidden]) .row').click();
    await expect(page.locator('#title')).toHaveText('Human Ear');
    await expect(page.locator('#detail-name')).toHaveText('Cochlea');
  });

  test('lesson walks through every part with narration', async ({ page }) => {
    await ready(page, '&model=tooth');
    await page.locator('#lesson-btn').click();
    await expect(page.locator('#toolbar-lesson')).toBeVisible();
    await expect(page.locator('#lesson-total')).toHaveText('6');
    await expect(page.locator('#lesson-step')).toHaveText('1', { timeout: 20_000 });
    await expect(page.locator('#detail-name')).toHaveText('Enamel');
    expect(await lastSpoken(page)).toMatch(/^Enamel\./);
    await expect(page.locator('#lesson-step')).toHaveText('2', { timeout: 20_000 });
    await page.locator('#lesson-stop').click();
    await expect(page.locator('#toolbar-idle')).toBeVisible();
  });

  test('quiz: find the part, wrong answers get a hint', async ({ page }) => {
    await ready(page, '&model=heart');
    await page.locator('#quiz-btn').click();
    await expect(page.locator('#quiz-banner')).toBeVisible();
    await expect(page.locator('#inspector')).toBeHidden();
    await page.waitForFunction(() => window.__body.state.explode > 0.97, null, { timeout: 30_000 });
    const { quiz, parts } = await state(page);
    expect(await lastSpoken(page)).toContain('Can you find the');
    await expect(page.locator('#quiz-question')).toContainText(parts[quiz.target].slice(1));

    // A wrong part first.
    const wrong = (quiz.target + 4) % parts.length;
    let [x, y] = await partPoint(page, wrong);
    await page.mouse.click(x, y);
    await expect(page.locator('#quiz-feedback')).toContainText('Try again');

    [x, y] = await partPoint(page, quiz.target);
    await page.mouse.click(x, y);
    await expect(page.locator('#quiz-feedback')).toContainText('Yes!');
    await expect(page.locator('#quiz-score')).toHaveText('⭐️ 1');
    await page.locator('#quiz-stop').click();
    await expect(page.locator('#quiz-banner')).toBeHidden();
  });

  test('narration can be muted', async ({ page }) => {
    await ready(page);
    await page.locator('#sound-btn').click();
    await expect(page.locator('#sound-btn')).toHaveClass(/muted/);
    await page.locator('#settings-btn').click();
    await expect(page.locator('#auto-read')).not.toBeChecked();
    await page.locator('#settings-done').click();
  });

  test('hand control: pointing and holding at a part selects it', async ({ page }) => {
    await ready(page);
    await page.locator('#view-seg button', { hasText: 'Apart' }).click();
    await page.waitForFunction(() => window.__body.state.explode > 0.97, null, { timeout: 30_000 });
    const heart = (await state(page)).parts.indexOf('Heart');
    const tip = await page.evaluate((i) => window.__body.partScreenPosition(i), heart);
    await page.evaluate(async (tip) => {
      const { poseHand } = await import('/src/synthHand.js');
      const lm = poseHand('point', { x: 600, y: 600, size: 110 });
      const dx = tip[0] - lm[8][0];
      const dy = tip[1] - lm[8][1];
      window.__body.injectHands([lm.map(([x, y, z]) => [x + dx, y + dy, z])]);
    }, tip);
    await expect(page.locator('#detail-name')).toHaveText('Heart', { timeout: 10_000 });
    await page.evaluate(() => window.__body.injectHands(null));
  });

  test('hand control: pinching a part pulls it out and narrates it', async ({ page }) => {
    await ready(page);
    await page.locator('#view-seg button', { hasText: 'Apart' }).click();
    await page.waitForFunction(() => window.__body.state.explode > 0.97, null, { timeout: 30_000 });
    const brain = (await state(page)).parts.indexOf('Brain');
    const tip = await page.evaluate((i) => window.__body.partScreenPosition(i), brain);
    const pinchAt = (pose, x, y) =>
      page.evaluate(
        async ({ pose, x, y }) => {
          const { poseHand } = await import('/src/synthHand.js');
          const lm = poseHand(pose, { x: 600, y: 600, size: 110 });
          const dx = x - lm[8][0];
          const dy = y - lm[8][1];
          window.__body.injectHands([lm.map(([a, b, c]) => [a + dx, b + dy, c])]);
        },
        { pose, x, y },
      );
    await pinchAt('pinch', tip[0], tip[1]);
    await page.waitForFunction((i) => window.__body.state.grabActive && window.__body.state.grabPart === i, brain);
    await expect(page.locator('#detail-name')).toHaveText('Brain');
    expect(await lastSpoken(page)).toMatch(/^Brain\. .*Did you know\?/);
    await expect(page.locator('#gesture-guide [data-g="pinch"]')).toHaveClass(/on/);

    // The part follows the pinching hand.
    await pinchAt('pinch', tip[0] - 150, tip[1] + 120);
    await page.waitForFunction(([i, x0]) => x0 - window.__body.partScreenPosition(i)[0] > 100, [brain, tip[0]]);

    // Letting go springs it back.
    await page.evaluate(() => window.__body.injectHands(null));
    await page.waitForFunction(() => !window.__body.state.grabActive);
    await page.waitForFunction(() => window.__body.state.grabPart === -1, null, { timeout: 15_000 });
  });

  test('mouse: dragging a part pulls it out', async ({ page }) => {
    await ready(page);
    await page.locator('#view-seg button', { hasText: 'Apart' }).click();
    await page.waitForFunction(() => window.__body.state.explode > 0.97, null, { timeout: 30_000 });
    const heart = (await state(page)).parts.indexOf('Heart');
    const [x, y] = await partPoint(page, heart);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 80, { steps: 6 });
    await page.waitForFunction((i) => window.__body.state.grabActive && window.__body.state.grabPart === i, heart);
    await expect(page.locator('#detail-name')).toHaveText('Heart');
    await page.mouse.up();
    await page.waitForFunction(() => !window.__body.state.grabActive);
  });

  test('phone layout hides the sidebar behind a button', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await ready(page);
    await expect(page.locator('#sidebar')).not.toBeInViewport();
    await page.locator('#open-sidebar').click();
    await expect(page.locator('#sidebar')).toBeInViewport();
    await page.locator('#systems .row', { hasText: 'Skeletal System' }).click();
    await expect(page.locator('#title')).toHaveText('Skeletal System');
  });
});
