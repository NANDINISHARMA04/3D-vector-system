import { ParticleSystem } from './particles.js';
import { HandTracker } from './hands.js';
import { GestureTracker } from './gestures.js';
import { Labels } from './labels.js';
import { Overlay } from './overlay.js';
import { MODELS, CATEGORIES, findModel } from './models/index.js';
import { mat4, v3, clamp, smooth, remap } from './math.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const COUNT = clamp(Math.round(Number(params.get('particles')) || 200000), 2000, 1000000);
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const ui = {
  body: document.body,
  gl: $('#gl'),
  video: $('#video'),
  category: $('#category'),
  name: $('#model-name'),
  sub: $('#model-sub'),
  scene: $('#scene-state'),
  hand: $('#hand-state'),
  sensitivity: $('#sensitivity'),
  opennessVal: $('#openness-val'),
  opennessBar: $('#openness-bar'),
  explode: $('#explode'),
  explodeVal: $('#explode-val'),
  gestures: [...document.querySelectorAll('#gestures li')],
  fps: $('#fps'),
  pcount: $('#pcount'),
  camstat: $('#camstat'),
  tabs: $('#tabs'),
  chips: $('#chips'),
  toast: $('#toast'),
  card: $('#partcard'),
  cardDot: $('#partcard-dot'),
  cardName: $('#partcard-name'),
  cardDesc: $('#partcard-desc'),
  cardHint: $('#partcard-hint'),
  start: $('#start'),
  help: $('#help'),
  panel: $('#panel'),
};

// ------------------------------------------------------------------ state
const S = {
  model: null,
  sample: null,
  pendingId: null,
  form: 0,
  formTarget: 0,
  explode: 0,
  explodeTarget: 0,
  yaw: 0.55,
  pitch: 0.12,
  pitchTarget: 0.12,
  dist: 4.4,
  distTarget: 4.4,
  yawVel: 0,
  autoRotate: true,
  clip: false,
  showVideo: true,
  hover: -1,
  hoverHeldUntil: 0,
  focus: 0,
  focusPart: -1,
  grab: { part: -1, active: false, byHand: false, offset: [0, 0, 0], base: [0, 0, 0], start: null },
  handWorld: [99, 99, 99],
  handForce: 0,
  pose: 'none',
  handCount: 0,
  openness: 0,
  sensitivity: 'standard',
  tour: { on: false, i: -1, t: 0 },
  injected: null,
  dragging: null,
  mouse: null,
  sliderActive: false,
  twoHandStartDist: null,
  snapFlashUntil: 0,
  shot: false,
  category: 'Anatomy',
};

// ------------------------------------------------------------------ systems
let particles;
try {
  particles = new ParticleSystem(ui.gl, COUNT);
} catch (err) {
  document.body.innerHTML = `<div class="overlay"><div class="card glass"><h2>Vector</h2><p>${err.message}</p><p class="muted">Vector needs a browser with WebGL2 (Chrome, Edge, Firefox or Safari 15+).</p></div></div>`;
  throw err;
}
const tracker = new HandTracker(ui.video);
const gestures = new GestureTracker();
const labels = new Labels($('#labels'), $('#leaders'));
const overlay = new Overlay($('#overlay'));
const worker = new Worker(new URL('./sampler.worker.js', import.meta.url), { type: 'module' });

let W = window.innerWidth;
let H = window.innerHeight;
let panelRight = 0;
function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  panelRight = ui.panel.getBoundingClientRect().right;
  particles.resize(W, H, DPR);
  overlay.resize(W, H, DPR);
}
window.addEventListener('resize', resize);
resize();

// ------------------------------------------------------------------ models
const cache = new Map();
const seedOf = (id) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

worker.onmessage = ({ data }) => {
  cache.set(data.id, data);
  while (cache.size > 4) cache.delete(cache.keys().next().value);
  if (data.id === S.pendingId) applyModel(data);
};

function loadModel(id) {
  const model = findModel(id) ?? MODELS[0];
  S.pendingId = model.id;
  if (cache.has(model.id)) applyModel(cache.get(model.id));
  else worker.postMessage({ id: model.id, count: COUNT, seed: seedOf(model.id) });
}

