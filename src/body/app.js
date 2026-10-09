// Body Explorer: a classroom app for exploring the human body in 3D.
// Reuses Vector's GPU particle engine, models and hand tracking, and adds
// spoken explanations, guided lessons and a "find the part" quiz.

import { ParticleSystem } from '../particles.js';
import { HandTracker } from '../hands.js';
import { GestureTracker } from '../gestures.js';
import { Labels } from '../labels.js';
import { Overlay } from '../overlay.js';
import { findModel } from '../models/index.js';
import { orbitCamera, project, unproject, pickPart, explodeFit, partAnchor } from '../viewer.js';
import { clamp, smooth, remap, v3 } from '../math.js';
import { LESSONS, SECTIONS, narration } from './content.js';
import { Narrator } from './speech.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const COUNT = clamp(Math.round(Number(params.get('particles')) || 150000), 5000, 600000);
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const lower = (name) => name[0].toLowerCase() + name.slice(1);

const ui = {
  body: document.body,
  stage: $('#stage'),
  gl: $('#gl'),
  video: $('#video'),
  systems: $('#systems'),
  search: $('#search'),
  eyebrow: $('#eyebrow'),
  title: $('#title'),
  subtitle: $('#subtitle'),
  viewSeg: $('#view-seg'),
  soundBtn: $('#sound-btn'),
  handsBtn: $('#hands-btn'),
  partList: $('#part-list'),
  partCount: $('#part-count'),
  detail: $('#detail'),
  detailDot: $('#detail-dot'),
  detailEyebrow: $('#detail-eyebrow'),
  detailName: $('#detail-name'),
  detailSummary: $('#detail-summary'),
  detailFact: $('#detail-fact'),
  speaking: $('#speaking'),
  quizBanner: $('#quiz-banner'),
  quizProgress: $('#quiz-progress'),
  quizQuestion: $('#quiz-question'),
  quizFeedback: $('#quiz-feedback'),
  quizScore: $('#quiz-score'),
  tbIdle: $('#toolbar-idle'),
  tbLesson: $('#toolbar-lesson'),
  tbQuiz: $('#toolbar-quiz'),
  lessonStep: $('#lesson-step'),
  lessonTotal: $('#lesson-total'),
  lessonBar: $('#lesson-bar'),
  lessonPause: $('#lesson-pause'),
  toast: $('#toast'),
  settings: $('#settings'),
  welcome: $('#welcome'),
};

// ------------------------------------------------------------------ state
const S = {
  model: null,
  sample: null,
  pendingId: null,
  pendingPart: null,
  section: '',
  form: 0,
  formTarget: 1,
  explode: 0,
  explodeTarget: 0,
  yaw: 0.35,
  pitch: 0.08,
  pitchTarget: 0.08,
  dist: 4.3,
  distTarget: 4.3,
  yawVel: 0,
  autoRotate: true,
  selected: -1,
  hover: -1,
  focus: 0,
  focusPart: -1,
  mode: 'explore', // explore | lesson | quiz
  started: false,
  dragging: null,
  pointers: new Map(),
  pinchDist: null,
  mouse: null,
  injected: null,
  pointHold: { part: -1, since: 0, fired: false },
  grab: { part: -1, active: false, byHand: false, offset: [0, 0, 0], base: [0, 0, 0], start: null },
  cameraBg: true,
};

// ------------------------------------------------------------------ pulling parts out
// A pinch (or a mouse drag on a part) grabs it; it follows the hand and springs back on release.
function startGrab(part, x, y, byHand) {
  const same = S.grab.part === part;
  const base = same ? [...S.grab.offset] : [0, 0, 0];
  S.grab = { part, active: true, byHand, base, offset: [...base], start: unproject(cam, x, y) };
}
function moveGrab(x, y) {
  S.grab.offset = v3.add(S.grab.base, v3.sub(unproject(cam, x, y), S.grab.start));
}
function endGrab() {
  S.grab.active = false;
}
const pick = (x, y) => pickPart(S.sample, cam, x, y, { explode: S.explode, grab: S.grab });

// ------------------------------------------------------------------ systems
let particles;
try {
  particles = new ParticleSystem(ui.gl, COUNT);
} catch (err) {
  ui.stage.innerHTML = `<div class="welcome"><div class="welcome-card"><h1>Body Explorer</h1><p class="welcome-sub">${err.message}<br/>Please open this page in Safari, Chrome or Edge.</p></div></div>`;
  throw err;
}
const narrator = new Narrator();
const tracker = new HandTracker(ui.video);
const gestures = new GestureTracker();
const labels = new Labels($('#labels'), $('#leaders'));
const overlay = new Overlay($('#overlay'));
const worker = new Worker(new URL('../sampler.worker.js', import.meta.url), { type: 'module' });

