# ARK Local Hub — setup and power guide

**In a crisis, ARK makes its own internet from the devices around you.** One laptop becomes the
hub. Nearby phones join it over Wi-Fi. Hubs pass messages on to each other by network, radio, or a
USB stick.

The hub turns one laptop or Raspberry Pi into a community board and library that phones reach over
local Wi-Fi. It needs **no internet, no accounts and no ARK servers**. It does need power, and it
needs this kit copied onto the machine **before** the internet goes down.

Keep three things in mind:

- The network is **local**. Messages reach only people on this hub, and on hubs it swaps messages with.
- The hub must run on a **laptop or Raspberry Pi**. A phone alone cannot be the hub.
- **Nobody monitors it.** ARK is not an emergency service. If any phone works, call 911 or your local emergency number.

## What people get when they join the hub's Wi-Fi

- A shared message board: *need help, safe, can help, looking for someone, general news*.
- "I saw this" buttons that record signed acknowledgments. A count means people read it, **never** that help is coming.
- The first aid and survival guidance, emergency numbers and your meeting point.
- The full ARK app to open, or to save onto their own phone and carry away.
- Any file you put in `library/files` (maps, books, apps), each listed with a SHA-256 fingerprint.

## Before a crisis (needs internet once)

1. Download the ARK Hub kit from <https://arks.solutions/hub> and unzip it. The kit includes Node.js for Windows; on Mac, Linux or Raspberry Pi install Node.js 20 or newer from <https://nodejs.org>.
2. Optional: copy anything you want to share with neighbours (offline maps, books, apps) into `library/files`.
3. Copy the whole kit folder onto the machine that will be the hub, and onto a USB stick as a spare.
4. Do a full practice run with the Wi-Fi router unplugged from the internet: start the hub, join with two phones, post, and acknowledge.
5. In the kit folder, run `node hub/selftest.mjs`. All checks must pass.

## Starting the hub

| Machine | Do this |
| --- | --- |
| Windows | Double-click `hub\start-hub.cmd`. Allow access on **private** networks if the firewall asks. |
| Raspberry Pi, Linux, Mac | In Terminal: `sh hub/start-hub.sh` from the kit folder. |

The window prints the address phones should open, for example `http://10.42.0.1:8080`.
Open `http://localhost:8080/sign` on the hub and print it, or copy the address onto paper by hand.

Optional settings, put before the start command:
`ARK_HUB_NAME="Lincoln School hub"` and `ARK_HUB_PEERS=http://10.0.0.7:8080` (another hub to sync with).

## Making the Wi-Fi network

The Wi-Fi does not need internet. Phones just have to join the same network as the hub.

- **Any Wi-Fi router** (best): plug it into power, keep it unplugged from the internet, and join the hub to it. Turn off "AP isolation" or "guest mode", because those stop phones reaching the hub.
- **Raspberry Pi or Linux laptop:** `sudo nmcli device wifi hotspot ssid ARK-HUB password choose-a-password ifname wlan0`. The hub is then usually at `http://10.42.0.1:8080`.
- **An Android phone's hotspot:** works with no mobile data on most phones. The hub and the other phones join it.
- **Windows or Mac hotspot:** often refuses to start with no internet. Use a router or phone hotspot instead.

A typical router or Pi hotspot reaches about 30–50 m indoors and handles 10–30 phones comfortably.

## The clock matters

Messages carry the time they were written. With no internet, the hub's clock is not corrected
automatically. A Raspberry Pi without a clock battery can boot with the wrong time.

- Check the time printed when the hub starts. On Linux or Pi, fix it with `sudo date -s "2026-11-14 14:30"`.
- The hub page warns any phone whose clock differs from the hub's by more than five minutes.

## Carrying messages between places

- **USB stick:** the hub writes its whole board to `hub/outbox/ark-hub-bundle.json` every 30 seconds.
  Copy that file to a stick, carry it to another hub, and drop it into that hub's `hub/inbox/` folder. It is imported within 30 seconds and moved to `inbox/done`.
- **Hub to hub:** if two hubs can reach each other on any network, set `ARK_HUB_PEERS` and they swap boards every minute.
- **From the hub page:** open the **USB carry** section on any phone or laptop. "Download all messages" saves the board as one file. On the other hub, open the same section and choose that file under "Bring messages in". The page can also show the newest 40 messages as text to copy into the offline message app, and accepts text pasted back from it.
- **Radio and SMS:** set `ARK_HUB_URL=http://127.0.0.1:8080` in the bridge toolkit's `.env`. The radio bridge also needs a local Mosquitto MQTT broker, because the public one is on the internet.
  Install the toolkit's packages with `npm install` while you still have internet.

