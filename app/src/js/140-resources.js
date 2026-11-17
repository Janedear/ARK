// === RESOURCES ===
const Resources = {
  _defaults: {water:0, food:0, fuel:0, medical:0, shelter:0, power:0, notes:''},
  _data: null,

  load() {
    this._data = Store.get('resources', {...this._defaults});
    return this._data;
  },

  render() {
    const d = this.load();
    const container = document.getElementById('resource-meters');
    if (!container) return;

    const items = [
      {key:'water',   label:'💧 Water',   unit:'gal',  max:50},
      {key:'food',    label:'🍽️ Food',    unit:'days', max:30},
      {key:'fuel',    label:'⛽ Fuel',    unit:'gal',  max:20},
      {key:'medical', label:'🏥 Medical', unit:'/5',   max:5},
      {key:'shelter', label:'🏠 Shelter', unit:'ppl',  max:20},
      {key:'power',   label:'🔋 Power',   unit:'hrs',  max:72},
    ];

    // Calculate days-of-supply annotations
    // People to supply: the saved count, or the members actually added, whichever is larger
    const hhMembers = Store.get('hh_members', []);
    const hhCount = Math.max(1, parseInt(Store.get('household', {}).count) || 0, Array.isArray(hhMembers) ? hhMembers.length : 0);
    // Water: ~1 gal/person/day (FEMA standard)
    const waterDays = d.water > 0 ? Math.floor(d.water / hhCount) : 0;
    // Food: already in days (per household)
    const foodDays = Number(d.food) > 0 ? Math.floor(Number(d.food)) : 0;
    // Power: convert hours to days+hours for readability
    const powerHrs = Number(d.power) || 0;
    const powerDays = Math.floor(powerHrs / 24);
    const powerRemHrs = powerHrs % 24;

    // Low stock warning: show only after the user has saved at least once
    const hasEverSaved = !!Store.get('resources_updated');
    const lowItems = hasEverSaved ? items.filter(it => {
      const v = Number(d[it.key]);
      if (isNaN(v) || it.key === 'shelter') return false; // shelter capacity is not a consumable
      return (v / it.max) * 100 < 25;
    }) : [];

    // Empty state: never saved
    if (!hasEverSaved) {
      container.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--text-secondary)">
        <div style="font-size:36px;margin-bottom:8px">📦</div>
        <div style="font-weight:600;margin-bottom:4px">No inventory saved yet</div>
        <div style="font-size:13px">Tap <strong>Update Inventory</strong> below to record your supplies.</div>
      </div>`;
    } else {
      // Survival duration summary banner
      let survivalBanner = '';
      if (waterDays > 0 || foodDays > 0) {
        // You last only as long as whichever runs out first — zero water is zero days, not "unknown".
        const effDays = Math.min(waterDays, foodDays);
        let survColor = effDays >= 14 ? 'var(--green)' : effDays >= 3 ? 'var(--yellow)' : 'var(--red)';
        let survBg = effDays >= 14 ? 'var(--green-bg)' : effDays >= 3 ? 'var(--yellow-bg)' : 'var(--red-bg)';
        let survLabel = effDays >= 14 ? '✅ Well stocked' : effDays >= 3 ? '⚠️ Moderate supply' : '🚨 Critical — restock now';
        survivalBanner = `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:8px;background:${survBg};border:1px solid ${survColor};margin-bottom:12px">
          <div style="font-size:13px;font-weight:600;color:${survColor}">${survLabel}</div>
          <div style="font-size:13px;font-weight:700;color:${survColor}">~${effDays}d / ${hhCount} ${hhCount===1?'person':'people'}</div>
        </div>`;
      }

      container.innerHTML = (lowItems.length ? `<div class="alert alert-warn mb-8" role="alert" style="display:flex;align-items:center;gap:6px;padding:8px 12px;border-radius:6px;background:var(--warn-bg,#7c4a001a);border:1px solid var(--warn-border,#d97706);color:var(--warn-text,#92400e)"><span>⚠️</span><span>Low stock: ${lowItems.map(i=>i.label).join(', ')}</span></div>` : '') +
      survivalBanner +
      items.map(it => {
        let val = Number(d[it.key]);
        if (isNaN(val) || val < 0) val = 0;
        val = Math.min(val, it.max * 2);
        const pct = Math.min(100, (val / it.max) * 100);
        // Percentage-based color: red <25%, yellow 25-50%, green >=50%
        let barClass = 'bar-green';
        if (pct < 25) barClass = 'bar-red';
        else if (pct < 50) barClass = 'bar-yellow';
        let display = it.key === 'medical' ? val + '/5' : val + ' ' + it.unit;
        let extra = '';
        if (it.key === 'water' && waterDays > 0) extra = `<span class="resource-days"> (~${waterDays}d/${hhCount}p)</span>`;
        else if (it.key === 'food' && foodDays > 0) extra = `<span class="resource-days"> (${foodDays}d total)</span>`;
        else if (it.key === 'power' && powerDays > 0) extra = `<span class="resource-days"> (${powerDays}d ${powerRemHrs}h)</span>`;
        return `<div class="resource-row">
          <span class="resource-label">${it.label}</span>
          <div class="resource-bar-wrap"><div class="resource-bar ${barClass}" style="width:${pct}%"></div></div>
          <span class="resource-val">${display}${extra}</span>
        </div>`;
      }).join('') +
      (d.notes ? `<div style="margin-top:10px;padding:8px 10px;background:var(--bg-elevated);border-radius:6px;font-size:13px;color:var(--text-secondary)"><span style="font-weight:600">📝 Notes:</span> ${d.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : '');
    }

    const upd = Store.get('resources_updated');
    const el = document.getElementById('resources-updated');
    if (el) el.textContent = upd ? 'Updated: ' + new Date(upd).toLocaleString() : 'Not yet updated';

    // Render history panel
    const histEl = document.getElementById('res-history');
    if (histEl) {
      const hist = Store.get('res_history', []);
      if (!hist.length) {
        histEl.textContent = 'No history yet — save a snapshot to track changes.';
      } else {
        histEl.innerHTML = hist.filter(h => h && typeof h === 'object').map(h => {
          const when = h.ts && !isNaN(Date.parse(h.ts)) ? new Date(h.ts).toLocaleString() : '?';
          const num = v => esc(Number(v) || 0);
          return `<div style="margin-bottom:6px"><span style="color:var(--text-muted)">${esc(when)}</span> — Water ${num(h.water)}gal · Food ${num(h.food)}d · Fuel ${num(h.fuel)}gal · Medical ${num(h.medical)}/5 · Shelter ${num(h.shelter)}ppl · Power ${num(h.power)}hrs</div>`;
        }).join('');
      }
    }
  },

  openEdit() {
    const d = this.load();
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setVal('res-water', d.water); setVal('res-food', d.food); setVal('res-fuel', d.fuel);
    setVal('res-medical', d.medical); setVal('res-shelter', d.shelter); setVal('res-power', d.power);
    setVal('res-notes', d.notes);
    const recEl = document.getElementById('resource-edit-card'); if (recEl) recEl.classList.remove('hidden');
  },

  closeEdit() {
    const el = document.getElementById('resource-edit-card'); if (el) el.classList.add('hidden');
  },

  save() {
    const getVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : String(def); };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const raw = {
      water:   parseFloat(getVal('res-water', 0)),
      food:    parseFloat(getVal('res-food', 0)),
      fuel:    parseFloat(getVal('res-fuel', 0)),
      medical: parseInt(getVal('res-medical', 0), 10),
      shelter: parseInt(getVal('res-shelter', 0), 10),
      power:   parseFloat(getVal('res-power', 0)),
    };
    // D2+D3: floor negatives to 0; cap each field at a sane maximum; guard NaN
    const d = {
      water:   clamp(isNaN(raw.water)   ? 0 : raw.water,   0, 9999),
      food:    clamp(isNaN(raw.food)    ? 0 : raw.food,    0, 9999),
      fuel:    clamp(isNaN(raw.fuel)    ? 0 : raw.fuel,    0, 9999),
      medical: clamp(isNaN(raw.medical) ? 0 : raw.medical, 0, 5),
      shelter: clamp(isNaN(raw.shelter) ? 0 : raw.shelter, 0, 9999),
      power:   clamp(isNaN(raw.power)   ? 0 : raw.power,   0, 9999),
      notes:   getVal('res-notes', '').trim().slice(0, 500) // enforce textarea maxlength in JS too
    };
    Store.set('resources', d);
    Store.set('resources_updated', new Date().toISOString());

    // Append history
    const hist = Store.get('res_history', []);
    hist.unshift({...d, ts: new Date().toISOString()});
    if (hist.length > 10) hist.pop();
    Store.set('res_history', hist);

    this.closeEdit();
    this.render();
    Toast.show('✅ Inventory updated and saved', 'success');
  },

  shareWithHub() {
    const d = this.load();
    // D6: strip control characters and newlines from notes before embedding in hub packet body
    const safeNotes = d.notes ? '. ' + String(d.notes).replace(/[\r\n\t]/g, ' ').slice(0, 200) : '';
    Hub.post({
      id: 'res_' + Date.now(),
      alias: Store.get('last_alias', 'Household'),
      channel: 'resources',
      body: `Resource update: Water ${d.water}gal, Food ${d.food}d, Fuel ${d.fuel}gal, Medical ${d.medical}/5, Shelter ${d.shelter}ppl${safeNotes}`,
      ts: new Date().toISOString()
    }).then(ok => Toast.show(ok ? '✅ Shared with your hub community' : 'Could not reach hub — will retry when you reconnect', ok ? 'success' : 'info'));
  },

  printReport() {
    window.print();
  },

  loadPreset(type) {
    // FEMA-based presets for 1 person — user adjusts for household size
    const presets = {
      '72hr':  {water:3,  food:3,  fuel:1,  medical:2, shelter:4, power:8,  notes:'72-hour emergency kit — FEMA baseline for 1 person. Multiply water and food by household size.'},
      '2week': {water:14, food:14, fuel:5,  medical:3, shelter:6, power:48, notes:'2-week extended preparedness supply for 1 person. Adjust quantities for your household.'},
      'month': {water:30, food:30, fuel:10, medical:4, shelter:8, power:120,notes:'30-day long-term preparedness plan for 1 person. Scale up for your full household.'},
    };
    const p = presets[type];
    if (!p) return;
    // Open the edit form first
    this.openEdit();
    // Then fill preset values
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setVal('res-water', p.water); setVal('res-food', p.food); setVal('res-fuel', p.fuel);
    setVal('res-medical', p.medical); setVal('res-shelter', p.shelter); setVal('res-power', p.power);
    setVal('res-notes', p.notes);
    const labels = {'72hr':'72-Hour Kit', '2week':'2-Week Supply', 'month':'30-Day Plan'};
    Toast.show(`📋 Loaded ${labels[type]} preset — adjust quantities for your household`, 'info', 3500);
  },

  exportJSON() {
    const d = this.load();
    const hist = Store.get('res_history', []);
    const payload = JSON.stringify({resources: d, history: hist, exported: new Date().toISOString()}, null, 2);
    try {
      const blob = new Blob([payload], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'ark-inventory-' + new Date().toISOString().slice(0,10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      Toast.show('✅ Inventory exported', 'success');
    } catch(e) {
      // Fallback: show JSON in a modal/prompt for manual copy
      prompt('Copy this JSON to save your inventory:', payload);
    }
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          if (!obj.resources) { Toast.show('Invalid file — no resources data found', 'error', 3000); return; }
          const r = obj.resources;
          // Validate fields exist and are numeric/string
          const valid = r && typeof r === 'object' && ('water' in r || 'food' in r);
          if (!valid) { Toast.show('Invalid inventory file format', 'error', 3000); return; }
          // Keep only the fields ARK knows, as numbers/text, so a damaged file cannot break the Resources tab
          const clean = {};
          ['water','food','fuel','medical','shelter','power'].forEach(k => { clean[k] = Math.max(0, Number(r[k]) || 0); });
          clean.notes = String(r.notes == null ? '' : r.notes).slice(0, 2000);
          if (!Store.set('resources', clean)) return;
          if (Array.isArray(obj.history)) {
            Store.set('res_history', obj.history.filter(h => h && typeof h === 'object').slice(-50).map(h => ({
              ts: typeof h.ts === 'string' ? h.ts : '',
              water: Number(h.water) || 0, food: Number(h.food) || 0, fuel: Number(h.fuel) || 0,
              medical: Number(h.medical) || 0, shelter: Number(h.shelter) || 0, power: Number(h.power) || 0
            })));
          }
          Store.set('resources_updated', new Date().toISOString());
          this.render();
          Toast.show('✅ Inventory imported successfully', 'success');
        } catch(err) {
          Toast.show('Could not parse file — make sure it is a valid ARK export', 'error', 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
};

