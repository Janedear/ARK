EMERGENCY NETWORK APP — COMPLETE DEVELOPMENT BACKLOG
Last updated: 2026-11-15 | Addendum integrated: ARK Internet & Network Backbone

═══════════════════════════════════════════════════════════════════════
SECTION 0 — ARK INTERNET ARCHITECTURE (new, top priority)
═══════════════════════════════════════════════════════════════════════

The document "ARK Internet & Network Backbone Addendum" (40 items, Nov 2026) establishes
ARK Internet as a shared infrastructure layer. Every ARK application uses it through
common interfaces rather than building competing networks.

Layered stack (build from bottom up):

  Layer 0 — Physical links    LoRa, APRS, Bluetooth, WiFi, Ethernet, Iridium → gateway.mjs [DONE]
  Layer 1 — Datagram          Packet framing, addressing, TTL               → ark-hub.mjs  [DONE]
  Layer 2 — Routing           Multi-hop, dynamic, partition-tolerant         → ark-router.mjs [NOT BUILT]
  Layer 3 — Transport         Store-and-forward ✓; DTN; streams              → partial
  Layer 4 — Services          Messaging ✓; Web; Library; Exchange; Security  → partial
  Layer 5 — SDK               ark-sdk.mjs (Resilience Core SDK)              → planned

Layer 2 is the critical blocker. Nothing above neighborhood scale works without it.

PHASE 1 — FOUNDATION (prerequisite for everything else)
-----------------------------------------------------------
[ ] ARK Router (ark-router.mjs)
    Multi-hop routing table, gossip-based peer discovery, hop-count TTL, loop prevention
    Without this: hub sync is single-hop only; cities/regions are impossible
[ ] mDNS / DNS-SD zero-config hub discovery
    Clients find hub on local network without typing an IP address
    Without this: every user needs manual hub URL config
[ ] Hub authentication
    Shared passphrase or QR-paired token; protect hub API from unauthenticated access
    Without this: any device on the network can post messages or drain the hub
[ ] Four-state connection indicator (Local ARK / Regional ARK / Extended ARK / Global Internet)
    User-visible health check; replaces the single "hub connected / offline" badge

PHASE 2 — NETWORK SERVICES
-----------------------------------------------------------
[ ] ARK Library
    Dynamic upload of docs/files to hub; content replication between hubs via peerCycle
[ ] ARK Exchange
    P2P file sync between hub-connected clients; builds on distribution.mjs chunked transfer
[ ] Link-health telemetry
    Per-adapter latency, throughput, delivery rate; extends gateway.mjs stats object
[ ] Coverage mapping
    Basic topology view: hubs, peers, radio reach; no precise device locations
[ ] Automatic gateway failover
    Internet-down detection → auto-switch to radio adapters without manual intervention
[ ] Bandwidth-aware routing
    Adapter capacity exported; routing selects adapter based on message size + available capacity

PHASE 3 — VALIDATION & HARDENING
-----------------------------------------------------------
[ ] Field pilot test harness (F1 — the first real milestone)
    Two Pis, no internet, full message + file exchange proof end-to-end
    This is the first measurable success; everything before it is preparation
[ ] Congestion management
    Rate limits, per-peer quotas, fairness policy for scarce radio bandwidth
[ ] Progressive expansion tests
    Neighborhood → city → regional networking, validated before making bigger claims
[ ] Partition-aware reconciliation
    Formal conflict resolution when separated ARK islands rejoin; vector clocks or CRDT

PHASE 4 — EVENTUALLY (requires hardware, licensing, or external partnerships)
-----------------------------------------------------------
[ ] Voice communication (blocked: WebRTC offline constraints; needs native app or hub-side SIP)
[ ] Video communication (blocked: same + much higher bandwidth)
[ ] Opportunistic phone relays (blocked: iOS/Android kill background service workers)
[ ] Regional networking (requires licensed amateur radio operators + long-range infrastructure)
[ ] Nationwide backbone (requires infrastructure agreements; not a software problem)
[ ] ARK Security — full authn + E2E encryption + defensive monitoring
    Complex enough to be its own project; stub in Phase 1 with hub passphrase

