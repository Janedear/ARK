# How ARK is put together

ARK has three parts that share one message format.

```
 Phone (browser)                Laptop / Raspberry Pi                 Web (optional)
 ┌──────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────┐
 │ The app              │ Wi-Fi│ ARK Hub (src/hub)         │      │ arks.solutions (web)│
 │ ARK-CRISIS-SUITE.html│◄────►│ message board + app copy  │      │ welcome page, app,  │
 │ works with no network│      │ no internet needed        │      │ hub kit, connect    │
 └──────────────────────┘      └───────────┬───────────────┘      └─────────────────────┘
                                           │ USB stick, radio/SMS bridges (src/toolkit),
                                           ▼ or any network between hubs
                                      other hubs
```

## 1. The app — `ARK-CRISIS-SUITE.html`

One self-contained HTML file: styles, markup, scripts, typeface and mascot are all inside it. It
runs from a website, from a hub, or from a file saved on the device.

**Source** is in `app/src/` and is joined, in the order given by `app/parts.txt`, by
`scripts/build.py`. There is no bundler and no transpiler: the build is concatenation, so the
built file reads exactly like the sources.

| Folder | Contents |
|---|---|
| `app/src/html/` | `000-head` (meta, CSP) · `020-body-open` (icon sprite) · `030` welcome wizard · `040` share dialog · `045` header and section strip · `050`–`150` one file per tab · `900-tail` (bottom bar, pristine-copy capture) |
| `app/src/styles/` | `font.css` (embedded Geist) · `base.css` (layout and components) · `halo.css` (tokens + brand surfaces) · `mascot.css` (embedded mascot) |
| `app/src/js/` | One file per feature, numbered in load order. All plain scripts sharing one global scope. |

Key scripts:

| File | What it owns |
|---|---|
| `040-storage-wrapper.js` | `Store` — everything saved in `localStorage` (keys are prefixed `ark_`) |
| `050-indexeddb-wrapper.js` | `DB` — messages and saved map tiles in IndexedDB |
| `090-ui-controller.js` | `UI` — tab switching, alert level, status display |
| `110-hub-communication.js` | `Hub` — talking to an ARK Hub: sync, post, offline queue |
| `120-messages.js` | `Messages` — the local message board |
| `130-guides.js`, `020-embedded-data.js` | Survival guides and their text |
| `390-arkai.js` | "Halo", the built-in assistant (rule-based answers; optional on-device model) |
| `200-network.js` | `Network` — hub screen, bug reports, official fixes ("patches") |
| `230-settings.js` | Backup, restore, wipe, display settings |
| `400-boot.js` | Start-up. Each step is isolated so one failure cannot blank the app. |

**Saved data.** Everything a person enters is in `localStorage` (`ark_*`) or IndexedDB (`ARK_DB`).
Backup/restore in Settings exports all of it. Nothing is sent anywhere unless the person connects
to a hub or sends a bug report.

**Sharing a copy.** "Save & Share ARK" hands over the original file, re-fetched from where it was
loaded or taken from an untouched copy captured before start-up (`window.__ARK_PRISTINE`). It is
never a snapshot of the screen, so no personal data travels with it.

**Official fixes.** Running copies ask `https://arks.solutions/?patches` for a small JSON patch.
Patches can change wording, styling and visibility only (`_applyPatch` in `200-network.js`); they
cannot run code or touch saved data, and hubs cannot supply them.

## 2. ARK Hub — `src/hub/`

A dependency-free Node.js server (`ark-hub.mjs`) for a laptop or Raspberry Pi. Phones on the same
Wi-Fi open its address and get a shared message board (`hub-page.html`), the app (`/app`) and
starter files. Messages are signed packets in the ARK-RELAY-1 format ([PROTOCOL.md](../PROTOCOL.md))
so they can travel hub to hub by network, USB stick, radio or SMS without being altered.

The app talks to a hub with `GET /api/messages`, `POST /api/post` and `GET /api/status`.
Guide: [src/hub/HUB-GUIDE.md](../src/hub/HUB-GUIDE.md).

## 3. The website — `web/`

Plain files for any PHP host (see [DEPLOY.md](DEPLOY.md)).

| File | Role |
|---|---|
| `landing.html` (`/`) | Welcome page |
| `ARK-CRISIS-SUITE.html` (`/app`) | The app (copied in by the build) |
| `hub.html` (`/hub`) | Hub kit download and setup steps |
| `connect.html` (`/connect`) | "Connect to ARK" request form for official services |
| `site.css` | Shared styles for the three pages |
| `index.php` | Front door: serves `/` and `/app`; `?patches`, `?bugs`, `?connect` endpoints; `?admin` panel |
| `service-worker.js` | Keeps the app available offline after one visit |
| `_og.html` | Source of the link-preview image (not published) |

Runtime data (bug reports, link requests, the current patch, the admin password hash) lives in
`ark-data/` on the server, which is never served and never committed.

## Design language

See the section in [CONTRIBUTING.md](../CONTRIBUTING.md). Tokens: `app/src/styles/halo.css` and
`web/site.css`.