let W = 1;
let H = 1;
function resize() {
  const r = ui.stage.getBoundingClientRect();
  W = Math.max(1, r.width);
  H = Math.max(1, r.height);
  particles.resize(W, H, DPR);
  overlay.resize(W, H, DPR);
}
new ResizeObserver(resize).observe(ui.stage);
resize();

// Inspector and detail card cover the stage edges: nudge the model into the clear area.
const stageShift = () => (W > 1100 && S.mode !== 'quiz' ? -120 : 0);
// Portrait screens need the camera further back to fit tall models.
const portraitFit = () => (W / H < 0.8 ? 1.35 : 1);
const camera = () =>
  orbitCamera({ yaw: S.yaw, pitch: S.pitch, dist: S.dist * explodeFit(S.sample, S.explode) * portraitFit(), W, H, shiftPx: stageShift() });
let cam = camera();

// ------------------------------------------------------------------ sidebar
const ITEMS = SECTIONS.flatMap((s) => s.items.map((it) => ({ ...it, section: s.title })));
const itemOf = (id) => ITEMS.find((i) => i.id === id);
const itemLabel = (it) => it.label ?? findModel(it.id).name;

function renderSidebar() {
  ui.systems.replaceChildren(
    ...SECTIONS.flatMap((sec) => {
      const h = document.createElement('h3');
      h.className = 'section-header';
      h.textContent = sec.title;
      const ul = document.createElement('ul');
      ul.className = 'inset-group';
      for (const it of sec.items) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.className = 'row';
        b.dataset.id = it.id;
        b.innerHTML = `<span class="icon" style="--tint:${it.tint}">${it.icon}</span><span class="row-text"><b></b><small></small></span><svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`;
        b.querySelector('b').textContent = itemLabel(it);
        b.querySelector('small').textContent = `${Object.keys(LESSONS[it.id].parts).length} parts`;
        b.onclick = () => {
          openModel(it.id, b.dataset.jump || null);
          ui.body.classList.remove('sidebar-open');
        };
        li.append(b);
        ul.append(li);
      }
      return [h, ul];
    }),
  );
}

ui.search.addEventListener('input', () => {
  const q = ui.search.value.trim().toLowerCase();
  for (const b of ui.systems.querySelectorAll('.row')) {
    const it = itemOf(b.dataset.id);
    const parts = Object.keys(LESSONS[it.id].parts);
    const partHit = q ? parts.find((p) => p.toLowerCase().includes(q)) : null;
    const hit = !q || itemLabel(it).toLowerCase().includes(q) || Boolean(partHit);
    b.parentElement.hidden = !hit;
    b.dataset.jump = partHit ?? '';
    b.querySelector('small').textContent = partHit ? `Includes: ${partHit}` : `${parts.length} parts`;
  }
  for (const ul of ui.systems.querySelectorAll('.inset-group')) {
    const any = [...ul.children].some((li) => !li.hidden);
    ul.hidden = !any;
    ul.previousElementSibling.hidden = !any;
  }
});

// ------------------------------------------------------------------ models
const cache = new Map();
const seedOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

worker.onmessage = ({ data }) => {
  cache.set(data.id, data);
  while (cache.size > 4) cache.delete(cache.keys().next().value);
  if (data.id === S.pendingId) applyModel(data);
};

function openModel(id, jumpToPart = null) {
  if (S.mode !== 'explore') stopMode();
  const model = findModel(id) ?? findModel('human-body');
  S.pendingId = model.id;
  S.pendingPart = jumpToPart;
  if (cache.has(model.id)) applyModel(cache.get(model.id));
  else worker.postMessage({ id: model.id, count: COUNT, seed: seedOf(model.id) });
}

function applyModel(sample) {
  const model = findModel(sample.id);
  const item = itemOf(model.id);
  particles.setModel(sample);
  S.sample = sample;
  S.model = model;
  S.selected = -1;
  S.hover = -1;
  S.focusPart = -1;
  S.grab = { part: -1, active: false, byHand: false, offset: [0, 0, 0], base: [0, 0, 0], start: null };
  labels.setParts(sample.parts);
  ui.eyebrow.textContent = item?.section ?? 'Anatomy';
  ui.title.textContent = item ? itemLabel(item) : model.name;
  ui.subtitle.textContent = model.subtitle;
  document.title = `${ui.title.textContent} · Body Explorer`;
  for (const b of ui.systems.querySelectorAll('.row')) b.classList.toggle('selected', b.dataset.id === model.id);
  renderParts();
  ui.detail.hidden = true;
  const url = new URL(location.href);
  url.searchParams.set('model', model.id);
  history.replaceState(null, '', url);

  const jump = S.pendingPart ? sample.parts.findIndex((p) => p.name === S.pendingPart) : -1;
  S.pendingPart = null;
  if (jump >= 0) {
    setExplode(0.5);
    selectPart(jump);
  } else if (S.started) {
    say(LESSONS[model.id]?.intro ?? model.name);
  }
}

