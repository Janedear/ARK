# ARK Continuity Network — audit, architecture and status

Version 1, 2026-11-14. "Tested" below means automated tests or a scripted end-to-end run on one
machine. **Nothing here has been tested between real phones with the internet physically off.**

## 1. Audit: what works without internet today

| Part | Needs the ARK cloud? | Evidence |
| --- | --- | --- |
| Web app (household plan, resources, help board, incidents, check-ins) | Yes: hosting, login and database are on Base44 and cannot be self-hosted | Platform architecture |
| Home dashboard saved snapshot | Read-only, in a browser that loaded it before | Built and labelled as a saved copy |
| Printable packet | No, once printed | Paper |
| Offline kit: guidance, contacts, worksheet, meeting point | No | Static files |
| Offline message app (ARK-Offline-Relay.html) | No | Self-contained; uses browser storage and signing |
| Bridge toolkit (radio, SMS) | Yes before this release; now optional with `ARK_HUB_URL` | Signed packets verified at the hub (scripted test) |
| **ARK Local Hub** | **No** | 14 automated checks plus a scripted run of the server on one machine |

## 2. Architecture

```
 Phones (browser)          Phones (offline message app)        Radio / SMS
       |  local Wi-Fi                 | copy-paste, file             | Meshtastic bridge, SMS bridge
       v                               v                              v
 +-------------------------- ARK Local Hub (laptop or Raspberry Pi) ---------------------------+
 |  board + acks  |  packet store (verify, dedupe, expire)  |  library server + fingerprints    |
 +---------------------------------------------------------------------------------------------+
       |  USB stick (inbox/outbox)          |  hub-to-hub HTTP (ARK_HUB_PEERS)
       v                                    v
   another hub                         another hub  ......  ARK web app when internet returns
```

Every route carries the same packet format, so a message can travel phone → hub → USB → hub → radio without being rewritten.

## 3. Packet format: ARK-RELAY-1 (implemented)

```json
{ "v": 1, "kind": "message" | "ack", "channel": "help", "alias": "Maria", "text": "NEED WATER",
  "ref": "" | "<id of acknowledged message>", "issued_at": "ISO-8601", "expires_at": "ISO-8601",
  "public_key": { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
  "id": "sha256 hex of the canonical bytes", "signature": "ECDSA P-256 / SHA-256, raw r||s, base64url" }
```

- Canonical bytes are the JSON of the fields above, without `id` and `signature`, in exactly that order.
- Limits: topic up to 40 characters `[a-z0-9-]`, name up to 40, text up to 1,000 characters, lifetime up to 72 hours, issue time no more than 5 minutes in the future.
- Bundle: `{ "protocol": "ARK-RELAY-1", "packets": [...] }`. Phones accept up to 40 packets per bundle; hubs accept up to 5,000.
- A signature proves the packet is unchanged since a key signed it. It does not prove who the person is, or that the text is true.

## 4. Hub API contract (implemented)

| Method and path | Purpose |
| --- | --- |
| `GET /api/status` | Hub name, hub clock, packet count, hub key fingerprint |
| `GET /api/messages?channel=` | Newest 200 messages with acknowledgment counts |
| `POST /api/post {alias, channel, text, hours}` | Hub signs and stores a post. 20 actions per phone per 10 minutes |
| `POST /api/ack {id, alias}` | Hub signs and stores an acknowledgment |
| `GET /api/bundle?channel=&limit=` | Export a bundle (add `download=1` for a file) |
| `POST /api/bundle` | Import a bundle. Returns counts of added, duplicate and refused packets, with reasons |
| `GET /files/manifest.json`, `GET /files/<name>` | Library listing with SHA-256 fingerprints; downloads can resume |
| `GET /kit/<name>`, `GET /sign` | Kit documents; printable wall sign |

Phones use the hub over plain `http`, so browsers turn off in-page signing there. That is why the
hub signs board posts with its own key and labels them "posted on this hub".

## 5. Transports

| Transport | Status |
| --- | --- |
| Local Wi-Fi to the hub | Implemented; scripted test on one machine |
| USB or SD card (inbox/outbox) | Implemented; scripted test of outbox writing |
| Hub-to-hub HTTP | Implemented; not yet run between two machines |
| Copy-paste or file bundles to phones | Implemented (existing offline app plus hub import and export) |
| Meshtastic LoRa through the bridge | Implemented in the toolkit; radio carries plain text, and the bridge signs it on arrival |
| SMS through the bridge | Implemented in the toolkit; needs a working phone network |
| Browser-to-browser WebRTC | Experimental, existing |
| Native Bluetooth, Wi-Fi Direct | Not possible in a web app; needs a native companion app |
| QR codes | Contract only: one message is about 600 bytes, which fits a single QR code |
| Reticulum / LXMF | Not started. To evaluate as a later transport: run a Reticulum node beside the hub and map LXMF messages to ARK-RELAY-1 packets in a bridge, like the Meshtastic one |

**LoRa size limit:** a signed packet is about 600 bytes, and a Meshtastic payload is about 230 bytes.
That is why signatures stop at the radio bridge today. Carrying signatures end to end over LoRa needs
the compact binary format below.

## 6. Not built yet (specified, in order)

1. **Compact binary packet (ARK-BIN-1).** Fields: version (1 byte), kind and topic code (1 byte), expiry in minutes (2 bytes),
   issue time in Unix minutes (4 bytes), coded request type and urgency (1 byte), coarse location (geohash, 6 bytes), UTF-8 text,
   then a 64-byte signature and an 8-byte key fingerprint. Senders' full public keys travel once and are cached.
   About 90 bytes plus text, so it fits one LoRa frame. Lossless round trip to ARK-RELAY-1 is required.
2. **Fragmentation for radio:** message id prefix, chunk index and count, CRC32 per chunk, hub-side reassembly with a timeout and rate limits.
3. **Encrypted messages:** recipient public-key encryption (ECDH P-256 + AES-GCM) for named recipients only. The public board stays public.
4. **Signed content manifests:** an ARK release key signs each manifest of file hashes, and hubs show "verified" only when that signature checks.
5. **Restricted remote tasks:** a fixed catalogue of tasks (first: search the hub's guidance and listings and return the top three answers with sources).
   Each task has size, time and rate limits and is logged. No arbitrary code is ever run.
6. **Two-way sync with the ARK web app** when internet returns, through the existing `networkExchange` gateway.

## 7. Verification still required before anyone relies on this

- [ ] Two phones and one hub, with the router physically disconnected from the internet: post, acknowledge, and reload after restarting the hub.
- [ ] A USB stick carried between two hubs on separate networks.
- [ ] A Raspberry Pi hub on a measured power bank for 12 hours with 10 phones connected.
- [ ] An Android phone that never had ARK installs Kiwix from the hub and opens a `.zim` file.
- [ ] An iPhone that never had ARK reads the board and the guidance in Safari.
- [ ] A Meshtastic message reaches the hub board through a local Mosquitto broker with no internet.
