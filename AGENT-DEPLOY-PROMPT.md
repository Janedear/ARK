# ARK Crisis Suite — Hosting Agent Deployment Prompt

> Copy everything below this line and paste it to your hosting/deployment agent.

---

## TASK: Deploy ARK Crisis Suite to Hostinger Shared Hosting

You are deploying the **ARK Crisis Suite** — an offline-first emergency communications and survival tool for HaloSuite. This is a **single PHP file** deployment designed for Hostinger shared hosting.

---

## THE FILE

**`ARK.php`** — 10,014 lines, ~575 KB. Contains the entire app and backend in one file.

No zip. No npm. No Node.js. No Cloudflare. No build step. No terminal required.

---

## DEPLOYMENT STEPS

### Step 1 — Upload to Hostinger

**Via hPanel File Manager:**
1. Log in to Hostinger hPanel
2. Click **File Manager**
3. Navigate to `public_html/`
4. Upload `ARK.php`
5. Done

**Via FTP:**
- Upload `ARK.php` to `public_html/`

The file auto-creates `ark-data/bugs/` and `ark-data/patches/` on first request. Nothing else needed.

---

### Step 2 — Confirm It Works

| What | URL |
|------|-----|
| App | `https://yourdomain.com/ARK.php` |
| Admin panel | `https://yourdomain.com/ARK.php?admin` |
| Patch endpoint | `https://yourdomain.com/ARK.php?patches` (GET → `{"active":false}`) |
| Bug endpoint | `https://yourdomain.com/ARK.php?bugs` (POST → `{"status":"ok","id":"..."}`) |

Admin password: `ARK-admin-2024`

The app loads with a warm cream design (`--bg-primary:#f0ebe0`). If you see that, it's correct.

---

## HOW ARK.PHP ROUTES REQUESTS

```
POST  ARK.php?bugs      → stores bug report in ark-data/bugs/
GET   ARK.php?patches   → returns ark-data/patches/latest.json
GET   ARK.php?admin     → admin panel (session auth)
*     anything else     → serves the full ARK Crisis Suite app
```

PHP auto-creates `ark-data/` and sub-folders on first run. No manual setup.

---

## PUSHING A HOT-PATCH (live fix without re-upload)

1. Go to `https://yourdomain.com/ARK.php?admin`
2. Sign in (password: `ARK-admin-2024`)
3. Paste patch JSON:
```json
{
  "active": true,
  "ops": [
    { "op": "set_text", "selector": "#target-id", "value": "New text" }
  ]
}
```
4. Click **Push Patch**

Supported ops: `replace_html`, `set_text`, `set_attr`, `set_class`, `store_set`, `store_delete`, `store_clear`, `add_css`, `reload`

The app polls for patches on boot (10s delay) and every 2 hours.

---

## APP OVERVIEW (11 Tabs)

| Tab | Function |
|-----|----------|
| 🏠 Home | Alert level, quick actions, real-time stats, battery, offline status |
| 💬 Messages | Signed encrypted messages, hub sync, search, channel filters |
| 📚 Survival | 24 emergency guides — CPR, bites, hypothermia, shelter, water |
| 📦 Resources | Food/water/power tracking, FEMA presets, export/import |
| 👥 Household | Members, medical info, vehicles, go-bag, meeting points, print card |
| 🌐 Network | Hub deploy/join, QR scanner, heartbeat, IP detection |
| 🏥 Medical | CPR timer (100bpm), Heimlich guide, medication log |
| 🗺️ Map | Custom OSM tile renderer, markers, distance/bearing, offline cache |
| 📻 Radio | Morse encoder/decoder, phonetic alphabet, frequency logbook |
| 🤖 ARKai | HALO Lite (rule-based) + HALO+ (WebLLM/Llama 3.2 on-device) |
| ⚙️ Settings | Dark mode, backup/restore, wipe, notification permissions |

**Additional:** Missing Persons tracker, 5-type Checklists, QR encoder, ECDSA signing, SoftHub mesh, hot-patch, bug pipeline.

---

## PRIVACY

- No personal address, phone, or personal email anywhere in the file
- Bug reports go to `hello@halosuite.ai` via the admin panel
- All user data: `localStorage` / `IndexedDB` on the user's device only
- No analytics, no trackers, no external CDN at runtime

---

*ARK Crisis Suite · HaloSuite · hello@halosuite.ai*
