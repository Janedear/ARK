# ARK — Emergency communication that keeps working when the internet doesn't

ARK helps households and neighbourhoods prepare for and get through an emergency:
a household plan, first aid and survival guidance, a community help board, and ways to pass
messages when phones, internet, and servers are down.

> **Status: prototype.** ARK is **not** an emergency service, **not** monitored, and has **not**
> been field-tested with the internet physically off. Medical and survival guidance comes from
> public sources and has not been reviewed by experts. **In immediate danger, call 911**
> (or your local emergency number).

**[→ Get ARK at ark.halosuite.ai](https://ark.halosuite.ai)**

---

## Use it now

| You want to… | Do this | Needs internet? |
|---|---|---|
| Use the app | Go to **https://ark.halosuite.ai** and download `ARK-CRISIS-SUITE.html` | Only to download |
| Use it offline | Open the downloaded `ARK-CRISIS-SUITE.html` file — works in any browser, no internet | No |
| Get a paper backup | In the app, open **Print packet** and print it | No (once you have the file) |
| Run a community hub | Follow [`src/hub/HUB-GUIDE.md`](src/hub/HUB-GUIDE.md) | No (needs power) |
| Connect radio (Meshtastic) or SMS | Follow [`src/toolkit/README.md`](src/toolkit/README.md) | Optional |

**Do it before you need it.** Download the file, print the packet, and practise once while things are normal.

---

## What still works when things go down

| Part | What it does | Works with no internet? |
|---|---|---|
| Downloaded `ARK-CRISIS-SUITE.html` | Full emergency app: plan, contacts, guides, messages, CPR timer, map, radio tools | ✅ Yes |
| Community hub (`src/hub/`) | A laptop or Raspberry Pi hosts a message board and library for phones over local Wi-Fi | ✅ Yes |
| Radio and SMS bridges (`src/toolkit/`) | Carry messages over Meshtastic radio or SMS into a hub | ✅ Into a local hub |
| Printed packet | Plan, contacts, guidance on paper | ✅ Yes |

Nothing has to be "switched on" in an emergency, and there is no master key or central server.
Each hub creates its own signing key, and anyone with a copy can start one.

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
   another hub                         another hub   ...   web when internet returns
```

Every route carries the same **signed message format (ARK-RELAY-1)**. A message can go
phone → hub → USB stick → another hub → radio without being rewritten, and changed or forged
messages are refused. Full protocol spec: [PROTOCOL.md](PROTOCOL.md).

---

## Repository layout

| Path | What it is |
|---|---|
| `ARK-CRISIS-SUITE.html` | The full app — one self-contained HTML file, zero dependencies |
| `landing.html` | Landing page at [ark.halosuite.ai](https://ark.halosuite.ai) |
| `manifest.json` | PWA manifest for installing ARK as a home-screen app |
| `service-worker.js` | Offline service worker for the web deployment |
| `PROTOCOL.md` | ARK-RELAY-1 signed message format specification |
| `src/hub/` | ARK Local Hub: the no-internet community server |
| `src/toolkit/` | Radio (Meshtastic) and SMS bridges |
| `src/content/` | Guidance articles and emergency contact lists |

---

## Why one HTML file?

ARK is intentionally a single self-contained file. This is a deliberate design decision, not a limitation:

1. **Offline-first** — works copied to a USB stick, opened from a filesystem, or served from an offline Pi hub over Wi-Fi.
2. **Zero install** — share it over Signal, AirDrop, email, or SD card. No app store, no package.json.
3. **Deployable anywhere** — drop it in an S3 bucket, a static web host, or email it. No server runtime.
4. **Auditable** — emergency software earns trust through inspectability. One file can be read and forked by anyone with a text editor.

---

## Checking it works

```bash
node src/hub/selftest.mjs      # 14 checks on message signing, storage and the hub
```

---

## Safety and limits

- Not a replacement for 911, official alerts, or qualified responders.
- The hub's message board is **public and unencrypted**. Don't post anything you wouldn't put on a noticeboard.
- No delivery is guaranteed. "Seen" counts mean people read a message, not that help is coming.
- ARK is designed to be defensive and voluntary: it never spreads itself, runs hidden, or collects data without consent.

---

## A gift from HaloSuite

ARK is free because safety shouldn't have a paywall. Built and maintained by [HaloSuite](https://halosuite.ai).  
Contact: hello@halosuite.ai