function renderParts() {
  const parts = S.sample.parts;
  ui.partCount.textContent = parts.length;
  ui.partList.replaceChildren(
    ...parts.map((p, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'part-row';
      b.innerHTML = '<span class="pdot"></span><span></span>';
      b.firstChild.style.color = p.color;
      b.lastChild.textContent = p.name;
      b.onclick = () => onPartChosen(i);
      b.onmouseenter = () => (S.listHover = i);
      b.onmouseleave = () => (S.listHover = -1);
      li.append(b);
      return li;
    }),
  );
}

// ------------------------------------------------------------------ selection + narration
function say(text) {
  return narrator.say(text);
}

function partText(i) {
  const p = S.sample.parts[i];
  const n = narration(S.model.id, p.name) ?? { summary: p.desc, fact: '' };
  return { name: p.name, ...n, color: p.color };
}

function selectPart(i, { speak = true } = {}) {
  if (!S.sample || i < 0 || i >= S.sample.parts.length) return null;
  S.selected = i;
  const t = partText(i);
  ui.detail.hidden = false;
  ui.detail.style.animation = 'none';
  void ui.detail.offsetWidth;
  ui.detail.style.animation = '';
  ui.detailDot.style.color = t.color;
  ui.detailEyebrow.textContent = `${ui.title.textContent} · ${i + 1} of ${S.sample.parts.length}`;
  ui.detailName.textContent = t.name;
  ui.detailSummary.textContent = t.summary;
  ui.detailFact.textContent = t.fact;
  ui.detailFact.parentElement.hidden = !t.fact;
  ui.partList.querySelectorAll('.part-row').forEach((b, k) => b.classList.toggle('selected', k === i));
  ui.partList.children[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  if (speak) return say(spokenText(t));
  return null;
}

const spokenText = (t) => `${t.name}. ${t.summary}${t.fact ? ` Did you know? ${t.fact}` : ''}`;

function clearSelection() {
  S.selected = -1;
  ui.detail.hidden = true;
  ui.partList.querySelectorAll('.part-row').forEach((b) => b.classList.remove('selected'));
}

// A part was tapped / pointed at / chosen from the list.
function onPartChosen(i) {
  if (S.mode === 'quiz') return quizAnswer(i);
  if (S.mode === 'lesson') stopMode();
  selectPart(i);
}

narrator.onstart = () => (ui.speaking.hidden = false);
narrator.onend = () => (ui.speaking.hidden = true);

$('#listen-btn').onclick = () => S.selected >= 0 && say(spokenText(partText(S.selected)));
$('#prev-part').onclick = () => S.sample && onPartChosen((S.selected - 1 + S.sample.parts.length) % S.sample.parts.length);
$('#next-part').onclick = () => S.sample && onPartChosen((S.selected + 1) % S.sample.parts.length);

// ------------------------------------------------------------------ view controls
const segIndex = (seg, i) => {
  const btns = [...seg.querySelectorAll('button')];
  const thumb = seg.querySelector('.seg-thumb');
  const b = btns[i];
  if (!b) return;
  thumb.style.width = `${b.offsetWidth}px`;
  thumb.style.transform = `translateX(${b.offsetLeft - 2}px)`;
  btns.forEach((x, k) => x.setAttribute('aria-checked', String(k === i)));
};

const EXPLODE_STOPS = [0, 0.5, 1];
function setExplode(v, { fromHand = false } = {}) {
  S.explodeTarget = v;
  const nearest = EXPLODE_STOPS.reduce((best, s, k) => (Math.abs(s - v) < Math.abs(EXPLODE_STOPS[best] - v) ? k : best), 0);
  if (!fromHand || S.lastSeg !== nearest) segIndex(ui.viewSeg, nearest);
  S.lastSeg = nearest;
}
ui.viewSeg.querySelectorAll('button').forEach((b) => (b.onclick = () => setExplode(Number(b.dataset.explode))));

ui.soundBtn.onclick = () => {
  narrator.enabled = !narrator.enabled;
  if (!narrator.enabled) narrator.stop();
  ui.soundBtn.classList.toggle('muted', !narrator.enabled);
  ui.soundBtn.setAttribute('aria-label', narrator.enabled ? 'Narration on' : 'Narration off');
  $('#auto-read').checked = narrator.enabled;
  toast(narrator.enabled ? 'Narration on' : 'Narration off');
};

let toastTimer;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1800);
}

