# Changelog

## 1.2.0 — 2026-11-17

First public release on **arks.solutions**.

### New look
- ARK is its own brand — the roof mark, "by HaloSuite" — in the HaloSuite design language: warm
  paper, near-black ink, restrained gold, the Geist typeface, Georgia italic accents, line icons.
- Halo, the mascot, is your guide: tap it on the home screen to ask a question.
- New home screen: *My Emergency Plan*, *Local Messages*, *Saved Guides*, *ARK Hub*.
- New bottom bar: Home · Plan · Guides · Messages · Hub.
- Welcome page at arks.solutions, the app at /app, the hub kit at /hub.
- The link preview is rendered from the real welcome page, so it always matches.
- Typeface and mascot are embedded, so ARK looks the same with no internet.

### New
- **Connect to ARK** (arks.solutions/connect): emergency services and agencies can ask to link
  with ARK. Requests are stored on the server and reviewed by a person in the admin panel.

### For contributors
- The app's source is now ~60 small files in `app/src/`, joined by `scripts/build.py` into the
  single file. See CONTRIBUTING.md and docs/ARCHITECTURE.md.
- One branch (`main`), automatic checks on every pull request, issue and pull-request templates.

### Fixed — things that would have failed in an emergency
- Messages now actually reach an ARK Hub (the app was posting to an address hubs do not have).
- A hub that refuses a message no longer makes it vanish; it stays queued and retries.
- The bottom navigation bar works.
- The welcome wizard can be skipped, fits small phones, and can be re-run without getting stuck.
- "Download ARK to share" hands over a clean app — never a snapshot containing your household's data.
- Share links went to a dead address; they now go to arks.solutions.
- ARK no longer claims a phone is "the hub" or "sharing with neighbours" when it is not.
- One failing start-up step can no longer leave the whole app blank.
- Restoring a backup reloads the app so nothing stale overwrites the restored data.
- Missing-person photos are shrunk so they actually save.
- Unsaved household details are no longer wiped when you switch tabs.
- "Cache map area" no longer tries to download millions of map tiles; saved maps are kept.
- Printing works when pop-ups are blocked.

### Safety content corrected
- Infant CPR: two thumbs (or heel of one hand), per 2025 AHA guidance; child CPR depth and breaths.
- CPR timer pauses for the two rescue breaths and keeps the screen awake.
- Open chest wounds: do not seal airtight (2024 AHA / Red Cross first-aid guidelines).
- Solar water disinfection times, frostnip, tick attachment time, nightshade description.
- Radio: NOAA weather, GMRS and hospital frequencies were mislabelled.
- Supplies: zero water now reads as critical, not "well stocked".
- Ask Halo: "my house is on fire", drowning, electric shock and seizures get the right answer.

### Security
- No password in the code. The admin panel is off until a hashed password is set on the server,
  with lockout after five wrong tries and protection against cross-site requests.
- Messages, channel names and imported files from other devices can no longer inject script.
- Fixes sent from the website can only change wording and styling. Hubs cannot send them.
- Bug reports are size- and rate-limited and no longer include file paths or IP addresses.

### Hub and toolkit
- The hub accepts posts from the app, serves the app to phones on its Wi-Fi, and ships starter files.
- The offline bridge no longer reports refused packets as delivered. Toolkit self-test repaired.

### Housekeeping
- Repository reorganised; unrelated build output and duplicate copies of the app removed.
- `scripts/build.py` produces the website folder and the hub kit. Checks run on every push.
