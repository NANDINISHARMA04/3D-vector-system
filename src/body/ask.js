// "Ask Body Buddy": a child asks a question by voice (or typing); the answer comes
// from the server-side AI assistant, or from the built-in lessons when offline,
// and is read aloud.
import { LESSONS } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function initAsk({ i18n, narrator, context, toast }) {
  const root = $('#ask');
  const log = $('#ask-log');
  const input = $('#ask-input');
  const mic = $('#ask-mic');
  const status = $('#ask-status');
  const chips = $('#ask-suggest');
  let ai = false;
  let busy = false;
  let rec = null;

  fetch('/api/status')
    .then((r) => (r.ok ? r.json() : { ai: false }))
    .then((d) => (ai = Boolean(d.ai)))
    .catch(() => (ai = false))
    .finally(renderStatus);

  function renderStatus() {
    status.textContent = ai ? i18n.t('aiOn') : i18n.t('aiOff');
    status.classList.toggle('on', ai);
  }

  function open() {
    root.hidden = false;
    renderStatus();
    renderSuggestions();
    if (!log.children.length) bubble('bot', i18n.t('askHint'));
    setTimeout(() => input.focus(), 50);
  }
  const close = () => {
    stopListening();
    root.hidden = true;
  };
  $('#ask-close').onclick = close;
  root.addEventListener('click', (e) => e.target === root && close());

  function renderSuggestions() {
    const { partLabel } = context();
    const part = partLabel || i18n.part('human-body', 'Heart').name;
    chips.replaceChildren(
      ...[i18n.t('suggest1', { part }), i18n.t('suggest2'), i18n.t('suggest3', { part })].map((q) => {
        const b = document.createElement('button');
        b.className = 'chip-btn';
        b.textContent = q;
        b.onclick = () => submit(q);
        return b;
      }),
    );
  }

  function bubble(who, text, meta = '') {
    const el = document.createElement('div');
    el.className = `bubble ${who}`;
    el.innerHTML = `<p>${esc(text)}</p>${meta ? `<small>${esc(meta)}</small>` : ''}`;
    log.append(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  async function submit(question) {
    const q = question.trim();
    if (!q || busy) return;
    busy = true;
    input.value = '';
    bubble('me', q);
    const pending = bubble('bot typing', i18n.t('thinking'));
    let answer;
    let meta = '';
    try {
      if (!ai) throw new Error('offline');
      const ctx = context();
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, model: ctx.modelTitle, part: ctx.partName, summary: ctx.partSummary, language: i18n.lang }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.answer) throw new Error(data.error || 'failed');
      answer = data.answer;
    } catch (err) {
      if (err.message !== 'offline') console.warn('[ask]', err.message);
      answer = offlineAnswer(q);
      meta = i18n.t('offlineAnswer');
    }
    pending.remove();
    bubble('bot', answer, meta);
    narrator.say(answer);
    busy = false;
  }

  // Without the AI: find the part the question mentions and answer from the lessons.
  function offlineAnswer(q) {
    const words = q.toLowerCase();
    const ctx = context();
    const ids = [ctx.modelId, ...Object.keys(LESSONS).filter((id) => id !== ctx.modelId)];
    for (const id of ids) {
      for (const part of Object.keys(LESSONS[id].parts)) {
        const local = i18n.part(id, part);
        const names = [part.toLowerCase(), local.name.toLowerCase(), part.toLowerCase().replace(/s$/, '')];
        if (names.some((n) => n.length > 2 && words.includes(n))) {
          return `${local.name}: ${local.summary} ${i18n.say('didYouKnow')} ${local.fact}`;
        }
      }
    }
    if (ctx.partName) {
      const local = i18n.part(ctx.modelId, ctx.partName);
      return `${local.name}: ${local.summary} ${i18n.say('didYouKnow')} ${local.fact}`;
    }
    return i18n.model(ctx.modelId).intro;
  }

  $('#ask-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submit(input.value);
  });

  // ---------------------------------------------------------- speech to text
  function stopListening() {
    rec?.abort?.();
    rec = null;
    mic.classList.remove('listening');
  }
  mic.onclick = () => {
    if (rec) return stopListening();
    if (!Recognition) {
      toast(i18n.t('noMic'));
      input.focus();
      return;
    }
    narrator.stop();
    rec = new Recognition();
    rec.lang = i18n.info.speech;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    mic.classList.add('listening');
    input.placeholder = i18n.t('listening');
    let finalText = '';
    rec.onresult = (e) => {
      let text = '';
      for (const r of e.results) {
        text += r[0].transcript;
        if (r.isFinal) finalText = text;
      }
      input.value = text;
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') toast(i18n.t('cameraDenied').replace(/camera/i, 'Microphone'));
    };
    rec.onend = () => {
      mic.classList.remove('listening');
      input.placeholder = i18n.t('askPlaceholder');
      rec = null;
      if (finalText || input.value) submit(finalText || input.value);
    };
    rec.start();
  };

  return { open, close, refresh: () => !root.hidden && (renderStatus(), renderSuggestions()) };
}
