// On-device storage for the classroom: roster, quiz results, custom lessons
// (localStorage) and teacher voice notes (IndexedDB, since audio is large).
// Nothing leaves the device.

const KEYS = { roster: 'bx-roster', results: 'bx-results', lessons: 'bx-lessons', settings: 'bx-settings' };

function load(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const TEAM_COLORS = ['#ff453a', '#0a84ff', '#30d158', '#ff9f0a'];

// ---------------------------------------------------------------- roster
export function getRoster() {
  const r = load(KEYS.roster, null);
  return r ?? { students: [], teams: [{ id: 'team-red', name: 'Red Team', color: TEAM_COLORS[0] }, { id: 'team-blue', name: 'Blue Team', color: TEAM_COLORS[1] }] };
}
export function saveRoster(r) {
  save(KEYS.roster, r);
}
export function addStudent(name) {
  const r = getRoster();
  const clean = name.trim().slice(0, 40);
  if (!clean) return null;
  const existing = r.students.find((s) => s.name.toLowerCase() === clean.toLowerCase());
  if (existing) return existing;
  const s = { id: uid(), name: clean };
  r.students.push(s);
  saveRoster(r);
  return s;
}
export function removeStudent(id) {
  const r = getRoster();
  r.students = r.students.filter((s) => s.id !== id);
  saveRoster(r);
}
export function renameTeam(id, name) {
  const r = getRoster();
  const t = r.teams.find((x) => x.id === id);
  if (t && name.trim()) t.name = name.trim().slice(0, 30);
  saveRoster(r);
}

// ---------------------------------------------------------------- results
/** result: { player: {id, name, type: 'student'|'team'|'guest'}, model, modelTitle, score, total, answers[], mode, date } */
export function addResult(result) {
  const all = load(KEYS.results, []);
  all.push({ id: uid(), date: new Date().toISOString(), ...result });
  save(KEYS.results, all.slice(-2000));
}
export const getResults = () => load(KEYS.results, []);
export function clearResults() {
  save(KEYS.results, []);
}

// ---------------------------------------------------------------- custom lessons
/** lesson: { id, title, model, steps: [{ part, note, audioId }] } */
export const getLessons = () => load(KEYS.lessons, []);
export function saveLesson(lesson) {
  const all = getLessons();
  const i = all.findIndex((l) => l.id === lesson.id);
  if (i >= 0) all[i] = lesson;
  else all.push(lesson);
  save(KEYS.lessons, all);
}
export function deleteLesson(id) {
  const lesson = getLessons().find((l) => l.id === id);
  lesson?.steps.forEach((s) => s.audioId && deleteAudio(s.audioId));
  save(KEYS.lessons, getLessons().filter((l) => l.id !== id));
}

// ---------------------------------------------------------------- settings
export const getSettings = () => load(KEYS.settings, {});
export function saveSettings(patch) {
  save(KEYS.settings, { ...getSettings(), ...patch });
}

// ---------------------------------------------------------------- voice notes (IndexedDB)
let dbPromise;
function db() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('body-explorer', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('audio');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction('audio', mode);
    const req = fn(t.objectStore('audio'));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}
export const putAudio = (id, blob) => tx('readwrite', (s) => s.put(blob, id));
export const getAudio = (id) => tx('readonly', (s) => s.get(id));
export const deleteAudio = (id) => tx('readwrite', (s) => s.delete(id)).catch(() => {});

// ---------------------------------------------------------------- stats for the dashboard
export function summarize(results) {
  const byPlayer = new Map();
  const byModel = new Map();
  const missed = new Map();
  for (const r of results) {
    const key = r.player?.id ?? 'guest';
    const p = byPlayer.get(key) ?? { player: r.player, games: 0, score: 0, total: 0, best: 0, last: r.date };
    p.games++;
    p.score += r.score;
    p.total += r.total;
    p.best = Math.max(p.best, r.total ? r.score / r.total : 0);
    if (r.date > p.last) p.last = r.date;
    p.player = r.player;
    byPlayer.set(key, p);

    const m = byModel.get(r.model) ?? { model: r.model, title: r.modelTitle, games: 0, score: 0, total: 0 };
    m.games++;
    m.score += r.score;
    m.total += r.total;
    byModel.set(r.model, m);

    for (const a of r.answers ?? []) {
      if (a.correct && a.tries === 1) continue;
      const k = `${r.modelTitle} · ${a.part}`;
      missed.set(k, (missed.get(k) ?? 0) + 1);
    }
  }
  const games = results.length;
  const score = results.reduce((s, r) => s + r.score, 0);
  const total = results.reduce((s, r) => s + r.total, 0);
  return {
    games,
    average: total ? score / total : 0,
    players: [...byPlayer.values()].sort((a, b) => b.score / (b.total || 1) - a.score / (a.total || 1)),
    models: [...byModel.values()].sort((a, b) => b.games - a.games),
    missed: [...missed.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  };
}

export function toCSV(results) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Player', 'Type', 'System', 'Score', 'Out of', 'Percent', 'Mode']];
  for (const r of results) {
    rows.push([new Date(r.date).toLocaleString(), r.player?.name, r.player?.type, r.modelTitle, r.score, r.total, r.total ? Math.round((r.score / r.total) * 100) : 0, r.mode]);
  }
  return rows.map((row) => row.map(esc).join(',')).join('\n');
}
