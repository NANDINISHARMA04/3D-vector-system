// Body Explorer: a classroom app for exploring the human body in 3D.
// Reuses Vector's GPU particle engine, models and hand tracking, and adds
// spoken explanations in English, Hindi and other Indian languages, an AI
// teaching assistant, guided and teacher-made lessons, solo and team quizzes,
// a class dashboard and accessibility options.

import { ParticleSystem } from '../particles.js';
import { HandTracker } from '../hands.js';
import { GestureTracker } from '../gestures.js';
import { Labels } from '../labels.js';
import { Overlay } from '../overlay.js';
import { findModel } from '../models/index.js';
import { orbitCamera, project, unproject, pickPart, explodeFit, partAnchor } from '../viewer.js';
import { clamp, smooth, remap, v3 } from '../math.js';
import { hex } from '../models/common.js';
import { LESSONS, SECTIONS } from './content.js';
import { Narrator } from './speech.js';
import { I18n, LANGS, applyStatic } from './i18n.js';
import { initAsk } from './ask.js';
import { initDashboard } from './dashboard.js';
import { initBuilder } from './builder.js';
import { getRoster, saveRoster, addStudent, addResult, getLessons, getAudio, getSettings, saveSettings, TEAM_COLORS } from './store.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const COUNT = clamp(Math.round(Number(params.get('particles')) || 150000), 5000, 600000);
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
  detailNote: $('#detail-note'),
  detailNoteText: $('#detail-note-text'),
  speaking: $('#speaking'),
  quizBanner: $('#quiz-banner'),
  teamBoard: $('#team-board'),
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
  scanHint: $('#scan-hint'),
  langSelects: [$('#lang'), $('#lang-settings'), $('#lang-welcome')],
};

// ------------------------------------------------------------------ settings & state
const saved = getSettings();
const i18n = new I18n(params.get('lang') ?? saved.lang ?? 'en');

const S = {
  model: null,
  sample: null,
  pendingId: null,
  pendingPart: null,
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
  autoRotate: saved.autoRotate ?? true,
  selected: -1,
  hover: -1,
  listHover: -1,
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
  ai: false,
  cb: Boolean(saved.cb),
  motion: Boolean(saved.motion ?? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  scan: { on: Boolean(saved.scan), ms: saved.scanMs ?? 2500, idx: -1, t: 0 },
};

// Colour-blind friendly categorical palette (validated for CVD separation on the
// dark stage). Parts past the eighth fold into one neutral; labels carry identity.
const CB_PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const CB_OTHER = '#aeaeb2';

// ------------------------------------------------------------------ systems
let particles;
try {
  particles = new ParticleSystem(ui.gl, COUNT);
} catch (err) {
  ui.stage.innerHTML = `<div class="welcome"><div class="welcome-card"><h1>Body Explorer</h1><p class="welcome-sub">${err.message}<br/>Please open this page in Safari, Chrome or Edge.</p></div></div>`;
  throw err;
}
const narrator = new Narrator();
narrator.rate = saved.rate ?? 0.95;
narrator.setLang(i18n.info.speech);
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
  measureInspector();
}
// Labels must stay left of the Parts panel (its width changes with large text).
let rightInset = 0;
function measureInspector() {
  const el = $('#inspector');
  const st = ui.stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  rightInset = r.width ? st.right - r.left + 12 : 0;
}
new ResizeObserver(resize).observe(ui.stage);
resize();

// Inspector and detail card cover the stage edges: nudge the model into the clear area.
const stageShift = () => (W > 1100 && S.mode !== 'quiz' ? -120 : 0);
const portraitFit = () => (W / H < 0.8 ? 1.35 : 1);
const camera = () =>
  orbitCamera({ yaw: S.yaw, pitch: S.pitch, dist: S.dist * explodeFit(S.sample, S.explode) * portraitFit(), W, H, shiftPx: stageShift() });
let cam = camera();

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

// ------------------------------------------------------------------ text helpers
const ITEMS = SECTIONS.flatMap((s) => s.items.map((it) => ({ ...it, section: s.title })));
const itemOf = (id) => ITEMS.find((i) => i.id === id);
const englishLabel = (id) => itemOf(id)?.label ?? findModel(id)?.name ?? id;
const modelText = (id) => i18n.model(id, { title: englishLabel(id), subtitle: findModel(id)?.subtitle ?? '' });
const partName = (i) => S.sample.parts[i].name; // English (stable id)
const displayColor = (i) => (S.cb ? CB_PALETTE[i] ?? CB_OTHER : S.sample.parts[i].color);

function partText(i) {
  const t = i18n.part(S.model.id, partName(i));
  return { ...t, summary: t.summary || S.sample.parts[i].desc, color: displayColor(i) };
}
const spokenText = (t, note = '') => `${t.name}. ${t.summary}${t.fact ? ` ${i18n.say('didYouKnow')} ${t.fact}` : ''}${note ? ` ${note}` : ''}`;
// English sentences read better with the part name in lower case mid-sentence.
const inSentence = (name) => (i18n.lang === 'en' && !/^[A-Z]{2}/.test(name) ? name[0].toLowerCase() + name.slice(1) : name);

let toastTimer;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2200);
}