function applyModel(sample) {
  const model = findModel(sample.id);
  particles.setModel(sample);
  S.sample = sample;
  S.model = model;
  S.hover = -1;
  S.focusPart = -1;
  S.grab = { part: -1, active: false, byHand: false, offset: [0, 0, 0], base: [0, 0, 0], start: null };
  S.tour.i = -1;
  labels.setParts(sample.parts);
  ui.category.textContent = model.category;
  ui.name.textContent = model.name;
  ui.sub.textContent = model.subtitle;
  document.title = `${model.name} · Vector`;
  S.category = model.category;
  renderDock();
  const url = new URL(location.href);
  url.searchParams.set('model', model.id);
  history.replaceState(null, '', url);
  // Prefetch the next model so a peace sign switches instantly.
  const next = MODELS[(MODELS.indexOf(model) + 1) % MODELS.length];
  if (!cache.has(next.id)) worker.postMessage({ id: next.id, count: COUNT, seed: seedOf(next.id) });
}

function stepModel(dir) {
  const i = MODELS.indexOf(S.model ?? MODELS[0]);
  const next = MODELS[(i + dir + MODELS.length) % MODELS.length];
  loadModel(next.id);
  toast(`${next.name}`);
}

function renderDock() {
  ui.tabs.replaceChildren(
    ...CATEGORIES.map((c) => {
      const b = document.createElement('button');
      b.textContent = `${c} · ${MODELS.filter((m) => m.category === c).length}`;
      b.className = c === S.category ? 'on' : '';
      b.setAttribute('role', 'tab');
      b.onclick = () => {
        S.category = c;
        renderDock();
      };
      return b;
    }),
  );
  ui.chips.replaceChildren(
    ...MODELS.filter((m) => m.category === S.category).map((m) => {
      const b = document.createElement('button');
      b.innerHTML = '<i></i>';
      b.append(m.name);
      b.dataset.model = m.id;
      b.className = S.model?.id === m.id ? 'on' : '';
      b.onclick = () => {
        loadModel(m.id);
        if (S.formTarget === 0) S.formTarget = 1;
      };
      return b;
    }),
  );
  ui.chips.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ------------------------------------------------------------------ camera
// Exploded models grow; pull the camera back so they stay in frame.
function explodeFit() {
  if (!S.sample) return 1;
  const [b0, b1] = S.sample.bounds;
  const ext = (b) => Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], (b[1][2] - b[0][2]) * 0.8);
  return Math.pow(1 + (ext(b1) / ext(b0) - 1) * S.explode, 0.9);
}

function camera() {
  const cp = Math.cos(S.pitch);
  const d = S.dist * explodeFit();
  const eye = [d * cp * Math.sin(S.yaw), d * Math.sin(S.pitch), d * cp * Math.cos(S.yaw)];
  const view = mat4.lookAt(eye, [0, 0, 0], [0, 1, 0]);
  const proj = mat4.perspective(0.75, W / H, 0.05, 100);
  // Lens shift: centre the scene in the space right of the side panel.
  proj[8] = -Math.min(panelRight, W * 0.3) / W;
  const vp = mat4.multiply(proj, view);
  return { eye, view, proj, vp, inv: mat4.invert(vp) };
}

function project(vp, p) {
  const c = mat4.transform(vp, p);
  if (c[3] <= 0.01) return null;
  return [((c[0] / c[3]) * 0.5 + 0.5) * W, (1 - ((c[1] / c[3]) * 0.5 + 0.5)) * H, c[3]];
}

// Screen point -> world point on the plane through the origin facing the camera.
function unproject(cam, x, y) {
  const nx = (x / W) * 2 - 1;
  const ny = 1 - (y / H) * 2;
  const a = mat4.transform(cam.inv, [nx, ny, -1]);
  const b = mat4.transform(cam.inv, [nx, ny, 1]);
  const near = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
  const far = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
  const dir = v3.sub(far, near);
  const n = v3.norm(cam.eye);
  const t = -v3.dot(near, n) / (v3.dot(dir, n) || 1e-6);
  return v3.add(near, v3.scale(dir, t));
}

