// Languages for Body Explorer.
// English and Hindi are written by hand and work offline. The other Indian
// languages are translated on demand by the AI assistant and cached on the device.

import { LESSONS } from './content.js';
import { HINDI } from './content.hi.js';

export const LANGS = {
  en: { name: 'English', native: 'English', speech: 'en-IN', short: 'EN', offline: true },
  hi: { name: 'Hindi', native: 'हिन्दी', speech: 'hi-IN', short: 'हि', offline: true },
  bn: { name: 'Bengali', native: 'বাংলা', speech: 'bn-IN', short: 'বা' },
  ta: { name: 'Tamil', native: 'தமிழ்', speech: 'ta-IN', short: 'த' },
  te: { name: 'Telugu', native: 'తెలుగు', speech: 'te-IN', short: 'తె' },
  mr: { name: 'Marathi', native: 'मराठी', speech: 'mr-IN', short: 'म' },
  gu: { name: 'Gujarati', native: 'ગુજરાતી', speech: 'gu-IN', short: 'ગુ' },
  kn: { name: 'Kannada', native: 'ಕನ್ನಡ', speech: 'kn-IN', short: 'ಕ' },
  ml: { name: 'Malayalam', native: 'മലയാളം', speech: 'ml-IN', short: 'മ' },
  pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', speech: 'pa-IN', short: 'ਪੰ' },
};