$('#open-sidebar').onclick = () => ui.body.classList.add('sidebar-open');
$('#close-sidebar').onclick = () => ui.body.classList.remove('sidebar-open');

// ------------------------------------------------------------------ settings
function fillVoices() {
  const sel = $('#voice');
  sel.replaceChildren(
    ...(narrator.voices.length ? narrator.voices : [{ name: 'Default voice' }]).map((v) => {
      const o = document.createElement('option');
      o.value = o.textContent = v.name;
      o.selected = v === narrator.voice;
      return o;
    }),
  );
}
window.speechSynthesis?.addEventListener?.('voiceschanged', fillVoices);
$('#settings-btn').onclick = () => {
  fillVoices();
  ui.settings.hidden = false;
  const q = [...$('#quality-seg').querySelectorAll('button')].findIndex((b) => Number(b.dataset.particles) === COUNT);
  requestAnimationFrame(() => segIndex($('#quality-seg'), q < 0 ? 1 : q));
};
$('#settings-done').onclick = () => (ui.settings.hidden = true);
ui.settings.addEventListener('click', (e) => e.target === ui.settings && (ui.settings.hidden = true));
$('#voice').onchange = (e) => narrator.setVoice(e.target.value);
$('#rate').oninput = (e) => (narrator.rate = Number(e.target.value));
$('#test-voice').onclick = () => say('Hello class! Let’s explore the amazing human body.');
$('#auto-read').onchange = (e) => {
  if (e.target.checked !== narrator.enabled) ui.soundBtn.click();
};
$('#show-labels').onchange = (e) => ui.body.classList.toggle('no-labels', !e.target.checked);
$('#auto-rotate').onchange = (e) => (S.autoRotate = e.target.checked);
$('#quality-seg').querySelectorAll('button').forEach((b, i) => {
  b.onclick = () => {
    segIndex($('#quality-seg'), i);
    const url = new URL(location.href);
    url.searchParams.set('particles', b.dataset.particles);
    url.searchParams.set('autostart', '1');
    setTimeout(() => location.assign(url), 300);
  };
});

// ------------------------------------------------------------------ lesson mode
let modeToken = 0;
let paused = false;
let resumeLesson = null;

function setMode(mode) {
  S.mode = mode;
  ui.body.classList.toggle('quiz', mode === 'quiz');
  ui.tbIdle.hidden = mode !== 'explore';
  ui.tbLesson.hidden = mode !== 'lesson';
  ui.tbQuiz.hidden = mode !== 'quiz';
  ui.quizBanner.hidden = mode !== 'quiz';
}

function stopMode() {
  modeToken++;
  paused = false;
  resumeLesson?.();
  narrator.stop();
  setMode('explore');
}

// Speak and also hold the part on screen long enough to read when muted.
async function present(text) {
  const words = text.split(/\s+/).length;
  const t0 = performance.now();
  const spoke = await say(text);
  // Muted, or speech unavailable/failed: still leave time to read the card.
  const readMs = Math.max(2500, words * 280);
  if (!spoke) await wait(Math.max(0, readMs - (performance.now() - t0)));
}

async function runLesson() {
  if (!S.sample) return;
  const token = ++modeToken;
  setMode('lesson');
  paused = false;
  ui.lessonPause.textContent = 'Pause';
  const parts = S.sample.parts;
  ui.lessonTotal.textContent = parts.length;
  setExplode(S.model.id === 'human-body' || S.model.id === 'digestive' || S.model.id === 'nervous' ? 1 : 0.5);
  clearSelection();
  ui.lessonStep.textContent = 0;
  ui.lessonBar.style.width = '0%';
  await present(LESSONS[S.model.id]?.intro ?? S.model.name);
  for (let i = 0; i < parts.length; i++) {
    if (token !== modeToken) return;
    if (paused) await new Promise((r) => (resumeLesson = r));
    if (token !== modeToken) return;
    ui.lessonStep.textContent = i + 1;
    ui.lessonBar.style.width = `${((i + 1) / parts.length) * 100}%`;
    selectPart(i, { speak: false });
    await present(spokenText(partText(i)));
    await wait(600);
    if (paused) i--; // repeat the interrupted part after resuming
  }
  if (token !== modeToken) return;
  await present(`Great job! You have learned all about the ${ui.title.textContent.toLowerCase()}.`);
  if (token === modeToken) stopMode();
}