// Finds the part under a screen point by projecting a subsample of particle targets.
function pickPart(cam, x, y) {
  const s = S.sample;
  if (!s || S.form < 0.6) return -1;
  const m = cam.vp;
  const { positions: P, explode: X, partIds } = s;
  const stride = Math.max(1, Math.floor(s.count / 14000));
  const E = S.explode;
  const g = S.grab;
  let front = -1;
  let frontW = Infinity;
  let near = -1;
  let nearD = 40 * 40;
  for (let i = 0; i < s.count; i += stride) {
    const part = partIds[i];
    let px = P[i * 3] + X[i * 3] * E;
    let py = P[i * 3 + 1] + X[i * 3 + 1] * E;
    let pz = P[i * 3 + 2] + X[i * 3 + 2] * E;
    if (part === g.part) {
      px += g.offset[0];
      py += g.offset[1];
      pz += g.offset[2];
    }
    if (S.clip && P[i * 3 + 2] > 0) continue;
    const w = m[3] * px + m[7] * py + m[11] * pz + m[15];
    if (w <= 0.01) continue;
    const sx = (((m[0] * px + m[4] * py + m[8] * pz + m[12]) / w) * 0.5 + 0.5) * W;
    const sy = (1 - (((m[1] * px + m[5] * py + m[9] * pz + m[13]) / w) * 0.5 + 0.5)) * H;
    const d = (sx - x) ** 2 + (sy - y) ** 2;
    if (d < 16 * 16 && w < frontW) {
      frontW = w;
      front = part;
    }
    if (d < nearD) {
      nearD = d;
      near = part;
    }
  }
  return front >= 0 ? front : near;
}

// ------------------------------------------------------------------ grabbing
function startGrab(cam, part, x, y, byHand) {
  const same = S.grab.part === part;
  S.grab = { part, active: true, byHand, base: same ? [...S.grab.offset] : [0, 0, 0], offset: same ? [...S.grab.offset] : [0, 0, 0], start: unproject(cam, x, y) };
}
function moveGrab(cam, x, y) {
  const g = S.grab;
  g.offset = v3.add(g.base, v3.sub(unproject(cam, x, y), g.start));
}
function endGrab() {
  S.grab.active = false;
}

// ------------------------------------------------------------------ actions
function toggleForm() {
  S.formTarget = S.formTarget > 0.5 ? 0 : 1;
  if (S.formTarget === 0) S.explodeTarget = 0;
  S.snapFlashUntil = performance.now() + 700;
  toast(S.formTarget ? 'Summoned' : 'Dissolved');
}

function resetView() {
  S.yaw = 0.55;
  S.pitchTarget = 0.12;
  S.distTarget = 4.4;
  S.yawVel = 0;
  S.explodeTarget = 0;
  S.grab.active = false;
}

let toastTimer;
function toast(msg) {
  ui.toast.textContent = msg;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
}

async function startCamera() {
  try {
    toast('Starting camera…');
    await tracker.start();
    ui.body.classList.add('camera-on');
    setTool('camera', true);
    toast('Show your hand ✋');
  } catch (err) {
    console.warn(err);
    setTool('camera', false);
    toast(err?.name === 'NotAllowedError' ? 'Camera blocked — using mouse mode' : 'No camera — using mouse mode');
  }
}

function stopCamera() {
  tracker.stop();
  ui.body.classList.remove('camera-on');
  setTool('camera', false);
}

const setTool = (name, on) => document.querySelector(`[data-action="${name}"]`)?.classList.toggle('on', on);

function toggleTour() {
  S.tour.on = !S.tour.on;
  S.tour.t = 0;
  S.tour.i = -1;
  setTool('tour', S.tour.on);
  if (S.tour.on) {
    S.formTarget = 1;
    toast('Guided tour');
  } else {
    S.explodeTarget = 0;
  }
}

const actions = {
  camera: () => (tracker.running ? stopCamera() : startCamera()),
  video: () => {
    S.showVideo = !S.showVideo;
    ui.body.classList.toggle('no-video', !S.showVideo);
    setTool('video', S.showVideo);
  },
  reset: resetView,
  rotate: () => {
    S.autoRotate = !S.autoRotate;
    setTool('rotate', S.autoRotate);
  },
  section: () => {
    S.clip = !S.clip;
    setTool('section', S.clip);
    toast(S.clip ? 'Section cut on' : 'Section cut off');
  },
  tour: toggleTour,
  shot: () => {
    S.shot = true;
  },
  help: () => {
    ui.help.hidden = false;
  },
};
document.querySelectorAll('#toolbar [data-action]').forEach((b) => b.addEventListener('click', () => actions[b.dataset.action]()));
setTool('video', true);

