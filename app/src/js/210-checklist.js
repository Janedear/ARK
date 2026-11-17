// === CHECKLIST ===
const Checklist = {
  // Active checklist id
  _activeId: 'daily',

  // Pre-built checklist templates — keyed by id
  TEMPLATES: {
    daily: {
      id: 'daily',
      label: '📋 Daily Check',
      builtIn: true,
      items: [
        {id:'headcount',  label:'👨‍👩‍👧 Family headcount',   desc:'Confirm all household members are present and accounted for.'},
        {id:'injury',     label:'🩹 Injury check',           desc:'Assess everyone for wounds, burns, or unresponsiveness requiring first aid.'},
        {id:'medical',    label:'💊 Medication check',       desc:'Locate prescriptions, insulin, EpiPen, and first aid kit — verify supply.'},
        {id:'shelter',    label:'🏠 Shelter secure',         desc:'Check for structural damage, gas leaks, fire hazards, and broken glass.'},
        {id:'water',      label:'💧 Water supply',           desc:'1 gal/person/day minimum. Fill bathtubs now if mains may fail.'},
        {id:'food',       label:'🍽️ Food supply',            desc:'Verify at least a 72-hour supply of ready-to-eat food is accessible.'},
        {id:'power',      label:'🔋 Power check',            desc:'Test batteries, flashlights, generator fuel, and solar chargers.'},
        {id:'radio',      label:'📻 Radio check',            desc:'Tune to emergency broadcast. Confirm ARK hub is reachable if configured.'},
        {id:'comms',      label:'📱 Devices charged',        desc:'Charge phones, power banks, and satellite communicator if available.'},
        {id:'documents',  label:'📄 Documents secured',      desc:'Gather IDs, insurance papers, cash, and go-bag document copies.'},
        {id:'evacroute',  label:'🗺️ Evacuation route',       desc:'Confirm primary and at least one alternate route out of the area.'},
        {id:'safe',       label:'✅ Posted safe status',     desc:'Post "I\'m safe" to the ARK community board so others know.'},
      ]
    },
    bugout: {
      id: 'bugout',
      label: '🎒 Bug-Out Bag',
      builtIn: true,
      items: [
        {id:'bo-water',       label:'💧 Water (2L min per person)',        desc:'Fill reusable bottles. Include water purification tablets or filter.'},
        {id:'bo-food',        label:'🍫 Food (3-day supply)',              desc:'Energy bars, dried fruit, nuts, crackers — no cooking required.'},
        {id:'bo-firstaid',    label:'🩹 First aid kit',                   desc:'Bandages, antiseptic, pain relievers, blister pads, scissors.'},
        {id:'bo-meds',        label:'💊 Prescriptions (7-day supply)',     desc:'All daily medications, plus extras. Keep in waterproof bag.'},
        {id:'bo-docs',        label:'📄 Document copies',                  desc:'IDs, insurance cards, medication list, emergency contacts — laminated or in waterproof sleeve.'},
        {id:'bo-cash',        label:'💵 Cash (small bills)',               desc:'ATMs may be offline. Include coins. Recommend $100+ in small denominations.'},
        {id:'bo-flashlight',  label:'🔦 Flashlight + spare batteries',    desc:'LED flashlight or headlamp. Test before packing.'},
        {id:'bo-radio',       label:'📻 Hand-crank or battery radio',     desc:'For emergency broadcasts when power is out.'},
        {id:'bo-phone',       label:'📱 Phone + charger + power bank',    desc:'Fully charged. Include a car charger as backup.'},
        {id:'bo-clothing',    label:'👕 Change of clothes',               desc:'Season-appropriate layers. Sturdy shoes. Rain gear.'},
        {id:'bo-warmth',      label:'🧥 Warmth layer + emergency blanket',desc:'Mylar emergency blanket weighs almost nothing but is critical.'},
        {id:'bo-firestarter', label:'🔥 Fire starter',                    desc:'Waterproof matches or lighter. Firestarter cubes as backup.'},
        {id:'bo-knife',       label:'🔪 Knife or multi-tool',             desc:'Fixed blade or folding — for cutting, preparing food, repairs.'},
        {id:'bo-whistle',     label:'📯 Signal whistle',                  desc:'Pea-less whistle (Fox 40 style) — audible over 1 mile.'},
        {id:'bo-map',         label:'🗺️ Paper map of local area',         desc:'GPS fails. Know two routes out of your neighborhood.'},
        {id:'bo-hygiene',     label:'🧴 Basic hygiene kit',               desc:'Hand sanitizer, soap, toothbrush, toilet paper in zip-lock bag.'},
        {id:'bo-pet',         label:'🐾 Pet supplies (if applicable)',     desc:'Food, water, carrier, vaccination records, collar with ID.'},
      ]
    },
    shelterinplace: {
      id: 'shelterinplace',
      label: '🏠 Shelter-in-Place',
      builtIn: true,
      items: [
        {id:'sip-headcount',    label:'👨‍👩‍👧 Account for all household members',   desc:'Bring everyone indoors immediately. Locate pets.'},
        {id:'sip-seal',         label:'🪟 Seal doors and windows',                desc:'For chemical/air hazard: plastic sheeting + duct tape. Seal gaps around pipes.'},
        {id:'sip-hvac',         label:'🌀 Turn off HVAC and ventilation',          desc:'Turn off fans, air conditioning, heating systems. Close fireplace damper.'},
        {id:'sip-water-fill',   label:'💧 Fill water containers now',             desc:'Fill bathtubs, pots, bottles. Water mains may fail during prolonged shelter.'},
        {id:'sip-food',         label:'🍽️ Stock 72-hour food supply indoors',     desc:'Pull from your pantry or bug-out bag. No trips outside.'},
        {id:'sip-meds',         label:'💊 Locate all medications',                desc:'Gather prescriptions, first aid kit, and medical devices in one location.'},
        {id:'sip-radio',        label:'📻 Monitor emergency broadcasts',          desc:'Battery-powered radio. NOAA weather radio if available. Follow official instructions.'},
        {id:'sip-phone',        label:'📱 Charge all devices',                    desc:'Phone, power bank, medical devices — charge everything before power fails.'},
        {id:'sip-flashlights',  label:'🔦 Test all flashlights',                  desc:'Check batteries. Place a flashlight in every room.'},
        {id:'sip-sanitation',   label:'🚽 Prepare sanitation backup',             desc:'If water/sewage fails: 5-gallon bucket, heavy-duty bags, kitty litter as odor control.'},
        {id:'sip-contacts',     label:'📞 Notify out-of-area contact',            desc:'Text (not call) an out-of-area family contact that you are sheltering in place.'},
        {id:'sip-pets',         label:'🐾 Pets secured indoors',                  desc:'Bring all pets inside. Provide extra food and water.'},
        {id:'sip-documents',    label:'📄 Documents accessible',                  desc:'Emergency binder: IDs, insurance, medical records, contacts — in one grab-and-go location.'},
      ]
    },
    evacuation: {
      id: 'evacuation',
      label: '🚶 Evacuation',
      builtIn: true,
      items: [
        {id:'ev-alert',       label:'📻 Confirm evacuation order',              desc:'Listen to official channels. Know your evacuation zone (Zone A/B/C).'},
        {id:'ev-notify',      label:'📞 Notify household + out-of-area contact', desc:'Tell family where you are going. Text your out-of-area contact.'},
        {id:'ev-bugout',      label:'🎒 Grab bug-out bags',                     desc:'Each person carries their own bag. Know where bags are stored.'},
        {id:'ev-meds',        label:'💊 All medications accounted for',         desc:'Do not leave without prescription medications and medical devices.'},
        {id:'ev-docs',        label:'📄 Documents and valuables',               desc:'IDs, insurance, cash, house keys, irreplaceable items.'},
        {id:'ev-route',       label:'🗺️ Primary route confirmed clear',         desc:'Check radio for road closures. Know alternate route if primary is blocked.'},
        {id:'ev-destination', label:'🏁 Destination confirmed',                 desc:'Pre-designated meeting point, shelter location, or family address.'},
        {id:'ev-fuel',        label:'⛽ Vehicle has fuel',                       desc:'Keep tank above half when alerts are issued. Gas stations may be closed.'},
        {id:'ev-pets',        label:'🐾 Pets and carriers loaded',              desc:'Carrier, leash, food, water, vaccination records for each pet.'},
        {id:'ev-utilities',   label:'🔌 Utilities off (if time allows)',         desc:'Turn off gas, water, electricity at main shutoffs if time permits.'},
        {id:'ev-lock',        label:'🔒 Home secured',                          desc:'Lock doors and windows. Leave a note of your destination and departure time.'},
        {id:'ev-phone',       label:'📱 Devices charged in vehicle',             desc:'Plug in to car charger while driving. Enable location sharing with family.'},
        {id:'ev-water',       label:'💧 Water in vehicle',                      desc:'At least 1 gallon per person for travel.'},
        {id:'ev-checkin',     label:'✅ Check in at destination',               desc:'Post safe status on ARK. Tell emergency management you have evacuated.'},
      ]
    },
    kit72: {
      id: 'kit72',
      label: '🕐 72-Hour Kit',
      builtIn: true,
      items: [
        {id:'k72-water',      label:'💧 Water (3 gal/person — 72hr)',           desc:'1 gallon per person per day for drinking and sanitation. Store in sealed containers.'},
        {id:'k72-food',       label:'🥫 Food (3-day, no-cook supply)',          desc:'Canned goods (with pull tabs or manual opener), energy bars, dried foods, comfort foods.'},
        {id:'k72-opener',     label:'🔧 Manual can opener',                     desc:'Check it works. Keep it with the food kit.'},
        {id:'k72-firstaid',   label:'🩹 First aid kit (complete)',              desc:'Bandages, gauze, antiseptic, CPR mask, thermometer, pain relievers, tweezers, scissors.'},
        {id:'k72-meds',       label:'💊 7-day prescription supply',             desc:'Rotate regularly. Keep a list of medications with dosages.'},
        {id:'k72-flashlight', label:'🔦 Two flashlights + batteries',           desc:'LED. Store batteries separately to prevent corrosion.'},
        {id:'k72-radio',      label:'📻 Battery/hand-crank radio',              desc:'NOAA weather frequencies. Test monthly.'},
        {id:'k72-phone',      label:'🔋 High-capacity power bank (20,000 mAh+)', desc:'Can charge phone 5× times. Keep charged — recharge every 3 months.'},
        {id:'k72-whistle',    label:'📯 Whistle (pea-less)',                    desc:'To signal for help without using energy.'},
        {id:'k72-blanket',    label:'🌡️ Mylar emergency blankets (1 per person)', desc:'Lightweight, reflects 90% of body heat. Fits in a pocket.'},
        {id:'k72-clothing',   label:'👕 Extra clothing (season-appropriate)',   desc:'Full change per person including socks, underwear, rain poncho.'},
        {id:'k72-shoes',      label:'👟 Sturdy footwear',                       desc:'Closed-toe shoes that can walk over debris. Near the kit.'},
        {id:'k72-docs',       label:'📄 Copies of key documents',               desc:'Sealed waterproof bag: IDs, insurance, bank info, emergency contacts, medical records.'},
        {id:'k72-cash',       label:'💵 Cash (small denominations)',             desc:'$100+ in small bills. ATMs may be offline.'},
        {id:'k72-hygiene',    label:'🧴 Sanitation kit',                        desc:'Hand sanitizer, soap, wet wipes, toothbrushes, feminine hygiene, diapers if needed.'},
        {id:'k72-tools',      label:'🔧 Multi-tool or knife + duct tape',       desc:'Utility knife, pliers, screwdrivers. Duct tape has hundreds of emergency uses.'},
        {id:'k72-firestarter',label:'🔥 Fire starters + waterproof matches',   desc:'Lighter + backup waterproof matches stored in zip-lock bag.'},
        {id:'k72-pet',        label:'🐾 Pet kit (if applicable)',               desc:'3-day food/water, carrier, ID tags, vaccination records, familiar toy.'},
        {id:'k72-baby',       label:'👶 Infant/special needs supplies',         desc:'Formula, diapers, medications, comfort items for children or elderly family members.'},
        {id:'k72-rotate',     label:'🗓️ Rotation date labeled on kit',         desc:'Check and rotate water/food every 6–12 months. Record the date on the kit.'},
      ]
    }
  },

  // Get the active checklist definition
  get items() {
    const cl = this._getActiveChecklist();
    return cl ? cl.items : [];
  },

  _getActiveChecklist() {
    // Check built-in templates first
    if (this.TEMPLATES[this._activeId]) return this.TEMPLATES[this._activeId];
    // Check custom checklists
    const custom = Store.get('custom_checklists', []);
    return custom.find(c => c.id === this._activeId) || this.TEMPLATES['daily'];
  },

  _getAllChecklists() {
    const custom = Store.get('custom_checklists', []);
    return [...Object.values(this.TEMPLATES), ...custom];
  },

  _storeKey() {
    // Built-in checklists use date-keyed state (daily resets), custom use persistent state
    const cl = this._getActiveChecklist();
    if (!cl || cl.builtIn) return 'checklist_' + this._activeId + '_' + today();
    return 'checklist_custom_' + this._activeId;
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
      el.innerHTML = `<span style="color:var(--green);font-weight:600">✅ ${done} / ${total} complete — 100%</span>`;
    } else {
      el.innerHTML = `<span style="color:${done > 0 ? 'var(--accent)' : 'var(--text-muted)'}">${done} / ${total} complete (${pct}%)</span>`;
    }

    if (banner) banner.style.display = allDone ? 'block' : 'none';

    // Tab title badge: show "(X/N)" when partially done, "✅ ARK" when all done
    const baseTitle = document.title.replace(/^\(.*?\)\s*|^✅\s*/, '');
    if (allDone) {
      document.title = '✅ ' + baseTitle;
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
      <button class="btn btn-sm ${this._activeId === cl.id ? 'btn-primary' : 'btn-ghost'}"
        onclick="Checklist.switchTo(${jsAttr(cl.id)})" style="font-size:12px">${esc(cl.label)}</button>
    `).join('') +
    `<button class="btn btn-ghost btn-sm" onclick="Checklist.newCustom()" style="font-size:12px" title="Create custom checklist">＋ Custom</button>`;
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
    const checked = Store.get(this._storeKey(), {});
    if (!items.length) {
      container.innerHTML = '<div class="text-secondary font-sm" style="padding:8px 0">No items — add some with + Custom.</div>';
      return;
    }
    container.innerHTML =
      '<div id="checklist-progress" class="font-sm" style="padding:6px 0 8px"></div>' +
      items.map(item => `
      <div class="checklist-item" onclick="Checklist.toggleRow(${jsAttr(item.id)})" role="button" tabindex="-1">
        <div class="check-box ${checked[item.id] ? 'checked' : ''}" id="check-${esc(item.id)}" role="checkbox" tabindex="0" aria-checked="${checked[item.id] ? 'true' : 'false'}" aria-labelledby="label-${esc(item.id)}" onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();Checklist.toggleRow('${esc(item.id)}')}">
          ${checked[item.id] ? '✓' : ''}
        </div>
        <div class="check-label-wrap">
          <span class="check-label ${checked[item.id] ? 'checked-text' : ''}" id="label-${esc(item.id)}">${esc(item.label)}</span>
          ${item.desc ? `<span class="check-desc">${esc(item.desc)}</span>` : ''}
        </div>
      </div>
    `).join('') +
      '<div id="checklist-allclear" class="checklist-allclear" style="display:none">🏁 All items checked — stay safe and stay prepared.</div>';
    this._updateProgress(checked);
  },

  // Toggle by item id — called from both row click and checkbox click.
  toggleRow(id) {
    const key = this._storeKey();
    const checked = Store.get(key, {});
    checked[id] = !checked[id];
    Store.set(key, checked);

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
    Store.del(this._storeKey());
    document.title = document.title.replace(/^\(.*?\)\s*|^✅\s*/, '');
    this.init(true);
  },

  printCurrent() {
    // Delegate to PrintARK with current checklist context
    PrintARK.checklist();
  },

  newCustom() {
    Modal.open(`
      <p style="margin:0 0 12px">Create a named checklist with custom items. Each item on a new line.</p>
      <label class="font-sm semibold">Checklist Name <span style="color:#cc0000">*</span></label>
      <input type="text" id="cl-name" maxlength="60" class="form-input w-full" placeholder="e.g. Vehicle Kit" style="margin:6px 0 2px">
      <div id="cl-name-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <label class="font-sm semibold">Items (one per line) <span style="color:#cc0000">*</span></label>
      <textarea id="cl-items" maxlength="2000" class="form-input w-full" rows="8" placeholder="Jumper cables&#10;Spare tire (inflated)&#10;First aid kit&#10;Flares or reflective triangles&#10;Blanket" style="margin:6px 0 8px"></textarea>
      <div id="cl-items-err" class="font-xs" style="color:#cc0000;min-height:16px;margin-bottom:8px"></div>
      <div class="flex gap-8" style="justify-content:flex-end">
        <button class="btn btn-ghost" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="if(Checklist._doNewCustom())Modal.close();">Create</button>
      </div>
    `, '➕ New Custom Checklist');
  },

  _doNewCustom() {
    const nameEl = document.getElementById('cl-name');
    const nameErr = document.getElementById('cl-name-err');
    const itemsEl = document.getElementById('cl-items');
    const itemsErr = document.getElementById('cl-items-err');

    const name = (nameEl?.value || '').trim();
    if (!name) { if (nameErr) nameErr.textContent = 'Name is required.'; nameEl?.focus(); return false; }
    if (nameErr) nameErr.textContent = '';

    const lines = (itemsEl?.value || '').split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { if (itemsErr) itemsErr.textContent = 'Add at least one item.'; itemsEl?.focus(); return false; }
    if (itemsErr) itemsErr.textContent = '';

    const id = 'custom_' + Date.now();
    const custom = Store.get('custom_checklists', []);
    custom.push({
      id,
      label: name,
      builtIn: false,
      items: lines.map((l, i) => ({id: id + '_' + i, label: l, desc: ''}))
    });
    Store.set('custom_checklists', custom);
    this._activeId = id;
    this.init();
    Toast.show('Checklist "' + name + '" created', 'success');
    return true;
  }
};

