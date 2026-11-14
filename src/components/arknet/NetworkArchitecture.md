# ARK network: implemented browser core and transport roadmap

## Goal and boundary
Allow people to create and relay public emergency-coordination reports without an ARK account on a compatible offline browser tool. Reconnect to the signed-in online gateway whenever a working internet path exists. This is not emergency dispatch, verified identity, an encrypted private messenger, a native mesh or guaranteed delivery.

## Implemented
- Account-scoped IndexedDB queue in the web app. A separate clean self-contained HTML tool has its own local queue and needs no online dependencies or login.
- Signed P-256 device envelopes with SHA-256 packet IDs, finite expiry (maximum 72 hours), duplicate suppression in each local store, channel labels and explicit signed reading acknowledgments. Signatures verify a key, not a human or the truth of a report. All payloads are plaintext and intentionally public.
- Online gateway validates the entire incoming batch before writing, checks device signatures, bounds request sizes and batches, filters feed pages on the server, records receipt times and keeps relay account metadata behind admin-only record rules. Authenticated users get only protocol packets, not relay account metadata.
- Foreground reconnect/retry with backoff; no indefinite rapid polling. Queue confirmation is recorded only after gateway acceptance. UI timestamps are explicit.
- Manual carry-and-forward bundles via text or locally saved files. OS sharing can expose the user's existing AirDrop, Quick Share or other installed options; ARK cannot force or guarantee any of those transports. The file picker reads locally, not through public cloud file storage.
- Manually signaled WebRTC data channels with zero configured ICE servers. Two browsers require a reachable local path. Explicit offers and answers replace signaling-server dependence; no automatic peer discovery. Chunked bounded transfers return a peer storage receipt only after local persistence succeeds. Network policies can still prevent the connection.
- A self-contained distributable offline relay HTML file, with clean-copy re-sharing. No live app URL, auth token, message or private key is embedded. Local HTML execution varies considerably by mobile OS/browser and often fails in iPhone document previews. This is not a universally installable native app.

## Receipt semantics
1. Local save: IndexedDB transaction completed on this browser only.
2. Peer stored: the paired peer reports completing local persistence; this is not independent proof of a trustworthy peer.
3. Server stored: the authenticated gateway returned a successful acceptance response with a receipt timestamp.
4. Reading acknowledged: another device explicitly created a signed `ack` packet referring to a message's ID. The alias is unverified and one person may have several device keys. Nothing implies assistance or emergency-service response.

## Protocol ARK-RELAY-1
Bundle `{protocol: "ARK-RELAY-1", packets: [...]}`. Up to 40 packets / 150 KB per manual transfer; server feed pages up to 50; local stores bounded to 1,000 packets. Newest active channel bundle is a bounded subset; individual-report relay allows other selected messages to be carried.

Canonical signed payload keys, in this exact order: `v`, `kind`, `channel`, `alias`, `text`, `ref`, `issued_at`, `expires_at`, `public_key`. Public key keys are `kty`, `crv`, `x`, `y`. UTF-8 JSON, SHA-256 ID in lowercase hex; WebCrypto ECDSA P-256/SHA-256 signature, IEEE P1363 64-byte r||s, unpadded base64url. JWK contains no private component. ISO UTC millisecond timestamps, maximum five-minute future skew. Acknowledgments have empty text and a 64-hex reference. Message packets have nonempty text and empty reference. Device clocks can prevent verification/ingestion; content remains unverified even with a valid signature.

Expired envelopes are not forwarded. Packet IDs are content identifiers, not route IDs. Gateway duplicate preflight reduces repeated inserts; concurrent requests may produce duplicate database rows because the entity has no unique-index transaction in this implementation. Receivers collapse them by signed packet ID. Do not claim exactly-once global storage.

## Deferred transports, in order
1. Android native adapter: nearby discovery + Bluetooth/BLE / Wi-Fi Direct with user permission and power-aware foreground/background limits; same envelope validation and storage-receipt contract.
2. iOS native adapter: Multipeer Connectivity where supported, user-consented sessions, foreground constraints and interruption handling. Do not assume Android/iOS radio interoperability; define a shared transport before claiming it.
3. Local hub: independent lightweight service with the same protocol on a trusted hotspot, offline enrollment, update trust and abuse controls. Replacing online auth/database/hosting is separate work, not supplied by copying the frontend.
4. Radio bridge: LoRa/Meshtastic adapters with fragment limits, duty-cycle compliance, channel/licensing policy, operator consent and signed packet reassembly. Never send full browser bundles blindly into low-bandwidth radio channels.
5. Optional providers: SMS gateways, email alerts, TURN for nonlocal WebRTC and satellite messaging adapters. Each needs a real authorized service, privacy model, credentials and cost controls. Existing native phone satellite emergency functions remain outside ARK.
6. Independent distribution: signed Android packages, approved iOS distribution, authenticated version manifests, trusted update path, documented paper enrollment and accessible staffed hubs.

## Field validation still needed
Two real phones on a hotspot without internet; isolated Wi-Fi; app sleep and process kill; reconnect after clock drift; storage quota/eviction; file execution on Android and iOS; bundle transfer between app and standalone; acknowledgment return via a third device; malformed/modified bundles; duplicate replay; expired messages; power loss before local commit; gateway 429 and account switching. No field-readiness or universal-device claim is made.

## Privacy and abuse
No medical details, private addresses, contact lists or hidden location collection. New records are server-managed and admin-restricted; the public-content gateway authenticates online callers. Local aliases are not verified accounts. Quota checks are best effort, not a distributed anti-abuse service. Stronger moderation, reporting, revocation, protocol-level tombstones and private encrypted groups remain future work. Deleting a local copy cannot revoke copies already relayed.
