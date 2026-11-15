# ARK-RELAY-1 Packet Format

**Version:** 1 (current)  
**Status:** Prototype — not field-tested  
**Contact:** hello@halosuite.ai

---

## Overview

ARK uses a signed JSON packet format called **ARK-RELAY-1** for all community messages. The same packet format works across every transport ARK supports: browser-to-hub over HTTP, hub-to-hub over any network, USB stick hand-carry, copy-paste relay, and radio/SMS bridges.

A signature proves a message was not modified in transit. It does **not** prove who wrote it, or that the content is true.

---

## Packet structure

```json
{
  "v":          1,
  "kind":       "msg",
  "channel":    "general",
  "alias":      "Maria",
  "text":       "Water available at 42 Elm St.",
  "ref":        null,
  "issued_at":  "2026-11-15T14:00:00.000Z",
  "expires_at": "2026-11-22T14:00:00.000Z",
  "public_key": "<base64url DER SubjectPublicKeyInfo>",
  "id":         "<sha256 hex of canonical payload>",
  "signature":  "<base64url raw r||s, 64 bytes>"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `v` | integer | ✅ | Protocol version. Always `1`. |
| `kind` | string | ✅ | Message type. See **Kind values** below. |
| `channel` | string | ✅ | Routing channel (e.g. `"general"`, `"medical"`, `"supply"`). Max 64 chars. |
| `alias` | string | ✅ | Display name chosen by the sender. Not verified. Max 64 chars. |
| `text` | string | ✅ | Message body. Max 2000 chars. |
| `ref` | string \| null | ✅ | `id` of a message being replied to or acknowledged, or `null`. |
| `issued_at` | ISO 8601 string | ✅ | When the message was created (UTC). |
| `expires_at` | ISO 8601 string | ✅ | When the message expires and should be hidden. |
| `public_key` | base64url string | ✅ | DER-encoded SubjectPublicKeyInfo for the sender's P-256 key. |
| `id` | hex string | ✅ | SHA-256 of the canonical payload (see **ID derivation** below). |
| `signature` | base64url string | ✅ | ECDSA P-256/SHA-256 signature over `id`. Raw format: `r ∥ s`, 64 bytes. |

### Kind values

| Kind | Meaning |
|------|---------|
| `msg` | Community message (default) |
| `ack` | Acknowledgement of another message (`ref` is required) |
| `status` | Hub or node status broadcast |
| `resource` | Resource availability announcement |

---

## ID derivation

The `id` field is the hex-encoded SHA-256 of the **canonical payload** — a stable JSON serialisation of all fields except `id` and `signature`, with keys sorted alphabetically and no extra whitespace:

```
canonical = JSON.stringify({
  alias, channel, expires_at, issued_at, kind, public_key, ref, text, v
})  // keys in alphabetical order, no space separators

id = hex(sha256(UTF-8 bytes of canonical))
```

Implementations must reject any packet where `id` does not match this derivation.

---

## Signature

```
signature = ECDSA-P256-SHA256-Sign(private_key, hex_to_bytes(id))
```

The signature is over the **raw bytes of the hex `id` string** (not the binary hash — the ASCII hex characters). This ensures the signed data is the same string that travels in the JSON.

Encoding: **base64url** (RFC 4648 §5, no padding), raw `r ∥ s` format (not DER/ASN.1). Both `r` and `s` are 32 bytes each, zero-padded to exactly 32 bytes, concatenated → 64 bytes total → 86 base64url characters (no `=`).

---

## Verification algorithm

```
1. Parse the JSON packet.
2. Reject if v ≠ 1.
3. Reject if any required field is missing.
4. Reject if issued_at or expires_at cannot be parsed as ISO 8601.
5. Reject if expires_at ≤ current time (expired).
6. Reconstruct canonical from {alias, channel, expires_at, issued_at, kind,
   public_key, ref, text, v} with alphabetically sorted keys.
7. Reject if hex(sha256(canonical)) ≠ id.
8. Decode public_key from base64url → DER SubjectPublicKeyInfo → P-256 public key.
9. Decode signature from base64url → 64 bytes → split r (bytes 0–31) and s (bytes 32–63).
10. Verify ECDSA-P256-SHA256(public_key, ASCII bytes of id, r, s).
11. Accept only if step 10 passes.
```

---

## Hub API

The ARK Local Hub exposes these endpoints on port 7779 (default):

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Hub health: `{ok, peers, messages, uptime}` |
| GET | `/api/messages` | All non-expired messages: `{messages: [...]}` |
| POST | `/api/post` | Submit a signed packet. Returns `{ok, id}` or `{error}`. |
| POST | `/api/ack` | Submit an ack packet (shorthand). |
| GET | `/api/bundle` | Full bundle: messages + manifest in one response. |
| POST | `/api/bundle` | Accept a bundle from another hub. |
| GET | `/files/manifest.json` | Offline file library manifest. |
| GET | `/files/<name>` | Serve a named file from the library. |
| GET | `/kit/<name>` | Serve a named kit file. |
| POST | `/sign` | Hub signs a payload with its own key (hub-to-hub auth). |

All endpoints return JSON. The hub rejects packets that fail verification at step 10 above.

---

## Transport notes

**Browser → Hub:** HTTP POST to `/api/post`. No authentication needed; the signature IS the authentication.

**Hub → Hub:** POST to the target hub's `/api/bundle` with a bundle signed by the sending hub.

**USB / file relay:** Export a bundle JSON file, carry it physically, import at the destination hub via POST `/api/bundle`.

**Copy-paste relay:** A single packet is valid JSON and can be copied from one device to another. The receiving hub verifies it normally.

**Radio / SMS:** The packet is serialised as compact JSON (or a base85/base64 encoding for bandwidth-constrained transports). The bridge code is in `src/toolkit/`.

---

## Security properties

- **Integrity:** A modified packet fails ID or signature verification and is refused.
- **Non-repudiation:** The sender's public key is embedded in the packet. They cannot disavow it without also disavowing the key.
- **No identity guarantee:** `alias` is chosen by the sender and is not verified. Anyone can claim any alias.
- **No confidentiality:** All messages are plaintext. Do not post anything you would not put on a public noticeboard.
- **No delivery guarantee:** "Seen" count means people read a message, not that help is coming.
- **No spam prevention:** Any device can send any message. The hub shows all valid messages.
- **Key continuity:** A device generates one P-256 key per install and signs all its messages with it. There is no key revocation mechanism in v1.

---

## Implementation

The reference implementation is in `ARK-CRISIS-SUITE.html` (the browser client) and `src/hub/hub-core.mjs` (the hub server). Both are plain JavaScript with no dependencies beyond the Web Crypto API (browser) and Node.js `crypto` module (hub).

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1 | 2026-11 | Initial specification |