$('#lesson-btn').onclick = runLesson;
$('#lesson-stop').onclick = stopMode;
ui.lessonPause.onclick = () => {
  paused = !paused;
  ui.lessonPause.textContent = paused ? 'Resume' : 'Pause';
  if (paused) narrator.stop();
  else {
    resumeLesson?.();
    resumeLesson = null;
  }
};

// ------------------------------------------------------------------ quiz mode
const Q = { list: [], i: 0, score: 0, locked: false };

function runQuiz() {
  if (!S.sample) return;
  const token = ++modeToken;
  setMode('quiz');
  clearSelection();
  setExplode(1);
  const pool = S.sample.parts.map((p, i) => i).filter((i) => S.sample.parts[i].name !== 'Body');
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  Q.list = pool.slice(0, Math.min(5, pool.length));
  Q.i = 0;
  Q.score = 0;
  Q.token = token;
  ui.quizScore.textContent = '⭐️ 0';
  ask();
}

function ask() {
  Q.locked = false;
  const name = S.sample.parts[Q.list[Q.i]].name;
  ui.quizProgress.textContent = `Question ${Q.i + 1} of ${Q.list.length}`;
  ui.quizQuestion.textContent = `Can you find the ${lower(name)}?`;
  ui.quizFeedback.textContent = 'Tap it on the model';
  ui.quizFeedback.className = 'quiz-feedback';
  say(`Can you find the ${lower(name)}?`);
}

async function quizAnswer(i) {
  if (Q.locked) return;
  const target = Q.list[Q.i];
  const token = Q.token;
  const name = S.sample.parts[i].name;
  if (i === target) {
    Q.locked = true;
    Q.score++;
    ui.quizScore.textContent = `⭐️ ${Q.score}`;
    ui.quizFeedback.textContent = `Yes! That's the ${lower(name)} 🎉`;
    ui.quizFeedback.className = 'quiz-feedback good';
    selectPart(i, { speak: false });
    const t = partText(i);
    await present(`Well done! That's the ${lower(name)}. ${t.fact}`);
    if (token === modeToken) nextQuestion();
  } else {
    ui.quizFeedback.textContent = `That's the ${lower(name)}. Try again!`;
    ui.quizFeedback.className = 'quiz-feedback bad';
    S.flash = { part: i, until: performance.now() + 1200 };
    say(`That's the ${lower(name)}. Try again!`);
  }
}

async function skipQuestion() {
  if (Q.locked) return;
  Q.locked = true;
  const token = Q.token;
  const i = Q.list[Q.i];
  const name = S.sample.parts[i].name;
  ui.quizFeedback.textContent = `Here it is: the ${lower(name)}`;
  ui.quizFeedback.className = 'quiz-feedback';
  selectPart(i, { speak: false });
  await present(`Here is the ${lower(name)}.`);
  if (token === modeToken) nextQuestion();
}

async function nextQuestion() {
  clearSelection();
  Q.i++;
  if (Q.i < Q.list.length) return ask();
  const token = Q.token;
  ui.quizProgress.textContent = 'Quiz complete';
  ui.quizQuestion.textContent = `You found ${Q.score} out of ${Q.list.length}!`;
  ui.quizFeedback.textContent = Q.score === Q.list.length ? 'Perfect score! 🏆' : Q.score >= Q.list.length / 2 ? 'Great work! 🌟' : 'Good try! Let’s play again 💪';
  ui.quizFeedback.className = 'quiz-feedback good';
  Q.locked = true;
  if (Q.score >= Math.ceil(Q.list.length / 2)) confetti();
  await present(`You found ${Q.score} out of ${Q.list.length}! ${Q.score === Q.list.length ? 'Perfect score!' : 'Great work!'}`);
  await wait(1500);
  if (token === modeToken) stopMode();
}

$('#quiz-btn').onclick = runQuiz;
$('#quiz-skip').onclick = skipQuestion;
$('#quiz-stop').onclick = stopMode;