// ---------------------------------------------------------------- UI strings
const UI = {
  en: {
    search: 'Search parts and systems',
    'section.Whole Body': 'Whole Body',
    'section.Body Systems': 'Body Systems',
    'section.Organs': 'Organs',
    'section.My Lessons': 'My Lessons',
    'section.Teacher tools': 'Teacher tools',
    parts: 'Parts',
    nParts: '{n} parts',
    includes: 'Includes: {part}',
    sbFoot: 'Tap any part to hear its name, what it does and a fun fact.',
    together: 'Together',
    peek: 'Peek',
    apart: 'Apart',
    previous: '‹ Previous',
    next: 'Next ›',
    speaking: 'Speaking',
    didYouKnow: '💡 Did you know?',
    teacherNote: '🧑‍🏫 Teacher’s note',
    ofN: '{i} of {n}',
    startLesson: 'Start Lesson',
    quiz: '🎯 Quiz',
    pause: 'Pause',
    resume: 'Resume',
    end: 'End',
    skip: 'Skip',
    endQuiz: 'End Quiz',
    questionOf: 'Question {i} of {n}',
    tapIt: 'Tap it on the model',
    findThe: 'Can you find the {name}?',
    yesThats: 'Yes! That’s the {name} 🎉',
    thatsThe: 'That’s the {name}. Try again!',
    hereItIs: 'Here it is: the {name}',
    quizComplete: 'Quiz complete',
    youFound: 'You found {s} out of {n}!',
    perfect: 'Perfect score! 🏆',
    great: 'Great work! 🌟',
    goodTry: 'Good try! Let’s play again 💪',
    teamTurn: '{team}’s turn',
    teamWins: '{team} wins! 🏆',
    tie: 'It’s a tie! 🤝',
    ask: 'Ask',
    askTitle: 'Ask Body Buddy',
    askHint: 'Tap the microphone and ask a question about the body.',
    askPlaceholder: 'Type a question…',
    listening: 'Listening…',
    thinking: 'Thinking…',
    offlineAnswer: 'Offline answer',
    aiOn: 'AI ready',
    aiOff: 'Offline answers',
    noMic: 'Voice input is not available in this browser. Please type your question.',
    suggest1: 'What does the {part} do?',
    suggest2: 'Why does my heart beat faster when I run?',
    suggest3: 'How do I keep my {part} healthy?',
    narrationOn: 'Narration on',
    narrationOff: 'Narration off',
    handsOff: 'Hand control off',
    startingCamera: 'Starting camera…',
    showHand: 'Show your hand ✋ then pinch a part 🤏',
    cameraDenied: 'Camera permission was denied',
    noCamera: 'No camera found',
    trackingFailed: 'Hand tracking could not load: check the internet connection',
    translating: 'Translating to {lang}…',
    needsAi: '{lang} needs the AI assistant (add an API key). English and Hindi work offline.',
    noVoice: 'No {lang} voice on this device: showing text only. Install one in system settings.',
    saved: 'Saved',
    dashboard: 'Class Dashboard',
    lessons: 'My Lessons',
    settings: 'Settings',
    done: 'Done',
  },
  hi: {
    search: 'अंग और तंत्र खोजें',
    'section.Whole Body': 'पूरा शरीर',
    'section.Body Systems': 'शरीर के तंत्र',
    'section.Organs': 'अंग',
    'section.My Lessons': 'मेरे पाठ',
    'section.Teacher tools': 'शिक्षक उपकरण',
    parts: 'हिस्से',
    nParts: '{n} हिस्से',
    includes: 'इसमें: {part}',
    sbFoot: 'किसी भी हिस्से को छुएँ और उसका नाम, काम और एक मज़ेदार तथ्य सुनें।',
    together: 'जुड़ा हुआ',
    peek: 'झाँकें',
    apart: 'अलग-अलग',
    previous: '‹ पिछला',
    next: 'अगला ›',
    speaking: 'बोल रहा है',
    didYouKnow: '💡 क्या आप जानते हैं?',
    teacherNote: '🧑‍🏫 शिक्षक का नोट',
    ofN: '{n} में से {i}',
    startLesson: 'पाठ शुरू करें',
    quiz: '🎯 क्विज़',
    pause: 'रोकें',
    resume: 'जारी रखें',
    end: 'समाप्त',
    skip: 'छोड़ें',
    endQuiz: 'क्विज़ समाप्त',
    questionOf: 'प्रश्न {i} / {n}',
    tapIt: 'मॉडल पर उसे छुएँ',
    findThe: 'क्या आप {name} ढूँढ सकते हैं?',
    yesThats: 'हाँ! यह {name} है 🎉',
    thatsThe: 'यह {name} है। फिर से कोशिश करें!',
    hereItIs: 'यह रहा: {name}',
    quizComplete: 'क्विज़ पूरा हुआ',
    youFound: 'आपने {n} में से {s} ढूँढे!',
    perfect: 'पूरे अंक! 🏆',
    great: 'बहुत बढ़िया! 🌟',
    goodTry: 'अच्छी कोशिश! फिर से खेलें 💪',
    teamTurn: '{team} की बारी',
    teamWins: '{team} जीत गई! 🏆',
    tie: 'बराबरी! 🤝',
    ask: 'पूछें',
    askTitle: 'बॉडी बडी से पूछें',
    askHint: 'माइक दबाएँ और शरीर के बारे में सवाल पूछें।',
    askPlaceholder: 'अपना सवाल लिखें…',
    listening: 'सुन रहा है…',
    thinking: 'सोच रहा है…',
    offlineAnswer: 'ऑफ़लाइन उत्तर',
    aiOn: 'AI तैयार',
    aiOff: 'ऑफ़लाइन उत्तर',
    noMic: 'इस ब्राउज़र में आवाज़ से पूछना उपलब्ध नहीं है। कृपया सवाल लिखें।',
    suggest1: '{part} क्या काम करता है?',
    suggest2: 'दौड़ते समय मेरा दिल तेज़ क्यों धड़कता है?',
    suggest3: 'मैं अपने {part} को स्वस्थ कैसे रखूँ?',
    narrationOn: 'आवाज़ चालू',
    narrationOff: 'आवाज़ बंद',
    handsOff: 'हाथ नियंत्रण बंद',
    startingCamera: 'कैमरा शुरू हो रहा है…',
    showHand: 'अपना हाथ दिखाएँ ✋ फिर किसी हिस्से को चुटकी से पकड़ें 🤏',
    cameraDenied: 'कैमरे की अनुमति नहीं मिली',
    noCamera: 'कैमरा नहीं मिला',
    trackingFailed: 'हाथ ट्रैकिंग लोड नहीं हो सकी: इंटरनेट जाँचें',
    translating: '{lang} में अनुवाद हो रहा है…',
    needsAi: '{lang} के लिए AI सहायक चाहिए। अंग्रेज़ी और हिंदी ऑफ़लाइन चलती हैं।',
    noVoice: 'इस डिवाइस पर {lang} आवाज़ नहीं है: केवल लिखा हुआ दिखेगा।',
    saved: 'सहेजा गया',
    dashboard: 'कक्षा डैशबोर्ड',
    lessons: 'मेरे पाठ',
    settings: 'सेटिंग्स',
    done: 'हो गया',
  },
};

// Spoken phrases ({name} etc. are filled in). Translated for AI languages too.
const SPEECH = {
  en: {
    didYouKnow: 'Did you know?',
    canYouFind: 'Can you find the {name}?',
    wellDone: 'Well done! That’s the {name}.',
    tryAgain: 'That’s the {name}. Try again!',
    hereIs: 'Here is the {name}.',
    quizDone: 'You found {s} out of {n}!',
    perfect: 'Perfect score!',
    great: 'Great work!',
    lessonDone: 'Great job! You have learned all about the {title}.',
    teamTurn: '{team}, it’s your turn.',
    teamWins: '{team} wins! Well played, everyone.',
    tie: 'It’s a tie! Everyone did brilliantly.',
    hello: 'Hello class! Let’s explore the amazing human body.',
  },
  hi: {
    didYouKnow: 'क्या आप जानते हैं?',
    canYouFind: 'क्या आप {name} ढूँढ सकते हैं?',
    wellDone: 'शाबाश! यह {name} है।',
    tryAgain: 'यह {name} है। फिर से कोशिश करें!',
    hereIs: 'यह रहा {name}।',
    quizDone: 'आपने {n} में से {s} ढूँढे!',
    perfect: 'पूरे अंक!',
    great: 'बहुत बढ़िया!',
    lessonDone: 'बहुत बढ़िया! आपने {title} के बारे में सब कुछ सीख लिया।',
    teamTurn: '{team}, अब आपकी बारी है।',
    teamWins: '{team} जीत गई! सबने बहुत अच्छा खेला।',
    tie: 'बराबरी! सबने कमाल कर दिया।',
    hello: 'नमस्ते बच्चों! चलो अद्भुत मानव शरीर को जानें।',
  },
};

