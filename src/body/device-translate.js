// Free, on-device translation using the browser's built-in Translator API
// (Chrome 138+ on desktop). The language pack downloads once, then works offline.
// https://developer.chrome.com/docs/ai/translator-api

const translators = new Map();

export const hasDeviceTranslator = () => typeof self !== 'undefined' && 'Translator' in self;

const support = new Map();

/** True if the browser can translate English -> lang on this device (maybe after a one-time download). */
export function deviceCanTranslate(lang) {
  if (!hasDeviceTranslator()) return Promise.resolve(false);
  if (!support.has(lang)) {
    // Some builds expose the API but never answer: give up after a few seconds.
    const timeout = new Promise((resolve) => setTimeout(() => resolve('unavailable'), 4000));
    const check = Promise.race([self.Translator.availability({ sourceLanguage: 'en', targetLanguage: lang }), timeout])
      .then((status) => status !== 'unavailable')
      .catch(() => false);
    support.set(lang, check);
  }
  return support.get(lang);
}

async function translatorFor(lang, onProgress) {
  if (!translators.has(lang)) {
    const created = self.Translator.create({
      sourceLanguage: 'en',
      targetLanguage: lang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => onProgress?.(e.loaded));
      },
    });
    translators.set(lang, created);
    created.catch(() => translators.delete(lang));
  }
  return translators.get(lang);
}

/** Translates a list of English strings; returns them in the same order. */
export async function deviceTranslate(lang, texts, onProgress) {
  const t = await translatorFor(lang, onProgress);
  const out = [];
  for (const text of texts) out.push(await t.translate(text));
  return out;
}
