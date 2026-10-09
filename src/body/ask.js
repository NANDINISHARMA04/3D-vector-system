// "Ask Body Buddy": a child asks a question by voice (or typing); the answer comes
// from the server-side AI assistant, or from the built-in lessons when offline,
// and is read aloud.
import { LESSONS } from './content.js';
import { findAnswer } from './faq.js';
import { deviceCanTranslate, deviceTranslate } from './device-translate.js';

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
      answer = await builtInAnswer(q);
      meta = i18n.t('builtIn');
    }
    pending.remove();
    bubble('bot', answer, meta);
    narrator.say(answer);
    busy = false;
  }

  // Without the AI (free): answer from the built-in question bank, or from the
  // lesson for the part the question mentions. Other languages are translated
  // on the device when the browser supports it.
  async function builtInAnswer(q) {
    const lang = i18n.lang === 'hi' ? 'hi' : 'en';
    const text = builtInText(q, lang);
    if (i18n.lang === 'en' || i18n.lang === 'hi' || !text.english) return text.local;
    if (await deviceCanTranslate(i18n.lang)) {
      try {
        return (await deviceTranslate(i18n.lang, [text.local]))[0];
      } catch {
        /* fall through to the untranslated answer */
      }
    }
    return text.local;
  }

  function builtInText(q, lang) {
    const words = q.toLowerCase();
    const ctx = context();
    const partAnswer = (id, part) => {
      const local = i18n.part(id, part);
      return `${local.name}: ${local.summary} ${i18n.say('didYouKnow')} ${local.fact}`;
    };
    // Which body part does the question name?
    let mentioned = null;
    const ids = [ctx.modelId, ...Object.keys(LESSONS).filter((id) => id !== ctx.modelId)];
    search: for (const id of ids) {
      for (const part of Object.keys(LESSONS[id].parts)) {
        const local = i18n.part(id, part).name.toLowerCase();
        const names = [part.toLowerCase(), part.toLowerCase().replace(/s$/, ''), local, local.split(' (')[0]];
        if (names.some((n) => n.length > 2 && words.includes(n))) {
          mentioned = [id, part];
          break search;
        }
      }
    }
    const faq = findAnswer(q, lang);
    // A specific "why/how" question beats a plain part description.
    if (faq && (faq.score >= 2 || !mentioned)) return { local: faq.text, english: lang === 'en' };
    if (mentioned) return { local: partAnswer(...mentioned), english: false };
    if (ctx.partName && /\b(this|it|that)\b|यह|इस/.test(words)) return { local: partAnswer(ctx.modelId, ctx.partName), english: false };
    return {
      local: lang === 'hi'
        ? 'बहुत अच्छा सवाल! मैं शरीर का विशेषज्ञ हूँ। मुझसे दिल, दिमाग, हड्डियों या साँस के बारे में पूछें, या अपने शिक्षक से पूछें।'
        : 'That’s a great question! I’m a body expert, so try asking me about your heart, brain, bones or breathing, or ask your teacher.',
      english: lang === 'en',
    };
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
