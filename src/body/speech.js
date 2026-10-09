// Narration with the browser's built-in text-to-speech (works offline, no audio files).

const PREFERRED = [
  'Samantha', 'Ava', 'Allison', 'Karen', 'Moira', 'Serena', 'Daniel',
  'Google UK English Female', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Libby',
];

export class Narrator {
  constructor() {
    this.synth = window.speechSynthesis ?? null;
    this.enabled = true;
    this.rate = 0.95;
    this.voice = null;
    this.voices = [];
    this.allVoices = [];
    this.lang = 'en-IN';
    this.log = []; // last utterances, for tests and the transcript
    this.onstart = null;
    this.onend = null;
    this.token = 0;
    if (this.synth) {
      this.#loadVoices();
      this.synth.addEventListener?.('voiceschanged', () => this.#loadVoices());
    }
  }

  get available() {
    return Boolean(this.synth);
  }

  #loadVoices() {
    this.allVoices = this.synth.getVoices();
    const base = this.lang.split('-')[0].toLowerCase();
    this.voices = this.allVoices.filter((v) => v.lang?.toLowerCase().replace('_', '-').startsWith(base));
    if (!this.voice || !this.voices.includes(this.voice)) {
      const exact = this.voices.filter((v) => v.lang?.replace('_', '-') === this.lang);
      this.voice =
        (base === 'en' ? PREFERRED.map((name) => this.voices.find((v) => v.name.includes(name))).find(Boolean) : null) ??
        exact.find((v) => /google|natural|neural/i.test(v.name)) ??
        exact[0] ??
        this.voices.find((v) => v.default) ??
        this.voices[0] ??
        null;
    }
  }

  /** Switches narration language (BCP-47, e.g. "hi-IN"). Returns false if no voice is installed for it. */
  setLang(code) {
    this.lang = code;
    this.voice = null;
    if (this.synth) this.#loadVoices();
    return this.voices.length > 0 || !this.synth;
  }

  setVoice(name) {
    this.voice = this.voices.find((v) => v.name === name) ?? this.voice;
  }

  /** Speaks text, cancelling anything already playing. Resolves when finished (or skipped). */
  say(text) {
    const token = ++this.token;
    this.log.push(text);
    if (this.log.length > 50) this.log.shift();
    if (!this.enabled || !this.synth) return Promise.resolve(false);
    this.synth.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) u.voice = this.voice;
      u.lang = this.voice?.lang ?? this.lang;
      u.rate = this.rate;
      u.pitch = 1.05;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        clearTimeout(fallback);
        if (token === this.token) this.onend?.();
        resolve(ok);
      };
      // Some browsers never fire `end` (no voices installed): estimate the duration instead.
      const words = text.split(/\s+/).length;
      const fallback = setTimeout(() => finish(true), (words / (2.6 * this.rate)) * 1000 + 1500);
      u.onstart = () => token === this.token && this.onstart?.();
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      this.synth.speak(u);
    });
  }

  stop() {
    this.token++;
    this.synth?.cancel();
    this.onend?.();
  }
}