// ------------------------------------------------------------------ sidebar
function renderSidebar() {
  const lessons = getLessons();
  const sections = [...SECTIONS];
  if (lessons.length) {
    sections.push({ title: 'My Lessons', items: lessons.map((l) => ({ lesson: l, id: l.model, icon: '▶︎', tint: '#5e5ce6' })) });
  }
  ui.systems.replaceChildren(
    ...sections.flatMap((sec) => {
      const h = document.createElement('h3');
      h.className = 'section-header';
      h.textContent = i18n.t(`section.${sec.title}`);
      const ul = document.createElement('ul');
      ul.className = 'inset-group';
      for (const it of sec.items) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.className = 'row';
        b.dataset.id = it.id;
        if (it.lesson) b.dataset.lesson = it.lesson.id;
        b.innerHTML = `<span class="icon" style="--tint:${it.tint}">${it.icon}</span><span class="row-text"><b></b><small></small></span><svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>`;
        b.querySelector('b').textContent = it.lesson ? it.lesson.title : modelText(it.id).title;
        b.querySelector('small').textContent = it.lesson
          ? `${modelText(it.lesson.model).title} · ${i18n.t('nParts', { n: it.lesson.steps.length })}`
          : i18n.t('nParts', { n: Object.keys(LESSONS[it.id].parts).length });
        b.onclick = () => {
          ui.body.classList.remove('sidebar-open');
          if (it.lesson) runLesson(it.lesson.id);
          else openModel(it.id, b.dataset.jump || null);
        };
        li.append(b);
        ul.append(li);
      }
      return [h, ul];
    }),
  );
  markSelectedRow();
  if (ui.search.value) filterSidebar();
}

function markSelectedRow() {
  for (const b of ui.systems.querySelectorAll('.row')) b.classList.toggle('selected', !b.dataset.lesson && b.dataset.id === S.model?.id);
}

function filterSidebar() {
  const q = ui.search.value.trim().toLowerCase();
  for (const b of ui.systems.querySelectorAll('.row')) {
    if (b.dataset.lesson) {
      b.parentElement.hidden = Boolean(q) && !b.textContent.toLowerCase().includes(q);
      continue;
    }
    const id = b.dataset.id;
    const parts = Object.keys(LESSONS[id].parts);
    const partHit = q ? parts.find((p) => p.toLowerCase().includes(q) || i18n.part(id, p).name.toLowerCase().includes(q)) : null;
    const hit = !q || modelText(id).title.toLowerCase().includes(q) || englishLabel(id).toLowerCase().includes(q) || Boolean(partHit);
    b.parentElement.hidden = !hit;
    b.dataset.jump = partHit ?? '';
    b.querySelector('small').textContent = partHit ? i18n.t('includes', { part: i18n.part(id, partHit).name }) : i18n.t('nParts', { n: parts.length });
  }
  for (const ul of ui.systems.querySelectorAll('.inset-group')) {
    const any = [...ul.children].some((li) => !li.hidden);
    ul.hidden = !any;
    ul.previousElementSibling.hidden = !any;
  }
}
ui.search.addEventListener('input', filterSidebar);

// ------------------------------------------------------------------ models
const cache = new Map();
const seedOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
let modelWaiters = [];

worker.onmessage = ({ data }) => {
  cache.set(data.id, data);
  while (cache.size > 4) cache.delete(cache.keys().next().value);
  if (data.id === S.pendingId) applyModel(data);
};

/** Opens a model; resolves once it is on screen. */
function openModel(id, jumpToPart = null, { keepMode = false } = {}) {
  if (S.mode !== 'explore' && !keepMode) stopMode();
  const model = findModel(id) ?? findModel('human-body');
  S.pendingId = model.id;
  S.pendingPart = jumpToPart;
  const ready = new Promise((resolve) => modelWaiters.push({ id: model.id, resolve }));
  if (S.model?.id === model.id && S.sample) applyModel(S.sample, { quiet: true });
  else if (cache.has(model.id)) applyModel(cache.get(model.id));
  else worker.postMessage({ id: model.id, count: COUNT, seed: seedOf(model.id) });
  return ready;
}

function applyModel(sample, { quiet = false } = {}) {
  const model = findModel(sample.id);
  if (S.sample !== sample) particles.setModel(sample);
  S.sample = sample;
  S.model = model;
  S.selected = -1;
  S.hover = -1;
  S.focusPart = -1;
  S.scan.idx = -1;
  S.grab = { part: -1, active: false, byHand: false, offset: [0, 0, 0], base: [0, 0, 0], start: null };
  applyColors();
  refreshModelText();
  ui.detail.hidden = true;
  const url = new URL(location.href);
  url.searchParams.set('model', model.id);
  history.replaceState(null, '', url);

  const jump = S.pendingPart ? sample.parts.findIndex((p) => p.name === S.pendingPart) : -1;
  S.pendingPart = null;
  if (jump >= 0) {
    setExplode(0.5);
    selectPart(jump);
  } else if (S.started && !quiet && S.mode === 'explore') {
    say(modelText(model.id).intro);
  }
  if (i18n.needsTranslation(model.id)) translateCurrent();
  const waiters = modelWaiters.filter((w) => w.id === model.id);
  modelWaiters = modelWaiters.filter((w) => w.id !== model.id);
  waiters.forEach((w) => w.resolve());
}