$('#help-close').onclick = () => (ui.help.hidden = true);
ui.help.addEventListener('click', (e) => e.target === ui.help && (ui.help.hidden = true));

function begin(withCamera) {
  ui.start.hidden = true;
  if (withCamera) startCamera();
  setTimeout(() => (S.formTarget = 1), 500);
}
$('#start-camera').onclick = () => begin(true);
$('#start-nocam').onclick = () => begin(false);

ui.sensitivity.onchange = () => (S.sensitivity = ui.sensitivity.value);
ui.explode.addEventListener('pointerdown', () => (S.sliderActive = true));
window.addEventListener('pointerup', () => (S.sliderActive = false));
ui.explode.addEventListener('input', () => {
  S.explodeTarget = ui.explode.value / 100;
  if (S.formTarget === 0) S.formTarget = 1;
});

// ------------------------------------------------------------------ mouse
let lastCam = camera();
ui.gl.addEventListener('pointerdown', (e) => {
  ui.gl.setPointerCapture(e.pointerId);
  const part = pickPart(lastCam, e.clientX, e.clientY);
  if (part >= 0) {
    startGrab(lastCam, part, e.clientX, e.clientY, false);
    S.hover = part;
  } else {
    S.dragging = { x: e.clientX, y: e.clientY };
    ui.gl.classList.add('dragging');
  }
});
ui.gl.addEventListener('pointermove', (e) => {
  S.mouse = [e.clientX, e.clientY];
  if (S.dragging) {
    S.yaw -= (e.clientX - S.dragging.x) * 0.008;
    S.pitch = clamp(S.pitch + (e.clientY - S.dragging.y) * 0.006, -1.3, 1.3);
    S.pitchTarget = S.pitch;
    S.dragging = { x: e.clientX, y: e.clientY };
  } else if (S.grab.active && !S.grab.byHand) {
    moveGrab(lastCam, e.clientX, e.clientY);
  }
});
const endPointer = () => {
  S.dragging = null;
  ui.gl.classList.remove('dragging');
  if (S.grab.active && !S.grab.byHand) endGrab();
};
ui.gl.addEventListener('pointerup', endPointer);
ui.gl.addEventListener('pointercancel', endPointer);
ui.gl.addEventListener('pointerleave', () => (S.mouse = null));
window.addEventListener('wheel', (e) => {
  if (e.target.closest('#panel, #dock, .overlay')) return;
  e.preventDefault();
  S.distTarget = clamp(S.distTarget * Math.exp(e.deltaY * 0.0012), 1.6, 10);
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
  const k = e.key.toLowerCase();
  if (k === ' ') {
    e.preventDefault();
    toggleForm();
  } else if (k === 'f') {
    S.formTarget = 1;
    S.explodeTarget = 0;
  } else if (k === 'e') {
    S.formTarget = 1;
    S.explodeTarget = S.explodeTarget > 0.5 ? 0 : 1;
  } else if (k === 'n' || k === 'arrowright') stepModel(1);
  else if (k === 'arrowleft') stepModel(-1);
  else if (k === 'r') actions.reset();
  else if (k === 'a') actions.rotate();
  else if (k === 'c') actions.section();
  else if (k === 't') actions.tour();
  else if (k === 's') actions.shot();
  else if (k === 'v') actions.camera();
  else if (k === 'b') actions.video();
  else if (k === 'h' || k === '?') ui.help.hidden = !ui.help.hidden;
  else if (k === 'escape') ui.help.hidden = true;
});

// ------------------------------------------------------------------ hands -> scene
const POSE_LABEL = { none: 'No hand', open: 'Open', moving: 'Moving', fist: 'Fist', point: 'Pointing', pinch: 'Pinch', peace: 'Peace' };
const POSE_ICON = { open: '🖐️', moving: '👋', fist: '✊', point: '☝️', pinch: '🤏', peace: '✌️' };

