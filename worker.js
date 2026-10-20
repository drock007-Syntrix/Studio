// Cloudflare Worker: serves the Studio page and generates images with Workers AI.
// The free Workers plan includes 10,000 AI "neurons" a day; past that, requests fail until 00:00 UTC (never billed).
// Optional: set an APP_PASSWORD variable so only you can use your daily allowance.

const MODEL = '@cf/black-forest-labs/flux-1-schnell';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: Boolean(env.AI), locked: Boolean(env.APP_PASSWORD) });
    }

    if (url.pathname === '/api/image') {
      if (request.method !== 'POST') return json({ error: 'Use POST' }, 405);
      if (!env.AI) return json({ error: 'Workers AI is not connected. Add an AI binding named AI.' }, 500);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'Bad request' }, 400); }
      if (env.APP_PASSWORD && body.password !== env.APP_PASSWORD) return json({ error: 'Wrong password' }, 401);

      const prompt = String(body.prompt || '').trim().slice(0, 2000);
      if (!prompt) return json({ error: 'Write a prompt first.' }, 400);
      const steps = Math.min(8, Math.max(1, Number(body.steps) || 4));
      const seed = Number.isInteger(body.seed) ? body.seed : Math.floor(Math.random() * 1e9);

      try {
        const out = await env.AI.run(MODEL, { prompt, steps, seed });
        const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } });
      } catch (e) {
        const msg = String(e?.message || e);
        // Free-plan quota exhaustion surfaces as an error from AI.run.
        if (/neuron|quota|limit|429|capacity/i.test(msg)) {
          return json({ error: 'Today\'s free image allowance is used up. It resets at 00:00 UTC.' }, 429);
        }
        return json({ error: `Image engine error: ${msg.slice(0, 200)}` }, 502);
      }
    }

    // Everything else is the page itself.
    return env.ASSETS.fetch(request);
  },
};