// Title, part list, 3D labels and the open card, in the current language.
function refreshModelText() {
  if (!S.model) return;
  const t = modelText(S.model.id);
  const item = itemOf(S.model.id);
  ui.eyebrow.textContent = i18n.t(`section.${item?.section ?? 'Organs'}`);
  ui.title.textContent = t.title;
  ui.subtitle.textContent = t.subtitle;
  document.title = `${t.title} · Body Explorer`;
  labels.setParts(S.sample.parts.map((p, i) => ({ ...p, name: partText(i).name })));
  markSelectedRow();
  renderParts();
  if (S.selected >= 0) showCard(S.selected, S.cardNote);
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
      b.firstChild.style.color = displayColor(i);
      b.lastChild.textContent = partText(i).name;
      b.classList.toggle('selected', i === S.selected);
      b.onclick = () => onPartChosen(i);
      b.onmouseenter = () => (S.listHover = i);
      b.onmouseleave = () => (S.listHover = -1);
      li.append(b);
      return li;
    }),
  );
}

function applyColors() {
  if (!S.sample) return;
  if (!S.cb) {
    particles.setColors(S.sample.colors);
    return;
  }
  const { partIds, count } = S.sample;
  const rgb = S.sample.parts.map((_, i) => hex(displayColor(i)));
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const c = rgb[partIds[k]];
    const shade = 0.8 + ((Math.imul(k, 2654435761) >>> 0) / 4294967296) * 0.4;
    out[k * 3] = Math.min(1, c[0] * shade);
    out[k * 3 + 1] = Math.min(1, c[1] * shade);
    out[k * 3 + 2] = Math.min(1, c[2] * shade);
  }
  particles.setColors(out);
}

// ------------------------------------------------------------------ languages
function fillLangSelects() {
  for (const sel of ui.langSelects) {
    if (!sel) continue;
    sel.replaceChildren(
      ...Object.entries(LANGS).map(([code, l]) => {
        const o = document.createElement('option');
        o.value = code;
        o.textContent = sel.id === 'lang' ? l.native : `${l.native} · ${l.name}${l.offline ? '' : ' (AI)'}`;
        o.selected = code === i18n.lang;
        return o;
      }),
    );
  }
}

async function translateCurrent() {
  if (!S.model || !S.ai) return;
  const id = S.model.id;
  toast(i18n.t('translating', { lang: i18n.info.native }));
  try {
    await i18n.translateModel(id, englishLabel(id), findModel(id).subtitle);
    if (S.model?.id === id) refreshModelText();
    renderSidebar();
  } catch (err) {
    console.warn('[translate]', err.message);
    toast(err.message);
  }
}

function setLang(code, { announce = true } = {}) {
  if (!LANGS[code] || code === i18n.lang) return fillLangSelects();
  if (!LANGS[code].offline && !S.ai) {
    toast(i18n.t('needsAi', { lang: LANGS[code].native }));
    return fillLangSelects();
  }
  i18n.lang = code;
  saveSettings({ lang: code });
  const hasVoice = narrator.setLang(LANGS[code].speech);
  fillLangSelects();
  fillVoices();
  applyStatic(i18n);
  renderSidebar();
  refreshModelText();
  ask.refresh();
  if (!hasVoice && narrator.allVoices.length) toast(i18n.t('noVoice', { lang: LANGS[code].native }));
  if (S.model && i18n.needsTranslation(S.model.id)) translateCurrent();
  else if (announce && S.started && S.model) say(modelText(S.model.id).intro);
}
ui.langSelects.forEach((sel) => sel?.addEventListener('change', () => setLang(sel.value)));

fetch('/api/status')
  .then((r) => (r.ok ? r.json() : {}))
  .then((d) => {
    S.ai = Boolean(d.ai);
    if (S.model && i18n.needsTranslation(S.model.id)) translateCurrent();
  })
  .catch(() => {});

// ------------------------------------------------------------------ selection + narration
function say(text) {
  return narrator.say(text);
}

function showCard(i, note = '') {
  const t = partText(i);
  S.cardNote = note;
  ui.detail.hidden = false;
  ui.detailDot.style.color = t.color;
  ui.detailEyebrow.textContent = `${ui.title.textContent} · ${i18n.t('ofN', { i: i + 1, n: S.sample.parts.length })}`;
  ui.detailName.textContent = t.name;
  ui.detailSummary.textContent = t.summary;
  ui.detailFact.textContent = t.fact;
  ui.detailFact.parentElement.hidden = !t.fact;
  ui.detailNote.hidden = !note;
  ui.detailNoteText.textContent = note;
  ui.partList.querySelectorAll('.part-row').forEach((b, k) => b.classList.toggle('selected', k === i));
}

function selectPart(i, { speak = true, note = '' } = {}) {
  if (!S.sample || i < 0 || i >= S.sample.parts.length) return null;
  const changed = S.selected !== i;
  S.selected = i;
  showCard(i, note);
  if (changed && !S.motion) {
    ui.detail.style.animation = 'none';
    void ui.detail.offsetWidth;
    ui.detail.style.animation = '';
  }
  ui.partList.children[i]?.scrollIntoView({ block: 'nearest', behavior: S.motion ? 'auto' : 'smooth' });
  if (speak) return say(spokenText(partText(i), note));
  return null;
}

function clearSelection() {
  S.selected = -1;
  S.cardNote = '';
  ui.detail.hidden = true;
  ui.partList.querySelectorAll('.part-row').forEach((b) => b.classList.remove('selected'));
}

// A part was tapped / pointed at / pinched / chosen from the list or by switch.
function onPartChosen(i) {
  if (S.mode === 'quiz') return quizAnswer(i);
  if (S.mode === 'lesson') stopMode();
  selectPart(i);
}

narrator.onstart = () => (ui.speaking.hidden = false);
narrator.onend = () => (ui.speaking.hidden = true);