function handleHands(now, dt, cam) {
  const hands = S.injected ?? (tracker.running ? tracker.hands : []);
  const g = gestures.update(hands, now, S.sensitivity);
  const P = g.primary;
  const prevPose = S.pose;
  S.pose = P ? g.pose : 'none';
  S.handCount = g.analyses.length;

  for (const ev of g.events) {
    if (ev === 'snap') toggleForm();
    if (ev === 'next') stepModel(1);
  }

  let targetYawVel = 0;
  if (!P) {
    S.handForce = 0;
    S.openness = smooth(S.openness, 0, 4, dt);
    S.twoHandStartDist = null;
    if (S.grab.active && S.grab.byHand) endGrab();
    return { g, targetYawVel: null };
  }

  S.openness = smooth(S.openness, P.openness, 14, dt);
  S.handWorld = unproject(cam, P.palm[0], P.palm[1]);
  S.handForce = S.formTarget === 0 ? 1 : 0;

  if (g.zoom) {
    if (S.twoHandStartDist == null) S.twoHandStartDist = S.distTarget;
    S.distTarget = clamp(S.twoHandStartDist / g.zoom, 1.6, 10);
  } else {
    S.twoHandStartDist = null;
  }

  switch (S.pose) {
    case 'fist':
      if (S.formTarget === 0) toast('Assembling');
      S.formTarget = 1;
      S.explodeTarget = 0;
      break;
    case 'open':
    case 'moving': {
      if (!g.zoom && S.formTarget === 1) S.explodeTarget = remap(P.openness, 0.3, 0.92);
      const dead = 0.3;
      if (Math.abs(P.roll) > dead) targetYawVel = -(P.roll - Math.sign(P.roll) * dead) * 2.6;
      S.pitchTarget = clamp((0.5 - P.palm[1] / H) * 1.5, -0.7, 0.9);
      break;
    }
    case 'point': {
      const part = pickPart(cam, P.indexTip[0], P.indexTip[1]);
      if (part >= 0) {
        S.hover = part;
        S.hoverHeldUntil = now + 350;
      } else if (now > S.hoverHeldUntil) S.hover = -1;
      break;
    }
    case 'pinch': {
      const x = (P.indexTip[0] + P.thumbTip[0]) / 2;
      const y = (P.indexTip[1] + P.thumbTip[1]) / 2;
      if (!S.grab.active) {
        const part = S.hover >= 0 && (prevPose === 'point' || prevPose === 'pinch') ? S.hover : pickPart(cam, x, y);
        if (part >= 0) {
          startGrab(cam, part, x, y, true);
          S.hover = part;
          toast(`Pulling out: ${S.sample.parts[part].name}`);
        }
      } else if (S.grab.byHand) {
        moveGrab(cam, x, y);
      }
      break;
    }
    default:
      break;
  }
  if (S.pose !== 'pinch' && S.grab.active && S.grab.byHand) endGrab();
  if (S.pose !== 'point' && S.pose !== 'pinch' && !S.tour.on && now > S.hoverHeldUntil) S.hover = -1;
  return { g, targetYawVel };
}

