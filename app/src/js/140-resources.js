// === RESOURCES ===
const Resources = {
  _defaults: {water:0, food:0, fuel:0, medical:0, shelter:0, power:0, notes:''},
  _data: null,

  load() {
    const d = Store.get('resources', null);
    // Always hand back a complete object, even if what was stored is damaged or partial
    this._data = {...this._defaults, ...(d && typeof d === 'object' ? d : {})};
    return this._data;
  },

  // People to supply: the saved count, or the members actually added, whichever is larger
  _people() {
    const hhMembers = Store.get('hh_members', []);
    const hh = Store.get('household', {}) || {};
    return Math.max(1, parseInt(hh.count, 10) || 0, Array.isArray(hhMembers) ? hhMembers.length : 0);
  },

  _icon(name) {
    return `<svg class="hi" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  },

  render() {
    const d = this.load();
    const container = document.getElementById('resource-meters');
    if (!container) return;

    const hhCount = this._people();
    const items = [
      // Water bar is measured against 30 days for this household (1 gallon per person per day)
      {key:'water',   label:'Water',   icon:'droplet', unit:'gal',    max:30 * hhCount},
      {key:'food',    label:'Food',    icon:'box',     unit:'days',   max:30},
      {key:'fuel',    label:'Fuel',    icon:'flame',   unit:'gal',    max:20},
      {key:'medical', label:'Medical', icon:'cross',   unit:'/5',     max:5},
      {key:'shelter', label:'Shelter', icon:'house',   unit:'people', max:20},
      {key:'power',   label:'Power',   icon:'battery', unit:'hrs',    max:72},
    ];

    // Calculate days-of-supply annotations
    // Water: ~1 gal/person/day (FEMA standard)
    const waterDays = Number(d.water) > 0 ? Math.floor(Number(d.water) / hhCount) : 0;
    // Food: already in days (per household)
    const foodDays = Number(d.food) > 0 ? Math.floor(Number(d.food)) : 0;
    // Power: convert hours to days+hours for readability
    const powerHrs = Number(d.power) || 0;
    const powerDays = Math.floor(powerHrs / 24);
    const powerRemHrs = Math.round(powerHrs % 24);

    // Low stock warning: show only after the user has saved at least once
    const hasEverSaved = !!Store.get('resources_updated');
    const lowItems = hasEverSaved ? items.filter(it => {
      const v = Number(d[it.key]);
      if (isNaN(v) || it.key === 'shelter') return false; // shelter capacity is not a consumable
      // Fuel and backup power are not needed by every home (and ARK's own 3-day target is small),
      // so they never raise the "Running low" warning. Their bars still show the amount.
      if (it.key === 'fuel' || it.key === 'power') return false;
      // Water and food are judged in days, the same way as the summary line, so the two never disagree
      if (it.key === 'water') return waterDays < 3;
      if (it.key === 'food') return foodDays < 3;
      return (v / it.max) * 100 < 25;
    }) : [];

    // Empty state: never saved
    if (!hasEverSaved) {
      container.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--text-secondary)">
        <div style="font-size:30px;line-height:1;margin-bottom:10px;color:var(--accent)">${this._icon('box')}</div>
        <div style="font-weight:600;margin-bottom:4px">No supplies written down yet</div>
        <div class="font-sm">Tap <strong>Update supplies</strong> and enter what you have. It is saved on this device.</div>
      </div>`;
    } else {
      // Survival duration summary banner
      let survivalBanner = '';
      if (waterDays > 0 || foodDays > 0) {
        // You last only as long as whichever runs out first — zero water is zero days, not "unknown".
        const effDays = Math.min(waterDays, foodDays);
        const tone = effDays >= 14 ? 'green' : effDays >= 3 ? 'yellow' : 'red';
        const survLabel = effDays >= 14 ? 'Well stocked' : effDays >= 3 ? 'Some supply' : 'Very low — restock when it is safe';
        const short = waterDays <= foodDays ? 'water' : 'food';
        survivalBanner = `<div class="flex wrap" style="align-items:center;justify-content:space-between;gap:4px 12px;padding:10px 14px;border-radius:var(--radius-md);background:var(--${tone}-bg);border:1px solid var(--${tone});margin-bottom:12px">
          <div class="font-sm" style="font-weight:600;color:var(--${tone})">${survLabel}</div>
          <div class="font-sm" style="color:var(--text-primary)">Water and food for about <strong>${effDays} ${effDays===1?'day':'days'}</strong> for ${hhCount} ${hhCount===1?'person':'people'}${waterDays !== foodDays ? ' — ' + short + ' runs out first' : ''}</div>
        </div>`;
      }

      container.innerHTML = (lowItems.length ? `<div class="mb-8 font-sm" role="status" style="display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:var(--radius-md);background:var(--yellow-bg);border:1px solid var(--yellow);color:var(--text-primary)">${this._icon('alert')}<span>Running low: ${lowItems.map(i=>i.label).join(', ')}</span></div>` : '') +
      survivalBanner +
      items.map(it => {
        let val = Number(d[it.key]);
        if (isNaN(val) || val < 0) val = 0;
        const pct = Math.min(100, (val / it.max) * 100);
        // Percentage-based color: red <25%, yellow 25-50%, green >=50%
        let barClass = 'bar-green';
        if (pct < 25) barClass = 'bar-red';
        else if (pct < 50) barClass = 'bar-yellow';
        // Water and food: colour by how many days they last (under 3 red, under 14 yellow), not by a fixed amount
        if (it.key === 'water' || it.key === 'food') {
          const days = it.key === 'water' ? waterDays : foodDays;
          barClass = days < 3 ? 'bar-red' : days < 14 ? 'bar-yellow' : 'bar-green';
        }
        let display = it.key === 'medical' ? val + '/5' : val + ' ' + it.unit;
        let extra = '';
        if (it.key === 'water' && waterDays > 0) extra = `<span class="resource-days"> (about ${waterDays} ${waterDays===1?'day':'days'})</span>`;
        else if (it.key === 'power' && powerDays > 0) extra = `<span class="resource-days"> (${powerDays} ${powerDays===1?'day':'days'}${powerRemHrs ? ' ' + powerRemHrs + ' hrs' : ''})</span>`;
        return `<div class="resource-row">
          <span class="resource-label">${this._icon(it.icon)} ${it.label}</span>
          <div class="resource-bar-wrap" aria-hidden="true"><div class="resource-bar ${barClass}" style="width:${pct}%"></div></div>
          <span class="resource-val">${esc(display)}${extra}</span>
        </div>`;
      }).join('') +
      (d.notes ? `<div class="font-sm" style="margin-top:10px;padding:8px 10px;background:var(--bg-secondary);border-radius:var(--radius-md);color:var(--text-secondary);overflow-wrap:anywhere"><span style="font-weight:600">Notes:</span> ${esc(d.notes)}</div>` : '');
    }

    const upd = Store.get('resources_updated');
    const el = document.getElementById('resources-updated');
    if (el) el.textContent = upd && !isNaN(Date.parse(upd)) ? 'Saved ' + new Date(upd).toLocaleString() : 'Not saved yet';

    // Render history panel
    const histEl = document.getElementById('res-history');
    if (histEl) {
      const histRaw = Store.get('res_history', []);
      const hist = (Array.isArray(histRaw) ? histRaw : []).filter(h => h && typeof h === 'object');
      if (!hist.length) {
        histEl.textContent = 'Nothing saved yet. Each time you save, the numbers are kept here so you can see what changed.';
      } else {
        histEl.innerHTML = hist.map(h => {
          const when = h.ts && !isNaN(Date.parse(h.ts)) ? new Date(h.ts).toLocaleString() : 'Date unknown';
          const num = v => esc(Number(v) || 0);
          return `<div style="margin-bottom:8px"><div class="font-xs text-muted">${esc(when)}</div>Water ${num(h.water)} gal · Food ${num(h.food)} days · Fuel ${num(h.fuel)} gal · Medical ${num(h.medical)}/5 · Shelter ${num(h.shelter)} people · Power ${num(h.power)} hrs</div>`;
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
    const recEl = document.getElementById('resource-edit-card');
    if (recEl) {
      recEl.classList.remove('hidden');
      // The form sits below the fold on a phone — bring it into view so the tap visibly did something
      try { recEl.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) { try { recEl.scrollIntoView(); } catch(_) {} }
      const first = document.getElementById('res-water');
      if (first) { try { first.focus({preventScroll:true}); } catch(e) {} }
    }
  },

  closeEdit() {
    const el = document.getElementById('resource-edit-card'); if (el) el.classList.add('hidden');
  },

  save() {
    const getVal = (id, def) => { const e = document.getElementById(id); return e ? e.value : String(def); };
    // One decimal place is plenty, and stops long numbers like 33.333333 showing on the meters
    const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)) * 10) / 10;
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
    // If saving fails, keep the form open so nothing typed is lost (Store has already told the user why)
    if (!Store.set('resources', d)) return;
    Store.set('resources_updated', new Date().toISOString());

    // Append history
    let hist = Store.get('res_history', []);
    if (!Array.isArray(hist)) hist = [];
    hist.unshift({...d, ts: new Date().toISOString()});
    if (hist.length > 10) hist.length = 10;
    Store.set('res_history', hist);

    this.closeEdit();
    this.render();
    Toast.show('Supplies saved on this device', 'success');
    const top = document.getElementById('resource-meters');
    if (top) { try { top.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e) {} }
  },

  shareWithHub() {
    if (!Store.get('resources_updated')) {
      Toast.show('Nothing to share yet. Tap Update supplies, save, then share.', 'info', 4500);
      return;
    }
    const d = this.load();
    // D6: strip control characters and newlines from notes before embedding in hub packet body
    const safeNotes = d.notes ? '. ' + String(d.notes).replace(/[\r\n\t]/g, ' ').slice(0, 200) : '';
    Hub.post({
      id: 'res_' + Date.now(),
      alias: Store.get('last_alias', 'Household'),
      channel: 'resources',
      body: `Resource update: Water ${d.water}gal, Food ${d.food}d, Fuel ${d.fuel}gal, Medical ${d.medical}/5, Shelter ${d.shelter}ppl, Power ${d.power}hrs${safeNotes}`,
      ts: new Date().toISOString()
    }).then(ok => Toast.show(ok
      ? 'Sent to your ARK Hub. People connected to it can see your supplies.'
      : 'Not sent yet. It is saved and will go out when this device joins an ARK Hub.', ok ? 'success' : 'info', 5000))
      .catch(() => Toast.show('Could not send. Check you are joined to an ARK Hub, then try again.', 'error', 5000));
  },

  printReport() {
    window.print();
  },

  loadPreset(type) {
    // Targets, not stock. Water follows FEMA (1 gallon per person per day) and is scaled to the household;
    // food is counted in days for the whole household, so it does not scale.
    const people = this._people();
    const who = people + (people === 1 ? ' person' : ' people');
    const presets = {
      '72hr':  {days:3,  fuel:1,  medical:2, shelter:4, power:8,   name:'3-day kit'},
      '2week': {days:14, fuel:5,  medical:3, shelter:6, power:48,  name:'2-week supply'},
      'month': {days:30, fuel:10, medical:4, shelter:8, power:120, name:'30-day supply'},
    };
    const p = presets[type];
    if (!p) return;
    // Open the edit form first
    this.openEdit();
    // Then fill preset values
    const setVal = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    setVal('res-water', p.days * people); setVal('res-food', p.days); setVal('res-fuel', p.fuel);
    setVal('res-medical', p.medical); setVal('res-shelter', Math.max(p.shelter, people)); setVal('res-power', p.power);
    // Never replace notes the user already wrote (where things are stored, expiry dates)
    if (!String((this._data && this._data.notes) || '').trim()) setVal('res-notes', `Target for a ${p.name} for ${who}. Change each number to what you really have.`);
    Toast.show(`${p.name} target for ${who} filled in. Change the numbers to what you really have, then save.`, 'info', 5000);
  },

  exportJSON() {
    const d = this.load();
    const hist = Store.get('res_history', []);
    const payload = JSON.stringify({resources: d, history: hist, exported: new Date().toISOString()}, null, 2);
    try {
      download('ark-inventory-' + today() + '.json', payload, 'application/json');
      Toast.show('Backup file saved. Look in your Downloads folder.', 'success', 4000);
    } catch(e) {
      // Fallback: show JSON in a modal/prompt for manual copy
      prompt('Could not save a file. Copy this text and keep it somewhere safe:', payload);
    }
  },

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onerror = () => Toast.show('That file could not be read. Try choosing it again.', 'error', 5000);
      reader.onload = (e) => {
        try {
          const obj = JSON.parse(e.target.result);
          const r = obj && obj.resources;
          // Validate fields exist and are numeric/string
          const valid = r && typeof r === 'object' && ('water' in r || 'food' in r);
          if (!valid) { Toast.show('That is not an ARK supplies backup. Choose a file named ark-inventory-….json', 'error', 6000); return; }
          // Keep only the fields ARK knows, as numbers/text, so a damaged file cannot break the Resources tab
          const clean = {};
          ['water','food','fuel','medical','shelter','power'].forEach(k => { clean[k] = Math.min(9999, Math.max(0, Number(r[k]) || 0)); });
          clean.medical = Math.min(5, Math.round(clean.medical));
          clean.notes = String(r.notes == null ? '' : r.notes).slice(0, 500);
          const apply = () => {
            if (!Store.set('resources', clean)) return;
            if (Array.isArray(obj.history)) {
              Store.set('res_history', obj.history.filter(h => h && typeof h === 'object').slice(0, 10).map(h => ({
                ts: typeof h.ts === 'string' ? h.ts : '',
                water: Number(h.water) || 0, food: Number(h.food) || 0, fuel: Number(h.fuel) || 0,
                medical: Number(h.medical) || 0, shelter: Number(h.shelter) || 0, power: Number(h.power) || 0
              })));
            }
            Store.set('resources_updated', new Date().toISOString());
            Resources.closeEdit();
            Resources.render();
            Toast.show('Supplies restored from the backup file', 'success', 4000);
          };
          // Restoring replaces what is saved here — ask first if there is anything to lose
          if (Store.get('resources_updated')) {
            const made = typeof obj.exported === 'string' && !isNaN(Date.parse(obj.exported)) ? ' made on ' + esc(new Date(obj.exported).toLocaleDateString()) : '';
            Modal.confirm('Replace the supplies saved on this device with the backup' + made + '? Your current numbers and past saves will be replaced.', apply, 'Replace', 'Keep mine');
          } else {
            apply();
          }
        } catch(err) {
          Toast.show('That file could not be read. Choose a file named ark-inventory-….json', 'error', 6000);
        }
      };
      reader.readAsText(file);
    };
    // Some phone browsers ignore a file picker that is not on the page, so attach it (hidden) first
    input.className = 'hidden';
    input.setAttribute('aria-hidden', 'true');
    input.tabIndex = -1;
    try {
      document.body.appendChild(input);
      setTimeout(() => { try { input.remove(); } catch(e) {} }, 60000);
    } catch(e) {}
    input.click();
  }
};
