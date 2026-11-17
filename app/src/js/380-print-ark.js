/* ============================================================
   PRINT ARK — printable outputs for offline use
   ============================================================ */
const PrintARK = (() => {

  function _openPrintWindow(html, title) {
    const pageHead = `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>${esc(title)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font:13px/1.5 Arial,sans-serif;color:#111;background:#fff;padding:20px;max-width:720px;margin:0 auto}
h1{font-size:18px;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:12px}
h2{font-size:14px;border-bottom:1px solid #aaa;padding-bottom:4px;margin:16px 0 8px}
h3{font-size:13px;font-weight:700;margin:10px 0 4px}
p,li{font-size:13px;margin-bottom:4px}
ul,ol{padding-left:20px;margin-bottom:8px}
.card{border:1px solid #ccc;border-radius:6px;padding:12px;margin-bottom:12px;page-break-inside:avoid}
.card-title{font-weight:700;font-size:14px;margin-bottom:6px}
.warn{background:#fff3cd;border:1px solid #ffc107;border-radius:4px;padding:8px;font-size:12px;margin-bottom:12px}
.badge{display:inline-block;background:#333;color:#fff;border-radius:3px;padding:1px 5px;font-size:11px}
table{border-collapse:collapse;width:100%;margin-bottom:12px}
td,th{border:1px solid #ccc;padding:4px 8px;font-size:12px;text-align:left}
th{background:#eee;font-weight:700}
.footer{margin-top:24px;padding-top:8px;border-top:1px solid #ccc;font-size:11px;color:#666;text-align:center}
@media print{body{padding:0}button{display:none}.no-print{display:none}}
</style></head><body>${html}
<div class="footer">ARK Crisis Suite · Printed ${new Date().toLocaleString()} · arks.solutions</div>`;
    const w = window.open('', '_blank', 'width=760,height=900');
    if (!w) {
      // Pop-ups are blocked (common in installed apps): print from this page instead.
      printInPage(pageHead + '</body></html>');
      return;
    }
    w.document.write(pageHead + `
<div class="no-print" style="text-align:center;margin:20px 0">
  <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;background:#333;color:#fff;border:none;border-radius:4px">🖨️ Print</button>
</div>
</body></html>`);
    w.document.close();
    // Auto-trigger print dialog after render
    printOnce(w);
  }

  // ── Household emergency card (wallet-size, 2 per page) ─────────────────────
  function emergencyCard() {
    const hh = Store.get('hh_members', []);
    const contacts = (function(){ const hh = Store.get('household', {}); return hh.ooaName ? [{name:hh.ooaName, phone:hh.ooaPhone||'', role:'Out-of-area contact'}] : []; })();
    const alias = Store.get('last_alias', 'ARK User');
    const hhId = Store.get('hh_id', '');
    const alertLevel = Store.get('alert_level', 1);
    const alertLabels = {1:'Normal',2:'Elevated',3:'High',4:'Crisis',5:'Critical'};

    let memberRows = '';
    if (hh.length) {
      memberRows = hh.map(m => {
        const medical = [
          m.bloodType ? `Blood: ${esc(m.bloodType)}` : null,
          m.allergies ? `Allergies: ${esc(m.allergies)}` : null,
          m.conditions ? `Conditions: ${esc(m.conditions)}` : null,
        ].filter(Boolean).join('<br>') || '—';
        return `<tr><td>${esc(m.name||'')}</td><td>${esc(m.role||'')}</td><td>${medical}</td></tr>`;
      }).join('');
    } else {
      memberRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No members added yet — fill in Household tab</td></tr>';
    }

    let contactRows = '';
    if (contacts && contacts.length) {
      contactRows = contacts.slice(0,5).map(c => `<tr><td>${esc(c.name||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.role||'')}</td></tr>`).join('');
    } else {
      contactRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No contacts saved — fill in Checklist tab</td></tr>';
    }

    const gps = Store.get('last_gps');
    const gpsLine = gps ? `${gps.lat.toFixed(4)}, ${gps.lon.toFixed(4)}` : 'unknown';

    const card = `<h1>🆘 ARK Emergency Card</h1>
<div class="warn">⚠️ EMERGENCY USE — Keep this with you. Alert level at print time: <strong>${alertLabels[alertLevel] || alertLevel}</strong></div>
<div class="card">
  <div class="card-title">👤 Household ID: ${esc(hhId)} &nbsp;·&nbsp; Lead: ${esc(alias)}</div>
  <table>
    <tr><th>Name</th><th>Role</th><th>Medical Info</th></tr>
    ${memberRows}
  </table>
</div>
<div class="card">
  <div class="card-title">📞 Emergency Contacts</div>
  <table>
    <tr><th>Name</th><th>Phone</th><th>Role</th></tr>
    ${contactRows}
  </table>
</div>
<div class="card">
  <div class="card-title">📍 Location at Print Time</div>
  <p>GPS: ${gpsLine} &nbsp;·&nbsp; Printed: ${new Date().toLocaleString()}</p>
  <p><strong>Meeting point (near home):</strong> ${esc(Store.get('household', {}).meet1 || '') || '_______________________________________'}</p>
  <p><strong>Meeting point (further away):</strong> ${esc(Store.get('household', {}).meet2 || '') || '_______________________________________'}</p>
  <p><strong>Evacuation route / destination:</strong> ${esc(Store.get('household', {}).evac || '') || '_______________________________________'}</p>
  <p><strong>Out-of-area contact:</strong> ${esc([Store.get('household', {}).ooaName, Store.get('household', {}).ooaPhone].filter(Boolean).join(' — ')) || '__________________________________'}</p>
</div>`;
    _openPrintWindow(card, 'ARK Emergency Card');
  }

  // ── Medical quick reference ────────────────────────────────────────────────
  function medicalRef() {
    const html = `<h1>🏥 ARK Medical Quick Reference</h1>
<div class="warn">⚠️ Life-threatening emergency: call 911. This is for reference only — not a substitute for professional care.</div>
<div class="card">
  <div class="card-title">❤️ CPR — Adult (8+ years)</div>
  <ol>
    <li>Check scene safety. Tap shoulder: "Are you OK?" — no response?</li>
    <li>Call 911 (or tell someone else to call).</li>
    <li>Tilt head back, lift chin. Look, listen, feel — no normal breathing?</li>
    <li>Heel of hand on centre of chest. 30 compressions, 2 inches deep, 100–120/min.</li>
    <li>2 rescue breaths (1 second each, chest should rise). Resume compressions.</li>
    <li>Keep going until help arrives or AED is attached.</li>
  </ol>
</div>
<div class="card">
  <div class="card-title">❤️ CPR — Child (1–8 years) and Infant</div>
  <ol>
    <li>Same check/call as above.</li>
    <li><strong>Child:</strong> one or two hands. 30 compressions, about 2 inches deep.</li>
    <li><strong>Infant (under 1):</strong> both thumbs with hands around the chest, or heel of one hand. 30 compressions, about 1.5 inches deep.</li>
    <li>2 gentle rescue breaths. Continue until help arrives.</li>
  </ol>
</div>
<div class="card">
  <div class="card-title">🤿 Choking — Adult / Child</div>
  <ul>
    <li>5 firm back blows between shoulder blades with heel of hand.</li>
    <li>5 abdominal thrusts (Heimlich): stand behind, fist above navel, pull sharply inward and upward.</li>
    <li>Alternate until object clears or person becomes unconscious.</li>
    <li>Unconscious → lower to floor, begin CPR, check mouth before breaths.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🤿 Choking — Infant (&lt;1 year)</div>
  <ul>
    <li>5 back blows (face-down on forearm, heel of hand).</li>
    <li>5 chest thrusts (heel of one hand, centre of chest). Do NOT do abdominal thrusts.</li>
    <li>Alternate until object clears.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🩸 Bleeding Control</div>
  <ul>
    <li>Apply firm direct pressure with clean cloth — do not remove.</li>
    <li>Elevate the limb if possible.</li>
    <li>Tourniquet (last resort): 2–3 inches above wound, tighten until bleeding stops, note time.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🌡️ Shock Signs &amp; Response</div>
  <ul>
    <li>Signs: pale/cool/clammy skin, rapid weak pulse, confusion, rapid breathing.</li>
    <li>Lay person flat, elevate legs 12 inches (unless head/neck/spine injury).</li>
    <li>Keep warm, do not give food or water. Call 911 immediately.</li>
  </ul>
</div>
<div class="card">
  <div class="card-title">🔥 Burns</div>
  <ul>
    <li>Cool with cool running water 10–20 minutes. No ice.</li>
    <li>Cover loosely with sterile gauze. No butter or toothpaste.</li>
    <li>Seek care if larger than palm, on face/hands/genitals, or full thickness (white/charred).</li>
  </ul>
</div>`;
    _openPrintWindow(html, 'ARK Medical Reference');
  }

  // ── Survival checklist ────────────────────────────────────────────────────
  function checklist() {
    const cl = (typeof Checklist !== 'undefined') ? Checklist._getActiveChecklist() : null;
    const items = cl ? cl.items : [];
    const storeKey = (typeof Checklist !== 'undefined') ? Checklist._storeKey() : ('checklist_daily_' + today());
    const checked = Store.get(storeKey, {});
    const done = items.filter(i => checked[i.id]).length;
    const total = items.length;
    const listName = cl ? cl.label : '📋 Preparedness Checklist';

    let rows = '';
    if (items.length) {
      rows = items.map(i => `<tr>
        <td style="text-align:center;font-size:16px">${checked[i.id] ? '✅' : '☐'}</td>
        <td>${esc(i.label||i.text||'')}</td>
        ${i.desc ? `<td style="font-size:11px;color:#666">${esc(i.desc)}</td>` : '<td></td>'}
      </tr>`).join('');
    } else {
      rows = '<tr><td colspan="3" style="color:#999;font-style:italic">No checklist items available</td></tr>';
    }

    const contacts = (function(){ const hh = Store.get('household', {}); return hh.ooaName ? [{name:hh.ooaName, phone:hh.ooaPhone||'', role:'Out-of-area contact'}] : []; })();
    let contactRows = '';
    if (contacts && contacts.length) {
      contactRows = contacts.map(c => `<tr><td>${esc(c.name||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.role||'')}</td></tr>`).join('');
    } else {
      contactRows = '<tr><td colspan="3" style="color:#999;font-style:italic">No contacts added</td></tr>';
    }

    const html = `<h1>📋 ${esc(listName)}</h1>
<p>Completed: <strong>${done} / ${total}</strong> items &nbsp;·&nbsp; Printed: ${new Date().toLocaleDateString()}</p>
<div class="card">
  <div class="card-title">Items</div>
  <table>
    <tr><th style="width:40px">Done</th><th>Item</th><th style="width:200px">Notes</th></tr>
    ${rows}
  </table>
</div>
<div class="card">
  <div class="card-title">📞 Emergency Contacts</div>
  <table>
    <tr><th>Name</th><th>Phone</th><th>Role</th></tr>
    ${contactRows}
  </table>
</div>`;
    _openPrintWindow(html, 'ARK — ' + listName);
  }

  // ── Inventory / resources list ────────────────────────────────────────────
  function inventory() {
    const r = Store.get('resources', null);
    if (!r) { Toast.show('No resources data saved yet — update inventory first', 'warning', 3000); return; }
    const rows = [
      {name:'Water', qty: r.water||0, unit:'gal'},
      {name:'Food', qty: r.food||0, unit:'days'},
      {name:'Fuel', qty: r.fuel||0, unit:'gal'},
      {name:'Medical Supplies', qty: r.medical||0, unit:'/5'},
      {name:'Shelter Capacity', qty: r.shelter||0, unit:'ppl'},
      {name:'Power', qty: r.power||0, unit:'hrs'},
    ].filter(x => x.qty > 0);
    if (!rows.length) { Toast.show('All resource quantities are zero — update inventory first', 'warning', 3000); return; }
    const tableRows = rows.map(i => `<tr>
      <td>${esc(i.name)}</td>
      <td style="text-align:center">${Number(i.qty)||0} ${esc(i.unit)}</td>
    </tr>`).join('');
    const notesRow = r.notes ? `<div class="card"><div class="card-title">Notes</div><p>${esc(r.notes)}</p></div>` : '';
    const html = `<h1>📦 ARK Inventory Report</h1>
<p>Printed: ${new Date().toLocaleString()}</p>
<div class="card">
  <table>
    <tr><th>Resource</th><th>Quantity</th></tr>
    ${tableRows}
  </table>
</div>${notesRow}`;
    _openPrintWindow(html, 'ARK Inventory');
  }

  // ── Missing persons flyer ─────────────────────────────────────────────────
  function missingPerson(id) {
    const people = Store.get('missing_persons', []);
    const p = id != null ? people.find(x => x.id === id) : people[0];
    if (!p) { Toast.show('No missing person record to print', 'warning', 3000); return; }
    // G2: validate photoUrl — only allow data:image/ or https:// to block javascript: injection
    const safePhotoUrl = (p.photoUrl && (/^data:image\//i.test(p.photoUrl) || /^https:\/\//i.test(p.photoUrl))) ? p.photoUrl : null;
    const html = `<h1 style="text-align:center;font-size:28px;color:#cc0000">⚠️ MISSING PERSON</h1>
<div style="text-align:center;margin-bottom:16px">
  ${safePhotoUrl ? `<img src="${esc(safePhotoUrl)}" style="max-width:200px;max-height:200px;border:2px solid #000;border-radius:4px">` : '<div style="width:200px;height:200px;border:2px dashed #aaa;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;color:#aaa;font-size:14px;margin:0 auto">No photo</div>'}
</div>
<div class="card">
  <table>
    <tr><th>Name</th><td>${esc(p.name||'Unknown')}</td></tr>
    <tr><th>Age</th><td>${esc(String(p.age||'Unknown'))}</td></tr>
    <tr><th>Status</th><td style="color:${p.status==='Located'?'#1a7a1a':p.status==='Deceased'?'#555':'#cc0000'};font-weight:600">${esc(p.status||'Active Search')}</td></tr>
    <tr><th>Description</th><td>${esc(p.description||'—')}</td></tr>
    <tr><th>Last seen location</th><td>${esc(p.lastSeen||'—')}</td></tr>
    ${p.lastSeenTime ? `<tr><th>Last seen time</th><td>${esc(p.lastSeenTime)}</td></tr>` : ''}
    <tr><th>Reported</th><td>${p.ts ? new Date(p.ts).toLocaleString() : '—'}</td></tr>
    ${p.updatedTs ? `<tr><th>Status updated</th><td>${new Date(p.updatedTs).toLocaleString()}${p.updateNote ? ' — ' + esc(p.updateNote) : ''}</td></tr>` : ''}
  </table>
</div>
<div style="border:2px solid #000;border-radius:4px;padding:12px;text-align:center">
  <strong>If you have information, contact:</strong><br>
  ${p.contactInfo ? `<div style="margin:8px 0;font-size:16px;font-weight:600">${esc(p.contactInfo)}</div>` : ''}
  <div style="margin:8px 0;font-size:16px">Call 911 or local emergency services</div>
  <div style="color:#555;font-size:12px">ARK Household ID: ${esc(Store.get('hh_id',''))}</div>
</div>`;
    _openPrintWindow(html, 'Missing Person — ' + (p.name || 'Unknown'));
  }

  return { emergencyCard, medicalRef, checklist, inventory, missingPerson };
})();

// ============================================================
// ARKQr — pure-JS QR Code encoder (no dependencies)
// Implements QR Version 1–10, error correction level M
// ARKQr.encode(text) → boolean[][] matrix
// ARKQr.toSVGDiv(text, cellPx?) → HTML string with inline SVG
// ============================================================
const ARKQr = (() => {
  // Reed-Solomon GF(256) arithmetic
  const GF = (() => {
    const exp = new Uint8Array(512), log = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x; log[x] = i;
      x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    const mul = (a, b) => a && b ? exp[log[a] + log[b]] : 0;
    const poly_mul = (p, q) => {
      const r = new Uint8Array(p.length + q.length - 1);
      for (let i = 0; i < p.length; i++)
        for (let j = 0; j < q.length; j++)
          r[i + j] ^= mul(p[i], q[j]);
      return r;
    };
    const gen = (n) => {
      let g = new Uint8Array([1]);
      for (let i = 0; i < n; i++) g = poly_mul(g, new Uint8Array([1, exp[i]]));
      return g;
    };
    // Polynomial remainder: divide only across the message part, never into the EC tail
    const rem = (data, gen) => {
      const r = new Uint8Array(data);
      const msgLen = data.length - (gen.length - 1);
      for (let i = 0; i < msgLen; i++)
        if (r[i]) { const f = r[i]; for (let j = 1; j < gen.length; j++) r[i + j] ^= mul(gen[j], f); }
      return r.slice(msgLen);
    };
    return { mul, gen, rem };
  })();

  // EC level M block structure per ISO/IEC 18004 Table 9:
  // [totalDataCodewords, totalEcCodewords, blockCount, ecCodewordsPerBlock]
  const VCAP = {
    1:[16,10,1,10],   2:[28,16,1,16],   3:[44,26,1,26],   4:[64,36,2,18],
    5:[86,48,2,24],   6:[108,64,4,16],  7:[124,72,4,18],  8:[154,88,4,22],
    9:[182,110,5,22], 10:[216,130,5,26]
  };
  const MAX_VERSION = 10;

  // Alignment pattern centre coordinates per version (ISO/IEC 18004 Annex E)
  const ALIGN_CENTRES = [null, [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50]];

  const ALNUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  const EC_LEVEL_M_BITS = 0b00;
  const FORMAT_XOR_MASK = 0x5412;
  const FORMAT_GENERATOR = 0x537;
  const VERSION_GENERATOR = 0x1F25;

  // The 8 data mask conditions (ISO/IEC 18004 Table 10); true = invert module
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    (r, c) => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0,
  ];

  const charCountBits = (mode, version) =>
    mode === 'alnum' ? (version <= 9 ? 9 : 11) : (version <= 9 ? 8 : 16);

  function payloadBitLength(mode, count, version) {
    const body = mode === 'alnum' ? Math.floor(count / 2) * 11 + (count % 2) * 6 : count * 8;
    return 4 + charCountBits(mode, version) + body;
  }

  function chooseVersion(mode, count) {
    for (let v = 1; v <= MAX_VERSION; v++)
      if (payloadBitLength(mode, count, v) <= VCAP[v][0] * 8) return v;
    throw new Error('Input too long for QR v' + MAX_VERSION);
  }

  function encodeData(mode, text, bytes, version) {
    const [dc, , blocks, ecPerBlock] = VCAP[version];
    const bits = [];
    const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    const ccBits = charCountBits(mode, version);

    if (mode === 'alnum') {
      push(0b0010, 4); push(text.length, ccBits);
      for (let i = 0; i < text.length; i += 2) {
        if (i + 1 < text.length) push(ALNUM.indexOf(text[i]) * 45 + ALNUM.indexOf(text[i + 1]), 11);
        else push(ALNUM.indexOf(text[i]), 6);
      }
    } else {
      push(0b0100, 4); push(bytes.length, ccBits);
      for (const b of bytes) push(b, 8);
    }
    // Terminator + padding
    for (let i = 0; i < 4 && bits.length < dc * 8; i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const pads = [0xEC, 0x11];
    let pi = 0;
    while (bits.length < dc * 8) { push(pads[pi++ % 2], 8); }

    const data = new Uint8Array(dc);
    for (let i = 0; i < dc; i++) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      data[i] = b;
    }

    // Split into blocks (shorter blocks first), compute EC, interleave
    const shortSize = Math.floor(dc / blocks);
    const longCount = dc % blocks;
    const dataBlocks = [], ecBlocks = [];
    const gen = GF.gen(ecPerBlock);
    let pos = 0;
    for (let b = 0; b < blocks; b++) {
      const sz = shortSize + (b >= blocks - longCount ? 1 : 0);
      const block = data.slice(pos, pos + sz); pos += sz;
      dataBlocks.push(block);
      ecBlocks.push(GF.rem(new Uint8Array([...block, ...new Uint8Array(ecPerBlock)]), gen));
    }
    const out = [];
    const maxSz = shortSize + (longCount ? 1 : 0);
    for (let i = 0; i < maxSz; i++)
      for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < ecPerBlock; i++)
      for (const b of ecBlocks) out.push(b[i]);
    return out;
  }

  // BCH remainder of (value << degree) by generator, appended to value
  function bchEncode(value, generator, degree) {
    let rem = value << degree;
    for (let i = 31 - Math.clz32(rem); i >= degree; i--)
      if ((rem >> i) & 1) rem ^= generator << (i - degree);
    return (value << degree) | rem;
  }

  // 15 format bits, index 0 = most significant bit
  function formatBits(maskIndex) {
    const word = bchEncode((EC_LEVEL_M_BITS << 3) | maskIndex, FORMAT_GENERATOR, 10) ^ FORMAT_XOR_MASK;
    return Array.from({length: 15}, (_, i) => (word >> (14 - i)) & 1);
  }

  // Function modules hold booleans; data modules hold numbers (0/1) so masks touch only data.
  function buildBaseMatrix(version, data) {
    const size = version * 4 + 17;
    const m = Array.from({length: size}, () => new Array(size).fill(null));
    const set = (r, c, v) => { if (r >= 0 && r < size && c >= 0 && c < size) m[r][c] = v; };

    const finder = (tr, tc) => {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++)
        set(tr + r, tc + c, r >= 0 && r <= 6 && c >= 0 && c <= 6
          ? (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4))
          : false);
    };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);

    for (let i = 8; i < size - 8; i++) {
      set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0);
    }

    const centres = ALIGN_CENTRES[version];
    const last = centres.length - 1;
    centres.forEach((r, ri) => centres.forEach((c, ci) => {
      const overlapsFinder = (ri === 0 && ci === 0) || (ri === 0 && ci === last) || (ri === last && ci === 0);
      if (overlapsFinder) return;
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++)
        set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }));

    // Reserve format areas (written per mask later), then the fixed dark module
    for (const [r, c] of formatPositions(size).flat()) set(r, c, false);
    set(size - 8, 8, true);

    // Version information, v7+ (two 6x3 blocks next to the top-right and bottom-left finders)
    if (version >= 7) {
      const word = bchEncode(version, VERSION_GENERATOR, 12);
      for (let i = 0; i < 18; i++) {
        const bitOn = ((word >> i) & 1) === 1;
        const a = size - 11 + (i % 3), b = Math.floor(i / 3);
        set(b, a, bitOn); set(a, b, bitOn);
      }
    }

    // Zig-zag data placement; remainder bits are 0 data modules (masked like any data)
    let bit = 0;
    let up = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col = 5;
      for (let row = 0; row < size; row++) {
        const r = up ? size - 1 - row : row;
        for (let d = 0; d < 2; d++) {
          const c = col - d;
          if (m[r][c] === null) {
            m[r][c] = bit < data.length * 8 ? (data[bit >> 3] >> (7 - (bit & 7))) & 1 : 0;
            bit++;
          }
        }
      }
      up = !up;
    }
    return m;
  }

  // Both copies of the format info, each listed MSB first
  function formatPositions(size) {
    return [
      [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]],
      [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],
       [8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]],
    ];
  }

  function applyMask(base, maskIndex) {
    const size = base.length;
    const cond = MASKS[maskIndex];
    const out = base.map((row, r) => row.map((v, c) =>
      typeof v === 'number' ? (v ^ (cond(r, c) ? 1 : 0)) === 1 : v === true));
    const fmt = formatBits(maskIndex);
    for (const copy of formatPositions(size))
      copy.forEach(([r, c], i) => { out[r][c] = fmt[i] === 1; });
    return out;
  }

  // Penalty rules N1–N4 (ISO/IEC 18004 §7.8.3). Lower is better.
  const PENALTY_RUN = 3, PENALTY_BLOCK = 3, PENALTY_FINDER = 40, PENALTY_BALANCE = 10;
  const FINDER_LIKE = [
    [true,false,true,true,true,false,true,false,false,false,false],
    [false,false,false,false,true,false,true,true,true,false,true],
  ];

  function linePenalty(line) {
    let score = 0, run = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) { run++; continue; }
      if (run >= 5) score += PENALTY_RUN + (run - 5);
      run = 1;
    }
    // Finder-like 1:1:3:1:1 with 4 light modules on one side; outside the symbol counts as light
    const padded = [false,false,false,false, ...line, false,false,false,false];
    for (let i = 0; i + 11 <= padded.length; i++)
      for (const pat of FINDER_LIKE)
        if (pat.every((p, k) => padded[i + k] === p)) score += PENALTY_FINDER;
    return score;
  }

  function penalty(m) {
    const size = m.length;
    let score = 0, dark = 0;
    for (let i = 0; i < size; i++) {
      score += linePenalty(m[i]);
      score += linePenalty(m.map(row => row[i]));
    }
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (m[r][c]) dark++;
      if (r < size - 1 && c < size - 1) {
        const v = m[r][c];
        if (m[r][c+1] === v && m[r+1][c] === v && m[r+1][c+1] === v) score += PENALTY_BLOCK;
      }
    }
    score += PENALTY_BALANCE * Math.floor(Math.abs(dark * 100 / (size * size) - 50) / 5);
    return score;
  }

  function encodeWithMask(text) {
    const mode = [...text].every(c => ALNUM.includes(c)) ? 'alnum' : 'byte';
    const bytes = mode === 'byte' ? new TextEncoder().encode(text) : null;
    const version = chooseVersion(mode, mode === 'byte' ? bytes.length : text.length);
    const base = buildBaseMatrix(version, encodeData(mode, text, bytes, version));
    let best = null;
    for (let k = 0; k < MASKS.length; k++) {
      const candidate = applyMask(base, k);
      const score = penalty(candidate);
      if (!best || score < best.score) best = {matrix: candidate, mask: k, score};
    }
    return best;
  }

  function encode(text) {
    return encodeWithMask(text).matrix;
  }

  function toSVGDiv(text, cellPx = 5) {
    try {
      const matrix = encode(text);
      const n = matrix.length;
      const quiet = 4;
      const total = (n + quiet * 2) * cellPx;
      let rects = '';
      for (let r = 0; r < n; r++)
        for (let c = 0; c < n; c++)
          if (matrix[r][c])
            rects += `<rect x="${(c+quiet)*cellPx}" y="${(r+quiet)*cellPx}" width="${cellPx}" height="${cellPx}"/>`;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
      return `<div style="text-align:center;margin:8px 0">${svg}<div class="font-xs" style="color:#888;margin-top:4px">Scan with any camera app</div></div>`;
    } catch(e) {
      return `<div style="padding:12px;border:1px solid #555;border-radius:6px;font-size:12px;word-break:break-all;color:#aaa"><div style="margin-bottom:4px;color:#888">QR unavailable — open this URL:</div>${esc(text)}</div>`;
    }
  }

  return { encode, toSVGDiv, _encodeWithMask: encodeWithMask, _formatBits: formatBits };
})();

