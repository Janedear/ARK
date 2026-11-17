# ARK Crisis Suite — Hosting Agent Deployment Prompt

> Copy everything below this line and paste it to your hosting/deployment agent.

---

## TASK: Deploy ARK Crisis Suite + Cloudflare Backend

You are deploying the **ARK Crisis Suite** — an offline-first emergency communications and survival tool — along with its Cloudflare Workers backend.

### What You Are Deploying

1. **`ARK-CRISIS-SUITE.html`** — The entire app. Single HTML file (~567 KB). Zero external dependencies. Runs from filesystem, USB, or any static host.
2. **`backend/`** — Cloudflare Worker that receives bug reports and serves hot-patches to the app.
3. **`backend/deploy.sh`** — Automated deploy script. Handles KV creation, secret generation, and Worker deployment.

---

## STEP 1: Deploy the Cloudflare Backend

### Prerequisites
You need:
- `CLOUDFLARE_API_TOKEN` — Create at https://dash.cloudflare.com/profile/api-tokens with "Edit Cloudflare Workers" template
- `CLOUDFLARE_ACCOUNT_ID` — Found at https://dash.cloudflare.com → right sidebar

### Run the deploy script
```bash
cd backend
chmod +x deploy.sh
export CLOUDFLARE_API_TOKEN="your_token_here"
export CLOUDFLARE_ACCOUNT_ID="your_account_id_here"
bash deploy.sh
```

The script will:
1. Install Node dependencies (`npm install`)
2. Create the KV namespace (`ARK_KV`)
3. Inject the real KV ID into `wrangler.toml`
4. Generate a random admin secret
5. Deploy the Worker to Cloudflare
6. Print the Worker URL (e.g. `https://ark-backend.YOUR-SUBDOMAIN.workers.dev`)

**Save the output.** You'll need the Worker URL and admin secret for Step 2.

### What the Worker does
- `POST /halo/bugs` — receives bug reports from the app, stores in KV, emails `hello@halosuite.ai` via SendGrid
- `GET /halo/patches/latest.json` — returns hot-patch JSON for the app to apply
- `POST /admin/patches` (X-Admin-Secret header) — push a new patch
- `GET /admin/bugs` (X-Admin-Secret header) — view received bugs
- `DELETE /admin/patches/active` (X-Admin-Secret header) — clear active patch

### Optional: Enable email notifications for bug reports
```bash
cd backend
npx wrangler secret put SENDGRID_API_KEY
# Enter your SendGrid API key when prompted
```
If SENDGRID_API_KEY is not set, bug reports are still stored in KV — email is just skipped.

---

## STEP 2: Wire the Backend URL Into the App

Open `ARK-CRISIS-SUITE.html` and find lines ~5786–5787 (search for `PATCH_URL`):

```javascript
const PATCH_URL = 'https://ark.halosuite.ai/halo/patches/latest.json';
const BUG_URL   = 'https://ark.halosuite.ai/halo/bugs';
```

Replace both URLs with your deployed Worker URL:
```javascript
const PATCH_URL = 'https://ark-backend.YOUR-SUBDOMAIN.workers.dev/halo/patches/latest.json';
const BUG_URL   = 'https://ark-backend.YOUR-SUBDOMAIN.workers.dev/halo/bugs';
```

Save the file.

---

## STEP 3: Host the App File

The app is a single HTML file. Choose any of these:

### Option A: Cloudflare Pages (recommended — free, fast, global CDN)
```bash
npx wrangler pages deploy . --project-name ark-crisis-suite
```
Or drag-and-drop the HTML file at https://pages.cloudflare.com

### Option B: GitHub Pages
1. Push `ARK-CRISIS-SUITE.html` to a repo
2. Enable Pages on the repo → deploy from `main` branch

### Option C: Any static host
Upload `ARK-CRISIS-SUITE.html` to Netlify, Vercel, S3+CloudFront, or any web server.

### Option D: Offline / USB use
No hosting needed. The file works directly from the filesystem — just open it in a browser. Service worker caching won't work (requires HTTP), but all features function offline.

---

## STEP 4: Custom Domain (Optional)

If deploying to `ark.halosuite.ai`:

1. Add a CNAME record pointing `ark.halosuite.ai` → your Cloudflare Pages / static host
2. Update `PATCH_URL` and `BUG_URL` to `https://ark.halosuite.ai/halo/patches/latest.json` etc.
3. Add a custom domain in your Cloudflare Worker settings pointing to the same subdomain or use a separate `api.halosuite.ai` → Worker

