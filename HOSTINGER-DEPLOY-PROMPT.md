# ARK Crisis Suite — Hostinger Deployment Prompt

## COPY EVERYTHING BELOW THIS LINE AND PASTE TO YOUR HOSTINGER AGENT

---

You are deploying the ARK Crisis Suite to Hostinger. There are two parts:

1. **The app** — `ARK-CRISIS-SUITE.html` goes on Hostinger's static hosting (or hPanel File Manager)
2. **The backend** — a Cloudflare Worker (Hostinger can't run Node backend code, so we use Cloudflare's free tier for the API)

---

## PART 1 — Upload the App to Hostinger

### Via hPanel File Manager
1. Log in to hPanel → **File Manager**
2. Navigate to `public_html` (or your domain's root folder)
3. Upload `ARK-CRISIS-SUITE.html`
4. If you want it at the root URL, rename it to `index.html`
5. If you want it at `/ark`, create a folder called `ark` and upload it there as `index.html`

### Via FTP (if you prefer)
Use the FTP credentials from hPanel → **FTP Accounts**:
- Upload `ARK-CRISIS-SUITE.html` to `public_html/` (rename to `index.html` for root access)

The file is fully self-contained — no other files needed, no npm install, no build step.

---

## PART 2 — Deploy the Cloudflare Worker Backend

The backend handles bug reports and hot-patches. It runs on Cloudflare's free Workers tier (100,000 requests/day free).

### You need
- A free Cloudflare account: https://dash.cloudflare.com/sign-up
- A Cloudflare API token with **Edit Cloudflare Workers** permissions:
  - Go to https://dash.cloudflare.com/profile/api-tokens
  - Click **Create Token** → use **Edit Cloudflare Workers** template
  - Copy the token
- Your Cloudflare Account ID:
  - Visible on the right sidebar of https://dash.cloudflare.com (after selecting any domain or the Workers section)

### Deploy command
On any machine with Node.js (or in a terminal on your computer):

```bash
cd backend
export CLOUDFLARE_API_TOKEN="paste_your_token_here"
export CLOUDFLARE_ACCOUNT_ID="paste_your_account_id_here"
bash deploy.sh
```

The script outputs something like:
```
Your ARK backend is live.
  Bug reports:  POST https://ark-backend.yourname.workers.dev/halo/bugs
  Latest patch: GET  https://ark-backend.yourname.workers.dev/halo/patches/latest.json
  Admin secret: abc123xyz...
```

**Save the Worker URL and admin secret — you need them in Part 3.**

---

## PART 3 — Wire Backend URL Into the App

Before uploading the HTML file (or after — you can re-upload):

Open `ARK-CRISIS-SUITE.html` in a text editor and search for `PATCH_URL` (around line 5786).

Find these two lines:
```javascript
const PATCH_URL = 'https://ark.halosuite.ai/halo/patches/latest.json';
const BUG_URL   = 'https://ark.halosuite.ai/halo/bugs';
```

Replace with your actual Worker URL:
```javascript
const PATCH_URL = 'https://ark-backend.YOUR-SUBDOMAIN.workers.dev/halo/patches/latest.json';
const BUG_URL   = 'https://ark-backend.YOUR-SUBDOMAIN.workers.dev/halo/bugs';
```

Save, then re-upload to `public_html/`.

---

## PART 4 — Test It

1. Visit your Hostinger URL — the app should load instantly
2. Open browser DevTools (F12) → Console tab
3. You should see: `ARK patch check` with no network errors
4. Test the backend directly:

```
GET https://your-worker.workers.dev/halo/patches/latest.json
```
Should return: `{"active":false}` or a patch object

---

## PART 5 — Custom Domain on Hostinger (Optional)

If you have a domain like `ark.halosuite.ai` pointed at Hostinger:
1. In hPanel → **Domains** → point your subdomain to the same `public_html` or a subfolder
2. Upload the HTML there
3. Update `PATCH_URL` / `BUG_URL` to use `https://api.halosuite.ai/halo/...` and add that subdomain as a custom domain on the Cloudflare Worker

---

## File List (what's in the zip)

```
ARK-CRISIS-SUITE.html          → upload this to Hostinger public_html/
backend/deploy.sh              → run this to deploy the Cloudflare Worker
backend/src/index.ts           → Worker source (deploy.sh handles building)
backend/wrangler.toml          → Worker config
backend/package.json           → Worker deps
backend/DEPLOY.md              → detailed backend deploy reference
HOSTINGER-DEPLOY-PROMPT.md    → this file
```

---

## Pushing a Hot-Patch Later (optional)

To push a live fix to all running instances without redeploying the file:

```bash
curl -X POST https://YOUR-WORKER.workers.dev/admin/patches \
  -H "X-Admin-Secret: YOUR-ADMIN-SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "ops": [
      { "op": "set_text", "selector": "#some-element", "value": "Updated text" }
    ]
  }'
```

Supported ops: `replace_html`, `set_text`, `set_attr`, `set_class`, `store_set`, `store_delete`, `store_clear`, `add_css`, `reload`

The app polls for patches on boot and every 2 hours automatically.

---

*ARK Crisis Suite · HaloSuite · hello@halosuite.ai*