$('#listen-btn').onclick = () => S.selected >= 0 && say(spokenText(partText(S.selected), S.cardNote));
$('#prev-part').onclick = () => S.sample && onPartChosen((S.selected - 1 + S.sample.parts.length) % S.sample.parts.length);
$('#next-part').onclick = () => S.sample && onPartChosen((S.selected + 1) % S.sample.parts.length);

// ------------------------------------------------------------------ view controls
const segIndex = (seg, i) => {
  const btns = [...seg.querySelectorAll('button')];
  const thumb = seg.querySelector('.seg-thumb');
  const b = btns[i];
  if (!b) return;
  if (thumb) {
    thumb.style.width = `${b.offsetWidth}px`;
    thumb.style.transform = `translateX(${b.offsetLeft - 2}px)`;
  }
  btns.forEach((x, k) => {
    x.setAttribute('aria-checked', String(k === i));
    x.classList.toggle('on', k === i);
  });
};

const EXPLODE_STOPS = [0, 0.5, 1];
function setExplode(v, { fromHand = false } = {}) {
  S.explodeTarget = v;
  const nearest = EXPLODE_STOPS.reduce((best, s, k) => (Math.abs(s - v) < Math.abs(EXPLODE_STOPS[best] - v) ? k : best), 0);
  if (!fromHand || S.lastSeg !== nearest) segIndex(ui.viewSeg, nearest);
  S.lastSeg = nearest;
}
ui.viewSeg.querySelectorAll('button').forEach((b) => (b.onclick = () => setExplode(Number(b.dataset.explode))));

function setNarration(on) {
  narrator.enabled = on;
  if (!on) narrator.stop();
  ui.soundBtn.classList.toggle('muted', !on);
  ui.soundBtn.setAttribute('aria-label', i18n.t(on ? 'narrationOn' : 'narrationOff'));
  $('#auto-read').checked = on;
  saveSettings({ narration: on });
}
ui.soundBtn.onclick = () => {
  setNarration(!narrator.enabled);
  toast(i18n.t(narrator.enabled ? 'narrationOn' : 'narrationOff'));
};

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
  requestAnimationFrame(() => {
    segIndex($('#quality-seg'), q < 0 ? 1 : q);
    segIndex($('#scan-seg'), [1500, 2500, 4000].indexOf(S.scan.ms));
  });
};
$('#settings-done').onclick = () => (ui.settings.hidden = true);
ui.settings.addEventListener('click', (e) => e.target === ui.settings && (ui.settings.hidden = true));
$('#voice').onchange = (e) => narrator.setVoice(e.target.value);
$('#rate').value = narrator.rate;
$('#rate').oninput = (e) => {
  narrator.rate = Number(e.target.value);
  saveSettings({ rate: narrator.rate });
};
$('#test-voice').onclick = () => say(i18n.say('hello'));
$('#auto-read').onchange = (e) => setNarration(e.target.checked);
$('#show-labels').onchange = (e) => ui.body.classList.toggle('no-labels', !e.target.checked);
$('#auto-rotate').checked = S.autoRotate;
$('#auto-rotate').onchange = (e) => {
  S.autoRotate = e.target.checked;
  saveSettings({ autoRotate: S.autoRotate });
};
$('#quality-seg').querySelectorAll('button').forEach((b, i) => {
  b.onclick = () => {
    segIndex($('#quality-seg'), i);
    const url = new URL(location.href);
    url.searchParams.set('particles', b.dataset.particles);
    url.searchParams.set('autostart', '1');
    setTimeout(() => location.assign(url), 300);
  };
});

// Accessibility
function setLarge(on) {
  ui.body.classList.toggle('large-text', on);
  $('#a11y-large').checked = on;
  measureInspector();
  saveSettings({ large: on });
}
function setColourBlind(on) {
  S.cb = on;
  $('#a11y-cb').checked = on;
  saveSettings({ cb: on });
  applyColors();
  if (S.sample) refreshModelText();
}
function setMotion(on) {
  S.motion = on;
  ui.body.classList.toggle('reduce-motion', on);
  $('#a11y-motion').checked = on;
  saveSettings({ motion: on });
}
function setScan(on) {
  S.scan.on = on;
  S.scan.t = 0;
  ui.body.classList.toggle('scanning', on);
  ui.scanHint.hidden = !on;
  $('#a11y-scan').checked = on;
  saveSettings({ scan: on });
}
$('#a11y-large').onchange = (e) => setLarge(e.target.checked);
$('#a11y-cb').onchange = (e) => setColourBlind(e.target.checked);
$('#a11y-motion').onchange = (e) => setMotion(e.target.checked);
$('#a11y-scan').onchange = (e) => setScan(e.target.checked);
$('#scan-seg').querySelectorAll('button').forEach((b, i) => {
  b.onclick = () => {
    S.scan.ms = Number(b.dataset.ms);
    segIndex($('#scan-seg'), i);
    saveSettings({ scanMs: S.scan.ms });
  };
});

// ------------------------------------------------------------------ modes
let modeToken = 0;
let paused = false;
let resumeLesson = null;
let teacherAudio = null;

function setMode(mode) {
  S.mode = mode;
  ui.body.classList.toggle('quiz', mode === 'quiz');
  measureInspector();
  ui.tbIdle.hidden = mode !== 'explore';
  ui.tbLesson.hidden = mode !== 'lesson';
  ui.tbQuiz.hidden = mode !== 'quiz';
  ui.quizBanner.hidden = mode !== 'quiz';
}