const fill = (s, vars = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));

// ---------------------------------------------------------------- AI translation cache
const CACHE_KEY = (lang) => `bx-tr-${lang}`;
const caches = {};
function cacheFor(lang) {
  if (!caches[lang]) {
    try {
      caches[lang] = JSON.parse(localStorage.getItem(CACHE_KEY(lang)) || '{}');
    } catch {
      caches[lang] = {};
    }
  }
  return caches[lang];
}
function saveCache(lang) {
  try {
    localStorage.setItem(CACHE_KEY(lang), JSON.stringify(caches[lang]));
  } catch {
    /* storage full or blocked: keep the in-memory copy */
  }
}

export class I18n {
  constructor(lang = 'en') {
    this.lang = LANGS[lang] ? lang : 'en';
    this.pending = new Map();
  }

  get info() {
    return LANGS[this.lang];
  }

  /** UI string. English and Hindi have hand-written UI; other languages show English UI. */
  t(key, vars) {
    const s = UI[this.lang]?.[key] ?? UI.en[key] ?? key;
    return fill(s, vars);
  }

  /** Spoken phrase in the narration language. */
  say(key, vars) {
    const s = SPEECH[this.lang]?.[key] ?? cacheFor(this.lang)[`say|${key}`] ?? SPEECH.en[key];
    return fill(s, vars);
  }

  /** Part text in the current language: { name, summary, fact }. */
  part(modelId, partName) {
    const en = LESSONS[modelId]?.parts[partName];
    const base = { name: partName, summary: en?.[0] ?? '', fact: en?.[1] ?? '' };
    if (this.lang === 'en') return base;
    if (this.lang === 'hi') {
      const h = HINDI[modelId]?.parts[partName];
      return h ? { name: h[0], summary: h[1], fact: h[2] } : base;
    }
    const c = cacheFor(this.lang);
    const k = `${modelId}|${partName}`;
    return { name: c[`${k}|name`] ?? base.name, summary: c[`${k}|summary`] ?? base.summary, fact: c[`${k}|fact`] ?? base.fact };
  }

  model(modelId, fallback = {}) {
    const en = { title: fallback.title ?? modelId, subtitle: fallback.subtitle ?? '', intro: LESSONS[modelId]?.intro ?? '' };
    if (this.lang === 'en') return en;
    if (this.lang === 'hi') {
      const h = HINDI[modelId];
      return h ? { title: h.title, subtitle: h.subtitle, intro: h.intro } : en;
    }
    const c = cacheFor(this.lang);
    return { title: c[`${modelId}|title`] ?? en.title, subtitle: c[`${modelId}|subtitle`] ?? en.subtitle, intro: c[`${modelId}|intro`] ?? en.intro };
  }

  /** True if this model still needs an AI translation in the current language. */
  needsTranslation(modelId) {
    if (LANGS[this.lang].offline) return false;
    const c = cacheFor(this.lang);
    const parts = Object.keys(LESSONS[modelId]?.parts ?? {});
    return !c[`${modelId}|intro`] || parts.some((p) => !c[`${modelId}|${p}|fact`]) || !c['say|canYouFind'];
  }

  /** Fetches translations for one model (and the spoken phrases) from the server. */
  async translateModel(modelId, englishTitle, englishSubtitle) {
    const lang = this.lang;
    const key = `${lang}:${modelId}`;
    if (this.pending.has(key)) return this.pending.get(key);
    const items = [
      { key: `${modelId}|title`, text: englishTitle },
      { key: `${modelId}|subtitle`, text: englishSubtitle },
      { key: `${modelId}|intro`, text: LESSONS[modelId].intro },
      ...Object.entries(LESSONS[modelId].parts).flatMap(([p, [summary, fact]]) => [
        { key: `${modelId}|${p}|name`, text: p },
        { key: `${modelId}|${p}|summary`, text: summary },
        { key: `${modelId}|${p}|fact`, text: fact },
      ]),
      ...Object.entries(SPEECH.en).map(([k, text]) => ({ key: `say|${k}`, text })),
    ];
    const job = fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang, items }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
        const c = cacheFor(lang);
        Object.assign(c, data.items ?? {});
        saveCache(lang);
        return true;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, job);
    return job;
  }
}

/** Applies data-i18n / data-i18n-placeholder / data-i18n-title attributes in the page. */
export function applyStatic(i18n, root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = i18n.t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => (el.placeholder = i18n.t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = i18n.t(el.dataset.i18nTitle);
    el.setAttribute('aria-label', el.title);
  });
  document.documentElement.lang = i18n.lang;
}
