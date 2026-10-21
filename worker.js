// Cloudflare Worker: serves the Studio page and runs free image generation on Workers AI.
// Free plan: 10,000 AI "neurons" a day. FLUX.1 schnell and the Llama prompt helper draw on that allowance;
// the Stable Diffusion models are listed by Cloudflare at $0 per step. Over the limit, calls fail until
// 00:00 UTC. The free plan never bills you.
// Optional: set an APP_PASSWORD secret so only you can use your allowance.

// Server-side catalog: what each model accepts. The page has the matching UI catalog in index.html.
const MODELS = {
  'flux-schnell': { id: '@cf/black-forest-labs/flux-1-schnell', kind: 'flux', maxSteps: 8 },
  'sdxl-lightning': { id: '@cf/bytedance/stable-diffusion-xl-lightning', kind: 'sd', maxSteps: 20 },
  'sdxl-base': { id: '@cf/stabilityai/stable-diffusion-xl-base-1.0', kind: 'sd', maxSteps: 20 },
  'dreamshaper': { id: '@cf/lykon/dreamshaper-8-lcm', kind: 'sd', maxSteps: 20 },
  'sd15-img2img': { id: '@cf/runwayml/stable-diffusion-v1-5-img2img', kind: 'sd', maxSteps: 20, needsImage: true },
};
const LLM = '@cf/meta/llama-3.1-8b-instruct';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const clamp = (v, lo, hi, d) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : d);
const size = (v) => Math.round(clamp(v, 256, 2048, 1024) / 8) * 8;

function aiError(e) {
  const msg = String(e?.message || e);
  if (/neuron|quota|daily|limit|429|capacity/i.test(msg)) {
    return json({ error: "Today's free allowance is used up. It resets at 00:00 UTC." }, 429);
  }
  return json({ error: `Image engine error: ${msg.slice(0, 200)}` }, 502);
}

async function readBody(request, env) {
  let body;
  try { body = await request.json(); } catch { return { err: json({ error: 'Bad request' }, 400) }; }
  if (env.APP_PASSWORD && body.password !== env.APP_PASSWORD) return { err: json({ error: 'Wrong password' }, 401) };
  return { body };
}

async function generate(body, env) {
  const m = MODELS[body.model];
  if (!m) return json({ error: 'Unknown model' }, 400);
  const prompt = String(body.prompt || '').trim().slice(0, 2000);
  if (!prompt) return json({ error: 'Write a prompt first.' }, 400);
  const seed = Number.isInteger(body.seed) ? body.seed : Math.floor(Math.random() * 1e9);
  const image_b64 = typeof body.image_b64 === 'string' && body.image_b64.length ? body.image_b64.replace(/^data:[^,]+,/, '') : null;
  if (m.needsImage && !image_b64) return json({ error: 'This model needs a start image.' }, 400);

  try {
    if (m.kind === 'flux') {
      const out = await env.AI.run(m.id, { prompt, seed, steps: Math.round(clamp(body.steps, 1, m.maxSteps, 4)) });
      const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
      return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
    }
    const input = {
      prompt, seed,
      width: size(body.width), height: size(body.height),
      num_steps: Math.round(clamp(body.steps, 1, m.maxSteps, 20)),
      guidance: clamp(body.guidance, 0, 20, 7.5),
    };
    const negative = String(body.negative || '').trim().slice(0, 1000);
    if (negative) input.negative_prompt = negative;
    if (image_b64) { input.image_b64 = image_b64; input.strength = clamp(body.strength, 0.05, 1, 0.6); }
    const out = await env.AI.run(m.id, input);
    return new Response(out, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' } });
  } catch (e) { return aiError(e); }
}

async function enhance(body, env) {
  const prompt = String(body.prompt || '').trim().slice(0, 1000);
  if (!prompt) return json({ error: 'Write a prompt first.' }, 400);
  try {
    const out = await env.AI.run(LLM, {
      max_tokens: 160,
      messages: [
        { role: 'system', content: 'You rewrite prompts for an AI image generator. Return ONE vivid prompt describing a single still image: subject, setting, composition, lighting, lens, mood. Under 70 words. No preamble, no quotes, no lists.' },
        { role: 'user', content: prompt },
      ],
    });
    const text = String(out?.response || '').trim().replace(/^["']|["']$/g, '');
    return text ? json({ prompt: text }) : json({ error: 'No suggestion came back. Try again.' }, 502);
  } catch (e) { return aiError(e); }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/health') {
      return json({ ok: Boolean(env.AI), locked: Boolean(env.APP_PASSWORD), models: Object.keys(MODELS) });
    }
    if (pathname === '/api/image' || pathname === '/api/enhance') {
      if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
      if (!env.AI) return json({ error: 'Workers AI is not connected. Add an AI binding named AI.' }, 500);
      const { body, err } = await readBody(request, env);
      if (err) return err;
      return pathname === '/api/image' ? generate(body, env) : enhance(body, env);
    }
    return env.ASSETS.fetch(request);
  },
};