// ------------------------------------------------------------------ frame loop
let last = performance.now();
let frames = 0;
let fpsT = last;
let fps = 0;
let hudT = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  frames++;
  if (now - fpsT > 500) {
    fps = Math.round((frames * 1000) / (now - fpsT));
    frames = 0;
    fpsT = now;
  }

  if (tracker.running) tracker.detect(W, H);
  const cam0 = lastCam;
  const { g, targetYawVel } = handleHands(now, dt, cam0);
  const handPresent = g.analyses.length > 0;

  // Mouse hover picking (when no hand is pointing).
  if (!handPresent && !S.dragging && !S.grab.active && !S.tour.on) {
    let part = -1;
    if (S.mouse) {
      part = labels.hit(S.mouse[0], S.mouse[1]);
      if (part < 0) part = pickPart(cam0, S.mouse[0], S.mouse[1]);
    }
    S.hover = part;
  }
  ui.gl.classList.toggle('over-part', S.hover >= 0 && !S.dragging);

  // Guided tour.
  if (S.tour.on && S.sample) {
    S.tour.t -= dt;
    if (S.tour.t <= 0) {
      S.tour.i = (S.tour.i + 1) % S.sample.parts.length;
      S.tour.t = 3.2;
    }
    S.hover = S.tour.i;
    S.explodeTarget = 0.6;
  }

  // Camera motion.
  if (targetYawVel != null) S.yawVel = smooth(S.yawVel, targetYawVel, 5, dt);
  else S.yawVel = smooth(S.yawVel, S.autoRotate && !S.dragging ? -0.14 : 0, 2, dt);
  if (!S.dragging) S.yaw += S.yawVel * dt;
  S.pitch = smooth(S.pitch, S.pitchTarget, 4, dt);
  S.dist = smooth(S.dist, S.distTarget, 7, dt);

  // Scene animation.
  S.form = smooth(S.form, S.formTarget, 2.2, dt);
  if (S.formTarget === 0) S.explodeTarget = 0;
  S.explode = smooth(S.explode, S.explodeTarget, S.sliderActive ? 20 : 5, dt);
  if (S.hover >= 0) S.focusPart = S.hover;
  S.focus = smooth(S.focus, S.hover >= 0 ? 1 : 0, 8, dt);
  if (!S.grab.active && S.grab.part >= 0) {
    S.grab.offset = S.grab.offset.map((v) => v * Math.exp(-3 * dt));
    if (v3.len(S.grab.offset) < 0.003) S.grab.part = -1;
  }

  const cam = camera();
  lastCam = cam;
  particles.step(dt, time, {
    form: S.form,
    explode: S.explode,
    grabPart: S.grab.part,
    grabOffset: S.grab.offset,
    hand: S.handWorld,
    handForce: S.handForce,
  });
  particles.draw(cam.view, cam.proj, { hover: S.focus > 0.01 ? S.focusPart : -1, focus: S.focus, clip: S.clip, form: S.form });

  // Labels.
  if (S.sample) {
    const anchors = S.sample.parts.map((p) => {
      let a = v3.add(p.anchor, v3.scale(p.explode, S.explode));
      if (p.index === S.grab.part) a = v3.add(a, S.grab.offset);
      if (S.clip && p.anchor[2] > 0.05) return null;
      return project(cam.vp, a);
    });
    const center = project(cam.vp, [0, 0, 0]);
    const [b0, b1] = S.sample.bounds;
    const lo = v3.lerp(b0[0], b1[0], S.explode);
    const hi = v3.lerp(b0[1], b1[1], S.explode);
    const xs = [];
    for (let c = 0; c < 8; c++) {
      const q = project(cam.vp, [c & 1 ? hi[0] : lo[0], c & 2 ? hi[1] : lo[1], c & 4 ? hi[2] : lo[2]]);
      if (q) xs.push(q[0]);
    }
    const cx = center ? center[0] : W / 2;
    const formed = remap(S.form, 0.75, 0.98) * (S.formTarget === 1 ? 1 : 0);
    labels.layout(anchors, [cx, xs.length ? Math.min(...xs) : cx, xs.length ? Math.max(...xs) : cx], {
      opacity: formed * (0.3 + 0.7 * remap(S.explode, 0.05, 0.6)),
      hot: S.hover,
      width: W,
      height: H,
      leftLimit: panelRight,
    });
    updateCard(handPresent);
  }

  // Overlay.
  const holdProgress = S.pose === 'peace' ? clamp((now - gestures.candidateSince) / 450, 0, 1) : 0;
  overlay.draw(g.analyses, { pose: S.pose, holdProgress, grabbing: S.grab.active, time });

  if (S.shot) {
    S.shot = false;
    saveScreenshot();
  }

  if (now - hudT > 120) {
    hudT = now;
    updatePanel(fps, now);
  }
  requestAnimationFrame(frame);
}

function updateCard(handPresent) {
  const show = S.hover >= 0 && S.form > 0.6 && S.formTarget === 1;
  ui.card.hidden = !show;
  if (!show) return;
  const p = S.sample.parts[S.hover];
  if (!p) return;
  ui.cardDot.style.background = p.color;
  ui.cardDot.style.color = p.color;
  ui.cardName.textContent = p.name;
  ui.cardDesc.textContent = p.desc;
  ui.cardHint.textContent = S.grab.active ? 'pulling out…' : handPresent ? 'pinch to pull it out' : 'drag to pull it out';
}

