/* ============================================================
   ARKai — Halo, ARK's built-in guide: stored answers (zero-download) + Halo+ (WebLLM)
   ============================================================
   HALO Lite: pattern-matching knowledge base, works instantly offline.
   HALO+: Llama 3.2 via WebLLM, requires internet once to cache model.
   ============================================================ */
const ARKai = (() => {
  let _engine = null;      // WebLLM engine when loaded
  let _loading = false;
  let _history = [];       // {role, content}[]
  let _injectedCtx = {};   // keyed context blobs
  const HISTORY_KEY = 'halo_chat_history';
  const CTX_KEY = 'halo_ctx';
  const PLUS_KEY = 'halo_plus_model'; // which Halo+ model was downloaded on this device, if any
  const MAX_HISTORY = 40;

  const WEBLLM_CDN = 'https://esm.run/@mlc-ai/web-llm';

  /* ── HALO Lite Knowledge Base ────────────────────────────── */
  const KB = [
    // Immediate-danger situations first — these must never be answered with a survival-skills article
    { k:['fire','house fire','on fire','wildfire','building fire','fire in the','fire in my','caught fire','catch fire','smoke in','fire alarm','evacuate fire','forest fire','brush fire'],
      r:`🔥 FIRE — GET OUT, STAY OUT, CALL 911\n\nHouse or building fire:\n1. Get everyone out NOW. Do not stop for belongings.\n2. Crawl low under smoke — the cleaner air is near the floor.\n3. Feel a closed door with the back of your hand. If it is hot, do NOT open it — use another way out.\n4. Close doors behind you to slow the fire.\n5. Go to your meeting point and call 911 from outside.\n6. NEVER go back inside for people, pets or things — tell firefighters who is missing.\n\nIf your clothes catch fire: STOP, DROP to the ground, cover your face, and ROLL.\n\nIf you are trapped: close the door, block the gap under it with cloth, open a window and signal for help. Call 911 and say exactly where you are.\n\nWildfire: leave as soon as you are told to — or sooner if you see or smell it coming. Do not wait to see how bad it gets. Take your go-bag, tell someone where you are going, and drive away from the fire with headlights on.`},
    { k:['drowning','drowned','near drowning','pulled from water','pulled out of the water','not breathing after water','went under'],
      r:`🌊 DROWNING — CALL 911\n\n1. Get the person out of the water ONLY if you can do it safely. Reach with a pole or throw something that floats — do not jump in unless you are trained.\n2. Lay them on their back on a firm surface. Check for breathing.\n3. NOT breathing: start CPR at once and include rescue breaths — a drowned person needs air.\n   • Give 2 rescue breaths first (tilt head back, pinch nose, breathe until the chest rises)\n   • Then 30 chest compressions, 2 breaths, and repeat\n4. Do NOT try to squeeze or drain water from the lungs.\n5. Breathing but unresponsive: roll them onto their side and keep them warm.\n6. Use an AED as soon as one arrives (dry the chest first).\n\nAnyone who was under water and coughed, struggled to breathe or passed out needs a doctor, even if they seem fine afterwards.`},
    { k:['electric shock','electrocut','electrical shock','downed power line','power line','live wire','shocked by'],
      r:`⚡ ELECTRIC SHOCK — CALL 911\n\n1. Do NOT touch the person while they are still touching the electricity — you will be shocked too.\n2. Switch the power off at the breaker or unplug it. If you cannot, push the source away with something dry that does not conduct electricity (wooden broom handle, plastic chair) while standing on something dry.\n3. Downed power line: stay at least 35 feet (10 metres) away and keep others back. Call 911 and the power company.\n4. Once the person is clear of the source: check breathing. Not breathing → start CPR.\n5. Cover burns loosely with a clean dry cloth. Do not use ice or ointment.\n6. Everyone who has had a serious shock should be seen by a doctor — the heart can be affected hours later.`},
    { k:['seizure','convulsion','convulsing','fitting','having a fit','epilep','shaking uncontrollably'],
      r:`🧠 SEIZURE\n\n1. Stay with the person and note the time it started.\n2. Ease them to the floor and turn them gently onto one side.\n3. Move hard or sharp things away. Put something soft under the head.\n4. Loosen anything tight around the neck. Remove glasses.\n5. Do NOT hold them down. Do NOT put anything in their mouth.\n6. Stay until they are fully awake, then tell them calmly what happened.\n\nCALL 911 if:\n• the seizure lasts longer than 5 minutes\n• another seizure starts soon after\n• they have trouble breathing or do not wake up afterwards\n• they are injured, pregnant, have diabetes, or it happened in water\n• they have never had a seizure before`},
    { k:['flood','flooding','flooded','flash flood','floodwater','flood water','rising water','water rising','water is rising'],
      r:`FLOOD — GET TO HIGHER GROUND\n\n1. Move to higher ground now. Do not wait to see how high the water gets.\n2. If you are told to evacuate, leave at once.\n3. Never walk, swim or drive through floodwater. Six inches (15 cm) of moving water can knock an adult down. One foot (30 cm) can float a car. Turn around.\n4. Stay off bridges over fast-moving water.\n5. Trapped in a building: go to the highest floor that still has a way out. Do NOT shelter in a closed attic — rising water can trap you there. Go onto the roof only if you must, and signal for help.\n6. Trapped in a car in moving water: stay inside. If water is rising inside the car, get onto the roof.\n7. Call 911 if you are trapped and a phone works.\n\nAfterwards:\n- Keep out of floodwater. It can hide sharp objects and holes, carry sewage, and be live from downed power lines.\n- Do not touch electrical equipment if you are wet or standing in water.\n- Treat tap water as unsafe until you are told it is safe. Boil it or use bottled water.\n- Do not go home until authorities say it is safe.`},
    { k:['tornado','twister','tornado warning','funnel cloud'],
      r:`TORNADO — TAKE SHELTER NOW\n\n1. Go to a basement, storm cellar or safe room. If there is none, go to a small inside room or hallway on the lowest floor of a sturdy building.\n2. Stay away from windows, doors and outside walls.\n3. Get low. Cover your head and neck with your arms. Pull a mattress, blankets or cushions over you.\n4. Mobile home or caravan: get out and go to a sturdy building. A mobile home is not safe in a tornado.\n5. In a car or outdoors with no building you can reach: do not shelter under a bridge or overpass. Get as low as you can and cover your head and neck with your arms, and your body with a coat or blanket.\n6. Do not try to outrun a tornado in a vehicle.\n\nAfterwards:\n- Stay in shelter until the danger has passed. Listen to a battery radio if you have one.\n- Keep away from downed power lines and damaged buildings.\n- If you smell gas, leave the building.\n- Check people near you for injuries. Call 911 for anyone badly hurt.`},

    { k:['tsunami','tidal wave','sea pulled back','sea is pulling back'],
      r:`TSUNAMI — GO TO HIGH GROUND NOW\n\nNear the coast, any of these means go now. Do not wait for an official warning:\n- A strong earthquake, or one that lasts a long time\n- The sea suddenly pulls back or rises\n- A loud roar from the ocean\n\n1. Move to high ground or inland at once. Go as high and as far from the water as you can.\n2. Go on foot if roads are jammed or damaged.\n3. If you cannot get away, go to an upper floor or the roof of a strong, tall building.\n4. Stay there. More waves can come for hours, and the first wave is often not the biggest.\n5. Never go to the shore to watch.\n6. If you are caught in the water, grab something that floats.\n\nAfterwards:\n- Do not go back until officials say it is safe.\n- Keep out of floodwater and away from damaged buildings and downed power lines.`},
    { k:['head injury','head injuries','hit head','hit my head','hit his head','hit her head','hit their head','banged head','banged my head','bump on the head','concussion','head wound','skull'],
      r:`HEAD INJURY\n\nCALL 911 if the person:\n- passed out, even for a moment\n- has a headache that keeps getting worse\n- vomits more than once\n- has a seizure\n- is confused, very sleepy or hard to wake\n- has pupils of different sizes\n- has weakness or numbness in an arm or leg, or slurred speech\n- has clear fluid or blood coming from the nose or ears\n\nWhat to do:\n1. Keep the person still. If they may have hurt their neck or back, do not move them unless they are in danger.\n2. Bleeding scalp: press on it firmly with a clean cloth. If the skull feels soft or dented, do not press on that spot. Cover it loosely.\n3. For a bump, hold a cold pack wrapped in cloth on it for up to 20 minutes.\n4. Not breathing → start CPR.\n5. Stay with them and check them often for the next 24 hours. Call for help if any sign above appears.\n\nDo not give alcohol. Do not leave them alone.`},

    // How ARK itself works — say it the same way everywhere, and keep it true
    { low:true, k:['what is ark','how does ark','ark work','about ark','ark hub','hub','own internet','no internet','without internet','internet','no signal','no wifi','no wi-fi','wifi','wi-fi','mesh','raspberry','send a message','send message','messages','offline','who made','halosuite'],
      r:`ARK — HOW IT WORKS\n\nIn a crisis, ARK makes its own internet from the devices around you.\n\n1. One laptop (or a Raspberry Pi) runs the ARK Hub. It becomes the hub.\n2. Nearby phones join the hub over Wi-Fi. No mobile signal or outside internet is needed.\n3. People on the same hub can send messages and check in on each other.\n4. Hubs pass messages on to each other — over a network link, by radio, or on a USB stick.\n\nWhat to know:\n- The network is local. Messages reach people on your hub and the hubs linked to it. They do not reach the wider internet or emergency services.\n- A phone alone cannot be the hub. With no hub nearby, the guides, your plan and Halo still work on this phone, and messages wait until you join a hub.\n- Nobody monitors ARK. It is not an emergency service. If you can reach 911, call.\n\nTo join a hub, open Hub in the bar at the bottom of ARK and follow the steps there.\n\nARK is free. It is made by HaloSuite.`},

    // Water
    { k:['water','purify','safe to drink','contaminated','boil'],
      r:`💧 WATER PURIFICATION\n\n1. Boiling (best): Bring to rolling boil for 1 min (3 min above 6500 ft). Let cool. Most reliable method.\n\n2. Chemical (no heat): Add 8 drops unscented household bleach (5–9% chlorine) per gallon. Wait 30 min. Should smell faintly of chlorine — if not, repeat once.\n\n3. Iodine tablets: Follow package. Not for pregnant women or thyroid conditions. 30–60 min contact time.\n\n4. Filtering + treatment: DIY filter (gravel → sand → charcoal in a bottle) removes sediment but NOT pathogens — always treat after filtering.\n\n⚠️ Signs water may be unsafe: unusual color, odor, foam, dead animals nearby, industrial area upstream.`},
    // Fire
    { k:['start a fire','make a fire','build a fire','light a fire','campfire','fire starting','no lighter','no matches','spark','flint','tinder'],
      r:`🔥 STARTING FIRE WITHOUT LIGHTER\n\nFriction method (bow drill):\n1. Carve a spindle ~18" long, pencil-width\n2. Carve a fireboard flat piece — same dry wood type\n3. Cut small notch in fireboard, place bark below to catch coal\n4. Loop string of bow around spindle, press down hard, bow back-and-forth fast\n5. When smoke and ember form, transfer to tinder bundle, blow gently\n\nFlint and steel: Strike flint against hard steel at angle over dry char cloth or tinder fungus.\n\nTinder: dry grass, bark shreds, birch paper bark, dry leaves, cattail fluff, pine needles. NOT damp material.\n\nFire lay: Teepee for fast heat, log cabin for sustained burn. Keep wind in mind — fire needs oxygen from downwind side.`},
    // Wound
    { k:['wound','bleeding','bleed','cut','deep cut','laceration','blood','treat wound','bandage','stop bleeding'],
      r:`🩸 WOUND CARE — NO DOCTOR\n\n1. STOP BLEEDING first:\n   - Direct pressure: clean cloth, press hard, hold 10+ minutes. Do NOT remove — add more on top if soaked.\n   - Elevate above heart level if possible.\n   - Tourniquet (life-threatening limb bleed only): 2–3" above wound, tighten until bleeding stops, note time applied.\n\n2. CLEAN the wound (once bleeding controlled):\n   - Flush with large volume of clean water under pressure (use syringe or plastic bag with pinhole)\n   - Remove visible debris gently\n   - Do NOT close a dirty or animal-bite wound — leave open to drain\n\n3. COVER:\n   - Clean bandage or cloth\n   - Change daily, watch for infection\n\n⚠️ Infection signs (seek help): increasing redness, warmth, pus, red streaks spreading, fever, wound smells bad\n\n⚠️ Seek immediate help: spurting blood (artery), wound > 1/2" deep, exposed bone/tendon, face/hand/joint wounds`},
    // Shock
    { k:['shock','someone in shock','pale','cold sweat','fainting','collapsed','low blood pressure','shock treatment'],
      r:`🚨 TREATING SHOCK\n\nShock = body not getting enough blood to vital organs. Life-threatening.\n\nSigns: pale/gray/bluish skin, cold clammy skin, rapid weak pulse, rapid shallow breathing, confusion/anxiety, nausea, unconsciousness.\n\nIMMEDIATE STEPS:\n1. Call 911 if possible\n2. Lay person flat, legs elevated ~12" (unless head/neck/spine injury, or breathing is worse)\n3. Keep them warm — cover with blanket\n4. Do NOT give food or water\n5. Loosen tight clothing\n6. If unconscious but breathing: recovery position (on side)\n7. If not breathing: begin CPR\n\nTypes to know:\n- Hemorrhagic (blood loss): control bleeding immediately\n- Anaphylactic (allergic): epinephrine (EpiPen) if available\n- Septic (infection): fever + shock signs = emergency\n\n⚠️ Do NOT leave them alone. Monitor breathing constantly.`},
    // Burns
    { k:['burn','burned','sunburn','burn treatment','fire burn','scald','chemical burn'],
      r:`🔥 BURN TREATMENT\n\nFirst, determine severity:\n- 1st degree: red, painful, no blisters (sunburn-like)\n- 2nd degree: blisters, intense pain, wet/shiny skin\n- 3rd degree: white/brown/black, leathery, may be painless (nerve damage)\n\n1st & 2nd degree (small area):\n1. Cool with cool running water 10–20 min — NOT ice, NOT butter/toothpaste/egg white\n2. After cooling: cover loosely with clean non-stick bandage\n3. Do NOT pop blisters\n4. Pain relief: ibuprofen or acetaminophen\n\n⚠️ Seek immediate help for:\n- Any 3rd degree burn\n- Burns on face, hands, feet, genitals, joints\n- Burns > palm-size (>1% body for 2nd/3rd)\n- Chemical or electrical burns\n- Smoke inhalation (hoarse voice, soot in mouth/nose)\n\nChemical burn: flush with large amounts of water 20+ min, remove contaminated clothing (protect yourself first)`},
    // CPR
    { k:['cpr','not breathing','cardiac arrest','heart stopped','chest compressions','resuscitation','unconscious not breathing'],
      r:`❤️ CPR — QUICK GUIDE\n\nADULT/CHILD (8+):\n1. Check scene is safe. Tap shoulders: "Are you OK?"\n2. Call 911 (or send someone)\n3. No normal breathing → start CPR\n4. Heel of hand on center of chest (between nipples)\n5. 30 compressions: push down 2–2.4", rate 100–120/min (beat of "Stayin' Alive")\n6. Tilt head, lift chin, give 2 rescue breaths (1 sec each, chest should rise)\n7. Repeat 30:2 until help arrives or person recovers\n\nINFANT (under 1 yr):\n- Both thumbs on center of chest (hands wrapped around the chest), just below nipple line — or the heel of one hand\n- Compress 1.5" depth\n- 30 compressions → 2 gentle breaths\n\nCHILD (1–8):\n- 1 or 2 hands depending on child size\n- Compress 2"\n- 30:2 same ratio\n\nAED (if available): Turn on, follow voice prompts. Use as soon as possible — delivers shock before CPR if needed.\n\n🚨 Hands-only CPR (no breaths) is acceptable for adult bystander CPR — compression-only is better than nothing.`},
    // Choking
    { k:['choking','heimlich','can\'t breathe','cant breathe','cannot breathe','obstruction','throat blocked','choking adult','choking infant','choking baby'],
      r:`🫁 CHOKING\n\nADULT / CHILD (1+):\n1. Ask "Are you choking?" — if they can cough, encourage coughing\n2. If they can't speak, breathe or cough: have someone call 911\n3. Lean them forward. Give 5 firm back blows between the shoulder blades with the heel of your hand\n4. Then give 5 abdominal thrusts:\n   - Stand behind, arms around waist\n   - Fist thumb-side just above navel, below chest\n   - Grab fist with other hand\n   - Pull sharply in and up\n5. Keep alternating 5 back blows and 5 thrusts until the object comes out or they go unconscious\n6. If unconscious: lower to ground, call 911, begin CPR\n\nPregnant, or too large to reach around: give chest thrusts instead (fist on the centre of the breastbone).\n\nINFANT (under 1 yr):\n1. Face-down on forearm, head lower than chest\n2. 5 firm back blows between shoulder blades\n3. Flip face-up: heel of one hand on center of chest, 5 quick chest thrusts\n4. Check mouth — only remove object if you can SEE it\n5. Repeat until cleared or infant goes unresponsive → infant CPR\n\nIf ALONE and choking:\n- Thrust your upper abdomen against hard edge of table/chair back\n- Self-Heimlich: fist technique same as above, thrust hard`},
    // Dehydration
    { k:['dehydration','dehydrated','thirsty','no water','fluid','electrolyte','hydration','rehydrat','signs of dehydration','diarrhea','diarrhoea','vomiting','throwing up'],
      r:`💧 DEHYDRATION — SIGNS & TREATMENT\n\nSigns by severity:\n\nMild: dark urine, thirsty, slightly dry mouth, tired\nModerate: very dark/no urine, dry mouth, headache, dizziness, rapid heart rate, muscle cramps, irritability\nSevere: sunken eyes, no urine >8h, rapid breathing, confusion, can't stand — EMERGENCY\n\nChildren: sunken fontanelle (soft spot on infant head), no tears when crying, no wet diaper >6h → urgent\n\nTreatment:\n1. Drink small amounts frequently — not large gulps (can cause vomiting)\n2. Oral Rehydration Solution (ORS) if available — better than plain water\n   DIY ORS: 1 liter clean water + 6 tsp sugar + 1/2 tsp salt\n3. If vomiting: small sips every 5 min, ice chips, popsicles\n4. Rest in cool/shaded area\n5. Avoid caffeine and alcohol\n\nSurvival note:\nAdult minimum need: ~2 liters/day in mild conditions; more in heat, exertion, illness\nFood survival: 3+ weeks without food\nWater survival: 3–5 days without water (less in heat)`},
    // Shelter
    { k:['shelter','cold','hypothermia','stay warm','build shelter','stay dry','survive cold','exposure'],
      r:`🏕️ EMERGENCY SHELTER & HYPOTHERMIA\n\nHypothermia signs:\n- Mild: shivering, confusion, slurred speech, stumbling\n- Moderate: intense shivering, pale skin, confusion\n- Severe: shivering stops (bad sign), unconscious, rigid muscles\n\nHypothermia treatment:\n1. Get to shelter, out of wind and wet\n2. Remove wet clothing\n3. Cover with dry insulation (blankets, leaves, clothing layers)\n4. Warm core first (chest, groin, armpits) — not extremities\n5. Warm sweet drinks if conscious and swallowing\n6. Do NOT rub extremities (drives cold blood to core)\n7. Handle gently — rough movement can cause cardiac arrest in severe hypothermia\n\nBuilding a debris shelter:\n1. Find natural windbreak (rock face, fallen log)\n2. Lean dead branches against it at 45°\n3. Pack debris (leaves, pine needles, bark) 2–3 ft thick on sides and roof\n4. Inside: deep leaf bed 4"+ off ground for insulation\n5. Opening: face away from prevailing wind\n6. Size: just big enough to fit — smaller holds body heat better\n\nInsulation priority: ground > sides > top. Cold ground pulls heat out of your body much faster than cold air.`},
    // Signaling
    { k:['signal','rescue','i am lost','i\'m lost','we are lost','sos','signal for help','stranded','how to be found'],
      r:`📡 SIGNALING FOR RESCUE\n\nRule of Threes for signaling: 3 of anything = distress (3 whistle blasts, 3 fires, 3 gunshots)\n\nMost visible signals:\n1. Signal mirror: flash toward aircraft/horizon. Can be seen 10+ miles. Aim reflection at target, use two-finger "V" aiming sight.\n2. Ground-to-air signals (stomp in snow or lay rocks/logs, minimum 10 ft tall):\n   - X = need medical help\n   - V = need help\n   - → = going this direction\n3. Fire/smoke: 3 fires in triangle, 100 ft apart. Green or wet leaves = white smoke (shows against dark trees). Oil or rubber = black smoke (shows against snow).\n4. Whistle: 3 blasts, pause, repeat. Carries further than voice.\n5. Bright colors: lay any bright material flat in open area, contrast with background.\n\nStay put vs. move:\n- STAY if someone knows your location\n- STAY if you have shelter and water\n- MOVE only if you know exactly where help is and you have the ability`},
    // Food survival
    { k:['food','survive without food','hunger','what to eat','edible plants','foraging','rations','food storage'],
      r:`🍎 FOOD SURVIVAL\n\nSurvival priority: Water > Shelter > Signals > Food\nYou can survive 3+ weeks without food.\n\nCalorie priorities for stored food:\n1. White rice/dried beans — longest shelf life (25+ years), complete protein together\n2. Oats — cheap, 30-year shelf life\n3. Honey — never spoils\n4. Salt — essential mineral, preservative\n5. Hard candy — morale + quick energy\n\nForaging universal edibility test (for unknown plants):\n1. Avoid white/yellow berries, plants with milky sap, umbrella-shaped flowers\n2. Touch small amount to lip — wait 3 min for reaction\n3. Touch to tongue — wait 15 min\n4. Chew (don't swallow) — wait 15 min\n5. Swallow small amount — wait 8 hours\n6. If no reaction: eat a small amount, wait 8 more hours\n\nSafe universally recognized plants:\n- Cattail (roots, pollen head)\n- Dandelion (all parts)\n- Acorns (must leach tannins — boil/soak multiple times)\n- Pine needles (tea — high vitamin C)\n- Rose hips (high vitamin C)\n\n⚠️ When in doubt, don't eat it. Hunger is survivable. Poison is not.`},
    // Medical assessment
    { k:['unconscious','unresponsive','passed out','fainted','knocked out','not responding','not waking','wont wake',"won't wake",'assess','abc','airway','breathing','circulation','assess someone','first aid assessment'],
      r:`🩺 CASUALTY ASSESSMENT — ABC\n\nDanger → Response → Airway → Breathing → Circulation\n\n1. DANGER: Is the scene safe? Don't become a casualty yourself.\n\n2. RESPONSE: Tap shoulders firmly. Shout "Can you hear me?"\n   - Responds → assess and treat\n   - No response → call 911 immediately\n\n3. AIRWAY: Tilt head back, lift chin. Look in mouth for obstruction. Remove if visible.\n\n4. BREATHING: Look (chest rise), listen, feel (cheek near mouth). 10 seconds.\n   - Breathing normally → recovery position\n   - Not breathing → CPR\n   - Gasping only → treat as not breathing\n\n5. CIRCULATION: Major bleeding? Treat now: press hard on the wound. If an arm or leg keeps bleeding heavily, use a tourniquet.\n\n6. DISABILITY: Check pupils (equal? reactive to light?). Can they squeeze your hands? Move feet?\n\n7. EXPOSURE: Check for hidden injuries. Protect from cold.\n\nRecord: What happened, time of injury, any medications, allergies. Tell emergency services when they arrive.`},
    // Morse code
    { k:['morse','morse code','sos'],
      r:`📻 MORSE CODE — SOS & ESSENTIALS\n\nSOS: · · · — — — · · · (3 short, 3 long, 3 short)\nThis is THE universal distress signal. Any medium — light, sound, radio, tapping.\n\nBasic letters:\nA ·—   B —···  C —·—·  D —··   E ·\nF ··—·  G ——·   H ····   I ··    J ·———\nK —·—  L ·—··  M ——    N —·    O ———\nP ·——·  Q ——·—  R ·—·   S ···    T —\nU ··—   V ···—   W ·——   X —··—  Y —·——  Z ——··\n\nNumbers:\n1 ·———— 2 ··——— 3 ···——  4 ····— 5 ·····\n6 —···· 7 ——··· 8 ———·· 9 ————· 0 —————\n\nTiming: dot = 1 unit, dash = 3 units, space between letters = 3 units, space between words = 7 units`},
    // Radio
    { k:['radio','communicate','frequency','walkie','ham radio','baofeng','radio frequencies'],
      r:`📡 EMERGENCY RADIO GUIDE\n\nFREQUENCIES TO KNOW:\n- 162.400–162.550 MHz — NOAA Weather Radio (listen only; 7 channels)\n- 462.675 MHz — GMRS channel 20, widely used for emergency and traveler calling (GMRS license required to transmit)\n- 155.160 MHz — commonly used for search and rescue\n- 156.800 MHz (Channel 16) — Marine distress & calling\n- 121.5 MHz — Aviation emergency (guard frequency)\n- GMRS/FRS (family radios): 462–467 MHz range\n\nTransmitting without a license:\nFCC rules allow any means of radio communication only when human life or property is in immediate danger and no other way to call for help is available. Listening never needs a license.\n\nMESSAGE FORMAT (when radio works but conditions poor):\n- Say callsign/name\n- Say location (GPS or landmark)\n- Say situation briefly\n- Repeat 3 times\n- Listen 2× as long as you transmit\n\nBATTERY CONSERVATION:\n- Scan mode instead of monitoring\n- Lower power setting at close range\n- Charge via solar/hand-crank in power outage\n\nSee ARK's Radio tab for the Morse code trainer and frequency logger.`},
    // General emergency
    { k:['power outage','power cut','power is out','power went out','blackout','grid down','no power','hurricane','disaster'],
      r:`🚨 GENERAL EMERGENCY PROTOCOL\n\nFIRST 60 SECONDS:\n1. Is anyone injured? Life safety first\n2. Is there immediate danger? (fire, gas, structure damage)\n3. 911 if phone works\n\nFIRST 24 HOURS:\n- Shelter in place unless ordered to evacuate\n- Gather: water, food, medications, documents, phone charger\n- Tune to emergency broadcast radio\n- Tell your household you are safe (ARK messages work if you have joined an ARK Hub)\n- Charge all devices now if power is intermittent\n\nUTILITY SAFETY:\n- Gas smell → leave immediately, don't flip switches, call utility from outside\n- Downed power line → stay at least 35 feet (10 metres) away, never touch, treat as live\n- Water main break → turn off at house valve\n\nFOOD SAFETY in outage:\n- Fridge: safe 4 hours if closed\n- Freezer: safe 24–48 hours if closed (full freezer = longer)\n- When in doubt, throw it out\n\nEVACUATION bag (72-hour kit):\nWater 1 gallon (about 4 liters) per person per day — carry what you can and a way to purify more, food 3 days, first aid kit, medications 1 week, flashlight, radio, documents (ID/insurance), cash small bills, phone charger, warm layers, map (paper)`},
    // Hypothermia in water
    { k:['water rescue','cold water','fallen in water','fell in water','water immersion'],
      r:`🌊 COLD WATER SURVIVAL\n\nCold water (below 70°F) incapacitation:\n- 32°F: unconscious in 15 min, dead in 15–45 min\n- 50°F: exhausted/unconscious 1–2h\n- 60°F: exhausted/unconscious 2–7h\n\nIf YOU fall in:\n1. Don't panic — involuntary gasp reflex passes in 60–90 seconds\n2. Keep head above water, control breathing\n3. HELP position (Heat Escape Lessening Position): cross arms tight on chest, knees up — reduces heat loss 50%\n4. DON'T swim to exhaustion — HELP or treading is better if you can't reach shore quickly\n5. Get OUT of the water as fast as possible — even lying on ice is better\n\nIf YOU rescue someone:\n1. Reach → Throw → Row → Go (last resort: go in)\n2. Horizontal extraction — don't stand them up (blood pressure crash)\n3. Treat for hypothermia (see Shelter section)\n4. Watch for cardiac arrhythmia — handle gently`},
    // Navigation
    { k:['navigate','lost','find direction','north','compass','stars','navigation','which way','orient','landmark'],
      r:`🧭 NAVIGATION WITHOUT TOOLS\n\n**Finding North:**\n- Sun method: Sun rises roughly East, sets roughly West. At noon (solar), shadows point North (N hemisphere) or South (S hemisphere).\n- Watch method (N hemisphere): Hold watch flat, point hour hand at sun. Bisect angle between hour hand and 12 — that line points South.\n- Night: Find Polaris (North Star) — follow the two outer stars of the Big Dipper's cup 5× their distance; Polaris is due North within 1°.\n- Shadow tip method: Push stick in ground, mark shadow tip, wait 15 min, mark again. First mark = West, second = East, line between = East-West.\n\n**When lost:**\n1. STOP — don't wander further\n2. Think — retrace your mental steps\n3. Observe — high ground, water flow direction, sun position\n4. Plan — follow water downstream (leads to civilization)\n\n**Terrain reading:**\n- Water flows downhill to civilization\n- Aircraft noise, roads, power lines → follow toward them\n- North-facing slopes (N hemisphere) = shadier, denser vegetation\n- Remember: 3 of anything = distress signal if you need rescue instead`},
    // Psychological / Mental Health
    { k:['panic','anxiety','stress','fear','mental','psychological','calm down','overwhelmed','trauma','cope','panic attack','morale'],
      r:`🧠 PSYCHOLOGICAL FIRST AID\n\n**Acute panic / panic attack:**\n1. Ground yourself: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.\n2. Box breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4–6 cycles.\n3. Cold water on wrists/face activates the dive reflex — slows heart rate fast.\n4. Physical movement (walking, rhythmic activity) burns off stress hormones.\n\n**During sustained crisis:**\n- Routine is stabilizing: regular sleep, meals, tasks — even if imperfect.\n- Information diet: check updates once/twice daily, not constantly.\n- Assign roles: purpose reduces helplessness.\n- Normalize reactions: fear and anxiety are rational responses, not weakness.\n- Focus on what you can control, explicitly let go of what you can't.\n\n**Helping others in crisis:**\n- Calm presence: speak slowly, stay close, make eye contact.\n- Don't say "calm down" — say "I'm here, you're safe, we're handling this."\n- Children: physical contact + simple true information — silence and secrecy worsen fear.\n- Watch for: withdrawal, rage, refusal to eat, talk of hopelessness → needs professional help when available.\n\n**Morale basics:** Sleep > food > warmth > human connection. All four matter.`},
    // Security
    { k:['security','protect','defend','safe','intruder','threat','looter','guard','watch','perimeter','safety'],
      r:`🔒 SECURITY IN A CRISIS\n\n**Immediate threat assessment:**\n1. Lock and secure entry points — doors, windows, gates.\n2. Establish a rally point if the household is separated.\n3. Designate a safe room (interior room, no windows, hardened door).\n4. Check in with neighbors — mutual aid increases collective security.\n\n**Layered awareness:**\n- Outer perimeter: know who is approaching before they reach your door.\n- Middle: lighting at night deters opportunistic threats.\n- Inner: know your exits, have a plan if you must leave fast.\n\n**De-escalation first:**\n- Most threats in disaster are opportunistic, not violent — firm, calm boundary-setting often works.\n- Display of a group (multiple people visible) is a deterrent.\n- Avoid openly displaying high-value resources.\n\n**Communication:**\n- Establish check-in times with household members.\n- Code words for "I'm in danger" vs. "I'm safe."\n- Document strangers at your location if rule-of-law is uncertain.\n\n⚠️ In any situation involving an armed threat: compliance and escape are safer than confrontation. Property is replaceable.`},
    // Evacuation
    { k:['evacuate','evacuation','bug out','leave home','go bag','72 hour','emergency kit','flee','leave now','forced to leave'],
      r:`🚗 EVACUATION — QUICK GUIDE\n\n**Go/No-Go decision:**\n- GO if: official evacuation order issued, structural threat to shelter, fire within 1 mile, rising water, toxic hazard nearby.\n- STAY if: no order issued, safer than roads, dependent household members can't travel.\n\n**72-Hour Bug-Out Bag (per person):**\n- Water: as much as you can carry (aim for 1 gallon / 4 liters per day) + purification tabs/filter\n- Food: 3 days non-perishable, 2000 cal/day\n- First aid kit + 1-week medications\n- Copies of ID, insurance, contacts (waterproof bag)\n- Cash in small bills (ATMs may be down)\n- Phone charger + battery bank\n- Flashlight + extra batteries\n- Warm layers + rain poncho\n- Whistle, knife, duct tape\n- Paper map of your region\n\n**Before leaving:**\n1. Tell someone your destination and route.\n2. Turn off gas, water or electricity only if officials tell you to. Unplug appliances if there is time.\n3. Take pets and medications — these are hard to replace.\n4. Lock doors and windows.\n5. Take one photo of each room for insurance claims.\n\n**On the road:**\n- Use official evacuation routes — shortcuts may be blocked.\n- Keep fuel above half-tank during crisis periods.\n- If roads are jammed and you are not in immediate danger, a nearby shelter can be safer than sitting in traffic.`},
    // Tools & improvised equipment
    { k:['tools','equipment','improvise','make do','no tools','knife','rope','cord','tarp','duct tape','paracord','improvised'],
      r:`🔧 IMPROVISED TOOLS & EQUIPMENT\n\n**Essential multi-use items to have:**\n- Duct tape — repairs, splints, shelter patching, blister prevention, cordage\n- Paracord — shelter lines, tourniquets, clothesline, tripwire alarm, fishing line (inner strands)\n- Tarp — shelter roof, ground cloth, water collection funnel, stretcher\n- Garbage bags — waterproofing, rain poncho, water storage, signal (orange/yellow)\n- Bandana — dust mask, bandage, water pre-filter, signal, cooling\n\n**Improvised tools:**\n- Knife from broken glass (flint-knapping technique or smash bottle to get edge)\n- Shovel from flat board or hub cap\n- Hammer from heavy rock\n- Rope from strips of clothing braided 3-strand\n- Water container from large plastic bag tied at top\n- Candle from fat/grease + twisted cloth wick in a tin can\n\n**Knife safety (improvised):**\n- Always cut away from body\n- Secure workpiece before cutting\n- Never catch a falling blade\n\n**Friction fire tools need:** dry wood, the right species (cottonwood, willow, cedar, basswood), and patience. If wood feels cold or won't powder, it's too moist — find drier material.`},
    // Heart attack
    { k:['heart attack','chest pain','chest pressure','heart','cardiac','jaw pain','arm pain','heart attack signs','myocardial'],
      r:`❤️ HEART ATTACK — ACT FAST\n\nWarning signs (can appear together or alone):\n- Chest pain, pressure, squeezing, or fullness — may come and go\n- Pain spreading to arm (usually left), shoulder, neck, jaw, or back\n- Shortness of breath (with or without chest discomfort)\n- Cold sweat, nausea, lightheadedness\n- Women often have atypical symptoms: jaw pain, nausea, fatigue without chest pain\n\nIMMEDIATE STEPS:\n1. Call 911 NOW — do not drive yourself\n2. Chew one adult aspirin (325mg) or 4 baby aspirin (81mg each) — if not allergic and no bleeding disorder. Chew, don't swallow whole.\n3. Sit or lie down in most comfortable position — do not exert\n4. Loosen tight clothing\n5. If prescribed nitroglycerin, take as directed\n6. If person becomes unconscious and stops breathing → CPR\n\n⚠️ Time is muscle. Every minute without treatment destroys heart tissue. Even if unsure — call 911.`},
    // Stroke
    { k:['stroke','face drooping','arm weakness','speech slurred','fast test','stroke signs','brain attack','tia','facial droop'],
      r:`🧠 STROKE — FAST ACTION\n\nF.A.S.T. Test:\n- **Face**: Ask to smile — one side droops?\n- **Arms**: Raise both arms — one drifts down?\n- **Speech**: Repeat a simple phrase — slurred or strange?\n- **Time**: Call 911 immediately if any sign is present\n\nOther signs:\n- Sudden severe headache with no known cause ("worst headache of my life")\n- Sudden confusion, trouble understanding\n- Sudden vision problem in one or both eyes\n- Sudden trouble walking, dizziness, loss of balance\n\nSTEPS:\n1. Call 911 immediately — note time symptoms started\n2. Do NOT give food, water, or aspirin (stroke may be hemorrhagic)\n3. Lay person on their side if vomiting\n4. Keep them calm, still, and warm\n5. CPR if breathing stops\n\n⚠️ Stroke treatment ("clot-buster" drug tPA) MUST be given within 3–4.5 hours. Every minute counts.`},
    // Anaphylaxis
    { k:['anaphylaxis','anaphylactic','allergic reaction','severe allergy','epipen','epinephrine','throat closing','hives','bee sting allergy','food allergy reaction'],
      r:`🚨 ANAPHYLAXIS — LIFE-THREATENING ALLERGIC REACTION\n\nSigns (appear within seconds to 30 min of exposure):\n- Hives, itching, flushed or pale skin\n- Swelling of throat/tongue (stridor = high-pitched breathing)\n- Drop in blood pressure, weak/rapid pulse\n- Nausea, vomiting, diarrhea\n- Dizziness, fainting\n- Sense of doom\n\nIMMEDIATE STEPS:\n1. Call 911\n2. Administer epinephrine (EpiPen) immediately if available:\n   - Remove blue safety cap\n   - Press orange tip firmly against outer mid-thigh (can go through clothing)\n   - Hold it in place for as long as the label says (3 to 10 seconds, depending on the brand)\n   - Note time — second dose can be given after 5–15 min if needed\n3. Lay person flat, legs elevated — unless breathing is worse (then sitting up)\n4. If unconscious and not breathing → CPR\n5. Even if symptoms improve after EpiPen → still go to ER (can return in 4–8h)\n\nAfter epinephrine: antihistamines (Benadryl) and steroids help but do NOT replace epinephrine.\n\n⚠️ Do NOT use antihistamines alone — anaphylaxis requires epinephrine.`},
    // Snake/animal bite
    { k:['snake','snake bite','snakebite','bitten by snake','venomous','spider bite','animal bite','dog bite','bite wound','rabies'],
      r:`🐍 BITES — SNAKE, ANIMAL & SPIDER\n\n**Snake bite:**\n1. Move away from the snake — do not try to catch or kill it\n2. Keep victim calm and still — movement spreads venom\n3. Remove rings/watches/tight items near bite (swelling comes fast)\n4. Keep bitten limb below heart level\n5. Mark edge of swelling with pen every 15 min to track spread\n6. Call Poison Control: 1-800-222-1222 (US)\n7. Get to hospital ASAP — antivenom is the only effective treatment\n\n❌ Do NOT: suck venom, apply tourniquet, cut the wound, apply ice, give alcohol\n\n**Dog/animal bite:**\n1. Wash wound thoroughly with soap and water for 5 min\n2. Apply gentle pressure to control bleeding\n3. Cover with clean bandage\n4. Seek medical care — rabies post-exposure shots may be needed if animal unknown/acting strangely\n5. Report bite to animal control if stray or wild animal\n\n**Spider bite (black widow/brown recluse):**\n- Black widow: muscle cramps, sweating, nausea → ER\n- Brown recluse: expanding skin lesion over hours → ER\n- Keep area clean, cold pack for pain, don't scratch`},
    // Poisoning
    { k:['poison','poisoning','overdose','swallowed','toxic','ingested chemicals','poison control','accidental ingestion','drug overdose'],
      r:`☠️ POISONING / OVERDOSE\n\nCall Poison Control FIRST: **1-800-222-1222** (US, 24/7, free, multilingual)\nOr 911 if person is unconscious or not breathing.\n\n**General principles:**\n1. Try to identify the substance: name, amount, time ingested\n2. Do NOT induce vomiting unless Poison Control specifically tells you to\n3. Do NOT give milk or water unless instructed\n4. If skin/eye contact: flush with large amounts of water for 15–20 min\n5. If inhaled: get person to fresh air immediately\n\n**Signs of serious poisoning:**\n- Difficulty breathing, seizures, unconsciousness, lips turning blue\n- Severe vomiting, burning in mouth/throat\n- Hallucinations, extreme confusion\n\n**Drug overdose (opioid) — Naloxone (Narcan):**\n1. Lay on back, tilt head to open airway\n2. Administer nasal Narcan: 1 spray in one nostril\n3. If no response in 2–3 min, repeat in other nostril\n4. Recovery position if breathing; CPR if not breathing\n5. Effects last 30–90 min — if drug outlasts Narcan, they can re-overdose; stay until EMS arrives`},
    // Broken bones / fractures
    { k:['broken bone','fracture','sprain','broken ankle','broken finger','broken foot','broken hand','broken rib','broken nose','broken hip','is broken','broke my','broke his','broke her','twisted ankle','broken arm','broken leg','dislocated','dislocation','broken wrist','splint','immobilize'],
      r:`🦴 FRACTURES & DISLOCATIONS\n\n**Signs of fracture:**\n- Pain, swelling, bruising at site\n- Deformity (limb looks wrong)\n- Inability to bear weight or use limb\n- Crepitus (grating/crunching when moved)\n\n**Fracture first aid:**\n1. Immobilize in the position found — do not straighten unless circulation cut off\n2. Splint: use rigid objects (boards, rolled magazine, sticks) padded with cloth, secured above and below the fracture\n3. Check circulation: pulse, feeling, and movement below the injury (before and after splinting)\n4. Elevate if possible to reduce swelling\n5. Ice pack (not directly on skin) for 20 min on/20 min off\n6. Seek medical care for all suspected fractures\n\n**When it's an emergency:**\n- Open fracture (bone through skin): cover with clean cloth, do NOT push bone back, 911\n- Suspected spine/neck fracture: do NOT move person, call 911, stabilize head\n- Signs of circulatory compromise (blue/cold/numb below fracture): 911 immediately\n\n**Dislocations:**\n- Do NOT try to put back yourself unless trained — can damage nerves/blood vessels\n- Immobilize as found, ice, seek medical care`},
    // Frostbite
    { k:['frostbite','frozen','frostbitten','frozen fingers','frozen toes','frozen skin','cold injury','numb cold'],
      r:`❄️ FROSTBITE\n\nStages:\n- Frostnip: red, painful, numb but pliable — full recovery with rewarming\n- Superficial frostbite: waxy/white/gray, numb, stiff surface but soft below\n- Deep frostbite: hard, wooden feel, can't feel it at all — tissue death risk\n\n**Rewarming — do only if no refreezing risk:**\n1. Get to warm shelter\n2. Remove wet clothing and jewelry from affected area\n3. Rewarm in warm water, 98–102°F (37–39°C) — warm, never hot; test with an unaffected hand\n4. 15–30 min until skin becomes pink and pliable — this will be painful\n5. After thaw: loosely wrap with sterile gauze, separate toes/fingers\n6. Do NOT rub the area — causes ice crystal damage\n7. Do NOT walk on thawed frostbitten feet — refreezing is catastrophic\n8. Do NOT use direct heat (fire, heating pad, hot water bottle)\n\n⚠️ If you cannot guarantee no refreezing: delay rewarming (walking on frozen feet is safer than refreezing thawed tissue)\n⚠️ Blisters will form 1–2 days after thawing — do not break them, seek medical care`},
    // Heat stroke
    { k:['heat stroke','heatstroke','sunstroke','heat exhaustion','overheating','hyperthermia','heat emergency','hot environment','too hot','heat illness'],
      r:`🌡️ HEAT EMERGENCIES\n\n**Heat exhaustion** (warning stage):\nSigns: heavy sweating, cool/pale/clammy skin, fast/weak pulse, nausea, dizziness, muscle cramps, weakness\nTreatment: move to cool area, lie down, loosen clothing, cool wet cloths on skin, sip water if conscious, fan them\n\n**Heat stroke** (emergency — life-threatening):\nSigns: HIGH body temp (103°F+/39°C+), hot/red/dry OR damp skin, rapid/strong pulse, confusion, possible unconsciousness\n\n**Heat stroke STEPS:**\n1. Call 911 immediately\n2. Move to cool environment\n3. Cool rapidly — FAST — using ANY method:\n   - Cold water immersion (most effective)\n   - Ice packs to neck, armpits, groin (high blood flow areas)\n   - Cold wet sheets\n   - Fanning while misting with cool water\n4. Do NOT give fluids if confused or unconscious\n5. Keep cooling until body temp drops to 101–102°F\n\n**High-risk groups**: elderly, young children, athletes, outdoor workers, people on diuretics/antihistamines/antidepressants`},
    // Gas leak / carbon monoxide
    { k:['gas leak','natural gas','gas smell','smell gas','smell of gas','smells like gas','carbon monoxide','co detector','co poisoning','gas emergency','propane leak'],
      r:`⚠️ GAS LEAK & CARBON MONOXIDE\n\n**Natural gas leak (rotten egg smell):**\n1. Do NOT flip light switches, use phone, or create any spark\n2. Leave immediately — leave door open, do not lock\n3. Get everyone out including pets\n4. Call 911 and gas company from outside / neighbor's phone\n5. Do not re-enter until utility clears the building\n\n**Carbon monoxide (CO) — odorless, invisible:**\nSigns: headache, dizziness, nausea, confusion, weakness — often affects everyone in the building simultaneously\n1. Get to fresh air immediately\n2. Leave door open, do not go back in\n3. Call 911 from outside\n4. Anyone with severe symptoms → ER (CO poisoning needs oxygen treatment)\n5. Do NOT re-enter until fire dept/utility clears with instruments\n\n**CO sources:** malfunctioning furnace, generator, gas appliance, car in garage, blocked chimney\n\n⚠️ Running a generator or gas appliance inside KILLS. 20 ft from any opening minimum.\n\n**Prevention:**\n- CO detector on every level, replace every 5–7 years\n- Never warm up vehicles in an attached garage\n- Annual furnace/appliance inspection`},
    // Earthquake
    { k:['earthquake','tremor','shaking','quake','aftershock','seismic','during earthquake'],
      r:`🌍 EARTHQUAKE — DURING AND AFTER\n\n**During shaking:**\n1. DROP to hands and knees — protects from knockdown\n2. COVER under sturdy table/desk, or against interior wall away from windows\n3. HOLD ON and cover head/neck with arms\n4. Stay inside — most injuries happen when people run outside (falling glass, debris)\n5. If in bed: stay there, cover head with pillow\n6. If outside: move away from buildings, power lines, trees; drop and cover\n7. If in a car: pull over away from buildings/power lines, stay inside until shaking stops\n\n**After shaking stops:**\n1. Check yourself and others for injury\n2. Gas smell → evacuate building (see gas leak protocol)\n3. Check for structural damage before moving around\n4. Expect aftershocks — another drop/cover ready\n5. Do NOT use elevators\n6. Listen to emergency broadcasts for instructions\n7. Text instead of call — networks are overloaded\n\n**Avoid:**\n- Damaged buildings\n- Downed power lines\n- Areas near rivers/coast (tsunami risk after major quake)\n- Using generators/grills indoors after power failure`},
    // Power / communications
    { k:['generator','solar','battery','charge phone','power bank','communication','radio setup','stay in touch','family contact','out of contact'],
      r:`⚡ POWER & COMMUNICATIONS IN A CRISIS\n\n⚠️ Generator: run it outdoors only, at least 20 feet (6 metres) from doors, windows and vents. Never in a garage or basement. The exhaust (carbon monoxide) has no smell and can kill.\n\n**Power priorities:**\n1. Medical devices (CPAP, insulin fridge) — first protected\n2. Communication (phone, radio)\n3. Lighting\n4. Heating/cooling\n\n**Charging without grid:**\n- Car charger: engine running, charge via 12V outlet. 30 min = 20–30% phone charge. Keep fuel in mind.\n- Solar panel (even basic 20W): charges phone in 2–4h direct sun.\n- Hand-crank radio/charger: emergency use only — 1 min cranking ≈ 2 min radio.\n- Battery banks: a 20,000 mAh bank charges a phone ~5 times.\n\n**Communication priorities:**\n1. Texts before calls — texts route through congested networks more reliably.\n2. Social media check-in features (Facebook Safety Check, Google Crisis).\n3. Out-of-area contact: designate one person outside the disaster zone as the family relay.\n4. NOAA Weather Radio (162.400–162.550 MHz) — continuous broadcast, battery-powered.\n5. Shortwave/ham: for regional communication when cell towers are down.\n\n**When all else fails:**\n- Written note left at home (where I went, when I left, route taken)\n- Pre-arranged meeting point (know it before the crisis)\n- Whistle signals: 1 blast = OK, 3 blasts = help needed`},
  ];

  /* ── Utility functions ───────────────────────────────────── */
  const MODE_LITE = 'Halo — works offline';
  const TOPICS = '• Bleeding, wounds & burns\n• CPR & choking\n• Heart attack, stroke & severe allergic reaction\n• Shock, seizures & poisoning\n• Broken bones, head injuries, bites & stings\n• Heat stroke, hypothermia & frostbite\n• Safe drinking water & dehydration\n• Fire, gas leaks & carbon monoxide\n• Earthquake, tsunami, flood, tornado, power outage & evacuation\n• Shelter, fire starting & signaling for rescue\n• Staying calm & helping others cope\n• How ARK works with no internet';

  function _icon(name) {
    return `<svg class="hi" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  function _setBadge(text, cls) {
    const b = document.getElementById('ai-status-badge');
    if (b) { b.textContent = text; b.className = 'badge ' + (cls || 'badge-muted'); }
  }

  function _setModePill(text, cls) {
    const p = document.getElementById('halo-mode-badge');
    if (p) { p.textContent = text; p.className = 'badge font-xs ai-mode-pill ' + (cls || 'badge-green'); }
  }

  function _setProgress(pct, label, totalMB) {
    const bar = document.getElementById('ai-progress-bar');
    const pctEl = document.getElementById('ai-progress-pct');
    const labelEl = document.getElementById('ai-progress-label');
    const mbEl = document.getElementById('ai-progress-mb');
    if (bar) bar.style.width = Math.min(100, pct) + '%';
    if (pctEl) pctEl.textContent = Math.round(pct) + '%';
    if (labelEl && label) labelEl.textContent = label;
    if (mbEl && totalMB && pct > 0) {
      const downloaded = ((pct / 100) * totalMB).toFixed(0);
      mbEl.textContent = `${downloaded} / ${totalMB} MB`;
    }
  }

  function _getModelSizeMB(modelId) {
    if (!modelId) return 650;
    if (modelId.includes('3B')) return 1800;
    if (modelId.includes('TinyLlama') || modelId.includes('1.1B')) return 580;
    return 650; // 1B default
  }

  // A picture character (emoji) at the very start of a line. Built with new RegExp inside
  // try/catch so an old browser can never fail to load this file because of it.
  let _PICTO = null;
  try { _PICTO = new RegExp('^(?:[\\u2300-\\u27BF\\u2B00-\\u2BFF]|[\\uD83C-\\uD83E][\\uDC00-\\uDFFF])[\\uFE0F\\u200D]*\\s*'); } catch (_) {}

  /* Basic markdown renderer — safe: everything is HTML-escaped first, then only
     the few tags below are added. Leading emoji become calm line icons (or are dropped). */
  function _renderMarkdown(text) {
    // Escape any HTML in text first (defensive, since Halo's stored answers
    // are hardcoded, but Halo+ could echo user content)
    const esc = String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Split into blocks separated by blank lines first to handle paragraphs vs lists
    const lines = esc.split('\n');
    const out = [];
    let inList = false;
    let listOrdered = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let lead = '';
      const pm = _PICTO ? line.match(_PICTO) : null;
      if (pm) {
        line = line.slice(pm[0].length);
        if (/^(?:⚠|🚨)/.test(pm[0])) lead = _icon('alert') + ' ';
        else if (/^❌/.test(pm[0])) lead = _icon('x') + ' ';
      }
      // Bold: **text** or __text__
      let processed = line
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>');
      // The first line of a stored answer is its heading (written in capitals)
      if (i === 0 && line.length < 90 && /[A-Z]/.test(line) && line === line.toUpperCase()) {
        processed = '<strong>' + processed + '</strong>';
      }

      const orderedMatch = processed.match(/^(\d+)\. (.+)/);
      const indentBullet = processed.match(/^   [•\-] (.+)/);  // indented sub-bullets (check before top-level)
      const bulletMatch = !indentBullet && processed.match(/^[•\-] (.+)/);

      if (indentBullet) {
        // A sub-point under a numbered step: show a dot, never a number
        if (!inList) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = false; }
        out.push(`<li style="margin:2px 0;margin-left:12px;list-style:disc">${indentBullet[1]}</li>`);
      } else if (orderedMatch) {
        if (inList && !listOrdered) { out.push('</ul>'); inList = false; }
        if (!inList) { out.push('<ol style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = true; }
        // value= keeps the real step number even when sub-points or text split the list
        out.push(`<li value="${orderedMatch[1]}" style="margin:2px 0">${orderedMatch[2]}</li>`);
      } else if (bulletMatch) {
        if (inList && listOrdered) { out.push('</ol>'); inList = false; }
        if (!inList) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); inList = true; listOrdered = false; }
        out.push(`<li style="margin:2px 0">${bulletMatch[1]}</li>`);
      } else {
        if (inList) { out.push(listOrdered ? '</ol>' : '</ul>'); inList = false; }
        if (processed === '') {
          out.push('<br>');
        } else {
          out.push(lead + processed);
          out.push('<br>');
        }
      }
    }
    if (inList) { out.push(listOrdered ? '</ol>' : '</ul>'); }

    return out.join('\n');
  }

  function _formatTime() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /* Copy text. navigator.clipboard is missing when ARK is opened as a file or
     from a local hub over plain http, so always fall back to the old method. */
  function _copyText(text, btn) {
    const reset = () => { btn.innerHTML = _icon('copy') + ' Copy'; };
    const done = () => { btn.innerHTML = _icon('check') + ' Copied'; setTimeout(reset, 1500); };
    const failed = () => Toast.show('Could not copy. Press and hold the text to select it instead.', 'warning', 5000);
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        if (ok) done(); else failed();
      } catch (_) { failed(); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fallback);
      } else fallback();
    } catch (_) { fallback(); }
  }

  /* Timestamp + Copy button under one of Halo's answers. getText is a function so a
     streaming answer always copies its latest text. */
  function _addMeta(div, getText, timeLabel) {
    const ts = document.createElement('div');
    ts.className = 'ai-msg-ts';
    ts.textContent = timeLabel ? 'Halo · ' + timeLabel : 'Halo';
    div.appendChild(ts);
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'ai-copy-btn';
    // Always visible (phones have no hover) and big enough to tap
    copyBtn.style.cssText = 'position:static;opacity:1;display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:6px 10px;font-size:12px;min-height:36px';
    copyBtn.innerHTML = _icon('copy') + ' Copy';
    copyBtn.setAttribute('aria-label', 'Copy this answer');
    copyBtn.onclick = () => _copyText(getText(), copyBtn);
    div.appendChild(copyBtn);
  }

  function _appendMsg(role, rawText, extraClass = '') {
    const container = document.getElementById('ai-messages');
    if (!container) return null;
    rawText = String(rawText == null ? '' : rawText);
    const restored = extraClass.includes('restored'); // re-drawn from a saved chat: the real time is not known
    const div = document.createElement('div');
    const cls = role === 'user' ? 'ai-msg-user' : role === 'system' ? 'ai-msg-sys' : 'ai-msg-ai';
    div.className = 'ai-msg ' + cls + (extraClass ? ' ' + extraClass : '');

    if (role === 'assistant' && !extraClass.includes('thinking')) {
      // Render markdown for Halo's answers
      div.innerHTML = _renderMarkdown(rawText);
      _addMeta(div, () => rawText, restored ? '' : _formatTime());
    } else if (role === 'assistant' && extraClass.includes('thinking')) {
      // Thinking bubble: animated dots via CSS ::after
      div.textContent = 'Thinking';
    } else if (role === 'system') {
      div.textContent = rawText;
      div.style.whiteSpace = 'pre-wrap';
    } else {
      // User messages — safe textContent
      div.textContent = rawText;
      div.style.whiteSpace = 'pre-wrap';
      // Add timestamp for user messages too
      const ts = document.createElement('div');
      ts.className = 'ai-msg-ts ai-msg-ts-user';
      ts.textContent = restored ? 'You' : 'You · ' + _formatTime();
      div.appendChild(ts);
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  /* Show a finished answer in the "Thinking" bubble. */
  function _fillAnswer(bubble, getText, timeLabel) {
    if (!bubble) return;
    bubble.classList.remove('thinking');
    bubble.innerHTML = _renderMarkdown(getText());
    _addMeta(bubble, getText, timeLabel);
    const c = document.getElementById('ai-messages');
    if (c) c.scrollTop = c.scrollHeight;
  }

  /* When Halo has no stored answer but some guides look related, add one-tap buttons
     that open those guides, so the person does not have to go and search for them. */
  function _addGuideLinks(bubble, guides) {
    if (!bubble || !guides || !guides.length) return;
    if (typeof UI === 'undefined' || typeof Guides === 'undefined') return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:8px';
    guides.forEach(g => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn btn-secondary btn-sm';
      b.style.textAlign = 'left';
      b.innerHTML = _icon('guides') + ' ';
      b.appendChild(document.createTextNode('Open guide: ' + g.title));
      b.onclick = () => {
        try { UI.switchTab('survival'); Guides._openBySlug(g.slug); }
        catch (_) { Toast.show('Could not open that guide. Tap Guides in the bar at the bottom and search for it.', 'warning', 6000); }
      };
      row.appendChild(b);
    });
    const ts = bubble.querySelector('.ai-msg-ts');
    if (ts) bubble.insertBefore(row, ts); else bubble.appendChild(row);
  }

  /* ── Context badge helpers ───────────────────────────────── */
  const CTX_LABELS = { medical:'Medical', inventory:'Supplies', household:'Household', situation:'Situation' };

  function _updateCtxBadges() {
    for (const key of Object.keys(CTX_LABELS)) {
      const btn = document.getElementById('ai-ctx-btn-' + key);
      if (btn) btn.setAttribute('aria-pressed', _injectedCtx[key] ? 'true' : 'false');
    }
    const row = document.getElementById('ai-ctx-badges');
    if (!row) return;
    row.innerHTML = '';
    const active = Object.keys(CTX_LABELS).filter(k => _injectedCtx[k]);
    if (!active.length) return;
    const lead = document.createElement('span');
    lead.className = 'font-xs text-muted';
    lead.textContent = 'Halo is using your:';
    row.appendChild(lead);
    for (const key of active) {
      const span = document.createElement('span');
      span.className = 'ai-ctx-badge active';
      span.textContent = CTX_LABELS[key];
      row.appendChild(span);
    }
  }

  /* ── History persistence ─────────────────────────────────── */
  function _saveHistory() {
    // Use Store wrapper so private-browsing fallback and quota handling are respected
    Store.set(HISTORY_KEY, _history.slice(-MAX_HISTORY));
    Store.set(CTX_KEY, _injectedCtx);
  }

  function _loadHistory() {
    try {
      const h = Store.get(HISTORY_KEY, null);
      // Drop anything that is not a normal chat entry, so damaged saved data can never break the chat
      if (Array.isArray(h)) _history = h.filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'));
      const c = Store.get(CTX_KEY, null);
      if (c && typeof c === 'object' && !Array.isArray(c)) _injectedCtx = c;
    } catch(_) { _history = []; _injectedCtx = {}; }
  }

  /* ── Restore persisted chat into DOM ─────────────────────── */
  function _restoreChat() {
    _loadHistory();
    _updateCtxBadges();
    const shown = _history.filter(m => !(m.role === 'user' && m.content.startsWith('[CONTEXT'))); // skip injected ctx
    if (!shown.length) return;
    const container = document.getElementById('ai-messages');
    if (!container) return;
    // Clear the static welcome message
    container.innerHTML = '';
    for (const msg of shown) _appendMsg(msg.role, msg.content, 'restored');
  }

  /* ── Halo's stored answers: keyword match ────────────────── */
  const _kwRe = {};
  // A keyword only counts at the start of a word, so "cut" does not fire on "execute",
  // "rope" on "property", or "stroke" on "heatstroke". Word endings still match ("burn" → "burned").
  function _hasKw(q, kw) {
    let re = _kwRe[kw];
    if (!re) re = _kwRe[kw] = new RegExp('(?:^|[^a-z0-9])' + kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return re.test(q);
  }

  function _kbMatch(query) {
    // Phones type curly apostrophes (can’t); the keywords use straight ones
    const q = String(query || '').toLowerCase().replace(/[‘’]/g, "'");
    // "How ARK works" shares words like "internet" and "messages" with real emergencies
    // ("no internet, how do I purify water"). Unless ARK or the hub is named, it only answers
    // when nothing else matches.
    const aboutArk = /(?:^|[^a-z0-9])(?:ark|hub|halosuite)(?![a-z0-9])/.test(q);
    let best = null, bestScore = 0, spare = null, spareScore = 0;
    for (const entry of KB) {
      let score = 0;
      for (const kw of entry.k) {
        if (_hasKw(q, kw)) score += kw.length; // longer match = more specific
      }
      if (entry.low && !aboutArk) { if (score > spareScore) { spareScore = score; spare = entry; } continue; }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    if (bestScore > 0 && best) return best.r;
    return (spareScore > 0 && spare) ? spare.r : null;
  }

  let _related = []; // guides named in the last "no stored answer" reply

  function _liteResponse(query) {
    _related = [];
    const hit = _kbMatch(query);
    if (hit) return hit;
    const q = String(query || '').toLowerCase();

    // Fallback generic responses
    if (q.length < 40 && /\b(thanks|thank you|thankyou|thx)\b/.test(q)) {
      return `You're welcome. I'm here if you need anything else.\n\nIf someone is in danger and you can reach 911, call.`;
    }
    if (q.length < 40 && /\b(hello|hi|hey|help|who are you|what are you|what can you do|are you real|are you a person|are you human)\b/.test(q)) {
      return `Hello, I'm Halo — the guide built into ARK. I am a program, not a person, and nobody reads this chat. My answers are stored on this device, so I work with no internet.\n\nIf someone is in danger and you can reach 911, call now.\n\nAsk me about:\n${TOPICS}\n\nOne or two plain words are enough, like "bleeding" or "burn".`;
    }
    if (_injectedCtx.medical && /\b(blood|medication|med|allerg|condition|health)\b/.test(q)) {
      return `From your household's saved medical details:\n\n${_injectedCtx.medical}\n\nIn an emergency, call 911 or Poison Control (1-800-222-1222) if you can.`;
    }
    if (_injectedCtx.inventory && /\b(inventory|stock|supply|supplies|run out|low|have|water|food)\b/.test(q)) {
      return `From your saved supplies:\n\n${_injectedCtx.inventory}\n\nTop up anything that is running low while you still can.`;
    }
    if (_injectedCtx.household && /\b(household|family|member|people|who|how many)\b/.test(q)) {
      return `From your saved household plan:\n\n${_injectedCtx.household}\n\nMake sure everyone knows the meeting points and the evacuation plan.`;
    }
    if (_injectedCtx.situation && /\b(situation|status|alert|current|level|now)\b/.test(q)) {
      return `Your current situation in ARK:\n\n${_injectedCtx.situation}\n\nMatch what you do to your alert level.`;
    }

    const shown = String(query || '').trim();
    const echo = shown.length > 80 ? shown.slice(0, 80) + '…' : shown;
    // Point to any guide whose title or summary mentions a word from the question
    let related = '';
    try {
      const skip = /^(what|when|where|which|how|does|with|have|that|this|from|someone|somebody|should|about|there|they|your|help|need|make|want|will|into|been|much|many|long|some|what's|cannot|could|would)$/;
      const words = q.split(/[^a-z0-9']+/).filter(w => w.length >= 4 && !skip.test(w));
      if (words.length && typeof ARK_GUIDES !== 'undefined') {
        _related = ARK_GUIDES.filter(g => {
          const hay = (g.title + ' ' + g.summary).toLowerCase();
          return words.some(w => hay.includes(w));
        }).slice(0, 3);
        const titles = _related.map(g => '- ' + g.title);
        if (titles.length) related = `\n\nThese guides may help. Open Guides to read them:\n${titles.join('\n')}`;
      }
    } catch (_) {}
    return `I don't have a stored answer for "${echo}".\n\nIf someone is in danger and you can reach 911, call now.${related}\n\nTry one or two plain words, like "bleeding", "burn", "choking" or "water". I can help with:\n${TOPICS}\n\nYou can also open Guides and search there. Halo+ (below) can try other questions, but it must be downloaded first, and that needs internet.`;
  }

  /* ── Load WebLLM model (Halo+) ───────────────────────────── */
  async function load() {
    if (_loading || _engine) return;
    _loading = true;

    if (!navigator.gpu) {
      Toast.show('This browser cannot run Halo+. Try a recent Chrome or Edge on a newer device. The built-in Halo still works.', 'warning', 8000);
      _setBadge('Not supported here', 'badge-red');
      _loading = false;
      return;
    }

    const modelId = document.getElementById('ai-model-select')?.value || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    const btn = document.getElementById('ai-load-btn');
    // If this model was downloaded before, the browser should still have it: say "starting", not "downloading"
    const hadBefore = Store.get(PLUS_KEY, '') === modelId;
    // A first download cannot work with no connection: say so at once instead of after a long wait
    if (!hadBefore && navigator.onLine === false) {
      _setBadge('Needs internet', 'badge-yellow');
      Toast.show('You are not connected to the internet. Halo+ needs internet for its first download. The built-in Halo works now. Use that.', 'warning', 8000);
      _loading = false;
      return;
    }
    if (btn) btn.disabled = true;

    const modelSizeMB = _getModelSizeMB(modelId);
    const progressRow = document.getElementById('ai-progress-row');
    if (progressRow) progressRow.classList.remove('hidden');
    const busyLabel = hadBefore ? 'Starting Halo+. This can take a minute. Keep ARK open.' : 'Downloading the model. This only happens once. Keep ARK open.';
    _setBadge(hadBefore ? 'Starting…' : 'Downloading…', 'badge-yellow');
    _setProgress(0, hadBefore ? 'Starting Halo+. This can take a minute. Keep ARK open.' : `Downloading the model (about ${modelSizeMB >= 1000 ? (modelSizeMB/1000).toFixed(1)+' GB' : modelSizeMB+' MB'}). This only happens once. Keep ARK open.`);

    try {
      const webllm = await import(WEBLLM_CDN);
      _setProgress(5, busyLabel, hadBefore ? 0 : modelSizeMB);

      _engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (p) => {
          const pct = Math.round((p.progress || 0) * 100);
          // Plain words only: the library's own progress text is technical
          _setProgress(pct, busyLabel, hadBefore ? 0 : modelSizeMB);
          _setBadge((hadBefore ? 'Starting ' : 'Downloading ') + pct + '%', 'badge-yellow');
        }
      });

      _setProgress(100, 'Halo+ is ready.');
      Store.set(PLUS_KEY, modelId);
      _setBadge('Ready', 'badge-green');
      _setModePill('Halo+ — on this device', 'badge-green');
      progressRow?.classList.add('hidden');
      document.getElementById('ai-upgrade-card')?.classList.add('hidden');
      Toast.show('Halo+ is ready. It runs on this device.', 'success', 4000);
      _appendMsg('system', 'Halo+ is ready and runs on this device. It can answer more kinds of questions, but it can get things wrong. For first aid, check the Guides too.');
    } catch (err) {
      console.error('ARKai load error:', err);
      _engine = null;
      _setModePill(MODE_LITE, 'badge-green');
      if (hadBefore) {
        _setBadge('Could not start', 'badge-red');
        _setProgress(0, 'Halo+ could not start. The browser may have cleared its saved copy. Connect to the internet, then tap Start Halo+ to try again.');
        Toast.show('Halo+ could not start. The built-in Halo still works. Use that for now.', 'error', 8000);
        _appendMsg('system', 'Halo+ could not start. It may need internet to load again. The built-in Halo still works — ask me about first aid, water, shelter, or how ARK works.');
      } else {
        _setBadge('Download failed', 'badge-red');
        _setProgress(0, 'The download did not finish. Check your internet connection, then tap Download to try again.');
        Toast.show('Halo+ could not be downloaded. Check your internet and try again. The built-in Halo still works.', 'error', 8000);
        _appendMsg('system', 'Halo+ could not be downloaded. It needs internet for the first download. The built-in Halo still works — ask me about first aid, water, shelter, or how ARK works.');
      }
      if (btn) btn.disabled = false;
    }
    _loading = false;
  }

  /* ── Input change — enable/disable send button ───────────── */
  function onInputChange(el) {
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = _busy || !el.value.trim();
  }

  /* ── Send message ────────────────────────────────────────── */
  let _busy = false; // true while an answer is being written, so a second Enter cannot overlap it

  function _doneSending() {
    _busy = false;
    const input = document.getElementById('ai-input');
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = !(input && input.value.trim());
  }

  async function send() {
    if (_busy) return;
    const input = document.getElementById('ai-input');
    const text = input?.value.trim();
    if (!text) return;
    _busy = true;

    input.value = '';
    // On a phone, close the keyboard so the answer is not hidden behind it
    try { if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) input.blur(); } catch (_) {}
    const sendBtn = document.getElementById('ai-send-btn');
    if (sendBtn) sendBtn.disabled = true;

    _appendMsg('user', text);
    _history.push({ role: 'user', content: text });
    // Cap history to prevent unbounded memory growth (keep last 40 turns)
    if (_history.length > MAX_HISTORY) _history = _history.slice(-MAX_HISTORY);

    const thinking = _appendMsg('assistant', '', 'thinking');

    if (_engine) {
      // Halo+ — on-device language model
      let reply = '';
      try {
        // Build system prompt with any injected context
        const ctxParts = [];
        if (_injectedCtx.household) ctxParts.push(`HOUSEHOLD: ${_injectedCtx.household}`);
        if (_injectedCtx.medical) ctxParts.push(`MEDICAL: ${_injectedCtx.medical}`);
        if (_injectedCtx.inventory) ctxParts.push(`SUPPLIES: ${_injectedCtx.inventory}`);
        if (_injectedCtx.situation) ctxParts.push(`SITUATION: ${_injectedCtx.situation}`);
        const ctxBlock = ctxParts.length ? `\n\nUSER CONTEXT (use this when relevant):\n${ctxParts.join('\n\n')}` : '';
        // Hand the model ARK's own checked answer for this topic, so it does not invent first-aid steps
        const ref = _kbMatch(text);
        const refBlock = ref ? `\n\nTRUSTED REFERENCE (base your answer on this; never contradict it):\n${ref}` : '';
        const sysPrompt = `You are Halo, the guide built into ARK, an offline emergency toolkit. You run on the user's device with no internet. You are not an emergency service and nobody monitors this chat. Be concise and practical. Prioritize life-safety. For immediate danger, tell them to call 911 if they can. Use short sentences and plain words suitable for a frightened person. If you are not sure, say so instead of guessing.${refBlock}${ctxBlock}`;
        const messages = [{ role:'system', content: sysPrompt }, ..._history.filter(m => !m.content.startsWith('[CONTEXT')).slice(-6)];
        const stream = await _engine.chat.completions.create({ messages, stream: true, temperature: 0.4, max_tokens: 512 });
        const streamTs = _formatTime();
        for await (const chunk of stream) {
          reply += chunk.choices[0]?.delta?.content || '';
          _fillAnswer(thinking, () => reply, streamTs);
        }
        if (!reply.trim()) throw new Error('empty reply');
        _history.push({ role:'assistant', content: reply });
        _saveHistory();
      } catch (err) {
        console.error('ARKai generate error:', err);
        // Never leave the person without an answer: fall back to Halo's stored answers
        const note = reply.trim() ? 'Halo+ stopped before it finished. Here is my stored answer instead:\n\n' : 'Halo+ could not answer just now. Here is my stored answer instead:\n\n';
        const fallback = note + _liteResponse(text);
        _fillAnswer(thinking, () => fallback, _formatTime());
        _history.push({ role: 'assistant', content: fallback });
        _saveHistory();
      }
      _doneSending();
    } else {
      // Built-in Halo — stored answers, with a brief thinking indicator
      const reply = _liteResponse(text);
      const related = _related.slice();
      const liteTs = _formatTime();
      setTimeout(() => {
        _fillAnswer(thinking, () => reply, liteTs);
        _addGuideLinks(thinking, related);
        // Long answers: show the top of the answer (the first steps), not the end of it
        try {
          const c = document.getElementById('ai-messages');
          if (c && thinking && thinking.offsetHeight > c.clientHeight - 40) c.scrollTop = Math.max(0, thinking.offsetTop - c.offsetTop - 8);
        } catch (_) {}
        _history.push({ role:'assistant', content: reply });
        _saveHistory();
        _doneSending();
      }, 220); // small delay feels more natural
    }
  }

  /* One tap on a suggested question asks it straight away. */
  function quickPrompt(btn) {
    const text = btn.textContent.trim();
    const input = document.getElementById('ai-input');
    if (!input || !text) return;
    if (_busy) { Toast.show('Halo is still answering. Try again in a moment.', 'info', 2500); return; }
    input.value = text;
    send();
    try { document.getElementById('ai-messages')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
  }

  function injectContext(type) {
    let ctx = '';
    const list = (v) => Array.isArray(v) ? v.filter(m => m && typeof m === 'object') : [];
    const nm = (m) => m.name || 'Someone';
    if (type === 'medical') {
      const hh = list(Store.get('hh_members', []));
      if (!hh.length) { Toast.show('No household members saved yet. Add them in Plan first, then tap Medical again.', 'info', 6000); return; }
      const meds = hh.flatMap(m => {
        const parts = [];
        if (m.conditions) parts.push(`${nm(m)} (conditions): ${m.conditions}`);
        if (Array.isArray(m.meds)) m.meds.forEach(med => parts.push(`${nm(m)} (med): ${med}`));
        return parts;
      });
      const allergies = hh.flatMap(m => m.allergies ? [`${nm(m)}: ${m.allergies}`] : []);
      const blood = hh.filter(m => m.bloodType||m.blood).map(m => `${nm(m)}: ${m.bloodType||m.blood}`);
      ctx = `Blood types: ${blood.join(', ')||'not recorded'}\nMedications/Conditions: ${meds.join('; ')||'none recorded'}\nAllergies: ${allergies.join('; ')||'none recorded'}`;
      _injectedCtx.medical = ctx;
    } else if (type === 'inventory') {
      const r = Store.get('resources', null);
      const lines = (r && typeof r === 'object') ? [
        r.water   ? `Water: ${r.water} gal`         : null,
        r.food    ? `Food: ${r.food} days`           : null,
        r.fuel    ? `Fuel: ${r.fuel} gal`            : null,
        r.medical ? `Medical supplies: ${r.medical}/5` : null,
        r.shelter ? `Shelter capacity: ${r.shelter} ppl` : null,
        r.power   ? `Power: ${r.power} hrs`          : null,
      ].filter(Boolean) : [];
      if (!lines.length && !(r && r.notes)) { Toast.show('No supplies saved yet. Record your supplies in ARK first, then tap Supplies again.', 'info', 6000); return; }
      ctx = lines.join('\n') || 'No amounts recorded.';
      if (r.notes) ctx += `\nNotes: ${r.notes}`;
      _injectedCtx.inventory = ctx;
    } else if (type === 'household') {
      const hh = list(Store.get('hh_members', []));
      const hhdRaw = Store.get('household', {});
      const hhd = (hhdRaw && typeof hhdRaw === 'object') ? hhdRaw : {};
      if (!hh.length && !hhd.name && !hhd.meet1 && !hhd.evac) { Toast.show('No household plan saved yet. Fill it in under Plan first, then tap Household again.', 'info', 6000); return; }
      const memberLines = hh.map(m=>`- ${m.name||'?'} (${m.role||'member'}${m.age?' age '+m.age:''}${m.bloodType?' blood '+m.bloodType:''}${m.allergies?' allergies: '+m.allergies:''}${m.conditions?' — '+m.conditions:''}${m.needs?' needs: '+m.needs:''})`).join('\n');
      ctx = `Household: ${hhd.name||'unnamed'}\nHousehold ID: ${Store.get('hh_id','?')}\nMembers (${hh.length}):\n${memberLines||'(none)'}`;
      if (hhd.needs) ctx += `\nSpecial needs: ${hhd.needs}`;
      if (hhd.meet1) ctx += `\nMeeting point 1: ${hhd.meet1}`;
      if (hhd.meet2) ctx += `\nMeeting point 2: ${hhd.meet2}`;
      if (hhd.evac) ctx += `\nEvacuation destination: ${hhd.evac}`;
      if (hhd.ooaName) ctx += `\nOut-of-area contact: ${hhd.ooaName}${hhd.ooaRel?' ('+hhd.ooaRel+')':''} ${hhd.ooaPhone||''}`;
      if (hhd.pets) ctx += `\nPets: ${hhd.pets}`;
      _injectedCtx.household = ctx;
    } else if (type === 'situation') {
      const level = Store.get('alert_level', 1);
      // Use the same alert names the rest of ARK shows
      const label = (typeof ALERT_LEVELS !== 'undefined' && ALERT_LEVELS[level] && ALERT_LEVELS[level].label) || level;
      const gps = Store.get('last_gps');
      const hasGps = gps && typeof gps.lat === 'number' && typeof gps.lon === 'number';
      const mp = Store.get('missing_persons', []);
      ctx = `Alert level: ${label}\nLast known location: ${hasGps ? `${gps.lat.toFixed(4)},${gps.lon.toFixed(4)}` : 'not recorded'}\nMissing people listed: ${Array.isArray(mp) ? mp.length : 0}`;
      _injectedCtx.situation = ctx;
    }
    if (!ctx) return;
    // Keep one context entry per kind, so tapping a button again refreshes it instead of piling up copies
    const tag = `[CONTEXT — ${type}]`;
    _history = _history.filter(m => !(m.role === 'user' && m.content.startsWith(tag)));
    _history.push({ role:'user', content: `${tag}\n${ctx}` });
    const label = (CTX_LABELS[type] || type).toLowerCase();
    _appendMsg('system', `Halo can now use your saved ${label} details. They stay on this device.`);
    _updateCtxBadges();
    _saveHistory();
  }

  function clearChat() {
    if (_busy) { Toast.show('Halo is still answering. Clear the chat when it has finished.', 'info', 3000); return; }
    _history = [];
    _injectedCtx = {};
    Store.del(HISTORY_KEY);
    Store.del(CTX_KEY);
    const container = document.getElementById('ai-messages');
    if (container) {
      container.innerHTML = '';
      _appendMsg('system', 'Chat cleared. I\'m Halo — ask me about first aid, water, shelter, or how ARK works.');
    }
    _updateCtxBadges();
  }

  /* ── Init — called on DOMContentLoaded ───────────────────── */
  function init() {
    _restoreChat();
    _setModePill(MODE_LITE, 'badge-green');
    // Ensure send button reflects current input state
    const input = document.getElementById('ai-input');
    if (input) input.addEventListener('input', () => onInputChange(input));
    // Halo+ was downloaded here before: say so, instead of "Not downloaded" and a second "Download"
    try {
      const had = Store.get(PLUS_KEY, '');
      const sel = document.getElementById('ai-model-select');
      if (had && typeof had === 'string' && sel && Array.from(sel.options).some(o => o.value === had)) {
        sel.value = had;
        _setBadge('Downloaded — not started', 'badge-muted');
        const btn = document.getElementById('ai-load-btn');
        if (btn) btn.innerHTML = _icon('bolt') + ' Start Halo+';
        // Picking a different model means a new download
        sel.addEventListener('change', () => {
          const same = sel.value === had;
          if (btn && !_loading && !_engine) btn.innerHTML = same ? _icon('bolt') + ' Start Halo+' : _icon('download') + ' Download';
        });
      }
    } catch (_) {}
  }

  return { load, send, quickPrompt, injectContext, clearChat, onInputChange, init };
})();
