# ARK bridge toolkit

Free, open-source adapters that connect ARK's public relay network to radio and SMS.
Everything here runs on your own computer, spare phone or small server. No licence fees,
no per-message charges, no accounts with anyone but your own ARK app.

Version 1.0. Node 18 or newer.

---

## What this gives you

| Bridge | Direction in | Direction out |
| --- | --- | --- |
| `bridges/meshtastic.mjs` | LoRa text heard by a Meshtastic node, published on MQTT, becomes a signed ARK packet | ARK messages are published to MQTT for your node to transmit over the air |
| `bridges/sms.mjs` | Texts received by an open-source Android SMS gateway become signed ARK packets | ARK messages are texted to the numbers you list |

Both bridges sign with a P-256 key created on this machine on first run. The ARK gateway
rejects anything unsigned or tampered with, so packets carry a real device signature —
not a claim of identity.

## What it cannot do

- **No satellite.** No free or open-source path exists. Satellite airtime is a paid service
  with licensed hardware.
- **No Bluetooth mesh.** A web app cannot join a BLE mesh. Use Meshtastic or Briar as
  separate tools, and bridge them here over MQTT or SMS.
- **No delivery guarantee.** A radio or SMS handoff is best-effort. Nothing in ARK confirms
  that a human received anything. A receipt means "stored", never "help is coming".
- **No privacy.** Every packet is public and unencrypted by design. Never send medical
  details, addresses or names through a public channel.
- **No inbound SMS from unknown numbers is validated.** Treat every incoming text as a claim.

## What you need

**Free and open source**

- Node.js 18+ on a machine that can stay on — a laptop, Raspberry Pi, or small VPS.
- Optionally a Meshtastic node (~$25–40 hardware; the firmware is free and open source).
- Optionally a spare Android phone running an open-source SMS gateway
  (for example capcom6/android-sms-gateway). Your normal SIM's texting rates apply.

**Paid things you do not need:** Twilio, satellite messengers, app store developer accounts,
map licences, or a paid Base44 add-on.

## Setup

### 1. Publish your ARK app

The gateway needs a live address. Publish the app first, otherwise nothing here can reach it.

### 2. Install

```bash
unzip ark-toolkit.zip -d ark-toolkit
cd ark-toolkit
npm install
```

### 3. Fill in `.env`

```bash
cp .env.example .env
```

Open `.env` and set:

- `ARK_FUNCTION_URL` — the HTTP endpoint for the `networkExchange` function. Your app's API
  documentation page in the dashboard shows it for this app.
- `ARK_TOKEN` — a personal access token created from the same area of the dashboard. Treat it
  like a password. Never commit it, never share the file.
- `ARK_CHANNEL` — the public channel name your group uses, for example `local`. Must match
  what people type in ARK's relay page: lowercase letters, digits and dashes, up to 40
  characters.
- `ARK_ALIAS` — the name the radio and texts appear under in the feed.

### 4. Check it works

```bash
npm run selftest
```

You should see a 64-character packet id and `signature length = 86`. If `ARK_FUNCTION_URL`
is set you should also see `gateway accepted 1 packet(s)`. If it says the packet was
refused, the token or the URL is wrong, or the app is not published.

### 5. Start a bridge

```bash
npm run radio     # Meshtastic over MQTT
npm run sms       # open-source Android SMS gateway
```

Leave it running. Packets wait in `outbox.json` until ARK confirms it stored them, so a
dropped connection loses nothing that has not expired.

---

## Radio bridge (Meshtastic)

1. Flash the free Meshtastic firmware on a node and set it to a channel you and your group share.
2. Enable MQTT in the node's app, pointing at a broker both the node and this bridge can reach.
   The community broker is fine for testing; for real use run your own Mosquitto so you are
   not dependent on someone else's server.
3. Put the broker address, username, password, root and channel name in `.env`.
4. Set `MESH_NODE_ID` to your node's id so ARK messages are handed back to it for transmission.

Limits worth knowing: Meshtastic text is short — the bridge trims outgoing messages to
`MESH_MAX_CHARS` (200 by default). Long ARK messages arrive truncated, not split. Radio range
depends on terrain and antenna, typically a few kilometres with the built-in antenna.

## SMS bridge (open-source Android gateway)

1. Install an open-source SMS gateway app on a spare Android phone with a SIM and leave it
   powered and charging.
2. Point `SMS_GATEWAY_URL` at that phone's local address, with its username and password.
3. List the people who should receive ARK messages in `SMS_TO`, comma separated, in
   international format.

Standard texts cost whatever your carrier charges. Check the gateway app's own documentation
for the exact endpoint shape if your version differs — the bridge calls
`GET /api/v1/messages?limit=20` and `POST /api/v1/messages`.

## Keep it running

On Linux, `ark-bridge.service` is a ready systemd unit:

```bash
sudo cp -r . /opt/ark-toolkit
sudo cp ark-bridge.service /etc/systemd/system/
sudo systemctl enable --now ark-bridge
journalctl -u ark-bridge -f
```

Change `ExecStart` to `bridges/sms.mjs` for the SMS bridge, or run one unit per bridge with
different names.

## Security

- The signing key lives in `~/.ark-bridge/key.json` with owner-only permissions. Back it up;
  without it, previously signed packets cannot be attributed to this bridge.
- `ARK_TOKEN` is a real credential. Anyone holding it can relay as you. Revoke it if the
  machine is lost.
- Everything relayed is public. There is no encryption layer, by design: anyone who can reach
  the channel can read it.
- Run the bridge as an unprivileged user, as the unit file does.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `ARK_FUNCTION_URL is not set` | `.env` missing or not loaded; use `npm run` scripts, which load it |
| `gateway refused the packet: Invalid device signature` | Clock drift on this machine, or a copied key file edited by hand |
| `gateway refused the packet: Expired packet` | System clock is wrong; sync with NTP |
| `Sign in to use the online gateway` | `ARK_TOKEN` empty or expired |
| `Gateway busy for this account` | Over 200 packets a minute from this account; the bridge waits and retries |
| Radio messages arrive, ARK messages do not appear on the radio | `MESH_NODE_ID` empty, or the node is not connected to the broker |
| Nothing in the feed page | Wrong `ARK_CHANNEL`, or nobody signed in on the app side is storing packets |

## Not in this bundle

- **Web push notifications.** Buildable into the app itself with free, open Web Push — no app
  store account needed. Not a bridge, so not shipped here.
- **Offline map tiles.** Already in the app: the Offline map page saves OpenStreetMap squares
  into your browser.