function confetti() {
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#ff375f', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2'];
  for (let i = 0; i < 90; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    c.style.animationDelay = `${Math.random() * 0.5}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(c);
  }
  ui.stage.append(box);
  setTimeout(() => box.remove(), 4000);
}

// ------------------------------------------------------------------ pointer input
const local = (e) => {
  const r = ui.stage.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
};

ui.gl.addEventListener('pointerdown', (e) => {
  ui.gl.setPointerCapture(e.pointerId);
  const p = local(e);
  S.pointers.set(e.pointerId, p);
  if (S.pointers.size === 1) S.dragging = { start: p, last: p, moved: 0, part: pick(p[0], p[1]) };
  else {
    S.dragging = null;
    const [a, b] = [...S.pointers.values()];
    S.pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
  }
});
ui.gl.addEventListener('pointermove', (e) => {
  const p = local(e);
  S.mouse = e.pointerType === 'mouse' ? p : null;
  if (!S.pointers.has(e.pointerId)) return;
  S.pointers.set(e.pointerId, p);
  if (S.pointers.size === 2 && S.pinchDist) {
    const [a, b] = [...S.pointers.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    S.distTarget = clamp(S.distTarget * (S.pinchDist / d), 1.6, 10);
    S.pinchDist = d;
  } else if (S.dragging) {
    const dx = p[0] - S.dragging.last[0];
    const dy = p[1] - S.dragging.last[1];
    S.dragging.moved += Math.abs(dx) + Math.abs(dy);
    if (S.dragging.part >= 0 && S.mode !== 'quiz') {
      // Dragging a part pulls it out of the body (and tells you about it).
      if (!S.grab.active && S.dragging.moved > 6) {
        startGrab(S.dragging.part, S.dragging.start[0], S.dragging.start[1], false);
        if (S.dragging.part !== S.selected) onPartChosen(S.dragging.part);
      }
      if (S.grab.active) moveGrab(p[0], p[1]);
      S.dragging.last = p;
      return;
    }
    S.yaw -= dx * 0.008;
    S.pitch = clamp(S.pitch + dy * 0.006, -1.2, 1.2);
    S.pitchTarget = S.pitch;
    S.dragging.last = p;
    ui.gl.classList.toggle('dragging', S.dragging.moved > 6);
  }
});
const endPointer = (e) => {
  const p = local(e);
  if (S.grab.active && !S.grab.byHand) endGrab();
  if (S.dragging && S.dragging.moved < 6 && S.pointers.size === 1) {
    const part = pick(p[0], p[1]);
    if (part >= 0) onPartChosen(part);
    else if (S.mode === 'explore') clearSelection();
  }
  S.pointers.delete(e.pointerId);
  if (S.pointers.size < 2) S.pinchDist = null;
  S.dragging = null;
  ui.gl.classList.remove('dragging');
};
ui.gl.addEventListener('pointerup', endPointer);
ui.gl.addEventListener('pointercancel', endPointer);
ui.gl.addEventListener('pointerleave', () => (S.mouse = null));
ui.gl.addEventListener('dblclick', () => {
  S.distTarget = 4.3;
  S.pitchTarget = 0.08;
});
ui.stage.addEventListener('wheel', (e) => {
  if (e.target.closest('.inspector, .detail, .navbar, .toolbar')) return;
  e.preventDefault();
  S.distTarget = clamp(S.distTarget * Math.exp(e.deltaY * 0.0012), 1.6, 10);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || !S.sample) return;
  const n = S.sample.parts.length;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onPartChosen((S.selected + 1) % n);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPartChosen((S.selected - 1 + n) % n);
  else if (e.key === 'Escape') {
    if (!ui.settings.hidden) ui.settings.hidden = true;
    else if (S.mode !== 'explore') stopMode();
    else clearSelection();
  } else if (e.key === '1' || e.key === '2' || e.key === '3') setExplode(EXPLODE_STOPS[Number(e.key) - 1]);
  else if (e.key === ' ') {
    e.preventDefault();
    if (S.selected >= 0) say(spokenText(partText(S.selected)));
  }
});

// ------------------------------------------------------------------ hand control
const GESTURE_OF = { point: 'point', pinch: 'pinch', open: 'open', moving: 'open', fist: 'fist', peace: 'peace', two: 'two' };
let shownGesture;
function showGesture(pose) {
  const g = pose ? GESTURE_OF[pose] ?? null : null;
  if (g === shownGesture) return;
  shownGesture = g;
  document.querySelectorAll('#gesture-guide [data-g]').forEach((el) => el.classList.toggle('on', el.dataset.g === g));
}
$('#camera-bg').onchange = (e) => ui.body.classList.toggle('pip-camera', !e.target.checked);
async function toggleHands() {
  if (tracker.running) {
    tracker.stop();
    ui.video.hidden = true;
    ui.body.classList.remove('camera-on');
    ui.handsBtn.classList.remove('active');
    toast('Hand control off');
    return;
  }
  try {
    toast('Starting camera…');
    ui.video.hidden = false;
    await tracker.start();
    ui.body.classList.add('camera-on');
    ui.handsBtn.classList.add('active');
    toast('Show your hand ✋ then pinch a part 🤏');
  } catch (err) {
    console.warn(err);
    const cameraWorked = tracker.running;
    tracker.stop();
    ui.video.hidden = true;
    ui.body.classList.remove('camera-on');
    if (err?.name === 'NotAllowedError') toast('Camera permission was denied');
    else if (cameraWorked) toast('Hand tracking could not load: check the internet connection');
    else toast('No camera found');
  }
}
ui.handsBtn.onclick = toggleHands;

function handleHands(now, dt) {
  const hands = S.injected ?? (tracker.running ? tracker.hands : []);
  const g = gestures.update(hands, now, 'forgiving');
  const P = g.primary;
  let targetYawVel = null;
  showGesture(P ? (g.analyses.length > 1 ? 'two' : g.pose) : null);
  if (!P) {
    S.pointHold.part = -1;
    S.prevPose = 'none';
    if (S.grab.active && S.grab.byHand) endGrab();
    return { g, targetYawVel };
  }
  for (const ev of g.events) if (ev === 'next' && S.sample) onPartChosen((S.selected + 1) % S.sample.parts.length);
  targetYawVel = 0;
  switch (g.pose) {
    case 'fist':
      setExplode(0, { fromHand: true });
      break;
    case 'open':
    case 'moving': {
      if (!g.zoom) setExplode(remap(P.openness, 0.3, 0.92), { fromHand: true });
      const dead = 0.3;
      if (Math.abs(P.roll) > dead) targetYawVel = -(P.roll - Math.sign(P.roll) * dead) * 2.4;
      break;
    }
    case 'pinch': {
      const x = (P.indexTip[0] + P.thumbTip[0]) / 2;
      const y = (P.indexTip[1] + P.thumbTip[1]) / 2;
      if (!S.grab.active) {
        // Grab what you were pointing at, or whatever is under the pinch.
        const part = S.hover >= 0 && (S.prevPose === 'point' || S.prevPose === 'pinch') ? S.hover : pick(x, y);
        if (part >= 0) {
          S.hover = part;
          if (S.mode === 'quiz') onPartChosen(part);
          else {
            startGrab(part, x, y, true);
            if (part !== S.selected) onPartChosen(part); // name + fun fact, right away
          }
        }
      } else if (S.grab.byHand) {
        moveGrab(x, y);
      }
      break;
    }
    case 'point': {
      const part = pick(P.indexTip[0], P.indexTip[1]);
      S.hover = part;
      const hold = S.pointHold;
      if (part !== hold.part) Object.assign(hold, { part, since: now, fired: false });
      else if (part >= 0 && !hold.fired && now - hold.since > 700) {
        hold.fired = true;
        if (part !== S.selected || S.mode === 'quiz') onPartChosen(part);
      }
      break;
    }
    default:
      break;
  }
  if (g.pose !== 'point') S.pointHold.part = -1;
  if (g.pose !== 'pinch' && S.grab.active && S.grab.byHand) endGrab();
  S.prevPose = g.pose;
  if (g.zoom) {
    if (S.zoomBase == null) S.zoomBase = S.distTarget;
    S.distTarget = clamp(S.zoomBase / g.zoom, 1.6, 10);
  } else S.zoomBase = null;
  return { g, targetYawVel, holdProgress: g.pose === 'point' && S.pointHold.part >= 0 && !S.pointHold.fired ? clamp((now - S.pointHold.since) / 700, 0, 1) : 0 };
}

// ------------------------------------------------------------------ frame loop
let last = performance.now();
let frames = 0;
let fpsT = last;
let fps = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  frames++;
  if (now - fpsT > 500) {
    fps = Math.round((frames * 1000) / (now - fpsT));
    frames = 0;
    fpsT = now;
  }
  if (tracker.running) tracker.detect(W, H);
  const { g, targetYawVel, holdProgress = 0 } = handleHands(now, dt);
  const handPresent = g.analyses.length > 0;

  if (!handPresent) {
    S.hover = -1;
    if (S.mouse && !S.dragging) S.hover = pick(S.mouse[0], S.mouse[1]);
    if (S.grab.active) S.hover = S.grab.part;
    if (S.listHover >= 0) S.hover = S.listHover;
  }
  ui.gl.classList.toggle('over-part', S.hover >= 0 && !S.dragging);
  ui.partList.querySelectorAll('.part-row').forEach((b, k) => b.classList.toggle('hover', k === S.hover));

  // Camera.
  const idle = !S.dragging && !handPresent && S.pointers.size === 0;
  const spin = S.autoRotate && idle ? (S.selected >= 0 ? -0.05 : -0.12) : 0;
  S.yawVel = smooth(S.yawVel, targetYawVel ?? spin, targetYawVel != null ? 5 : 2, dt);
  if (!S.dragging) S.yaw += S.yawVel * dt;
  S.pitch = smooth(S.pitch, S.pitchTarget, 4, dt);
  S.dist = smooth(S.dist, S.distTarget, 7, dt);

  S.form = smooth(S.form, S.formTarget, 2.2, dt);
  if (!S.grab.active && S.grab.part >= 0) {
    S.grab.offset = S.grab.offset.map((v) => v * Math.exp(-2.5 * dt));
    if (v3.len(S.grab.offset) < 0.003) S.grab.part = -1;
  }
  S.explode = smooth(S.explode, S.explodeTarget, 4, dt);

  // Which part to spotlight: a wrong quiz answer flashes, else hover, else selection.
  let spot = S.hover >= 0 ? S.hover : S.selected;
  if (S.flash && now < S.flash.until) spot = S.flash.part;
  if (spot >= 0) S.focusPart = spot;
  S.focus = smooth(S.focus, spot >= 0 ? (S.selected >= 0 || S.flash ? 1 : 0.7) : 0, 8, dt);

  cam = camera();
  particles.step(dt, now / 1000, { form: S.form, explode: S.explode, grabPart: S.grab.part, grabOffset: S.grab.offset, hand: [99, 99, 99], handForce: 0 });
  particles.draw(cam.view, cam.proj, { hover: S.focus > 0.01 ? S.focusPart : -1, focus: S.focus, clip: false, form: S.form });

  if (S.sample) {
    const anchors = S.sample.parts.map((p) => project(cam, partAnchor(p, S.explode, S.grab)));
    const [b0, b1] = S.sample.bounds;
    const lo = b0[0].map((v, k) => v + (b1[0][k] - v) * S.explode);
    const hi = b0[1].map((v, k) => v + (b1[1][k] - v) * S.explode);
    const xs = [];
    for (let c = 0; c < 8; c++) {
      const q = project(cam, [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]]);
      if (q) xs.push(q[0]);
    }
    const center = project(cam, [0, 0, 0]);
    const cx = center ? center[0] : W / 2;
    const inspector = W > 1100 ? 260 : 0;
    // In a quiz, only the part being guessed may carry a label after it is found.
    const quiz = S.mode === 'quiz';
    labels.layout(anchors, [cx, xs.length ? Math.min(...xs) : cx, xs.length ? Math.max(...xs) : cx], {
      opacity: quiz ? 0 : remap(S.form, 0.8, 0.98) * remap(S.explode, 0.15, 0.7),
      hot: quiz ? (S.selected >= 0 ? S.selected : -2) : spot,
      width: W - inspector,
      height: H,
      leftLimit: 8,
      leftBottom: ui.detail.hidden ? H - 120 : ui.detail.offsetTop - 20,
      top: W > 860 ? 128 : 170,
    });
  }

  overlay.draw(g.analyses, { pose: g.pose, holdProgress, time: now / 1000 });
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ boot
renderSidebar();
requestAnimationFrame(() => segIndex(ui.viewSeg, 0));
const initial = findModel(params.get('model') ?? '') && itemOf(params.get('model')) ? params.get('model') : 'human-body';
openModel(initial);

function start() {
  S.started = true;
  ui.welcome.hidden = true;
  if (S.model) say(LESSONS[S.model.id]?.intro ?? S.model.name);
}
$('#get-started').onclick = start;
$('#start-camera').onclick = () => {
  start();
  toggleHands();
};
if (params.get('autostart')) {
  S.started = true;
  ui.welcome.hidden = true;
  if (params.get('autostart') === 'camera') toggleHands();
}

requestAnimationFrame(frame);

// Hooks for automated tests.
window.__body = {
  get state() {
    return {
      model: S.model?.id ?? null,
      title: ui.title.textContent,
      parts: S.sample?.parts.map((p) => p.name) ?? [],
      selected: S.selected,
      hover: S.hover,
      explode: S.explode,
      explodeTarget: S.explodeTarget,
      mode: S.mode,
      grabPart: S.grab.part,
      grabActive: S.grab.active,
      quiz: { index: Q.i, score: Q.score, target: S.mode === 'quiz' ? Q.list[Q.i] : -1 },
      spoken: narrator.log.slice(),
      fps,
    };
  },
  openModel,
  injectHands: (h) => (S.injected = h),
  partScreenPosition: (i) => (S.sample ? project(cam, partAnchor(S.sample.parts[i], S.explode, S.grab)) : null),
};
