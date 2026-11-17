// === SOFT HUB (Auto-hub: first opener becomes the hub when no external hub is set) ===
const SoftHub = (() => {
  const CHANNEL   = 'ark_softhub_v1';
  const ROLE_KEY  = 'softhub_role';   // 'hub' | 'peer'
  const CLAIM_KEY = 'softhub_claimed'; // ISO timestamp of when this tab claimed hub role
  const PEERS_KEY = 'softhub_peers';  // JSON array of {id, alias, lastSeen}
  const SELF_ID   = 'ark_' + (Store.get('hh_id') || Math.random().toString(36).slice(2));

  let _bc = null;
  let _role = 'peer';
  let _peers = [];
  let _heartbeatInterval = null;

  function _enabled()  { return typeof BroadcastChannel !== 'undefined'; }
  function isHub()     { return _role === 'hub'; }
  function peerCount() { return _peers.length; }

  function _savePeers(list) {
    _peers = list;
    try { localStorage.setItem(PEERS_KEY, JSON.stringify(list)); } catch(e) {}
  }

  function _broadcast(type, payload = {}) {
    if (_bc) try { _bc.postMessage({ type, from: SELF_ID, alias: Store.get('last_alias',''), ...payload }); } catch(e) {}
  }

  function _claimHub() {
    _role = 'hub';
    Store.set(ROLE_KEY, 'hub');
    const claimedAt = new Date().toISOString();
    Store.set(CLAIM_KEY, claimedAt);
    _broadcast('hub_claim', { claimedAt });
    _updateUI();
  }

  function _updateUI() {
    // Update Network tab hub status indicator if present
    const badge = document.getElementById('softhub-role-badge');
    if (badge) {
      badge.textContent = '📡 ARK tabs open in this browser share messages with each other';
      badge.style.color = isHub() ? 'var(--gold, #8b6f3e)' : 'var(--text-secondary, #666)';
      badge.style.display = '';
    }
    // Show notification once when auto-promoted
    const notified = Store.get('softhub_notified');
    if (isHub() && !notified) {
      // No announcement: a browser tab cannot share with other devices by itself, and saying
      // so would give false reassurance. Other devices are reached through an ARK Hub (Network tab).
      Store.set('softhub_notified', true);
    }
    // Update hero peer badge
    const heroPeers = document.getElementById('hero-sync-badge');
    if (heroPeers) heroPeers.textContent = _peers.length + ' Peer' + (_peers.length !== 1 ? 's' : '');
    // Delegate to Network's deploy UI updater
    if (typeof Network !== 'undefined' && Network._updateHubDeployUI) {
      Network._updateHubDeployUI();
    }
  }

  function _handleMessage(e) {
    const { type, from, alias } = e.data || {};
    if (!type || from === SELF_ID) return;

    if (type === 'hub_claim') {
      // Another tab / window is claiming hub role — yield if we claimed later
      const myClaim = new Date(Store.get(CLAIM_KEY, 0)).getTime();
      const theirClaim = e.data.claimedAt ? new Date(e.data.claimedAt).getTime() : 0;
      if (_role === 'hub' && theirClaim && theirClaim < myClaim) {
        _role = 'peer';
        Store.set(ROLE_KEY, 'peer');
        _updateUI();
      }
    }

    if (type === 'heartbeat') {
      // Record peer
      const now = Date.now();
      const existing = _peers.findIndex(p => p.id === from);
      const entry = { id: from, alias: alias || 'Unknown', lastSeen: now };
      if (existing >= 0) _peers[existing] = entry;
      else _peers.push(entry);
      // Prune peers not seen in 90s
      _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
      _updateUI();
      // If hub, acknowledge
      if (isHub()) _broadcast('hub_ack', { peers: _peers.length });
    }

    if (type === 'hub_ack') {
      // We got a reply from a hub peer; update peer count
      _updateUI();
    }
  }

  async function init() {
    // Only activate SoftHub when no external hub URL is configured
    if (Store.get('hub_url')) return;

    if (!_enabled()) return; // BroadcastChannel not available (very old browser)

    try { _bc = new BroadcastChannel(CHANNEL); } catch(e) { return; }
    _bc.onmessage = _handleMessage;

    // Check if another tab already holds the hub role via localStorage timestamp
    const existingClaim = Store.get(CLAIM_KEY);
    const existingRole  = Store.get(ROLE_KEY);
    const wasManual     = Store.get('softhub_manual');

    if (existingRole === 'hub' && existingClaim) {
      // Another tab may own hub — wait a moment to let it heartbeat
      // But if the user manually pressed "Become Hub" last time, re-claim immediately
      if (wasManual) {
        setTimeout(() => { _claimHub(); }, 100);
      } else {
        // Wait for a hub_ack/heartbeat from the other tab; only claim if none arrives
        let gotAck = false;
        const prevOnMessage = _bc.onmessage;
        _bc.onmessage = (e) => {
          const { type } = e.data || {};
          if (type === 'hub_ack' || type === 'hub_claim' || type === 'heartbeat') gotAck = true;
          if (prevOnMessage) prevOnMessage(e);
        };
        setTimeout(() => {
          _bc.onmessage = _handleMessage; // restore normal handler
          if (!gotAck) _claimHub();       // no live hub found — claim it
        }, 2000);
      }
    } else {
      // First opener — claim hub role immediately
      await new Promise(r => setTimeout(r, 300)); // small delay for UI
      _claimHub();
    }

    // Send heartbeats every 15s
    _heartbeatInterval = setInterval(() => {
      _broadcast('heartbeat');
      // Prune peers > 90s
      const now = Date.now();
      _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
      _updateUI();
    }, 15000);

    // Initial heartbeat
    _broadcast('heartbeat');
  }

  function stop() {
    if (_heartbeatInterval) clearInterval(_heartbeatInterval);
    if (_bc) { try { _bc.close(); } catch(e) {} _bc = null; }
    _role = 'peer';
  }

  // Called by Hub when an external hub URL is configured — SoftHub yields
  function yield_to_external() {
    stop();
    Store.del(ROLE_KEY);
    Store.del(CLAIM_KEY);
    Store.del('softhub_notified');
  }

  // One-tap manual hub claim (called from Network tab "Become Hub" button)
  async function claimHubManually() {
    // If BroadcastChannel not yet set up, init the channel first
    if (!_bc && _enabled()) {
      try { _bc = new BroadcastChannel(CHANNEL); _bc.onmessage = _handleMessage; } catch(e) {}
    }
    // Start heartbeat if not already running
    if (!_heartbeatInterval) {
      _heartbeatInterval = setInterval(() => {
        _broadcast('heartbeat');
        const now = Date.now();
        _savePeers(_peers.filter(p => now - p.lastSeen < 90000));
        _updateUI();
      }, 15000);
    }
    _claimHub();
    _broadcast('heartbeat');
    // Persist explicit choice so it survives page reload
    Store.set('softhub_manual', '1');
  }

  // === AUTO-DISCOVERY: broadcast "join me" on first open ===
  // On first open, ARK finds every other open tab/window and invites them in.
  // The invite shows a persistent banner with one-tap join.
  const DISCOVER_CHANNEL = 'ark_discover_v1';
  let _discoverBc = null;

  function _startDiscovery() {
    if (typeof BroadcastChannel === 'undefined') return;
    // Close any existing channel before reopening (prevents instance leak on double-call)
    if (_discoverBc) { try { _discoverBc.close(); } catch(e) {} _discoverBc = null; }
    try { _discoverBc = new BroadcastChannel(DISCOVER_CHANNEL); } catch(e) { return; }

    _discoverBc.onmessage = (e) => {
      const { type, fromAlias, hubIP, hubPort } = e.data || {};
      // Another ARK tab is announcing itself — show a join banner
      if (type === 'ark_here' && hubIP) {
        _showJoinBanner(fromAlias, hubIP, hubPort);
      }
      // A new tab just opened — if we're the hub, announce our address
      if (type === 'ark_new_tab' && isHub()) {
        const ip = Store.get('softhub_detected_ip');
        if (ip) {
          _discoverBc.postMessage({
            type: 'ark_here',
            fromAlias: Store.get('last_alias', 'ARK Hub'),
            hubIP: ip,
            hubPort: 8765
          });
        }
      }
    };

    // Announce ourselves as a new tab — existing hubs will respond
    _discoverBc.postMessage({ type: 'ark_new_tab', from: SELF_ID });

    // If we become hub and detect IP, announce to any other tabs
    setTimeout(() => {
      if (isHub()) {
        const ip = Store.get('softhub_detected_ip');
        if (ip) {
          _discoverBc.postMessage({
            type: 'ark_here',
            fromAlias: Store.get('last_alias', 'This device'),
            hubIP: ip,
            hubPort: 8765
          });
        }
      }
    }, 4000);
  }

  // Validate that an IP is a private-range address (safe for LAN hub use)
  const _PRIVATE_IP_RE = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

  function _showJoinBanner(alias, ip, port) {
    // Validate IP is a private-range address before trusting it
    if (!ip || !_PRIVATE_IP_RE.test(ip)) return;
    // Don't show if already connected to a hub
    if (Store.get('hub_url')) return;
    // Don't show if WE are the hub
    if (isHub()) return;
    // Don't show if already dismissed this IP recently
    const dismissKey = 'ark_join_dismiss_' + ip;
    if (Store.get(dismissKey)) return;

    const bannerId = 'ark-join-banner';
    if (document.getElementById(bannerId)) return; // already showing

    const hubUrl = 'http://' + ip + ':' + (parseInt(port) || 8765);
    const displayAlias = alias || 'a nearby device';

    const banner = document.createElement('div');
    banner.id = bannerId;
    banner.style.cssText = [
      'position:fixed', 'bottom:calc(80px + env(safe-area-inset-bottom,0px))', 'left:50%', 'transform:translateX(-50%)',
      'z-index:8500', 'max-width:min(420px,calc(100vw - 32px))', 'width:100%',
      'background:linear-gradient(135deg,#2a2016 0%,#1a1208 100%)',
      'border:1.5px solid rgba(139,111,62,.55)', 'border-radius:20px',
      'padding:16px 20px', 'box-shadow:0 8px 40px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.04) inset',
      'display:flex', 'align-items:center', 'gap:14px',
      'animation:slideUpBanner .35s cubic-bezier(.34,1.56,.64,1) both'
    ].join(';');

    banner.innerHTML = `
      <span style="font-size:1.6rem;flex-shrink:0">📡</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:.8rem;font-weight:700;color:#c9a86c;letter-spacing:.06em;text-transform:uppercase;margin-bottom:2px">ARK Found Nearby</div>
        <div style="font-size:.85rem;color:#e8dcc8;line-height:1.3"><strong>${_esc(displayAlias)}</strong> has an ARK hub on this network. Join to sync messages.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="ark-join-btn"
          style="background:var(--accent,#8b6f3e);color:#fff;border:none;border-radius:10px;padding:8px 14px;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap">
          Join →
        </button>
        <button class="ark-dismiss-btn"
          style="background:transparent;color:rgba(200,180,150,.6);border:none;font-size:.75rem;cursor:pointer;padding:2px 0">
          Dismiss
        </button>
      </div>`;

    // Wire buttons via data attributes — avoids string interpolation XSS in onclick
    banner.querySelector('.ark-join-btn').dataset.hubUrl = hubUrl;
    banner.querySelector('.ark-join-btn').addEventListener('click', function() {
      Network.joinFromBanner(this.dataset.hubUrl);
      banner.remove();
    });
    banner.querySelector('.ark-dismiss-btn').dataset.dismissKey = dismissKey;
    banner.querySelector('.ark-dismiss-btn').addEventListener('click', function() {
      Store.set(this.dataset.dismissKey, '1');
      banner.remove();
    });

    document.body.appendChild(banner);

    // Auto-remove after 25 seconds
    setTimeout(() => { banner.remove(); }, 25000);
  }

  function _esc(s) { return String(s).replace(/[<>"'&]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','&':'&amp;'}[c])); }

  return { init, stop, yield_to_external, isHub, peerCount, claimHubManually, startDiscovery: _startDiscovery };
})();