function stopMode() {
  modeToken++;
  paused = false;
  resumeLesson?.();
  resumeLesson = null;
  teacherAudio?.pause();
  narrator.stop();
  setMode('explore');
}

// Speak and also hold the part on screen long enough to read when muted.
async function present(text) {
  const words = text.split(/\s+/).length;
  const t0 = performance.now();
  const spoke = await say(text);
  const readMs = Math.max(2500, words * 280);
  if (!spoke) await wait(Math.max(0, readMs - (performance.now() - t0)));
}

// Plays a teacher's recorded voice note; resolves when it ends.
async function playVoiceNote(audioId) {
  const blob = await getAudio(audioId).catch(() => null);
  if (!blob || !narrator.enabled) return false;
  narrator.stop();
  teacherAudio = new Audio(URL.createObjectURL(blob));
  ui.speaking.hidden = false;
  await new Promise((resolve) => {
    teacherAudio.onended = teacherAudio.onerror = teacherAudio.onpause = resolve;
    teacherAudio.play().catch(resolve);
  });
  ui.speaking.hidden = true;
  return true;
}

// ------------------------------------------------------------------ lessons
async function runLesson(customId = null) {
  const custom = customId ? getLessons().find((l) => l.id === customId) : null;
  const token = ++modeToken;
  if (custom) {
    await openModel(custom.model, null, { keepMode: true });
    if (token !== modeToken) return;
  }
  if (!S.sample) return;
  setMode('lesson');
  paused = false;
  ui.lessonPause.textContent = i18n.t('pause');
  const steps = custom
    ? custom.steps.map((s) => ({ ...s, index: S.sample.parts.findIndex((p) => p.name === s.part) })).filter((s) => s.index >= 0)
    : S.sample.parts.map((_, index) => ({ index, note: '', audioId: null }));
  ui.lessonTotal.textContent = steps.length;
  setExplode(['human-body', 'digestive', 'nervous'].includes(S.model.id) ? 1 : 0.5);
  clearSelection();
  ui.lessonStep.textContent = 0;
  ui.lessonBar.style.width = '0%';
  await present(custom ? custom.title : modelText(S.model.id).intro);
  for (let k = 0; k < steps.length; k++) {
    if (token !== modeToken) return;
    if (paused) await new Promise((r) => (resumeLesson = r));
    if (token !== modeToken) return;
    const step = steps[k];
    ui.lessonStep.textContent = k + 1;
    ui.lessonBar.style.width = `${((k + 1) / steps.length) * 100}%`;
    selectPart(step.index, { speak: false, note: step.note });
    const usedVoice = step.audioId ? await playVoiceNote(step.audioId) : false;
    if (!usedVoice) await present(spokenText(partText(step.index), step.note));
    await wait(600);
    if (paused) k--; // repeat the interrupted step after resuming
  }
  if (token !== modeToken) return;
  await present(i18n.say('lessonDone', { title: ui.title.textContent }));
  if (token === modeToken) stopMode();
}

$('#lesson-btn').onclick = () => runLesson();
$('#lesson-stop').onclick = stopMode;
ui.lessonPause.onclick = () => {
  paused = !paused;
  ui.lessonPause.textContent = i18n.t(paused ? 'resume' : 'pause');
  if (paused) {
    narrator.stop();
    teacherAudio?.pause();
  } else {
    resumeLesson?.();
    resumeLesson = null;
  }
};

// ------------------------------------------------------------------ quiz (solo or two teams)
const Q = { list: [], i: 0, score: 0, tries: 0, locked: false, mode: 'solo', player: null, teams: [], answers: [] };
const setup = { mode: 'solo', player: null, count: 5 };

