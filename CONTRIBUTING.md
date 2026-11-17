# Contributing to ARK

Thank you for helping. ARK is used by people who are frightened, offline, and on whatever phone
they have. Every change should make it calmer, clearer or more dependable for them.

## Get it running (two minutes)

You need **Node.js 20+** and **Python 3.9+**. Nothing to install with npm or pip.

```bash
git clone https://github.com/Janedear/ARK.git
cd ARK
python scripts/build.py --app-only     # builds ARK-CRISIS-SUITE.html from app/src/
```

Open `ARK-CRISIS-SUITE.html` in a browser. That is the whole app.

To try the hub: `node src/hub/ark-hub.mjs`, then open the address it prints.
To try the website locally (needs PHP 8+): `python scripts/build.py` then
`php -S 127.0.0.1:8770 -t build/public_html`.

## Where things are

```
app/
  parts.txt            the order the source files are joined in
  src/html/            one file per screen (wizard, header, each tab)
  src/js/              one file per feature (messages, guides, map, …) — plain scripts, one global scope
  src/styles/          base.css (structure) · halo.css (design language + tokens) · font.css · mascot.css
ARK-CRISIS-SUITE.html  the built single-file app (committed so anyone can download and open it)
web/                   the website: landing, hub and connect pages, site.css, index.php, service worker
src/hub/               ARK Hub — the no-internet community server (Node.js, no dependencies)
src/toolkit/           radio (Meshtastic) and SMS bridges
kit/                   starter files shipped in the hub kit
scripts/               build.py (app + website + hub kit) · make-og-image.py (link preview)
docs/                  ARCHITECTURE.md · DEPLOY.md · BACKLOG.md
```

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Making a change

1. Create a branch from `main`: `git checkout -b fix/short-description`.
2. Edit the files under `app/src/` (never edit `ARK-CRISIS-SUITE.html` by hand — it is generated).
3. Rebuild and check:
   ```bash
   python scripts/build.py --app-only
   node src/hub/selftest.mjs && node src/hub/selftest-extended.mjs && node src/toolkit/selftest.mjs
   python scripts/build.py --check
   ```
4. Open the built file and try your change on a phone-sized window (360 px wide), with the
   network switched off.
5. Commit the source **and** the rebuilt `ARK-CRISIS-SUITE.html`, then open a pull request to `main`.

The same checks run automatically on every pull request.

## Rules that keep ARK trustworthy

- **Offline first.** No CDNs, no web fonts, no analytics, no libraries. The app must work from a
  saved file with the network off.
- **One file.** Whatever you add must end up inside `ARK-CRISIS-SUITE.html`.
- **Honest.** Never claim more than ARK does. The network ARK makes is local and needs a hub on a
  laptop; a phone alone cannot be the hub. Nobody monitors ARK.
- **Plain words.** Short sentences a scared person can follow. Every error says what to do next.
- **Safety content is conservative.** First-aid and survival text must match current Red Cross,
  American Heart Association, CDC or FEMA guidance. Cite the source in your pull request.
- **Private.** What people type stays on their device.
- **Don't break saved data.** Keep element ids, global names, `localStorage` keys and data formats
  stable, or include a migration.

## Design language

ARK is its own brand, made by HaloSuite. It sits in the same family — warm paper, near-black ink,
gold, the Geist typeface, a Georgia italic accent line, calm spacing — without copying
halosuite.ai. What makes it ARK: the gold double-roof mark with a bold ARK wordmark, confident
headlines, rounded cards and buttons, a dark pill-shaped bottom bar, Halo the mascot as the guide,
and the signature picture of homes and devices linked by dashed lines. Icons are line icons from
the sprite in `app/src/html/020-body-open.html`.

How we explain ARK: **in a crisis, ARK makes its own internet from the devices around you.** Then
say plainly how — one laptop becomes the hub, nearby phones join it over Wi-Fi, hubs pass messages on. Colours come from the tokens in
`app/src/styles/halo.css` (app) and `web/site.css` (website) — do not hard-code them.

## Branches and releases

- `main` is the only long-lived branch. It always builds and is what the website runs.
- Releases are tags (`v1.2.0`) with three files attached: the app, the hub kit and the website zip.
  See [docs/DEPLOY.md](docs/DEPLOY.md).

## Reporting a problem

Open an issue with what you did, what you expected, what happened, and your phone or browser. For
anything that could put people at risk (wrong safety advice, a security hole), email
hello@halosuite.ai instead of opening a public issue.
