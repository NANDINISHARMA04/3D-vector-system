// Lesson builder: teachers choose a body system, pick and order parts, write
// notes and record their own voice for each step. Lessons are saved on the device.
import { LESSONS } from './content.js';
import { getLessons, saveLesson, deleteLesson, putAudio, getAudio, deleteAudio, uid } from './store.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function initBuilder({ items, labelOf, partName, onChange, onPlay, toast }) {
  const root = $('#builder');
  const body = $('#builder-body');
  const title = $('#builder-title');
  const back = $('#builder-back');
  let draft = null;
  let recorder = null;
  let recordingStep = -1;
  let preview = null;

  const open = (lessonId) => {
    root.hidden = false;
    if (lessonId) edit(getLessons().find((l) => l.id === lessonId));
    else list();
  };
  const close = () => {
    stopRecording();
    preview?.pause();
    root.hidden = true;
  };
  $('#builder-done').onclick = close;
  root.addEventListener('click', (e) => e.target === root && close());
  back.onclick = list;

  function list() {
    stopRecording();
    draft = null;
    title.textContent = 'My Lessons';
    back.hidden = true;
    const lessons = getLessons();
    body.innerHTML = `
      <button class="btn-filled wide" id="new-lesson">＋ New lesson</button>
      ${lessons.length ? `<ul class="inset-group list" style="margin-top:16px">${lessons.map((l) => `
        <li><span><b>${esc(l.title)}</b><small>${esc(labelOf(l.model))} · ${l.steps.length} step${l.steps.length === 1 ? '' : 's'}${l.steps.some((s) => s.audioId) ? ' · 🎙️ voice notes' : ''}</small></span>
          <span class="row-actions"><button class="text-btn" data-play="${l.id}">▶ Play</button><button class="text-btn" data-edit="${l.id}">Edit</button><button class="text-btn danger" data-del="${l.id}">Delete</button></span></li>`).join('')}</ul>`
        : '<div class="empty"><div class="empty-icon">📚</div><h4>Create your own lesson</h4><p>Pick a body system, choose which parts to cover and in what order, add notes and record your own voice.</p></div>'}`;
    $('#new-lesson', body).onclick = () => edit(null);
    body.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => {
      close();
      onPlay(b.dataset.play);
    }));
    body.querySelectorAll('[data-edit]').forEach((b) => (b.onclick = () => edit(getLessons().find((l) => l.id === b.dataset.edit))));
    body.querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => {
      if (!confirm('Delete this lesson and its voice notes?')) return;
      deleteLesson(b.dataset.del);
      onChange();
      list();
    }));
  }

  function stepsFor(model, existing = []) {
    const names = Object.keys(LESSONS[model].parts);
    const chosen = existing.filter((s) => names.includes(s.part)).map((s) => ({ ...s, on: true }));
    const rest = names.filter((n) => !chosen.some((s) => s.part === n)).map((n) => ({ part: n, note: '', audioId: null, on: !existing.length }));
    return [...chosen, ...rest];
  }

  function edit(lesson) {
    draft = lesson
      ? { id: lesson.id, title: lesson.title, model: lesson.model, steps: stepsFor(lesson.model, lesson.steps), isNew: false }
      : { id: uid(), title: '', model: items[0].id, steps: stepsFor(items[0].id), isNew: true };
    title.textContent = lesson ? 'Edit lesson' : 'New lesson';
    back.hidden = false;
    renderEditor();
  }

  function renderEditor() {
    body.innerHTML = `
      <ul class="inset-group form">
        <li><label for="lesson-title">Title</label><input id="lesson-title" class="text-input" placeholder="e.g. How we breathe" maxlength="60" value="${esc(draft.title)}" /></li>
        <li><label for="lesson-model">Body system</label><select id="lesson-model">${items.map((it) => `<option value="${it.id}" ${it.id === draft.model ? 'selected' : ''}>${esc(labelOf(it.id))}</option>`).join('')}</select></li>
      </ul>
      <h4 class="section-header">Steps</h4>
      <p class="footnote" style="margin-top:-2px;margin-bottom:8px">Tick the parts to include and use the arrows to change the order.</p>
      <ul class="inset-group steps">${draft.steps.map((s, i) => `
        <li class="${s.on ? '' : 'off'}">
          <div class="step-head">
            <input type="checkbox" data-on="${i}" ${s.on ? 'checked' : ''} aria-label="Include ${esc(s.part)}" />
            <b>${esc(partName(draft.model, s.part))}</b>
            <span class="row-actions">
              <button class="text-btn" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
              <button class="text-btn" data-down="${i}" ${i === draft.steps.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
            </span>
          </div>
          ${s.on ? `<textarea data-note="${i}" rows="2" maxlength="400" placeholder="Optional note to read after the part is explained">${esc(s.note)}</textarea>
          <div class="voice-row">
            ${recordingStep === i ? `<button class="btn-tinted rec" data-stop="${i}">■ Stop recording</button><span class="rec-dot"></span>`
              : `<button class="btn-plain" data-rec="${i}">🎙️ ${s.audioId ? 'Re-record' : 'Record your voice'}</button>`}
            ${s.audioId && recordingStep !== i ? `<button class="btn-plain" data-listen="${i}">▶ Listen</button><button class="text-btn danger" data-unrec="${i}">Remove voice</button>` : ''}
          </div>` : ''}
        </li>`).join('')}
      </ul>
      <p class="footnote">When a step has a voice note, it is played instead of the built-in narration. Notes are shown on the card and read aloud.</p>
      <div class="actions-row"><button class="btn-filled wide" id="save-lesson">Save lesson</button></div>`;

    $('#lesson-title', body).oninput = (e) => (draft.title = e.target.value);
    $('#lesson-model', body).onchange = (e) => {
      draft.model = e.target.value;
      draft.steps = stepsFor(draft.model);
      renderEditor();
    };
    body.querySelectorAll('[data-on]').forEach((c) => (c.onchange = () => {
      draft.steps[+c.dataset.on].on = c.checked;
      renderEditor();
    }));
    const move = (i, d) => {
      const s = draft.steps;
      [s[i], s[i + d]] = [s[i + d], s[i]];
      renderEditor();
    };
    body.querySelectorAll('[data-up]').forEach((b) => (b.onclick = () => move(+b.dataset.up, -1)));
    body.querySelectorAll('[data-down]').forEach((b) => (b.onclick = () => move(+b.dataset.down, 1)));
    body.querySelectorAll('[data-note]').forEach((t) => (t.oninput = () => (draft.steps[+t.dataset.note].note = t.value)));
    body.querySelectorAll('[data-rec]').forEach((b) => (b.onclick = () => startRecording(+b.dataset.rec)));
    body.querySelectorAll('[data-stop]').forEach((b) => (b.onclick = stopRecording));
    body.querySelectorAll('[data-listen]').forEach((b) => (b.onclick = async () => {
      const blob = await getAudio(draft.steps[+b.dataset.listen].audioId);
      if (!blob) return;
      preview?.pause();
      preview = new Audio(URL.createObjectURL(blob));
      preview.play();
    }));
    body.querySelectorAll('[data-unrec]').forEach((b) => (b.onclick = () => {
      const s = draft.steps[+b.dataset.unrec];
      deleteAudio(s.audioId);
      s.audioId = null;
      renderEditor();
    }));
    $('#save-lesson', body).onclick = () => {
      const steps = draft.steps.filter((s) => s.on).map(({ part, note, audioId }) => ({ part, note: note.trim(), audioId }));
      if (!steps.length) return toast('Choose at least one part');
      const lesson = { id: draft.id, title: draft.title.trim() || `${labelOf(draft.model)} lesson`, model: draft.model, steps };
      saveLesson(lesson);
      onChange();
      toast('Lesson saved');
      list();
    };
  }

  async function startRecording(i) {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return toast('Recording is not supported in this browser');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      recorder = new MediaRecorder(stream);
      recordingStep = i;
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const step = draft?.steps[i];
        if (step && chunks.length) {
          if (step.audioId) await deleteAudio(step.audioId);
          step.audioId = `voice-${uid()}`;
          await putAudio(step.audioId, new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        }
        recorder = null;
        recordingStep = -1;
        if (draft) renderEditor();
      };
      recorder.start();
      renderEditor();
      setTimeout(() => recordingStep === i && stopRecording(), 60_000); // 1 minute max per note
    } catch {
      toast('Microphone permission was denied');
    }
  }
  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  return { open, close };
}