ADDENDUM ITEM CLASSIFICATIONS (40 items, fully classified)
-----------------------------------------------------------
A1  ARK Internet concept                   → Phase 1 (this architecture is it)
A2  Standard TCP/IP / HTTP                 → ALREADY DONE (hub + gateway.mjs)
A3  Neighborhood networks                  → Partial — mDNS + router needed (Phase 1)
A4  Citywide networking                    → Phase 2 (needs router first)
A5  Regional networking                    → Phase 4 (hardware + licensing)
A6  Nationwide backbone                    → Phase 4 (not a software problem alone)
A7  Multi-hop routing                      → Phase 1 (ark-router.mjs)
A8  Dynamic routing                        → Phase 1 (ark-router.mjs)
A9  Network partition tolerance            → Phase 3
A10 Network rejoining + reconciliation     → Phase 3
B1  Opportunistic phone relays             → Phase 4 — platform-blocked (iOS/Android)
B2  Dedicated ARK routing hubs             → ALREADY DONE (ark-hub.mjs on Pi)
B3  Conventional internet gateways        → ALREADY DONE
B4  Automatic gateway failover             → Phase 2
C1  ARK Web (local website hosting)        → Phase 2 (extend hub static serving)
C2  ARK Messaging                          → ALREADY DONE
C3  ARK Library                            → Phase 2
C4  ARK Exchange                           → Phase 2 (distribution.mjs + P2P layer)
C5  ARK Security (authn/encryption)        → Phase 1 stub; full in Phase 4
C6  Local service discovery (mDNS)         → Phase 1
C7  Local naming and resolution            → Phase 1 (tied to mDNS)
C8  Offline content hosting                → Phase 2
C9  Content replication                    → Phase 2
D1  Store-and-forward networking           → ALREADY DONE (gateway.mjs txQueue)
D2  Delay-tolerant networking              → Partial — TTL exists; no bundle protocol
D3  Bandwidth-aware routing                → Phase 2
D4  Traffic prioritization                 → ALREADY DONE (Critical/Normal routing)
D5  Congestion management                  → Phase 3
D6  Voice communication                    → Phase 4 — platform-blocked
D7  Video communication                    → Phase 4 — platform-blocked
E1  Four connection indicators             → Phase 1 (UI change)
E2  Verified reachability                  → Phase 2 (ping/probe system)
E3  Link-health telemetry                  → Phase 2 (extend gateway stats)
E4  Coverage mapping                       → Phase 2
E5  Infrastructure planning tool           → Phase 3 (planning guide first)
E6  ARK-wide networking SDK                → Phase 2 (ark-sdk.mjs)
E7  Offline-first application contracts    → Phase 2 (formalize implicit architecture)
E8  Cross-platform compatibility           → Partial (Android ✓, iOS restricted, desktop ✓)
F1  Field pilot test (2 disconnected hubs) → Phase 3 — FIRST REAL MILESTONE
F2  Progressive expansion tests            → Phase 3

═══════════════════════════════════════════════════════════════════════
SECTION 1 — CORE OFFLINE NETWORKING [critical]
═══════════════════════════════════════════════════════════════════════
[ ] Bluetooth peer discovery and pairing         → Phase 1 (tied to mDNS)
[ ] Local Wi-Fi communication without internet   → DONE (hub HTTP works on LAN)
[x] Local network device discovery               → Phase 1 (mDNS)
[ ] Automatic reconnection to previously trusted peers
[ ] Encrypted direct messaging                   → Phase 1 stub / Phase 4 full E2E
[x] Store-and-forward message delivery           → DONE
[x] Message IDs, timestamps, duplicate prevention → DONE
[ ] Delivery acknowledgments and retry queues    → Partial (gateway retries; no ACK to client)
[ ] Message expiration and storage limits
[ ] Offline network status and diagnostics
[ ] Clear warnings when a message has not been delivered
[ ] Battery-conscious discovery intervals

═══════════════════════════════════════════════════════════════════════
SECTION 2 — VOLUNTARY APP REPLICATION AND DISTRIBUTION [critical]
═══════════════════════════════════════════════════════════════════════
[ ] Share App button on every compatible device
[ ] Signed Android APK offline sharing
[ ] Bluetooth file transfer where supported
[ ] Wi-Fi peer-to-peer file sharing where supported
[x] Local Wi-Fi download portal                  → DONE (distribution.mjs startDownloadPortal)
[ ] USB installation package distribution
[x] QR codes for local download addresses        → DONE (hub-page.html)
[x] SHA-256 package verification                 → DONE (distribution.mjs sha256File)
[ ] Developer signature verification
[x] Resumable chunked file transfers             → DONE (distribution.mjs buildChunks)
[ ] Offline installation instructions
[x] Package version and compatibility checks     → Partial
[ ] Signed offline updates and rollback
[ ] Explicit recipient approval before transfer or installation
[ ] No silent installation or unauthorized propagation

