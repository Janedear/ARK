# ARK Crisis Suite — Hostinger Deployment

> **For the Hostinger agent.** Copy everything below the line and paste it.

---

## TASK: Deploy ARK Crisis Suite to Hostinger

You are deploying the **ARK Crisis Suite** — an offline-first emergency communications and survival tool built for HaloSuite.

This is a **single-file PHP deployment**. There is exactly **one file to upload**.

> ⚠️ **IMPORTANT:** The correct file is `index.html` from the `for-hostinger` branch. Despite the `.html` extension, it is a PHP file starting with `<?php` — Hostinger/PHP hosts will execute it correctly as PHP. Do NOT deploy any other file.

---

## WHAT YOU ARE UPLOADING

| File | Purpose |
|------|---------|
| `index.html` | The entire app + backend in one file (~575 KB). Starts with `<?php`. |

That's it. No zip. No npm. No build step. No Cloudflare. No terminal.

---

## STEP 1 — Upload to Hostinger

### Via hPanel File Manager (easiest)
1. Log in to hPanel → **File Manager**
2. Navigate to `public_html/`
3. Upload `ARK.php`
4. Done

### Via FTP
- Upload `ARK.php` to `public_html/`

**Final structure on the server:**
```
public_html/
└── ARK.php          ← the whole app
```

The file auto-creates its own data directory (`ark-data/`) on first request. No manual folder creation needed.

---

## STEP 2 — Visit the App

After upload, the URLs are:

| What | URL |
|------|-----|
| **App** | `https://yourdomain.com/ARK.php` |
| **Admin panel** | `https://yourdomain.com/ARK.php?admin` |
| **Admin password** | `ARK-admin-2024` |

---

## STEP 3 — Verify It Works

1. Open `https://yourdomain.com/ARK.php` — the app should load with a **warm cream** design
2. Open browser DevTools (F12) → Console — no network errors
3. The patch check runs silently on boot (`ARK patch check` in console is normal)

Test the backend endpoints directly:
```
GET  https://yourdomain.com/ARK.php?patches   → returns {"active":false}
POST https://yourdomain.com/ARK.php?bugs      → returns {"status":"ok","id":"..."}
GET  https://yourdomain.com/ARK.php?admin     → shows login form
```

---

## WHAT ARK.PHP DOES (How It Works)

The PHP header runs first on every request and routes to the right handler:

| Request | Handler |
|---------|---------|
| `POST ARK.php?bugs` | Saves bug report JSON to `ark-data/bugs/` |
| `GET ARK.php?patches` | Returns `ark-data/patches/latest.json` |
| `GET ARK.php?admin` | Admin panel (session-authenticated) |
| Any other request | Outputs the full ARK Crisis Suite app |

The admin panel lets you:
- **Push hot-patches** to all running instances (live CSS/text fixes without re-uploading)
- **View and delete bug reports** submitted by users
- **Clear patches** when done

---

## PUSHING A HOT-PATCH FROM ADMIN PANEL

1. Go to `https://yourdomain.com/ARK.php?admin`
2. Sign in with password `ARK-admin-2024`
3. Paste patch JSON into the Patch field, e.g.:
```json
{
  "active": true,
  "ops": [
    { "op": "set_text", "selector": "#some-id", "value": "Updated text" }
  ]
}
```
4. Click **Push Patch** — all running instances pick it up within 2 hours (or on next load)

---

## WHAT'S IN THE APP (11 Tabs)

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

**Additional modules:** Missing Persons tracker, Checklists (5 types + custom), QR encoder, ECDSA message signing, SoftHub mesh networking, hot-patch system, bug reporting pipeline.

---

## PRIVACY

- No personal address, phone number, or personal email embedded anywhere
- Bug reports go to `hello@halosuite.ai` via admin panel
- All user data stays in `localStorage` / `IndexedDB` on the user's device
- No analytics, no trackers, no external CDN calls at runtime

---

*ARK Crisis Suite · HaloSuite · hello@halosuite.ai*
