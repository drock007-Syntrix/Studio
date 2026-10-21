# Syntrix Studio

A free, personal AI image studio that runs on Cloudflare's free plan. No API keys, no subscription.

## What it does
- **One composer** for images and motion clips. `⌘/Ctrl + Enter` generates.
- **5 free models**, each with its own settings: FLUX.1 schnell, SDXL Lightning, SDXL Base, DreamShaper 8, and Restyle a photo (image-to-image). Searchable model picker.
- **Per-model settings** rendered from one catalog: aspect ratios, steps, guidance, negative prompt, start-image strength.
- **Start image** from a new upload, your uploads library, or any past result.
- **✨ Enhance** rewrites a rough prompt into a detailed one (Llama 3.1 on Workers AI).
- **Batch** up to 4 results per press, each with its own seed.
- **Gallery** with All / Images / Motion / Favorites / Uploads tabs (arrow keys move between them), masonry tiles at true aspect ratio, live loading tiles.
- **Per-result actions**: favorite, reuse (restores model, settings, prompt and start image), delete, retry on failure.
- **Viewer** with full prompt (copy), model, every setting, seed, date, download, favorite, Reuse and Recreate. Arrow keys move between results.
- **Select mode**: tap or shift-click a range, then bulk download, favorite, unfavorite or delete. `Esc` exits.
- **Undo** any delete for 6 seconds.
- **Motion clips**: your still animated with a camera move (dolly, orbit, crane, crash zoom, FPV, handheld, pan). Not AI video.
- History and images stay in your browser (IndexedDB). Favorites never age out; other results cap at 300.

## Cost
Cloudflare's free Workers plan includes 10,000 AI "neurons" a day. FLUX.1 schnell and Enhance draw on that (roughly 150 FLUX images a day).
Cloudflare lists the Stable Diffusion models at $0 per step. Over the limit, generation pauses until 00:00 UTC. The free plan never bills.
AI video is not included: no free video model exists on Workers AI.

## Set up (from an iPad is fine)
1. dash.cloudflare.com → sign up (free).
2. Workers & Pages → Create → Import a repository → connect GitHub → pick `Studio` → Deploy.
3. Open the `*.workers.dev` link it gives you.
4. Optional lock: Worker → Settings → Variables and Secrets → add a Secret `APP_PASSWORD`.

## Credits
The feature set follows the studio pattern of [OpenHiggsfield](https://github.com/wide-trace/open-higgsfield) (one composer, catalog-driven
settings, asset picker, selection mode, undo). That repository has no license file, so no code was copied; this is an independent build
on different infrastructure.
