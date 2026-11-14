# ARK — emergency preparedness that keeps working when the internet doesn't

ARK helps households and neighbourhoods get ready for, and get through, an emergency:
a household plan, first aid and survival guidance, a community help board, and ways to pass
messages along **when phones, internet and servers are down**.

> **Status: prototype.** ARK is **not** an emergency service, **not** monitored, and has **not**
> been field-tested with the internet physically off. The medical and survival guidance comes
> from public sources and has not been reviewed by experts. **In immediate danger, call 911**
> (or your local emergency number).

---

## Use it now

| You want to… | Do this | Needs internet? |
| --- | --- | --- |
| Use the web app | Open **https://snap-back-now.base44.app** (it may ask you to sign in) | Yes |
| Get everything for offline use | On that page, download **ARK-offline-kit.zip** and unzip it. Open `START-HERE.html` | Only to download |
| Get a paper backup | In the web app, open **Print packet** and print it | Only to print |
| Run a community hub with no internet | Follow [`src/hub/HUB-GUIDE.md`](src/hub/HUB-GUIDE.md) | No (needs power) |
| Connect radio (Meshtastic) or SMS | Follow [`src/toolkit/README.md`](src/toolkit/README.md) | Optional |

**Do it before you need it.** Download the kit, print the packet and practise once while things are normal.

---

## What still works when things go down

| Part | What it does | Works with no internet? |
| --- | --- | --- |
| Printed packet | Plan, contacts, guidance on paper | ✅ Yes |
| Offline kit (`START-HERE.html`, guidance, worksheet) | The basics as plain files | ✅ Yes |
| Offline message app (`ARK-Offline-Relay.html`) | Write signed messages and pass them phone to phone by copy-paste or file | ✅ Yes |
| **Community hub** (`src/hub/`) | A laptop or Raspberry Pi hosts a message board and library for phones over local Wi-Fi | ✅ Yes |
| Offline library (Wikipedia, maps, offline AI) | Fetched by the kit's downloader in advance | ✅ Yes, once downloaded |
| Radio and SMS bridges (`src/toolkit/`) | Carry messages over Meshtastic radio or SMS into a hub or the web app | ✅ Into a local hub |
| Web app (plans, help board, resources) | Online coordination with accounts | ❌ No. It is hosted on Base44 and cannot be self-hosted |

Nothing has to be "switched on" in an emergency, and there is no master key or central server
that everything relies on. Each hub creates its own signing key, and anyone with the kit can start one.

---

## How the pieces fit together

```
 Phones (browser)       Phones (offline message app)        Radio / SMS
       |  local Wi-Fi             | copy-paste, file             | bridges
       v                          v                              v
 +------------------ ARK Local Hub (laptop or Raspberry Pi) ------------------+
 |  message board + "I saw this"  |  checks every message  |  offline library |
 +----------------------------------------------------------------------------+
       |  USB stick                         |  hub to hub over any network
       v                                    v
   another hub                         another hub   ...   web app when internet returns
```

Every route carries the same **signed message format (ARK-RELAY-1)**. A message can go
phone → hub → USB stick → another hub → radio without being rewritten, and changed or forged
messages are refused. A signature proves a message wasn't changed. It does **not** prove who
wrote it, or that it's true.

The full design, message format, hub API, transport status and the list of what's not built yet
are in [`src/hub/CONTINUITY.md`](src/hub/CONTINUITY.md).

---

## What's in this repository

| Folder | What it is |
| --- | --- |
| `src/pages/` | Web app screens. `Download.jsx` is the landing page and `Lifeline.jsx` is the home dashboard at `/Home` |
| `src/content/` | Guidance articles and emergency contact lists, the source of everything people read |
| `src/components/kit/` | Builds the downloadable offline kit in the browser (no server needed) |
| `src/components/arknet/` | Signed messages, offline queue and the standalone offline message app |
| `src/hub/` | **ARK Local Hub**: the no-internet community server, its guides and its self-test |
| `src/toolkit/` | Radio (Meshtastic) and SMS bridges, packaged into the kit |
| `base44/entities/` | Data definitions for the web app, each with its access rules |
| `base44/functions/networkExchange/` | Online gateway that accepts and serves signed messages |

The older crisis-coordination screens (Incidents, Response hub) are an earlier prototype and are not part of the offline design.

---

## Checking it works

```bash
node src/hub/selftest.mjs      # 14 checks on message signing, storage and the hub
```

The radio and SMS bridge self-test runs from inside the downloaded kit:
`cd ARK-offline-kit/bridge-toolkit && node selftest.mjs`.

**Not yet verified** (help wanted): two real phones and a hub with the router unplugged from the
internet, a USB stick carried between two hubs, a Pi hub on battery for 12 hours, and an iPhone and an
Android phone that have never used ARK. The full checklist is in `src/hub/CONTINUITY.md`.

---

## Working on the code

This web app is built and hosted on [Base44](https://base44.com). This repository syncs both ways
with the Base44 editor, so changes pushed here appear there.

1. `npm install`
2. Create `.env.local` with `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL` for your Base44 app
3. `npm run dev`

The hub (`src/hub/`) and bridges (`src/toolkit/`) are plain Node.js with **no dependencies** for the
hub, and run without Base44 at all.

## How to help

- **Test it offline** on real devices and report what happened, including failures.
- **Review the guidance** if you're a medic, nurse, EMT or emergency manager. Corrections are the most valuable contribution.
- **Keep copies.** Fork this repository, save the offline kit to USB sticks, and leave copies with libraries, schools, ham radio clubs and response teams.
- **Open an issue** for anything confusing in this README.

## Safety and limits

- Not a replacement for 911, official alerts or qualified responders.
- The hub's message board is **public and unencrypted**. Don't post anything you wouldn't put on a noticeboard.
- No delivery is guaranteed. "Seen" counts mean people read a message, not that help is coming.
- ARK is designed to be defensive and voluntary: it never spreads itself, runs hidden, or collects data without consent.
