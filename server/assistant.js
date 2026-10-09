// Server-side AI teaching assistant for Body Explorer.
// The browser never sees the API key: it calls these endpoints, and this module
// calls Claude with the Anthropic SDK.
//
//   GET  /api/status     -> { ai: boolean }
//   POST /api/ask        -> { answer }            child-friendly answer to a question
//   POST /api/translate  -> { items: {key: text} } narration in another language

// The SDK is loaded lazily, only when an API key is configured, so the free
// app starts even if the package has not been installed.
let Anthropic = null;
async function loadSdk() {
  Anthropic ??= (await import('@anthropic-ai/sdk')).default;
  return Anthropic;
}

const MODEL = 'claude-opus-5-5';

export const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
  kn: 'Kannada',
  ml: 'Malayalam',
  pa: 'Punjabi',
};

const TEACHER_PROMPT = `You are "Body Buddy", the friendly voice of Body Explorer, a 3D human-body app that teachers use in classrooms with children aged about 7 to 12.

A child (or their teacher) asks you a question out loud while looking at a 3D model. You will be told which body system and which part is on screen; use that to understand vague questions like "what does this do?".

How to answer:
- Answer in 2 to 4 short, simple sentences that a 9-year-old understands, then add one fun, true fact if it fits.
- Your answer is read aloud by text-to-speech, so write plain sentences only: no markdown, lists, emojis or symbols, and spell out numbers that are hard to read aloud.
- Be warm and encouraging. Use everyday comparisons (a pump, a sponge, a highway).
- Be scientifically accurate. If something is uncertain, say "scientists think".
- If a question is about something worrying (an illness, an injury, a scary feeling), give a gentle, general answer and say a grown-up such as a parent, teacher or doctor can help. Never diagnose or give medical advice.
- Keep to bodies, health, science and learning. If asked about something unrelated or not suitable for children, kindly steer back to the body, for example "That's a fun question, but I'm a body expert! Ask me about your heart or your brain."
- Never ask for personal information.`;

let client = null;
const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
function getClient() {
  return client;
}
async function initClient() {
  if (!hasKey()) return null;
  if (!client) {
    try {
      client = new (await loadSdk())();
    } catch (err) {
      console.warn('[assistant] @anthropic-ai/sdk is not installed: run `npm install` to use the AI assistant.');
      return null;
    }
  }
  return client;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 64_000) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

const clip = (s, n) => String(s ?? '').slice(0, n);

function textOf(response) {
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

// Server-side fallbacks: if a safety classifier declines, the API retries on
// Anthropic's recommended fallback model inside the same call.
const BASE = { model: MODEL, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' };

async function callClaude(params) {
  return getClient().beta.messages.create({ ...BASE, ...params });
}

// Long outputs (a whole model's narration) are streamed to avoid HTTP timeouts.
async function streamClaude(params) {
  return getClient().beta.messages.stream({ ...BASE, ...params }).finalMessage();
}

async function ask(body) {
  const question = clip(body.question, 500).trim();
  if (!question) return { status: 400, data: { error: 'Please ask a question.' } };
  const language = LANGUAGE_NAMES[body.language] ?? 'English';
  const context = [
    `On screen: ${clip(body.model, 80) || 'the human body'}.`,
    body.part ? `Selected part: ${clip(body.part, 80)}${body.summary ? ` (${clip(body.summary, 300)})` : ''}.` : 'No part is selected.',
    `Reply in ${language}${language === 'English' ? '' : `, using simple words and the ${language} script`}.`,
  ].join('\n');

  const response = await callClaude({
    max_tokens: 4000,
    output_config: { effort: 'low' }, // short spoken answers: keep latency low
    system: TEACHER_PROMPT,
    messages: [{ role: 'user', content: `${context}\n\nQuestion: ${question}` }],
  });

  if (response.stop_reason === 'refusal') {
    return { status: 200, data: { answer: "Hmm, I can't answer that one. Let's ask your teacher together!", refused: true } };
  }
  return { status: 200, data: { answer: textOf(response) } };
}

async function translate(body) {
  const language = LANGUAGE_NAMES[body.language];
  const items = Array.isArray(body.items) ? body.items.slice(0, 200) : [];
  if (!language || body.language === 'en' || !items.length) return { status: 400, data: { error: 'Nothing to translate.' } };

  const source = Object.fromEntries(items.map((it) => [clip(it.key, 120), clip(it.text, 600)]));
  const response = await streamClaude({
    max_tokens: 32000,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            translations: {
              type: 'array',
              items: {
                type: 'object',
                properties: { key: { type: 'string' }, text: { type: 'string' } },
                required: ['key', 'text'],
                additionalProperties: false,
              },
            },
          },
          required: ['translations'],
          additionalProperties: false,
        },
      },
    },
    system: `You translate narration for a children's human-body learning app into ${language}. Use simple words a 9-year-old understands, the ${language} script, and the common school terms for body parts (add the English name in brackets only where children usually learn it that way). Keep each text about the same length. Keep placeholders in curly braces, such as {name}, {team}, {title}, {s} and {n}, exactly as they are (do not translate them). Return every key exactly as given.`,
    messages: [{ role: 'user', content: JSON.stringify(source) }],
  });

  if (response.stop_reason === 'refusal') return { status: 502, data: { error: 'Translation was declined.' } };
  const parsed = JSON.parse(textOf(response));
  const out = {};
  for (const { key, text } of parsed.translations ?? []) if (key in source) out[key] = text;
  return { status: 200, data: { items: out } };
}

/** Connect-style middleware, mounted at /api by the Vite dev and preview servers. */
export function assistantMiddleware() {
  return async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0];
    try {
      if (path === '/status' && req.method === 'GET') return send(res, 200, { ai: Boolean(await initClient()), model: MODEL });
      if (path !== '/ask' && path !== '/translate') return next();
      if (req.method !== 'POST') return send(res, 405, { error: 'Use POST' });
      if (!(await initClient())) return send(res, 503, { error: 'AI assistant is not configured (set ANTHROPIC_API_KEY).' });
      const body = await readJson(req);
      const { status, data } = path === '/ask' ? await ask(body) : await translate(body);
      return send(res, status, data);
    } catch (err) {
      if (!Anthropic) {
        console.error('[assistant]', err);
        return send(res, 500, { error: 'Something went wrong.' });
      }
      if (err instanceof Anthropic.AuthenticationError) return send(res, 503, { error: 'The API key was rejected.' });
      if (err instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Too many questions right now, try again in a moment.' });
      if (err instanceof Anthropic.APIError) return send(res, 502, { error: `AI service error (${err.status ?? 'network'}).` });
      if (err instanceof SyntaxError) return send(res, 400, { error: 'Bad request.' });
      console.error('[assistant]', err);
      return send(res, 500, { error: 'Something went wrong.' });
    }
  };
}
