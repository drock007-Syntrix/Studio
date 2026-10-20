# Syntrix Studio (free)

Prompt-to-image studio with style presets, camera-move motion clips, and a gallery saved on your device.

## Free engine: Cloudflare Workers AI
Deployed as a Cloudflare Worker (`worker.js` + `wrangler.toml`), images come from Workers AI (FLUX.1 schnell) using
the free plan's 10,000 daily "neurons": about 100–170 images a day. Past that, generation pauses until 00:00 UTC.
The free plan never bills you; it just stops.

Set up (all doable from an iPad in Safari):
1. dash.cloudflare.com → sign up (free).
2. Workers & Pages → Create → Import a repository → connect GitHub → pick `Studio` → Deploy.
3. Optional lock: your Worker → Settings → Variables and Secrets → add a Secret named `APP_PASSWORD`.

## Backup engine
Opened anywhere else (e.g. GitHub Pages), the page falls back to Pollinations' old keyless image link, which is unreliable.
