// === CHECKLIST ===
const Checklist = {
  // Active checklist id
  _activeId: 'daily',

  // Pre-built checklist templates — keyed by id
  TEMPLATES: {
    daily: {
      id: 'daily',
      label: 'Daily Check',
      builtIn: true,
      items: [
        {id:'headcount',  label:'Family headcount',   desc:'Confirm all household members are present and accounted for.'},
        {id:'injury',     label:'Injury check',           desc:'Check everyone for wounds, burns, or anyone who will not wake up. Give first aid.'},
        {id:'medical',    label:'Medication check',       desc:'Locate prescriptions, insulin, EpiPen, and first aid kit — verify supply.'},
        {id:'shelter',    label:'Shelter secure',         desc:'Check for structural damage, gas leaks, fire hazards, and broken glass.'},
        {id:'water',      label:'Water supply',           desc:'At least 1 gallon per person per day. Fill bathtubs now if tap water may stop.'},
        {id:'food',       label:'Food supply',            desc:'Verify at least a 72-hour supply of ready-to-eat food is accessible.'},
        {id:'power',      label:'Power check',            desc:'Test batteries, flashlights, generator fuel, and solar chargers.'},
        {id:'radio',      label:'Radio check',            desc:'Tune to emergency broadcasts. If you use an ARK Hub, check this device can still reach it.'},
        {id:'comms',      label:'Devices charged',        desc:'Charge phones, power banks, and satellite communicator if available.'},
        {id:'documents',  label:'Documents secured',      desc:'Gather IDs, insurance papers, cash, and go-bag document copies.'},
        {id:'evacroute',  label:'Evacuation route',       desc:'Confirm primary and at least one alternate route out of the area.'},
        {id:'safe',       label:'Posted safe status',     desc:'Post "I\'m safe" in ARK Messages. People connected to your ARK Hub will see it.'},
      ]
    },
    bugout: {
      id: 'bugout',
      label: 'Go-Bag',
      builtIn: true,
      keep: true, // a packing list: ticks stay until the user resets them
      items: [
        {id:'bo-water',       label:'Water (2L min per person)',        desc:'Fill reusable bottles. Include water purification tablets or filter.'},
        {id:'bo-food',        label:'Food (3-day supply)',              desc:'Energy bars, dried fruit, nuts, crackers — no cooking required.'},
        {id:'bo-firstaid',    label:'First aid kit',                   desc:'Bandages, antiseptic, pain relievers, blister pads, scissors.'},
        {id:'bo-meds',        label:'Prescriptions (7-day supply)',     desc:'All daily medications, plus extras. Keep in waterproof bag.'},
        {id:'bo-docs',        label:'Document copies',                  desc:'IDs, insurance cards, medication list, emergency contacts — laminated or in waterproof sleeve.'},
        {id:'bo-cash',        label:'Cash (small bills)',               desc:'ATMs may be offline. Include coins. Recommend $100+ in small denominations.'},
        {id:'bo-flashlight',  label:'Flashlight + spare batteries',    desc:'LED flashlight or headlamp. Test before packing.'},
        {id:'bo-radio',       label:'Hand-crank or battery radio',     desc:'For emergency broadcasts when power is out.'},
        {id:'bo-phone',       label:'Phone + charger + power bank',    desc:'Fully charged. Include a car charger as backup.'},
        {id:'bo-clothing',    label:'Change of clothes',               desc:'Season-appropriate layers. Sturdy shoes. Rain gear.'},
        {id:'bo-warmth',      label:'Warmth layer + emergency blanket',desc:'Mylar emergency blanket weighs almost nothing but is critical.'},
        {id:'bo-firestarter', label:'Fire starter',                    desc:'Waterproof matches or lighter. Firestarter cubes as backup.'},
        {id:'bo-knife',       label:'Knife or multi-tool',             desc:'Fixed blade or folding — for cutting, preparing food, repairs.'},
        {id:'bo-whistle',     label:'Signal whistle',                  desc:'A loud whistle with no pea inside. It carries much farther than shouting and takes less energy.'},
        {id:'bo-map',         label:'Paper map of local area',         desc:'GPS fails. Know two routes out of your neighborhood.'},
        {id:'bo-hygiene',     label:'Basic hygiene kit',               desc:'Hand sanitizer, soap, toothbrush, toilet paper in zip-lock bag.'},
        {id:'bo-pet',         label:'Pet supplies (if applicable)',     desc:'Food, water, carrier, vaccination records, collar with ID.'},
      ]
    },
    shelterinplace: {
      id: 'shelterinplace',
      label: 'Shelter-in-Place',
      builtIn: true,
      items: [
        {id:'sip-headcount',    label:'Account for all household members',   desc:'Bring everyone indoors immediately. Locate pets.'},
        {id:'sip-seal',         label:'Seal doors and windows',                desc:'For chemical/air hazard: plastic sheeting + duct tape. Seal gaps around pipes.'},
        {id:'sip-hvac',         label:'Turn off fans, heating and cooling',     desc:'Turn off fans, air conditioning and heating so outside air is not pulled in. Close the fireplace damper.'},
        {id:'sip-water-fill',   label:'Fill water containers now',             desc:'Fill bathtubs, pots, bottles. Water mains may fail during prolonged shelter.'},
        {id:'sip-food',         label:'Stock 72-hour food supply indoors',     desc:'Pull from your pantry or go-bag. No trips outside.'},
        {id:'sip-meds',         label:'Locate all medications',                desc:'Gather prescriptions, first aid kit, and medical devices in one location.'},
        {id:'sip-radio',        label:'Monitor emergency broadcasts',          desc:'Battery-powered radio. NOAA weather radio if available. Follow official instructions.'},
        {id:'sip-phone',        label:'Charge all devices',                    desc:'Phone, power bank, medical devices — charge everything before power fails.'},
        {id:'sip-flashlights',  label:'Test all flashlights',                  desc:'Check batteries. Place a flashlight in every room.'},
        {id:'sip-sanitation',   label:'Prepare sanitation backup',             desc:'If water/sewage fails: 5-gallon bucket, heavy-duty bags, kitty litter as odor control.'},
        {id:'sip-contacts',     label:'Notify out-of-area contact',            desc:'Text (not call) an out-of-area family contact that you are sheltering in place.'},
        {id:'sip-pets',         label:'Pets secured indoors',                  desc:'Bring all pets inside. Provide extra food and water.'},
        {id:'sip-documents',    label:'Documents accessible',                  desc:'Emergency binder: IDs, insurance, medical records, contacts — in one grab-and-go location.'},
      ]
    },
    evacuation: {
      id: 'evacuation',
      label: 'Evacuation',
      builtIn: true,
      items: [
        {id:'ev-alert',       label:'Confirm evacuation order',              desc:'Listen to official channels. Know your evacuation zone (Zone A/B/C).'},
        {id:'ev-notify',      label:'Notify household + out-of-area contact', desc:'Tell family where you are going. Text your out-of-area contact.'},
        {id:'ev-bugout',      label:'Grab go-bags',                     desc:'Each person carries their own bag. Know where bags are stored.'},
        {id:'ev-meds',        label:'All medications accounted for',         desc:'Do not leave without prescription medications and medical devices.'},
        {id:'ev-docs',        label:'Documents and valuables',               desc:'IDs, insurance, cash, house keys, irreplaceable items.'},
        {id:'ev-route',       label:'Primary route confirmed clear',         desc:'Check radio for road closures. Know alternate route if primary is blocked.'},
        {id:'ev-destination', label:'Destination confirmed',                 desc:'Pre-designated meeting point, shelter location, or family address.'},
        {id:'ev-fuel',        label:'Vehicle has fuel',                       desc:'Keep tank above half when alerts are issued. Gas stations may be closed.'},
        {id:'ev-pets',        label:'Pets and carriers loaded',              desc:'Carrier, leash, food, water, vaccination records for each pet.'},
        {id:'ev-utilities',   label:'Utilities off (only if told to)',        desc:'Shut off gas, water or electricity only if officials tell you to, or you smell gas or see damage. Once gas is off, only a professional should turn it back on.'},
        {id:'ev-lock',        label:'Home secured',                          desc:'Lock doors and windows. Leave a note of your destination and departure time.'},
        {id:'ev-phone',       label:'Devices charged in vehicle',             desc:'Plug in to car charger while driving. Enable location sharing with family.'},
        {id:'ev-water',       label:'Water in vehicle',                      desc:'At least 1 gallon per person for travel.'},
        {id:'ev-checkin',     label:'Check in at destination',               desc:'Tell your out-of-area contact you arrived. If you can reach an ARK Hub, post that you are safe.'},
      ]
    },
    kit72: {
      id: 'kit72',
      label: '72-Hour Kit',
      builtIn: true,
      keep: true, // a packing list: ticks stay until the user resets them
      items: [
        {id:'k72-water',      label:'Water (3 gal/person — 72hr)',           desc:'1 gallon per person per day for drinking and sanitation. Store in sealed containers.'},
        {id:'k72-food',       label:'Food (3-day, no-cook supply)',          desc:'Canned goods (with pull tabs or manual opener), energy bars, dried foods, comfort foods.'},
        {id:'k72-opener',     label:'Manual can opener',                     desc:'Check it works. Keep it with the food kit.'},
        {id:'k72-firstaid',   label:'First aid kit (complete)',              desc:'Bandages, gauze, antiseptic, CPR mask, thermometer, pain relievers, tweezers, scissors.'},
        {id:'k72-meds',       label:'7-day prescription supply',             desc:'Rotate regularly. Keep a list of medications with dosages.'},
        {id:'k72-flashlight', label:'Two flashlights + batteries',           desc:'LED. Store batteries separately to prevent corrosion.'},
        {id:'k72-radio',      label:'Battery/hand-crank radio',              desc:'NOAA weather frequencies. Test monthly.'},
        {id:'k72-phone',      label:'High-capacity power bank (20,000 mAh+)', desc:'Can recharge a phone several times. Keep it charged — top it up every 3 months.'},
        {id:'k72-whistle',    label:'Whistle (pea-less)',                    desc:'To signal for help without using energy.'},
        {id:'k72-blanket',    label:'Mylar emergency blankets (1 per person)', desc:'Lightweight, reflects 90% of body heat. Fits in a pocket.'},
        {id:'k72-clothing',   label:'Extra clothing (season-appropriate)',   desc:'Full change per person including socks, underwear, rain poncho.'},
        {id:'k72-shoes',      label:'Sturdy footwear',                       desc:'Closed-toe shoes that can walk over debris. Near the kit.'},
        {id:'k72-docs',       label:'Copies of key documents',               desc:'Sealed waterproof bag: IDs, insurance, bank info, emergency contacts, medical records.'},
        {id:'k72-cash',       label:'Cash (small denominations)',             desc:'$100+ in small bills. ATMs may be offline.'},
        {id:'k72-hygiene',    label:'Sanitation kit',                        desc:'Hand sanitizer, soap, wet wipes, toothbrushes, feminine hygiene, diapers if needed.'},
        {id:'k72-tools',      label:'Multi-tool or knife + duct tape',       desc:'Utility knife, pliers, screwdrivers. Duct tape has hundreds of emergency uses.'},
        {id:'k72-firestarter',label:'Fire starters + waterproof matches',   desc:'Lighter + backup waterproof matches stored in zip-lock bag.'},
        {id:'k72-pet',        label:'Pet kit (if applicable)',               desc:'3-day food/water, carrier, ID tags, vaccination records, familiar toy.'},
        {id:'k72-baby',       label:'Infant/special needs supplies',         desc:'Formula, diapers, medications, comfort items for children or elderly family members.'},
        {id:'k72-rotate',     label:'Rotation date labeled on kit',         desc:'Check and rotate water/food every 6–12 months. Record the date on the kit.'},
      ]
    }
  },

  // Get the active checklist definition
  get items() {
    const cl = this._getActiveChecklist();
    return cl ? cl.items : [];
  },

  // Custom lists as saved, minus anything damaged (so one bad entry cannot break the Home screen)
  _getCustom() {
    const custom = Store.get('custom_checklists', []);
    if (!Array.isArray(custom)) return [];
    return custom.filter(c => c && typeof c === 'object' && c.id && Array.isArray(c.items))
      .map(c => ({...c, label: String(c.label || 'My list'), builtIn: false, items: c.items.filter(i => i && typeof i === 'object' && i.id)}));
  },

  _getActiveChecklist() {
    // Check built-in templates first
    if (this.TEMPLATES[this._activeId]) return this.TEMPLATES[this._activeId];
    // Check custom checklists
    return this._getCustom().find(c => c.id === this._activeId) || this.TEMPLATES['daily'];
  },

  _getAllChecklists() {
    return [...Object.values(this.TEMPLATES), ...this._getCustom()];
  },

  _storeKey() {
    const cl = this._getActiveChecklist();
    if (!cl) return 'checklist_daily_' + today();
    // Custom lists keep their ticks until reset
    if (!cl.builtIn) return 'checklist_custom_' + cl.id;
    // Packing lists (go-bag, 72-hour kit) keep their ticks too: packing takes more than one day
    if (cl.keep) return 'checklist_keep_' + cl.id;
    // Situation lists start fresh each day
    return 'checklist_' + cl.id + '_' + today();
  },

  // Ticks for the active list, always as a plain object
  _getChecked() {
    const cl = this._getActiveChecklist();
    let checked = Store.get(this._storeKey(), null);
    // Packing lists used to be saved per day — carry today's ticks over once
    if (!checked && cl && cl.builtIn && cl.keep) checked = Store.get('checklist_' + cl.id + '_' + today(), null);
    return (checked && typeof checked === 'object' && !Array.isArray(checked)) ? checked : {};
  },

  // Prune checklist keys older than 7 days to prevent localStorage from filling up.
  _pruneOldKeys() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    Store.keys().forEach(k => {
      // Only prune the daily check (old format) and new date-keyed built-in checklist states
      const m = k.match(/^checklist_(daily|bugout|shelterinplace|evacuation|kit72)_(\d{4}-\d{2}-\d{2})$/);
      if (m && m[2] < cutoffStr) Store.del(k);
      // Also prune legacy plain date keys
      if (k.startsWith('checklist_') && k.length === 'checklist_YYYY-MM-DD'.length) {
        const dateStr = k.slice('checklist_'.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) && dateStr < cutoffStr) Store.del(k);
      }
    });
  },

  // Update the progress line, all-clear banner, and browser tab title.
  _updateProgress(checked) {
    const el = document.getElementById('checklist-progress');
    const banner = document.getElementById('checklist-allclear');
    if (!el) return;
    const items = this._getActiveChecklist()?.items || [];
    const done = items.filter(i => checked[i.id]).length;
    const total = items.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const allDone = done === total && total > 0;

    if (allDone) {
      el.innerHTML = `<span style="color:var(--green);font-weight:600"><svg class="hi" aria-hidden="true"><use href="#i-check"/></svg> All ${total} done</span>`;
    } else {
      el.innerHTML = `<span style="color:${done > 0 ? 'var(--text-primary)' : 'var(--text-muted)'}">${done} of ${total} done</span>`;
    }

    if (banner) banner.style.display = allDone ? 'block' : 'none';

    // Tab title badge: show "(X/N)" when partially done, "✓ ARK" when all done
    const baseTitle = document.title.replace(/^\(.*?\)\s*|^[✅✓]\s*/u, '');
    if (allDone) {
      document.title = '✓ ' + baseTitle;
    } else if (done > 0) {
      document.title = `(${done}/${total}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  },

  // Render date in header.
  _renderDate() {
    const el = document.getElementById('checklist-header-date');
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  },

  // Render the checklist type tabs
  _renderTabs() {
    const row = document.getElementById('checklist-tab-row');
    if (!row) return;
    const all = this._getAllChecklists();
    row.innerHTML = all.map(cl => `
      <button class="btn btn-sm ${this._activeId === cl.id ? 'btn-primary' : 'btn-secondary'}" aria-pressed="${this._activeId === cl.id ? 'true' : 'false'}"
        onclick="Checklist.switchTo(${jsAttr(cl.id)})">${esc(cl.label)}</button>
    `).join('') +
    `<button class="btn btn-ghost btn-sm" onclick="Checklist.newCustom()" title="Make your own checklist"><svg class="hi" aria-hidden="true"><use href="#i-plus"/></svg> Your own list</button>`;
  },

  switchTo(id) {
    this._activeId = id;
    this._renderTabs();
    this.init(true); // skip tab re-render to avoid loop
  },

  init(skipTabs) {
    const container = document.getElementById('checklist-container');
    if (!container) return;
    this._pruneOldKeys();
    this._renderDate();
    if (!skipTabs) this._renderTabs();
    const cl = this._getActiveChecklist();
    const items = cl ? cl.items : [];
    const checked = this._getChecked();
    this._shownKey = this._storeKey(); // which day's ticks are on screen
    const isCustom = !!cl && !cl.builtIn;
    const keeps = isCustom || !!(cl && cl.keep);
    const removeBtn = isCustom ? '<div class="mt-12"><button class="btn btn-ghost btn-sm" onclick="Checklist.removeCustom()"><svg class="hi" aria-hidden="true"><use href="#i-trash"/></svg> Delete this list</button></div>' : '';
    if (!items.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">This list is empty. Delete it and make a new one with “Your own list”.</div>' + removeBtn;
      return;
    }
    container.innerHTML =
      '<div class="flex wrap" style="justify-content:space-between;gap:2px 12px;padding:6px 0 8px"><div id="checklist-progress" class="font-sm" role="status"></div>' +
      '<div class="font-xs text-muted">' + (keeps ? 'Ticks stay until you tap Reset' : 'Starts fresh each day') + '</div></div>' +
      items.map(item => `
      <div class="checklist-item" onclick="Checklist.toggleRow(${jsAttr(item.id)})">
        <div class="check-box ${checked[item.id] ? 'checked' : ''}" id="check-${esc(item.id)}" role="checkbox" tabindex="0" aria-checked="${checked[item.id] ? 'true' : 'false'}" aria-labelledby="label-${esc(item.id)}" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();Checklist.toggleRow(${jsAttr(item.id)})}">
          ${checked[item.id] ? '✓' : ''}
        </div>
        <div class="check-label-wrap">
          <span class="check-label ${checked[item.id] ? 'checked-text' : ''}" id="label-${esc(item.id)}">${esc(item.label)}</span>
          ${item.desc ? `<span class="check-desc">${esc(item.desc)}</span>` : ''}
        </div>
      </div>
    `).join('') +
      '<div id="checklist-allclear" class="checklist-allclear" style="display:none">Everything on this list is done.</div>' + removeBtn;
    this._updateProgress(checked);
  },

  // Toggle by item id — called from both row click and checkbox click.
  toggleRow(id) {
    const key = this._storeKey();
    // ARK was left open past midnight: a daily list has started again, but yesterday's ticks
    // are still on screen. Show today's list first, so the screen and the saved ticks agree.
    if (this._shownKey && this._shownKey !== key) {
      this.init(true);
      Toast.show('It is a new day, so this list has started fresh. Tap the item again.', 'info', 5000);
      return;
    }
    const checked = this._getChecked();
    checked[id] = !checked[id];
    if (!Store.set(key, checked)) return; // not saved — leave the box as it was (Store has told the user)

    const box = document.getElementById('check-' + id);
    if (box) {
      box.classList.toggle('checked', checked[id]);
      box.setAttribute('aria-checked', checked[id] ? 'true' : 'false');
      box.textContent = checked[id] ? '✓' : '';
      box.classList.remove('pop');
      void box.offsetWidth;
      box.classList.add('pop');
    }
    const label = document.getElementById('label-' + id);
    if (label) label.classList.toggle('checked-text', checked[id]);
    this._updateProgress(checked);
  },

  reset() {
    const cl = this._getActiveChecklist();
    const checked = this._getChecked();
    const done = (cl ? cl.items : []).filter(i => checked[i.id]).length;
    if (!done) { Toast.show('Nothing is ticked on this list yet', 'info'); return; }
    // One stray tap must not wipe a half-packed bag
    Modal.confirm('Clear all ' + done + ' ' + (done === 1 ? 'tick' : 'ticks') + ' on <strong>' + esc(cl.label) + '</strong> and start again?', () => {
      // Save an empty set (rather than deleting) so older per-day ticks are not picked up again
      if (!Store.set(Checklist._storeKey(), {})) return; // not saved — ticks are still there (Store has told the user)
      document.title = document.title.replace(/^\(.*?\)\s*|^[✅✓]\s*/u, '');
      Checklist.init(true);
      Toast.show('List cleared', 'info');
    }, 'Clear ticks', 'Keep them');
  },

  // Delete the custom list that is showing now
  removeCustom() {
    const cl = this._getActiveChecklist();
    if (!cl || cl.builtIn) return;
    Modal.confirm('Delete your list <strong>' + esc(cl.label) + '</strong>? This cannot be undone.', () => {
      const left = Checklist._getCustom().filter(c => c.id !== cl.id);
      if (!Store.set('custom_checklists', left)) return;
      Store.del('checklist_custom_' + cl.id);
      Checklist._activeId = 'daily';
      document.title = document.title.replace(/^\(.*?\)\s*|^[✅✓]\s*/u, '');
      Checklist.init();
      Toast.show('List deleted', 'info');
    }, 'Delete list', 'Keep it');
  },

  printCurrent() {
    // Delegate to PrintARK with current checklist context
    PrintARK.checklist();
  },

  newCustom() {
    Modal.open(`
      <p class="font-sm text-secondary" style="margin:0 0 12px">Give your list a name, then type one thing per line. It is saved on this device.</p>
      <label class="form-label" for="cl-name">List name</label>
      <input type="text" id="cl-name" maxlength="60" class="form-input w-full" placeholder="e.g. Car kit" aria-describedby="cl-name-err" autocomplete="off">
      <div id="cl-name-err" class="font-xs" role="alert" style="color:var(--red);min-height:16px;margin:2px 0 8px"></div>
      <label class="form-label" for="cl-items">Things on the list (one per line)</label>
      <textarea id="cl-items" maxlength="2000" class="form-input w-full" rows="8" aria-describedby="cl-items-err" placeholder="Jumper cables&#10;Spare tire (inflated)&#10;First aid kit&#10;Flares or reflective triangles&#10;Blanket"></textarea>
      <div id="cl-items-err" class="font-xs" role="alert" style="color:var(--red);min-height:16px;margin:2px 0 8px"></div>
      <div class="flex gap-8 wrap" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(Checklist._doNewCustom())Modal.close();">Make list</button>
      </div>
    `, 'Make your own checklist');
  },

  _doNewCustom() {
    const nameEl = document.getElementById('cl-name');
    const nameErr = document.getElementById('cl-name-err');
    const itemsEl = document.getElementById('cl-items');
    const itemsErr = document.getElementById('cl-items-err');

    const name = (nameEl?.value || '').trim();
    if (!name) { if (nameErr) nameErr.textContent = 'Type a name for your list.'; nameEl?.focus(); return false; }
    if (nameErr) nameErr.textContent = '';

    const lines = (itemsEl?.value || '').split('\n').map(l => l.trim().slice(0, 140)).filter(Boolean).slice(0, 60);
    if (!lines.length) { if (itemsErr) itemsErr.textContent = 'Type at least one thing, one per line.'; itemsEl?.focus(); return false; }
    if (itemsErr) itemsErr.textContent = '';

    const id = 'custom_' + Date.now();
    const custom = this._getCustom();
    custom.push({
      id,
      label: name,
      builtIn: false,
      items: lines.map((l, i) => ({id: id + '_' + i, label: l, desc: ''}))
    });
    if (!Store.set('custom_checklists', custom)) return false; // not saved — keep the form open (Store has told the user)
    this._activeId = id;
    this.init();
    Toast.show('Your list "' + name + '" is ready', 'success');
    return true;
  }
};

