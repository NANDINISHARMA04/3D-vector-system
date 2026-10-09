import { test, expect } from '@playwright/test';

const URL = '/body.html?particles=20000';
const state = (page) => page.evaluate(() => window.__body.state);
const lastSpoken = async (page) => (await state(page)).spoken.at(-1) ?? '';

async function ready(page, query = '') {
  await page.goto(`${URL}&autostart=1&lang=en${query}`);
  await page.waitForFunction(() => window.__body?.state.parts.length > 0);
}

// Waits until a part's label anchor is on screen (model formed / exploded) and returns it.
async function partPoint(page, i) {
  await page.waitForTimeout(1500);
  const box = await page.locator('#stage').boundingBox();
  const p = await page.evaluate((i) => window.__body.partTapPoint(i), i);
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
    await expect(page.locator('#quiz-setup')).toBeVisible();
    await page.locator('#qs-start').click();
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
    // Stars are only for a correct first try.
    await expect(page.locator('#quiz-score')).toHaveText('⭐️ 0');
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

  // ---------------------------------------------------------------- languages
  test('Hindi: the whole interface and narration switch to Hindi', async ({ page }) => {
    await ready(page);
    await page.locator('#lang').selectOption('hi');
    await expect(page.locator('#title')).toHaveText('मानव शरीर');
    await expect(page.locator('#lesson-btn')).toContainText('पाठ शुरू करें');
    await expect(page.locator('.part-row').first()).toHaveText('मस्तिष्क');
    expect(await lastSpoken(page)).toContain('मानव शरीर है');
    await page.locator('.part-row').nth(2).click();
    await expect(page.locator('#detail-name')).toHaveText('हृदय (दिल)');
    expect(await lastSpoken(page)).toContain('क्या आप जानते हैं?');
    // Remembered for next time.
    await page.goto(`${URL}&autostart=1`);
    await page.waitForFunction(() => window.__body?.state.parts.length > 0);
    await expect(page.locator('#title')).toHaveText('मानव शरीर');
  });

  test('AI languages need the assistant: offline, the language does not change', async ({ page }) => {
    await page.route('**/api/status', (r) => r.fulfill({ json: { ai: false } }));
    await ready(page);
    await page.locator('#lang').selectOption('ta');
    await expect(page.locator('#toast')).toContainText('needs the AI assistant');
    expect((await state(page)).lang).toBe('en');
  });

  test('Tamil: narration is translated by the assistant and cached', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/status', (r) => r.fulfill({ json: { ai: true } }));
    await page.route('**/api/translate', async (r) => {
      calls++;
      const { items, language } = r.request().postDataJSON();
      expect(language).toBe('ta');
      r.fulfill({ json: { items: Object.fromEntries(items.map((it) => [it.key, `த ${it.text}`])) } });
    });
    await ready(page);
    await page.waitForFunction(() => window.__body.state.ai);
    await page.locator('#lang').selectOption('ta');
    await expect(page.locator('#title')).toHaveText('த Human Body');
    await page.locator('.part-row').first().click();
    await expect(page.locator('#detail-name')).toHaveText('த Brain');
    expect(await lastSpoken(page)).toContain('த Did you know?');
    // Opening another system translates it once; going back uses the cache.
    await page.locator('#systems .row').nth(1).click();
    await expect(page.locator('#title')).toHaveText('த Skeletal System');
    await page.locator('#systems .row').first().click();
    await expect(page.locator('#title')).toHaveText('த Human Body');
    expect(calls).toBe(2);
  });

  // ---------------------------------------------------------------- AI assistant
  test('Ask: questions go to the AI assistant with the part on screen', async ({ page }) => {
    let sent;
    await page.route('**/api/status', (r) => r.fulfill({ json: { ai: true } }));
    await page.route('**/api/ask', (r) => {
      sent = r.request().postDataJSON();
      r.fulfill({ json: { answer: 'When you run, your muscles need more oxygen, so your heart pumps faster to deliver it.' } });
    });
    await ready(page);
    await page.locator('.part-row', { hasText: 'Heart' }).click();
    await page.locator('#ask-btn').click();
    await expect(page.locator('#ask')).toBeVisible();
    await expect(page.locator('#ask-status')).toHaveText('AI ready');
    await page.locator('#ask-input').fill('Why does my heart beat faster when I run?');
    await page.locator('#ask-form button[type=submit]').click();
    await expect(page.locator('.bubble.bot').last()).toContainText('muscles need more oxygen');
    expect(sent).toMatchObject({ question: 'Why does my heart beat faster when I run?', part: 'Heart', language: 'en', model: 'Human Body' });
    expect(await lastSpoken(page)).toContain('muscles need more oxygen');
  });

  test('Ask: without the AI, answers come from the built-in lessons', async ({ page }) => {
    await page.route('**/api/status', (r) => r.fulfill({ json: { ai: false } }));
    await ready(page);
    await page.locator('#ask-btn').click();
    await expect(page.locator('#ask-status')).toHaveText('Offline answers');
    await page.locator('#ask-input').fill('What does the liver do?');
    await page.locator('#ask-input').press('Enter');
    await expect(page.locator('.bubble.bot').last()).toContainText('cleans your blood');
    await expect(page.locator('.bubble.bot').last()).toContainText('Offline answer');
  });

  // ---------------------------------------------------------------- classroom
  test('Team quiz: two teams take turns with a live scoreboard', async ({ page }) => {
    await ready(page, '&model=heart');
    await page.locator('#quiz-btn').click();
    await page.locator('#qs-mode button', { hasText: 'Two teams' }).click();
    await expect(page.locator('#qs-teams')).toBeVisible();
    await page.locator('#qs-count button', { hasText: '5' }).click();
    await page.locator('#qs-start').click();
    await expect(page.locator('#team-board .team')).toHaveCount(2);
    await expect(page.locator('#team-board .team.active')).toContainText('Red Team');
    expect(await lastSpoken(page)).toContain('Red Team, it’s your turn.');
    const s0 = await state(page);
    expect(s0.quiz.total % 2).toBe(0); // fair: both teams get the same number
    // Red answers correctly on the first try (canvas tapping is covered by the solo quiz test).
    await page.evaluate((i) => window.__body.choosePart(i), s0.quiz.target);
    await expect(page.locator('#team-board .team').first()).toContainText('1');
    await expect(page.locator('#team-board .team.active')).toContainText('Blue Team', { timeout: 20_000 });
  });

  test('Solo quiz results are saved to the class dashboard', async ({ page }) => {
    await ready(page, '&model=tooth');
    await page.locator('#quiz-btn').click();
    await page.locator('#qs-new').fill('Meera');
    await page.locator('#qs-add button').click();
    await expect(page.locator('#qs-players li.on')).toHaveText('Meera');
    await page.locator('#qs-count button', { hasText: '5' }).click();
    await page.locator('#qs-start').click();
    for (let i = 0; i < 5; i++) {
      await page.waitForFunction((i) => window.__body.state.quiz.index === i, i, { timeout: 20_000 });
      await page.locator('#quiz-skip').click();
    }
    await expect(page.locator('#quiz-question')).toContainText('You found 0 out of 5', { timeout: 20_000 });
    await page.locator('#quiz-stop').click();
    await page.locator('#open-dashboard').click();
    await expect(page.locator('.tile').first()).toContainText('1');
    await page.locator('#dash-tabs button', { hasText: 'Students' }).click();
    await expect(page.locator('#dash-body')).toContainText('Meera');
    await expect(page.locator('#dash-body')).toContainText('1 quiz');
    await page.locator('#dash-tabs button', { hasText: 'History' }).click();
    await expect(page.locator('#dash-body table')).toContainText('Tooth (Molar)');
    const download = page.waitForEvent('download');
    await page.locator('#dash-csv').click();
    expect((await download).suggestedFilename()).toMatch(/body-explorer-results-.*\.csv/);
  });

  test('Lesson builder: a teacher-made lesson appears in the sidebar and plays', async ({ page }) => {
    await ready(page);
    await page.locator('#open-builder').click();
    await page.locator('#new-lesson').click();
    await page.locator('#lesson-title').fill('Breathing basics');
    await page.locator('#lesson-model').selectOption('lungs');
    // Keep only the trachea and the diaphragm.
    const boxes = page.locator('#builder-body [data-on]');
    const n = await boxes.count();
    for (let i = 0; i < n; i++) {
      const name = await page.locator('#builder-body .step-head b').nth(i).textContent();
      if (!['Trachea', 'Diaphragm'].includes(name)) await boxes.nth(i).uncheck();
    }
    await page.locator('[data-note]').first().fill('Put your hand on your throat and breathe in!');
    await page.locator('#save-lesson').click();
    await expect(page.locator('#builder-body')).toContainText('Breathing basics');
    await page.locator('#builder-done').click();
    const row = page.locator('#systems .row', { hasText: 'Breathing basics' });
    await expect(row).toBeVisible();
    await row.click();
    await expect(page.locator('#toolbar-lesson')).toBeVisible();
    await expect(page.locator('#title')).toHaveText('Respiratory System');
    await expect(page.locator('#lesson-total')).toHaveText('2');
    await expect(page.locator('#detail-name')).toHaveText('Trachea', { timeout: 20_000 });
    await expect(page.locator('#detail-note')).toBeVisible();
    await expect(page.locator('#detail-note-text')).toHaveText('Put your hand on your throat and breathe in!');
  });

  // ---------------------------------------------------------------- accessibility
  test('Accessibility: large text, colour-blind colours and switch scanning', async ({ page }) => {
    await ready(page, '&model=heart');
    await page.locator('#settings-btn').click();
    await page.locator('#a11y-large').check();
    await page.locator('#a11y-cb').check();
    await page.locator('#a11y-scan').check();
    await page.locator('#settings-done').click();
    await expect(page.locator('body')).toHaveClass(/large-text/);
    await expect(page.locator('.part-row .pdot').first()).toHaveCSS('color', 'rgb(57, 135, 229)');
    await expect(page.locator('#scan-hint')).toBeVisible();
    await page.waitForFunction(() => window.__body.state.scanIndex >= 0);
    const idx = (await state(page)).scanIndex;
    await page.locator('#stage').press('Space');
    const s = await state(page);
    expect([idx, (idx + 1) % s.parts.length]).toContain(s.selected);
    expect(await lastSpoken(page)).toMatch(/Did you know\?/);
    // Settings persist across reloads.
    await page.reload();
    await page.waitForFunction(() => window.__body?.state.parts.length > 0);
    await expect(page.locator('body')).toHaveClass(/large-text/);
    await expect(page.locator('body')).toHaveClass(/scanning/);
  });
});