═══════════════════════════════════════════════════════════════════════
SECTION 3 — EMERGENCY ALERTS AND PUBLIC SAFETY [critical]
═══════════════════════════════════════════════════════════════════════
[x] Offline emergency bulletin board             → DONE (community board in HTML)
[ ] Verified official alert publisher accounts
[x] Emergency message priority labels            → DONE (Critical priority)
[x] Medical assistance requests                  → DONE (help request form)
[x] Shelter and evacuation information           → DONE (embedded playbooks)
[x] Water and food distribution notices          → DONE (resource tracker)
[ ] Missing-person and family reunification notices
[x] Public safety instructions cached offline    → DONE (service worker + IndexedDB)
[ ] Alert expiration and correction notices
[ ] Protection against forged or misleading alerts
[ ] Accessible alert presentation
[ ] Last-updated and source verification indicators

═══════════════════════════════════════════════════════════════════════
SECTION 4 — POWER-OUTAGE RESILIENCE [critical]
═══════════════════════════════════════════════════════════════════════
[ ] Low-power operating mode
[ ] Adjustable scanning frequency
[ ] Manual sync mode
[x] Offline-first local database                 → DONE (IndexedDB + localStorage)
[x] App restart and recovery after phone reboot  → DONE (service worker)
[ ] Storage capacity warnings
[ ] Battery level indicators
[x] Power bank and charging station directory    → DONE (resource tab)
[x] Printable setup and operating instructions   → DONE (print packet)
[x] No mandatory cloud login                     → DONE
[x] Graceful operation with no GPS signal        → DONE
[ ] Data backup and restore

═══════════════════════════════════════════════════════════════════════
SECTION 5 — RESPONDER AND NATIONAL GUARD SUPPORT [high]
═══════════════════════════════════════════════════════════════════════
[x] Separate authorized responder interface      → DONE (responder-bridge.mjs)
[ ] Pre-enrolled responder identity verification
[x] Cryptographically signed public announcements → Partial (responder-bridge has signing stub)
[x] Responder role permissions                   → Partial
[x] Civilian assistance request queue            → DONE
[x] Resource requests and fulfillment status     → DONE
[x] Medical triage request intake without automated diagnosis → DONE
[ ] Shelter occupancy reporting
[ ] Volunteer dispatch and coordination
[ ] Responder audit records
[ ] Sensitive information access controls
[ ] No public display of military personnel movements  → by design (never stored)
[ ] No classified or operationally sensitive info handling → by design
[ ] Authorized integration and export interfaces

═══════════════════════════════════════════════════════════════════════
SECTION 6 — RADIO AND LONG-RANGE CONNECTIVITY [high]
═══════════════════════════════════════════════════════════════════════
[x] Optional Meshtastic gateway adapter          → DONE (LoRaAdapter in gateway.mjs)
[x] LoRa text message bridge                     → DONE (gateway.mjs + RYLR/RN2903)
[x] Packet radio gateway interface               → DONE (AprsAdapter + KISS/AX.25)
[ ] Radio link capacity indicators               → Phase 2
[x] Small compressed text packet format         → DONE (ARK|channel|alias|text)
[x] Chunking and checksums for suitable data links → DONE (distribution.mjs)
[x] Bandwidth-aware message prioritization       → Partial (priority; not capacity-aware)
[x] Radio regulatory and licensing guidance      → DONE (HUB-GUIDE.md)
[ ] Gateway power status
[x] Satellite or internet gateway integration    → DONE (SatModemAdapter + Iridium SBD)
[x] No assumption that phones contain LoRa hardware → by design (NullAdapter)
[x] No large APK distribution over LoRa         → by design (200-byte payload limit)

═══════════════════════════════════════════════════════════════════════
SECTION 7 — OFFLINE MAPS AND LOCATION SERVICES [high]
═══════════════════════════════════════════════════════════════════════
[ ] Downloadable offline maps
[ ] Shelter locations
[ ] Hospitals and medical aid points
[ ] Water distribution points
[ ] Food distribution points
[ ] Charging locations
[ ] Public meeting and check-in locations
[ ] User-controlled location sharing
[ ] Location precision and expiration controls
[ ] Map updates with source and timestamp
[ ] No automatic public sharing of precise locations → by design (never auto-shared)

═══════════════════════════════════════════════════════════════════════
SECTION 8 — COMMUNITY ORGANIZATION AND LOGISTICS [high]
═══════════════════════════════════════════════════════════════════════
[ ] Neighborhood group creation
[ ] Trusted community coordinator roles
[ ] Volunteer registration
[ ] Task assignment and completion tracking
[x] Supply inventory reporting                   → DONE (resource tracker)
[x] Resource request and offer matching          → DONE
[x] Community bulletin board                     → DONE
[x] Family check-in messages                     → DONE (household tab)
[ ] Scheduled communication windows
[ ] Multi-language announcements
[ ] Printable community information sheets
[ ] Offline contact directory with consent