function openQuizSetup() {
  const sheet = $('#quiz-setup');
  sheet.hidden = false;
  renderSetup();
  requestAnimationFrame(() => {
    segIndex($('#qs-mode'), setup.mode === 'solo' ? 0 : 1);
    segIndex($('#qs-count'), [5, 10, 0].indexOf(setup.count));
  });
}
function renderSetup() {
  $('#qs-solo').hidden = setup.mode !== 'solo';
  $('#qs-teams').hidden = setup.mode !== 'teams';
  const roster = getRoster();
  const list = $('#qs-players');
  const people = [{ id: 'guest', name: 'Guest (not saved by name)' }, ...roster.students];
  if (!people.some((p) => p.id === setup.player?.id)) setup.player = people[0];
  list.replaceChildren(
    ...people.map((p) => {
      const li = document.createElement('li');
      li.className = `pick${p.id === setup.player.id ? ' on' : ''}`;
      li.tabIndex = 0;
      li.textContent = p.name;
      li.onclick = li.onkeydown = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        setup.player = p;
        renderSetup();
      };
      return li;
    }),
  );
  $('#qs-team-names').replaceChildren(
    ...roster.teams.slice(0, 2).map((t, k) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="team-dot" style="background:${t.color}"></span><input class="team-name" maxlength="30" aria-label="Team ${k + 1} name" />`;
      const input = li.querySelector('input');
      input.value = t.name;
      input.onchange = () => {
        const r = getRoster();
        if (input.value.trim()) r.teams[k].name = input.value.trim().slice(0, 30);
        saveRoster(r);
      };
      return li;
    }),
  );
}
$('#qs-mode').querySelectorAll('button').forEach((b, i) => {
  b.onclick = () => {
    setup.mode = b.dataset.mode;
    segIndex($('#qs-mode'), i);
    renderSetup();
  };
});
$('#qs-count').querySelectorAll('button').forEach((b, i) => {
  b.onclick = () => {
    setup.count = Number(b.dataset.n);
    segIndex($('#qs-count'), i);
  };
});
$('#qs-add').addEventListener('submit', (e) => {
  e.preventDefault();
  const s = addStudent($('#qs-new').value);
  if (s) {
    setup.player = s;
    $('#qs-new').value = '';
    renderSetup();
  }
});
$('#qs-cancel').onclick = () => ($('#quiz-setup').hidden = true);
$('#qs-start').onclick = () => {
  $('#quiz-setup').hidden = true;
  const roster = getRoster();
  runQuiz({
    mode: setup.mode,
    count: setup.count,
    player: setup.player?.id === 'guest' ? { id: 'guest', name: 'Guest', type: 'guest' } : { ...setup.player, type: 'student' },
    teams: roster.teams.slice(0, 2).map((t, k) => ({ id: t.id, name: t.name, color: t.color ?? TEAM_COLORS[k], score: 0, asked: 0, answers: [] })),
  });
};

function runQuiz({ mode = 'solo', count = 5, player = { id: 'guest', name: 'Guest', type: 'guest' }, teams = [] } = {}) {
  if (!S.sample) return;
  const token = ++modeToken;
  setMode('quiz');
  clearSelection();
  setExplode(1);
  const pool = S.sample.parts.map((_, i) => i).filter((i) => S.sample.parts[i].name !== 'Body');
  for (let k = pool.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [pool[k], pool[j]] = [pool[j], pool[k]];
  }
  let n = count > 0 ? Math.min(count, pool.length) : pool.length;
  // Teams alternate, so give both the same number of questions.
  if (mode === 'teams' && n % 2) n = n + 1 <= pool.length ? n + 1 : n - 1;
  Object.assign(Q, { list: pool.slice(0, n), i: 0, score: 0, tries: 0, locked: false, mode, player, teams, answers: [], token });
  renderScore();
  askQuestion();
}

const currentTeam = () => (Q.mode === 'teams' ? Q.teams[Q.i % Q.teams.length] : null);

function renderScore() {
  if (Q.mode === 'teams') {
    ui.quizScore.innerHTML = Q.teams.map((t) => `<span style="color:${t.color}">●</span> ${t.score}`).join('&nbsp;&nbsp;');
    ui.teamBoard.hidden = false;
    const active = currentTeam();
    ui.teamBoard.innerHTML = Q.teams
      .map((t) => `<span class="team${t === active && !Q.done ? ' active' : ''}" style="--tc:${t.color}"><i></i>${t.name.replace(/[<>&]/g, '')} <b>${t.score}</b></span>`)
      .join('');
  } else {
    ui.quizScore.textContent = `⭐️ ${Q.score}`;
    ui.teamBoard.hidden = true;
  }
}

function askQuestion() {
  Q.locked = false;
  Q.tries = 0;
  Q.done = false;
  const t = partText(Q.list[Q.i]);
  const team = currentTeam();
  ui.quizProgress.textContent = team ? `${i18n.t('teamTurn', { team: team.name })} · ${i18n.t('questionOf', { i: Q.i + 1, n: Q.list.length })}` : i18n.t('questionOf', { i: Q.i + 1, n: Q.list.length });
  ui.quizQuestion.textContent = i18n.t('findThe', { name: inSentence(t.name) });
  ui.quizFeedback.textContent = i18n.t('tapIt');
  ui.quizFeedback.className = 'quiz-feedback';
  renderScore();
  say(`${team ? `${i18n.say('teamTurn', { team: team.name })} ` : ''}${i18n.say('canYouFind', { name: inSentence(t.name) })}`);
}

function recordAnswer(correct) {
  const entry = { part: partName(Q.list[Q.i]), correct, tries: Q.tries };
  Q.answers.push(entry);
  const team = currentTeam();
  if (team) {
    team.asked++;
    team.answers.push(entry);
  }
}

async function quizAnswer(i) {
  if (Q.locked) return;
  const target = Q.list[Q.i];
  const token = Q.token;
  const t = partText(i);
  Q.tries++;
  if (i === target) {
    Q.locked = true;
    const firstTry = Q.tries === 1;
    if (firstTry) {
      if (Q.mode === 'teams') currentTeam().score++;
      else Q.score++;
    }
    recordAnswer(true);
    renderScore();
    ui.quizFeedback.textContent = i18n.t('yesThats', { name: inSentence(t.name) });
    ui.quizFeedback.className = 'quiz-feedback good';
    selectPart(i, { speak: false });
    await present(`${i18n.say('wellDone', { name: inSentence(t.name) })} ${t.fact}`);
    if (token === modeToken) nextQuestion();
  } else {
    ui.quizFeedback.textContent = i18n.t('thatsThe', { name: inSentence(t.name) });
    ui.quizFeedback.className = 'quiz-feedback bad';
    S.flash = { part: i, until: performance.now() + 1200 };
    say(i18n.say('tryAgain', { name: inSentence(t.name) }));
  }
}

async function skipQuestion() {
  if (Q.locked) return;
  Q.locked = true;
  const token = Q.token;
  const i = Q.list[Q.i];
  const t = partText(i);
  recordAnswer(false);
  ui.quizFeedback.textContent = i18n.t('hereItIs', { name: inSentence(t.name) });
  ui.quizFeedback.className = 'quiz-feedback';
  selectPart(i, { speak: false });
  await present(i18n.say('hereIs', { name: inSentence(t.name) }));
  if (token === modeToken) nextQuestion();
}

async function nextQuestion() {
  clearSelection();
  Q.i++;
  if (Q.i < Q.list.length) return askQuestion();
  const token = Q.token;
  Q.done = true;
  Q.locked = true;
  const modelTitle = englishLabel(S.model.id);
  let speech;
  if (Q.mode === 'teams') {
    for (const t of Q.teams) addResult({ player: { id: t.id, name: t.name, type: 'team' }, model: S.model.id, modelTitle, score: t.score, total: t.asked, answers: t.answers, mode: 'teams' });
    const [a, b] = Q.teams;
    const winner = a.score === b.score ? null : a.score > b.score ? a : b;
    ui.quizProgress.textContent = i18n.t('quizComplete');
    ui.quizQuestion.textContent = winner ? i18n.t('teamWins', { team: winner.name }) : i18n.t('tie');
    ui.quizFeedback.textContent = Q.teams.map((t) => `${t.name}: ${t.score}`).join(' · ');
    speech = winner ? i18n.say('teamWins', { team: winner.name }) : i18n.say('tie');
    confetti(winner?.color);
  } else {
    addResult({ player: Q.player, model: S.model.id, modelTitle, score: Q.score, total: Q.list.length, answers: Q.answers, mode: 'solo' });
    ui.quizProgress.textContent = i18n.t('quizComplete');
    ui.quizQuestion.textContent = i18n.t('youFound', { s: Q.score, n: Q.list.length });
    ui.quizFeedback.textContent = Q.score === Q.list.length ? i18n.t('perfect') : Q.score >= Q.list.length / 2 ? i18n.t('great') : i18n.t('goodTry');
    speech = `${i18n.say('quizDone', { s: Q.score, n: Q.list.length })} ${i18n.say(Q.score === Q.list.length ? 'perfect' : 'great')}`;
    if (Q.score >= Math.ceil(Q.list.length / 2)) confetti();
  }
  ui.quizFeedback.className = 'quiz-feedback good';
  renderScore();
  await present(speech);
  await wait(1500);
  if (token === modeToken) stopMode();
}

$('#quiz-btn').onclick = openQuizSetup;
$('#quiz-skip').onclick = skipQuestion;
$('#quiz-stop').onclick = stopMode;

function confetti(tint) {
  if (S.motion) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = tint ? [tint, '#ffffff', '#ffd60a'] : ['#ff375f', '#ff9f0a', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2'];
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

// ------------------------------------------------------------------ teacher tools & assistant
const dashboard = initDashboard({ toast });
const builder = initBuilder({
  items: ITEMS,
  labelOf: (id) => modelText(id).title,
  partName: (model, part) => i18n.part(model, part).name,
  onChange: renderSidebar,
  onPlay: (id) => runLesson(id),
  toast,
});
const ask = initAsk({
  i18n,
  narrator,
  toast,
  context: () => ({
    modelId: S.model?.id ?? 'human-body',
    modelTitle: S.model ? englishLabel(S.model.id) : 'Human Body',
    partName: S.selected >= 0 ? partName(S.selected) : '',
    partLabel: S.selected >= 0 ? partText(S.selected).name : '',
    partSummary: S.selected >= 0 ? partText(S.selected).summary : '',
  }),
});
$('#open-dashboard').onclick = () => {
  ui.body.classList.remove('sidebar-open');
  dashboard.open();
};
$('#open-builder').onclick = () => {
  ui.body.classList.remove('sidebar-open');
  builder.open();
};
$('#ask-btn').onclick = () => ask.open();

const anyModalOpen = () => [...document.querySelectorAll('.modal')].some((m) => !m.hidden) || !ui.welcome.hidden;

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
    if (S.scan.on && S.scan.idx >= 0) onPartChosen(S.scan.idx); // a click acts as the switch
    else {
      const part = pick(p[0], p[1]);
      if (part >= 0) onPartChosen(part);
      else if (S.mode === 'explore') clearSelection();
    }
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
  if (e.key === 'Escape') {
    const open = [...document.querySelectorAll('.modal')].find((m) => !m.hidden);
    if (open) open.hidden = true;
    else if (S.mode !== 'explore') stopMode();
    else clearSelection();
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName) || !S.sample || anyModalOpen()) return;
  const n = S.sample.parts.length;
  if (S.scan.on && (e.key === ' ' || e.key === 'Enter') && S.scan.idx >= 0) {
    e.preventDefault();
    onPartChosen(S.scan.idx);
    S.scan.t = 0;
    return;
  }
  if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') onPartChosen((S.selected + 1) % n);
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') onPartChosen((S.selected - 1 + n) % n);
  else if (e.key === '1' || e.key === '2' || e.key === '3') setExplode(EXPLODE_STOPS[Number(e.key) - 1]);
  else if (e.key === ' ') {
    e.preventDefault();
    if (S.selected >= 0) say(spokenText(partText(S.selected), S.cardNote));
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
    toast(i18n.t('handsOff'));
    return;
  }
  try {
    toast(i18n.t('startingCamera'));
    ui.video.hidden = false;
    await tracker.start();
    ui.body.classList.add('camera-on');
    ui.handsBtn.classList.add('active');
    toast(i18n.t('showHand'));
  } catch (err) {
    console.warn(err);
    const cameraWorked = tracker.running;
    tracker.stop();
    ui.video.hidden = true;
    ui.body.classList.remove('camera-on');
    if (err?.name === 'NotAllowedError') toast(i18n.t('cameraDenied'));
    else if (cameraWorked) toast(i18n.t('trackingFailed'));
    else toast(i18n.t('noCamera'));
  }
}
ui.handsBtn.onclick = toggleHands;

function handleHands(now) {
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
          if (S.mode === 'quiz') {
            if (S.prevPose !== 'pinch') onPartChosen(part);
          } else {
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
  const { g, targetYawVel, holdProgress = 0 } = handleHands(now);
  const handPresent = g.analyses.length > 0;

  if (!handPresent) {
    S.hover = -1;
    if (S.mouse && !S.dragging) S.hover = pick(S.mouse[0], S.mouse[1]);
    if (S.listHover >= 0) S.hover = S.listHover;
    if (S.grab.active) S.hover = S.grab.part;
  }

  // Switch scanning: parts light up in turn; one key/switch/click chooses.
  if (S.scan.on && S.sample && !anyModalOpen()) {
    S.scan.t -= dt * 1000;
    if (S.scan.t <= 0) {
      S.scan.idx = (S.scan.idx + 1) % S.sample.parts.length;
      S.scan.t = S.scan.ms;
      ui.partList.children[S.scan.idx]?.scrollIntoView({ block: 'nearest' });
    }
    if (!handPresent) S.hover = S.scan.idx;
  }

  ui.gl.classList.toggle('over-part', S.hover >= 0 && !S.dragging);
  ui.partList.querySelectorAll('.part-row').forEach((b, k) => b.classList.toggle('hover', k === S.hover));

  // Camera.
  const idle = !S.dragging && !handPresent && S.pointers.size === 0;
  const spin = S.autoRotate && !S.motion && idle ? (S.selected >= 0 ? -0.05 : -0.12) : 0;
  S.yawVel = smooth(S.yawVel, targetYawVel ?? spin, targetYawVel != null ? 5 : 2, dt);
  if (!S.dragging) S.yaw += S.yawVel * dt;
  S.pitch = smooth(S.pitch, S.pitchTarget, 4, dt);
  S.dist = smooth(S.dist, S.distTarget, 7, dt);

  S.form = smooth(S.form, S.formTarget, 2.2, dt);
  if (!S.grab.active && S.grab.part >= 0) {
    S.grab.offset = S.grab.offset.map((v) => v * Math.exp(-2.5 * dt));
    if (v3.len(S.grab.offset) < 0.003) S.grab.part = -1;
  }
  S.explode = smooth(S.explode, S.explodeTarget, S.motion ? 12 : 4, dt);

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
    // In a quiz, only the part being guessed may carry a label after it is found.
    const quiz = S.mode === 'quiz';
    labels.layout(anchors, [cx, xs.length ? Math.min(...xs) : cx, xs.length ? Math.max(...xs) : cx], {
      opacity: quiz ? 0 : remap(S.form, 0.8, 0.98) * remap(S.explode, 0.15, 0.7),
      hot: quiz ? (S.selected >= 0 ? S.selected : -2) : spot,
      width: W - (quiz ? 0 : rightInset),
      height: H,
      leftLimit: 8,
      leftBottom: ui.detail.hidden ? H - 120 : ui.detail.offsetTop - 20,
      top: W > 860 ? 128 : 210,
    });
  }

  overlay.draw(g.analyses, { pose: g.pose, holdProgress, time: now / 1000 });
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ boot
applyStatic(i18n);
fillLangSelects();
setLarge(Boolean(saved.large));
setMotion(S.motion);
setScan(S.scan.on);
$('#a11y-cb').checked = S.cb;
if (saved.narration === false) setNarration(false);
renderSidebar();
requestAnimationFrame(() => segIndex(ui.viewSeg, 0));
const initial = findModel(params.get('model') ?? '') && itemOf(params.get('model')) ? params.get('model') : 'human-body';
openModel(initial);

function start() {
  S.started = true;
  ui.welcome.hidden = true;
  if (S.model) say(modelText(S.model.id).intro);
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
      lang: i18n.lang,
      ai: S.ai,
      grabPart: S.grab.part,
      grabActive: S.grab.active,
      scanIndex: S.scan.on ? S.scan.idx : -1,
      quiz: {
        index: Q.i,
        score: Q.score,
        mode: Q.mode,
        target: S.mode === 'quiz' && !Q.done ? Q.list[Q.i] : -1,
        teams: Q.teams.map((t) => ({ name: t.name, score: t.score })),
        total: Q.list.length,
      },
      spoken: narrator.log.slice(),
      fps,
    };
  },
  openModel,
  setLang,
  runQuiz,
  runLesson,
  choosePart: (i) => onPartChosen(i),
  /** A screen point where tapping really picks part i (its anchor can be hidden behind another part). */
  partTapPoint(i) {
    const { positions: P, explode: X, partIds, count } = S.sample;
    const candidates = [project(cam, partAnchor(S.sample.parts[i], S.explode, S.grab))];
    for (let k = 0; k < count && candidates.length < 200; k += 7) {
      if (partIds[k] !== i) continue;
      candidates.push(project(cam, [0, 1, 2].map((a) => P[k * 3 + a] + X[k * 3 + a] * S.explode)));
    }
    return candidates.find((q) => q && q[0] > 0 && q[1] > 0 && q[0] < W && q[1] < H && pick(q[0], q[1]) === i) ?? candidates[0];
  },
  injectHands: (h) => (S.injected = h),
  partScreenPosition: (i) => (S.sample ? project(cam, partAnchor(S.sample.parts[i], S.explode, S.grab)) : null),
};