---

## STEP 5: Verify Deployment

After deployment, test these endpoints with curl or a browser:

```bash
# Should return {"active":false} or a patch object
curl https://YOUR-WORKER.workers.dev/halo/patches/latest.json

# Should return 400 (missing body) — proves the endpoint exists
curl -X POST https://YOUR-WORKER.workers.dev/halo/bugs

# Admin: view bugs (replace YOUR-ADMIN-SECRET with the value from deploy.sh output)
curl -H "X-Admin-Secret: YOUR-ADMIN-SECRET" https://YOUR-WORKER.workers.dev/admin/bugs
```

Then open the app, go to **Settings → App** and check that:
- The app loads without errors
- Bug reports don't show a network error in the console
- The patch check runs silently on boot (check DevTools console for `ARK patch check`)

---

## Pushing a Hot-Patch

To update the running app without redeploying the file:

```bash
curl -X POST https://YOUR-WORKER.workers.dev/admin/patches \
  -H "X-Admin-Secret: YOUR-ADMIN-SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "ops": [
      {
        "op": "set_text",
        "selector": "#some-element",
        "value": "Updated text"
      }
    ]
  }'
```

**Supported patch operations:**
- `replace_html` — replace innerHTML of an element (sanitized)
- `set_text` — set textContent
- `set_attr` — set an attribute (blocked list enforced)
- `set_class` — set className
- `store_set` — set a localStorage key (primitives only)
- `store_delete` — delete a localStorage key
- `store_clear` — clear all localStorage (use with caution)
- `add_css` — inject a `<style>` block (no @import, url(), javascript:)
- `reload` — force a page reload after applying other ops

The app polls for patches on boot (10s delay) and every 2 hours.

To clear the active patch:
```bash
curl -X DELETE https://YOUR-WORKER.workers.dev/admin/patches/active \
  -H "X-Admin-Secret: YOUR-ADMIN-SECRET"
```

---

## File Manifest

```
ARK-CRISIS-SUITE.html          Main app — 9896 lines, 567 KB
backend/
  src/index.ts                 Cloudflare Worker TypeScript source
  wrangler.toml                Worker config (KV ID injected by deploy.sh)
  deploy.sh                    One-shot deploy script
  package.json                 Node deps (wrangler, typescript)
  tsconfig.json                TypeScript config
  DEPLOY.md                    Detailed deploy guide
AGENT-DEPLOY-PROMPT.md         This file
```

---

## What's In the App (11 Tabs)

| Tab | What It Does |
|-----|-------------|
| 🏠 Home | Alert level, quick actions, real-time stats, battery, offline status |
| 💬 Messages | Signed encrypted messages, hub sync, search, channel filters |
| 📚 Survival | 24 emergency guides with search, filtering, accordion, CPR/bites/hypothermia |
| 📦 Resources | Food/water/power tracking with FEMA presets, export/import, duration math |
| 👥 Household | Members, medical info, vehicles, go-bag, meeting points, print card |
| 🌐 Network | Hub deploy/join, QR scanner (BarcodeDetector), heartbeat, IP detection |
| 🏥 Medical | CPR timer (100bpm, pause/resume, breath prompts), Heimlich, med log |
| 🗺️ Map | Custom OSM tile renderer, markers, distance+bearing calc, scale bar, offline cache |
| 📻 Radio | Morse encoder/decoder with speed control, phonetic alphabet, frequency logbook |
| 🤖 ARKai | HALO Lite (rule-based, instant) + HALO+ (WebLLM/Llama 3.2, 32-entry KB) |
| ⚙️ Settings | Dark mode, backup/restore, wipe with TYPE-TO-CONFIRM, notification permissions |

**Additional modules:** Missing Persons (5-checklist system + status updates), Checklist (Daily/Bug-Out/Shelter/Evacuation/72hr + custom), QR encoder, ECDSA message signing, SoftHub (BroadcastChannel mesh), hot-patch system, bug reporting pipeline.

---

## Privacy Notes

- No personal address, phone number, or personal email is embedded in the app or backend
- Bug reports go to `hello@halosuite.ai`
- All user data stays in `localStorage` / `IndexedDB` on the user's device
- No analytics, no trackers, no external CDN calls at runtime

---

*ARK Crisis Suite — HaloSuite · hello@halosuite.ai*