═══════════════════════════════════════════════════════════════════════
SECTION 9 — PRIVACY, SECURITY AND ABUSE PREVENTION [critical]
═══════════════════════════════════════════════════════════════════════
[ ] End-to-end encryption for private messages
[ ] Authenticated device pairing
[ ] Signed application releases
[ ] Secure key storage
[ ] Local data encryption
[ ] Message authenticity verification
[ ] Spam and flood controls
[x] Rate limits and queue quotas                 → Partial (gateway TTL + retry limits)
[ ] Role-based access controls
[ ] Consent-based file transfers
[ ] Lost-device account and key recovery plan
[ ] Offline credential expiration and revocation
[ ] User-controlled data deletion
[x] Minimal collection of personal information   → DONE (opt-in telemetry only)
[ ] Threat modeling and security review
[ ] No hidden surveillance or unauthorized access → by design

═══════════════════════════════════════════════════════════════════════
SECTION 10 — ACCESSIBILITY AND USABILITY [high]
═══════════════════════════════════════════════════════════════════════
[x] One-screen emergency home dashboard          → DONE
[ ] Large readable controls
[x] High-contrast and dark modes                 → DONE
[ ] Screen-reader accessibility
[ ] Low-literacy visual instructions
[ ] Multiple language packs
[ ] Text-only low-bandwidth mode
[ ] Clear connection and delivery status
[x] Simple onboarding                            → DONE (setup wizard stub)
[x] No account required for basic offline use    → DONE
[ ] Emergency help button with confirmation
[x] Offline help and troubleshooting guide       → DONE (embedded)

═══════════════════════════════════════════════════════════════════════
SECTION 11 — RELIABILITY AND TESTING [critical]
═══════════════════════════════════════════════════════════════════════
[ ] Airplane-mode Bluetooth tests
[ ] No-internet Wi-Fi tests
[ ] Multiple Android model compatibility tests
[ ] iOS capability and restriction assessment
[ ] App restart and phone reboot tests
[ ] Low-battery behavior tests
[ ] Interrupted file transfer recovery tests
[x] Corrupted package rejection                  → DONE (sha256 verify)
[x] Duplicate message suppression tests          → DONE (dedup in store)
[ ] Encryption and authentication tests
[ ] Queue overflow and storage exhaustion tests
[ ] Real-world range tests
[x] Clearly documented known limitations         → DONE (README + HUB-GUIDE.md)
[ ] Reproducible build and release checklist

═══════════════════════════════════════════════════════════════════════
SECTION 12 — DEPLOYMENT AND GOVERNANCE [high]
═══════════════════════════════════════════════════════════════════════
[x] Offline installer bundle                     → DONE (zip kit endpoint)
[ ] Pre-outage installation campaign
[ ] Community seed-device program
[x] Local distribution hub setup guide           → DONE (HUB-GUIDE.md)
[ ] Coordinator training cards
[ ] Printable QR posters
[ ] Offline incident operating procedures
[ ] Official agency contact and escalation plan
[ ] Public release signing and version control
[ ] Open-source licensing decision
[ ] Independent security review plan
[ ] Maintenance and update ownership
[x] Disaster recovery documentation             → DONE (CONTINUITY.md)
[ ] Post-incident data retention policy

═══════════════════════════════════════════════════════════════════════
WHAT'S DONE (summary)
═══════════════════════════════════════════════════════════════════════
DONE:  Offline-first PWA (service worker, IndexedDB, localStorage)
DONE:  Community messaging + hub HTTP sync
DONE:  Peer registry + hub-to-hub gossip pull (single-hop)
DONE:  gateway.mjs — LoRa (AT commands), APRS (KISS/AX.25), Iridium SBD satellite
DONE:  NullAdapter (no-hardware safe start)
DONE:  Network Intelligence + opt-in telemetry + readiness score
DONE:  Distribution portal (chunked transfer, SHA-256, QR, zip kit)
DONE:  Responder bridge protocol
DONE:  Household/resource/medical/incident tabs
DONE:  Print packet, embedded playbooks, service worker caching
DONE:  Critical/Normal priority routing

THE FIRST REAL MILESTONE (Phase 3, F1):
  Two Raspberry Pis, internet cable unplugged, exchange messages + files.
  That is the proof. Everything before it is preparation.