Every packet is checked against its signature. Changed, forged, expired or duplicate packets are refused or merged.

## Power

There is no software fix for power. These figures are rough and depend on hardware, so measure your own setup with a USB power meter during the practice run.

| Device | Typical draw | On a 20,000 mAh power bank (about 55 Wh usable) |
| --- | --- | --- |
| Raspberry Pi 4 running the hub and hotspot | 3–6 W | roughly 10–15 hours |
| Raspberry Pi Zero 2 W (slower, fewer phones) | 1–2 W | roughly 1–2 days |
| Wi-Fi travel router | 2–5 W | roughly 12–24 hours |
| Laptop | 10–40 W | use its own battery: about 3–8 hours |
| Meshtastic radio node | under 1 W | several days |
| Charging one phone from flat | 12–20 Wh | 2–4 phone charges |

- **Solar:** a 100 W folding panel gives very roughly 300–500 Wh on a clear day in the continental US, and a fifth of that or less when it's overcast. That keeps a Pi hub, a router and a few phones going. A 20–30 W panel tops up phones but struggles to keep a hub running.
- **Cars:** a 12 V USB adapter charges banks and phones while the engine runs. Never run an engine or generator in a garage or any enclosed space, because carbon monoxide kills.
- **What to power first:** the hub and its Wi-Fi, then one phone per household, then the radio node, then lights.
- **Save power:** dim or turn off the hub's screen, run the hub only at set hours (for example 8–10 am and 6–8 pm), and write those hours on the printed sign.

## If something does not work

| What you see | What to do |
| --- | --- |
| The hub window closes at once, or says Node is missing | Mac, Linux, Pi: install Node.js 20 or newer while you still have internet. Windows: unzip the whole kit first, then run `hub\start-hub.cmd` from the unzipped folder. |
| A phone cannot open the address | Check the phone is on the **same Wi-Fi** as the hub. Type the whole address, starting with `http://` (not `https://`) and ending with `:8080`. Turn off mobile data on the phone and try again. |
| Phones still cannot open it | On Windows, allow the hub through the firewall on **private** networks. On the router, turn off "AP isolation" or "guest mode". |
| The hub page says it cannot reach the hub | The phone has left the Wi-Fi, or the hub computer went to sleep. Rejoin the Wi-Fi and stop the hub computer from sleeping. Messages written meanwhile stay saved on the phone and post when the hub is back, as long as the page stays open. |
| "Too many posts from this phone" | Each phone can do 20 things (posts, "I saw this", edits) every 10 minutes. Wait 10 minutes. |
| "The hub is full and cannot take new messages" | The hub holds 5,000 items (messages and "I saw this" marks). The message was **not** posted. Room comes back by itself as older messages run out of time (3 days at most), so post it again later. The hub already removes expired messages by itself, so **Remove expired messages** in Hub settings rarely frees more. Until there is room, pass urgent news on in person or on a paper note, and ask people to pick a shorter time under "Keep this message up for". |
| A message saved on the phone is still waiting after the hub is back | Open **Messages** and tap **Try now**. After the hub refuses a saved message, the page waits 2 minutes before it tries again by itself (10 minutes after "Too many posts"). Keep the page open. |
| The "I need help" button opens the Post form instead of asking a question | That browser blocks pop-up questions. Type where you are and what you need, then tap **Post to board**. |
| A second hub added on the hub page never swaps messages | Restart the hub program, or start it with `ARK_HUB_PEERS` set to the other hub's address. |
| Message times look wrong | Fix the clock on the hub computer (see "The clock matters"). |

## What the hub cannot do

- It is not monitored, not dispatch and not a 911 replacement.
- It does not reach the wider internet, and it cannot call or text anyone. Only people on this hub, or on hubs it swaps messages with, can see a message.
- The hub page has no password. Anyone on the Wi-Fi can post, edit the shared lists, set the alert banner and use the Hub settings section.
- The "Clinic" section of the hub page keeps its notes only on the device that typed them. Other phones cannot see them.
- Everything on the board is public and unencrypted. Posts made on the hub page are signed by the **hub**, which shows which hub accepted them, not who typed them.
- iPhones cannot install apps from the hub. They can use the board and read the guidance in Safari, and open `.zim` files only if Kiwix was installed from the App Store beforehand.
- The offline message app opens from a phone's downloads on many Android browsers. Some phones refuse to run saved HTML files; test yours.
- The SHA-256 fingerprints show a file matches another copy. They do not prove who made it.