function sceneState() {
  if (S.formTarget === 0) return S.form > 0.05 ? ['Dissolving', 'forming'] : ['Dissolved', ''];
  if (S.form < 0.95) return ['Forming', 'forming'];
  if (S.explode > 0.15) return ['Exploded', 'exploded'];
  return ['Formed', 'formed'];
}

function updatePanel(fpsNow, now) {
  const [label, cls] = sceneState();
  ui.scene.textContent = label;
  ui.scene.className = `pill ${cls}`;
  const handLabel = S.handCount > 1 ? 'Two hands' : POSE_LABEL[S.pose];
  ui.hand.textContent = S.pose === 'none' ? handLabel : `${POSE_ICON[S.pose] ?? ''} ${handLabel}`;
  ui.hand.className = `pill ${S.pose === 'none' ? 'dim' : 'live'}`;
  const o = Math.round(S.openness * 100);
  ui.opennessVal.textContent = `${o}%`;
  ui.opennessBar.style.width = `${o}%`;
  const e = Math.round(S.explode * 100);
  ui.explodeVal.textContent = `${e}%`;
  if (!S.sliderActive) ui.explode.value = e;

  const active = new Set();
  if (now < S.snapFlashUntil) active.add('snap');
  if (S.handCount > 1) active.add('two');
  else if (S.pose === 'fist') active.add('fist');
  else if (S.pose === 'open') active.add('open');
  else if (S.pose === 'moving') active.add(Math.abs(S.yawVel) > 0.15 ? 'twist' : 'open');
  else if (S.pose === 'point' || S.pose === 'pinch') active.add('point');
  else if (S.pose === 'peace') active.add('peace');
  for (const li of ui.gestures) li.classList.toggle('active', active.has(li.dataset.g));

  ui.fps.textContent = fpsNow;
  ui.pcount.textContent = COUNT >= 1000 ? `${Math.round(COUNT / 1000)}k` : COUNT;
  ui.camstat.textContent = tracker.running
    ? `cam ${tracker.camFps} fps · hands ${tracker.delegate} ${tracker.inferMs.toFixed(0)} ms`
    : S.injected
      ? 'simulated hand input'
      : 'camera off · mouse mode';
}

function saveScreenshot() {
  const c = document.createElement('canvas');
  c.width = ui.gl.width;
  c.height = ui.gl.height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, c.width, c.height);
  if (tracker.running && S.showVideo && ui.video.videoWidth) {
    const vw = ui.video.videoWidth;
    const vh = ui.video.videoHeight;
    const s = Math.max(c.width / vw, c.height / vh);
    ctx.save();
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.globalAlpha = 0.8;
    ctx.drawImage(ui.video, (c.width - vw * s) / 2, (c.height - vh * s) / 2, vw * s, vh * s);
    ctx.restore();
  }
  ctx.drawImage(ui.gl, 0, 0);
  ctx.drawImage($('#overlay'), 0, 0, c.width, c.height);
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vector-${S.model?.id ?? 'scene'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  toast('Screenshot saved');
}

// ------------------------------------------------------------------ boot
const initial = findModel(params.get('model') ?? '') ?? findModel('human-body');
S.category = initial.category;
renderDock();
loadModel(initial.id);

const autostart = params.get('autostart');
if (autostart === 'nocamera') begin(false);
else if (autostart === 'camera') begin(true);

requestAnimationFrame(frame);

// Hooks for automated tests and debugging.
window.__vector = {
  get state() {
    return {
      model: S.model?.id ?? null,
      modelName: S.model?.name ?? null,
      form: S.form,
      formTarget: S.formTarget,
      explode: S.explode,
      explodeTarget: S.explodeTarget,
      pose: S.pose,
      hover: S.hover,
      grabPart: S.grab.part,
      grabActive: S.grab.active,
      yaw: S.yaw,
      dist: S.dist,
      fps,
      particles: COUNT,
      parts: S.sample?.parts.map((p) => p.name) ?? [],
    };
  },
  injectHands(hands) {
    S.injected = hands;
  },
  loadModel,
  partScreenPosition(i) {
    const p = S.sample?.parts[i];
    if (!p) return null;
    let a = v3.add(p.anchor, v3.scale(p.explode, S.explode));
    if (p.index === S.grab.part) a = v3.add(a, S.grab.offset);
    return project(lastCam.vp, a);
  },
};
