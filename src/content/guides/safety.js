export const safetyGuides = [
  {
    slug: 'generator-carbon-monoxide',
    category: 'power',
    title: 'Generators and carbon monoxide',
    summary: 'Carbon monoxide is invisible and kills whole households. Placement matters more than generator size.',
    quickSteps: [
      'Run a generator outdoors only, at least 20 feet (6 m) from doors, windows and vents, with the exhaust pointing away from the building.',
      'Never run one in a garage, basement, crawlspace, attached carport or porch, even with the door open. Opening a door does not make it safe.',
      'Keep working carbon monoxide alarms on every level of the home and outside sleeping areas, and test them monthly.',
      'If anyone has a headache with dizziness, nausea, weakness, chest pain or confusion, get everyone into fresh air and call 911. Do not go back inside to look for the cause.',
      'Never plug a generator into a wall outlet to power the house. That backfeeds the utility line and can kill a line worker. Use a transfer switch installed by a qualified electrician.'
    ],
    sections: [
      {
        heading: 'Why proximity is the whole problem',
        body: [
          'Carbon monoxide from a generator can seep through a window, a vent or a wall opening even when the unit sits outside. Twenty feet with the exhaust directed away is the minimum published guidance.',
          'Smaller spaces are more dangerous: a garage or a tent concentrates the gas. Every year people die running generators in exactly those places.',
          'Wind can carry CO back toward the building even with correct placement. Check which way the wind is blowing and ensure exhaust always moves away from the structure.',
        ],
      },
      {
        heading: 'Carbon monoxide poisoning: symptoms and response',
        body: [
          'Early symptoms (mild exposure): headache, slight dizziness, nausea — easily mistaken for flu without fever, food poisoning, or general illness from stress. This is why CO is called the silent killer.',
          'Moderate exposure: severe headache, drowsiness, disorientation, rapid heart rate. At this stage, judgement is already impaired and the person may not recognise the need to escape.',
          'Severe exposure: confusion, unconsciousness, vomiting while unconscious (aspiration risk), convulsions, death.',
          'Response: move everyone immediately to fresh outdoor air. Call 911. Do not re-enter the building. If the person is unconscious and not breathing, begin CPR if trained.',
          'CO is not heavier than air — it mixes throughout the space at all heights. Crawling low does not help.',
        ],
      },
      {
        heading: 'Run it properly',
        body: [
          'Let the generator cool completely before refuelling, and store fuel outside the living space in an approved container.',
          'Never store more fuel than you can safely handle, and never near a water heater, furnace or any pilot light.',
          'Check oil before each use. Running a generator low on oil causes overheating and engine failure.',
          'Keep a fire extinguisher rated for flammable liquids (Type B) near the generator when in use.',
        ],
      },
      {
        heading: 'Alarms and detection',
        body: [
          'A carbon monoxide alarm is the only reliable warning. Replace the unit by the date on the back even if it still beeps when tested — the sensing element degrades before the low-battery alarm triggers.',
          'Do not rely on the smell of exhaust. Carbon monoxide has no smell.',
          'Install CO alarms at knee height in sleeping areas (CO distributes evenly, but sleeping people may not wake unless alarm is nearby). Follow manufacturer instructions for exact placement.',
        ],
      },
      {
        heading: 'Batteries, candles and alternative heat',
        body: [
          'Charge lithium battery banks on a hard surface, never on bedding or in a hot closed space, and never use one that is swollen or damaged.',
          'Candles start fires during outages. Use flashlights and battery lanterns instead. If you must use candles: never leave unattended, keep away from anything flammable, use a stable holder on a stable surface, extinguish before sleeping.',
          'Kerosene heaters: use only outdoors or in well-ventilated spaces. Keep away from flammable materials. Carbon monoxide and other combustion products are produced. Crack a window when using indoors in an emergency — not ideal but better than sealed space.',
          'Propane heaters: same rules as kerosene. "Indoor-safe" propane heaters are safer than generators but still produce CO at some level. Never sleep with one running in an enclosed space.',
        ],
      },
      {
        heading: 'Solar panels and battery banks',
        body: [
          'A grid-tied solar system will shut off during a grid outage (by design, to protect line workers). Only systems with an off-grid inverter or battery backup will function during an outage.',
          'Battery banks: lithium (LiFePO4) is the safest chemistry for home use. Store in a cool, dry location. Avoid deep discharge below 20%. Do not puncture, crush, or expose to water.',
          'Priority order for conserving power: medical devices first, communication (phone/radio) second, lighting third, refrigeration fourth, everything else last.',
          'USB power banks (5,000–30,000 mAh): enough for 1–10 phone charges depending on size. Keep charged. Test capacity periodically as they degrade with age.',
        ],
      },
    ],
    sources: [
      { label: 'CDC — Carbon monoxide poisoning prevention', url: 'https://www.cdc.gov/carbon-monoxide' },
      { label: 'CPSC — Generator safety', url: 'https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Carbon-Monoxide-Information-Center' },
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
      { label: 'NFPA — Generator safety', url: 'https://www.nfpa.org/Public-Education/Staying-safe/Safety-equipment/Generators' },
    ],
  },
  {
    slug: 'extreme-heat',
    category: 'weather',
    title: 'Extreme heat',
    summary: 'Heat kills more Americans per year than any other weather event. Knowing the difference between heat exhaustion and heat stroke determines whether a person lives.',
    quickSteps: [
      'Heat stroke: hot, dry or damp skin (may still be sweating), confusion, slurred speech, body temperature above 103°F — this is a medical emergency. Call 911 and cool the person aggressively with whatever you have.',
      'Heat exhaustion: heavy sweating, cold pale clammy skin, fast weak pulse, nausea, dizziness — move to cool area, loosen clothes, apply cool wet cloths, sip water. If not better in 1 hour or symptoms worsen, call 911.',
      'Drink water before you feel thirsty. By the time thirst is felt, mild dehydration is already present.',
      'Fans above 95°F / 35°C do not eliminate heat risk — they help through evaporative cooling but can accelerate dehydration. A fan blowing hot air at a sweating person helps. A fan in a room hotter than body temperature without sweating does not.',
      'Check on elderly, very young, and chronically ill neighbours at least twice per day. Heat kills quietly.'
    ],
    sections: [
      {
        heading: 'Heat index vs temperature',
        body: [
          'The heat index combines temperature and humidity into a "feels like" temperature. 90°F at 90% humidity feels like 122°F. 95°F at 60% humidity feels like 114°F.',
          'At heat index above 103°F: heat cramps and heat exhaustion are likely with prolonged exposure. Above 125°F: heat stroke highly likely. Official guidance uses the heat index, not the thermometer reading alone.',
          'High overnight low temperatures (above 70°F) are especially dangerous because the body cannot recover its core temperature during sleep.',
        ],
      },
      {
        heading: 'Cooling without air conditioning',
        body: [
          'Daytime: keep windows and curtains closed on the sun-facing side. At night when outside air cools below indoor temperature, open windows on opposite sides to create cross-ventilation.',
          'Cool the person, not the room: a damp cloth on the neck, wrists, and ankles (where blood vessels are close to the skin surface) is more effective per litre of water than misting the air.',
          'A cool shower or bath reduces core temperature rapidly. Even putting feet in cool water provides meaningful relief.',
          'The lowest floor of a building is coolest. An unfinished basement is often 10–15°F cooler than upper floors.',
          'Cooling centres: libraries, malls, community centres, and public buildings with air conditioning. FEMA and local emergency management publicise locations. 211 can direct to the nearest open one.',
        ],
      },
      {
        heading: 'Heat stroke: emergency response',
        body: [
          'Recognise it: very high body temperature (103°F+), hot skin (dry or wet), fast strong pulse, confusion, unconsciousness. The person may be agitated or combative.',
          'Act immediately — do not wait for 911. Begin cooling while calling. Every minute at high temperature causes organ damage.',
          'Most effective cooling: immerse in cool water if possible (bathtub, pool, any body of water). Second best: spray or pour cool water over the whole body while fanning continuously.',
          'Ice packs to neck, armpits, and groin (where large blood vessels run close to skin) accelerate cooling.',
          'Do NOT give the person anything by mouth if they are confused or unconscious. Aspiration risk.',
          'Stop active cooling when body temperature reaches 101–102°F. Overcooling can cause hypothermia.',
        ],
      },
      {
        heading: 'At-risk populations',
        body: [
          'Elderly: reduced thirst sensation, impaired temperature regulation, frequent use of medications that reduce heat tolerance (diuretics, beta blockers, antipsychotics, anticholinergics). Check on them every few hours, not once a day.',
          'Infants and young children: cannot regulate temperature or communicate distress. Never leave in a parked vehicle even briefly in warm weather. Direct cool fluids (breastmilk or formula for infants under 6 months; water and electrolyte drinks for older children).',
          'Chronic illness: heart disease, kidney disease, obesity, diabetes all increase heat vulnerability significantly.',
          'Medications: antidepressants, antihistamines, blood pressure medications, and many others impair the body\'s heat response. Check the medication guide or ask a pharmacist what to watch for.',
          'Pets: dogs and cats cannot sweat efficiently. Provide shade, cool water, and do not exercise them outdoors in extreme heat. Signs of heat stroke in a pet: excessive panting, drooling, red gums, staggering. Cool with cool (not cold) water and get to a vet.',
        ],
      },
      {
        heading: 'Hydration and electrolytes',
        body: [
          'Water alone is not enough in prolonged heat with heavy sweating — sodium and potassium must be replaced. Eating salty foods (crackers, pretzels) with water is effective.',
          'Electrolyte drinks (sports drinks, oral rehydration salts): useful after significant sweating. Not needed for normal daily activity in heat.',
          'Avoid alcohol: a vasodilator that feels cooling but accelerates dehydration and impairs judgement.',
          'Caffeine: mild diuretic. Moderate coffee or tea is not dangerous, but replace that fluid volume with extra water.',
          'Urine colour guide: pale yellow = well hydrated. Dark yellow = mildly dehydrated, drink more. Brown or no urine = severely dehydrated, medical attention needed.',
        ],
      },
    ],
    sources: [
      { label: 'National Weather Service — Heat safety', url: 'https://www.weather.gov/safety/heat' },
      { label: 'CDC — Heat and health', url: 'https://www.cdc.gov/heat-health/' },
      { label: 'CDC — Heat stress in older adults', url: 'https://www.cdc.gov/heat-health/risk-factors/older-adults/index.html' },
    ],
  },
  {
    slug: 'extreme-cold',
    category: 'weather',
    title: 'Extreme cold and hypothermia',
    summary: 'Hypothermia can occur above freezing, indoors, and without warning. Knowing the stages prevents the fatal delay in acting.',
    quickSteps: [
      'Mild hypothermia: shivering, pale skin, confusion beginning, slurred speech, clumsiness. Rewarm actively.',
      'Severe hypothermia: shivering stops (this is worse, not better), very cold skin, slow or absent breathing, unresponsive. This is a medical emergency even if the person appears dead. Begin rewarming and call 911.',
      'Never rub frostbitten skin. Do not walk on frostbitten feet. Rewarm in lukewarm water (100–105°F) for 20–30 minutes.',
      'Wet clothing loses up to 25x more heat than dry. Remove wet clothes and replace with dry insulation.',
      'Do not give alcohol for warmth — it causes vasodilation, rapid heat loss, and impairs shivering.'
    ],
    sections: [
      {
        heading: 'Hypothermia stages',
        body: [
          'Mild (95–89°F / 35–32°C): uncontrollable shivering, skin pale and cold, difficulty with fine motor tasks (fumbling, stumbling), mild confusion, person recognises they are cold.',
          'Moderate (89–82°F / 32–28°C): shivering becomes sporadic or stops, increasingly confused and irrational, skin blue-grey and waxy, muscle stiffness, irregular heartbeat begins. The paradoxical undressing behaviour may appear — the person feels hot and removes clothing. This is a medical emergency.',
          'Severe (below 82°F / 28°C): appears unconscious or dead. No shivering. Pupils dilated and fixed. No detectable pulse or very faint, irregular pulse. Breathing very slow or absent.',
          'Critical rewarming rule: "Not dead until warm and dead." A person in severe hypothermia can survive with no vital signs. CPR should be performed and continued until they are warmed to a normal temperature. Many documented full recoveries from core temperatures below 70°F.',
        ],
      },
      {
        heading: 'Rewarming correctly',
        body: [
          'Mild hypothermia: move to a warm dry environment. Remove wet clothing. Insulate with dry blankets, sleeping bags, or clothing including head and neck. Give warm beverages (not alcohol or caffeine) if the person is fully conscious and can swallow safely.',
          'Moderate hypothermia: same, plus apply chemical heat packs to armpits, groin, and neck — these are the heat transfer zones. Do not apply direct heat (heating pads, hot water bottles) to extremities — this pulls cold blood from the core to the surface and causes cardiac arrest.',
          'Severe hypothermia: handle gently — rough movement can trigger ventricular fibrillation. Keep horizontal. Insulate from above and below. Apply heat only to core (chest, neck, groin). Get to a hospital.',
          'Rewarming in the field when evacuation is not possible: share body heat in a sleeping bag or blankets with another person. This is the most reliable passive warming method.',
        ],
      },
      {
        heading: 'Frostbite stages and treatment',
        body: [
          'Frostnip (early frostbite): affected area is numb, red, and painful. No lasting damage if treated immediately. Rewarm gently with body heat (hands in armpit, feet against partner\'s stomach). Do not rub.',
          'Superficial frostbite: skin is pale, waxy, or grayish. Hard on the surface but soft tissue underneath. Rewarm in water at 100–105°F (feels warm to the inside of your elbow — not hot) for 15–30 minutes. Expect severe pain and blistering as blood returns. This is normal.',
          'Deep frostbite: entire thickness of skin and tissue is frozen, appears grey or black, completely numb. Do NOT rewarm in the field if there is any chance of refreezing — refreezing after thawing causes far more damage. Protect, insulate, and get to definitive medical care.',
          'After rewarming: blisters will form within 24–36 hours. Do not break them. Loosely cover with sterile dressing. Keep elevated. The affected area will be exquisitely sensitive to cold permanently.',
        ],
      },
      {
        heading: 'Layering system',
        body: [
          'Base layer (next to skin): moisture-wicking synthetic (polyester, nylon) or merino wool. Never cotton — cotton holds moisture against the skin and causes rapid heat loss. Regulates moisture.',
          'Mid layer (insulation): fleece, down, or synthetic insulation. Traps air for warmth. Down is warmest by weight but loses all insulating ability when wet. Synthetic insulation keeps working when wet.',
          'Outer layer (shell): wind and waterproof. Gore-Tex or similar breathable waterproof material. Blocks wind and precipitation while allowing moisture vapour to escape.',
          'Head and extremities: 40–60% of heat loss in cold occurs through the head and neck. A hat is the highest-impact cold-weather item. Mittens are warmer than gloves. Layered socks prevent frostbite more than thick single socks.',
        ],
      },
      {
        heading: 'Improvised insulation',
        body: [
          'Newspaper, dry leaves, dry grass stuffed inside clothing provides emergency insulation. Loft (trapped air) is what insulates — density is not important.',
          'Sleeping without shelter: build a debris hut by piling 3–4 feet of dry leaves, pine needles, or dead grass over a simple frame. The pile should be much larger than expected — compression during sleep removes most of the insulation value.',
          'Vapour barrier technique (extreme cold): a plastic bag over the socks inside the outer boot traps body-heat moisture near the foot and dramatically increases warmth. For short-term emergency use only — feet will be wet inside the bag.',
          'Space (emergency) blankets: reflect up to 90% of radiated body heat. Effective when dry and when there is a trapped air layer between the blanket and the person. Primarily useful for preventing further heat loss, not for rapid rewarming.',
        ],
      },
      {
        heading: 'Safe indoor heating',
        body: [
          'The safest indoor heating without power: add people. Body heat in a small insulated space (one room) adds up. Close off rooms you are not using.',
          'Electric space heaters: safe indoors if UL-listed, kept 3 feet from flammables, never left unattended, never used in bathrooms. Trip hazard for older adults.',
          'Propane and kerosene indoor heaters: produce CO and other combustion byproducts. Use only with ventilation (cracked window). Do not sleep with one running. Carbon monoxide alarm is mandatory.',
          'Candles and open fire: fire risk during stress when people are tired and distracted. Never leave unattended. Keep fire extinguisher accessible.',
          'Pipe freezing prevention: drip faucets slowly during extreme cold. Open cabinet doors under sinks to allow warm air to circulate. Know where the main water shutoff valve is before pipes burst.',
          'Warming centres: typically open when temperatures are forecast to drop below a threshold (often below 15°F with windchill). 211, local emergency management, and weather broadcasts announce locations.',
        ],
      },
    ],
    sources: [
      { label: 'National Weather Service — Cold safety', url: 'https://www.weather.gov/safety/cold' },
      { label: 'CDC — Hypothermia', url: 'https://www.cdc.gov/natural-disasters/winter-weather/hypothermia/index.html' },
      { label: 'Wilderness Medical Society — Cold injury guidelines', url: 'https://www.wms.org/medicine/cold' },
    ],
  },
  {
    slug: 'evacuation-sheltering',
    category: 'evacuation',
    title: 'Evacuation and sheltering in place',
    summary: 'When to go, when to stay put, and what to take if you have two minutes.',
    quickSteps: [
      'If an official evacuation order covers your area, leave. Follow the route authorities give, even if it looks longer.',
      'Never walk or drive into floodwater. Six inches of moving water can knock an adult down, and twelve inches can float a car.',
      'If told to shelter in place, go inside, close windows and outside ventilation, and take your kit to an interior room above ground level.',
      'Take identification, medication, water, chargers, a battery radio and your written contact card. Leave a note at home saying where you went and when.',
      'Never shelter in a closed attic during a flood. You can be trapped. Go to the highest floor that still has a way out.'
    ],
    sections: [
      {
        heading: 'Go bag: 72-hour contents',
        body: [
          'Water: 1 gallon per person per day minimum. 3 gallons per person for 72 hours. Use collapsible containers to reduce weight before filling.',
          'Food: non-perishable, no cooking required. Ready-to-eat canned goods, energy bars, peanut butter, crackers, dried fruit, nuts. Manual can opener.',
          'Medications: minimum 7-day supply in original containers with dosing information. Insulin storage note: in an emergency, opened insulin can survive 28 days at room temperature (below 77°F). Closed vials: 6 months room temperature.',
          'Documents: copies of ID, insurance cards, prescription list, bank account numbers, deed or lease. Store in a waterproof bag. Photographs of household members for identification.',
          'Communication: battery or hand-crank radio (NOAA weather radio). Portable phone charger. Written list of emergency contacts. Physical maps of your area.',
          'First aid: basic kit (see medical guide). Extra eyeglasses. Hearing aid batteries. Any medical equipment.',
          'Clothing: one change per person. Sturdy closed-toe shoes. Rain gear. Emergency blanket.',
          'Money: cash in small bills. Cards may not work. Banks may be closed.',
          'Pets: food, water, carrier, vaccination records, medications. Many public shelters do not accept pets — plan for a pet-friendly location.',
          'Special needs: infant formula, diapers, special foods, mobility aids, communication devices.',
        ],
      },
      {
        heading: 'Bug-out trigger vs shelter-in-place decision',
        body: [
          'Leave (evacuate) when: you receive an official evacuation order, your home is in a flood zone with rising water, structural damage makes the building unsafe, there is a gas leak that cannot be shut off, fire is approaching your area.',
          'Shelter in place when: chemical or nuclear incident (outdoor air is more dangerous than indoor), civil unrest (remaining home is safer than moving through it), severe weather (tornado, blizzard) where movement is more dangerous than staying.',
          'If both options are dangerous: sheltering in a more structurally sound building nearby (a school, community centre, or multi-storey concrete building) is a third option.',
          'Vehicle prep before evacuating: fill the fuel tank before the emergency, not during. Keep emergency supplies in the car. Know your route and two alternates.',
          'On-foot evacuation: know routes that do not require a car. A rolling suitcase, bike, or other non-motorised transport can carry a go bag farther than carrying it.',
        ],
      },
      {
        heading: 'Rally points and out-of-area contact',
        body: [
          'Designate two rally points: one at the end of your block or just outside your home (for immediate household emergencies), one at a known location outside your neighbourhood (for wider disaster).',
          'Everyone in the household should know both locations and not need a phone to reach them.',
          'Out-of-area contact: a person in another city or state. Easier to reach than local contacts during a local disaster. This person serves as a message relay — everyone checks in with them so the family knows everyone is safe even without direct contact.',
          'When separating: tell someone where you are going and when you expect to arrive. Leave a written note at home. Check in at the agreed time.',
        ],
      },
      {
        heading: 'Special needs registration',
        body: [
          'Many counties maintain a Special Needs Registry (also called Access and Functional Needs Registry or AFN Registry) for people who need assistance during evacuation.',
          'Who should register: people who use oxygen, ventilators, or powered mobility devices; people with significant mobility limitations; people with communication difficulties; people who live alone with health conditions.',
          'Contact your local emergency management office (not 911) to register. This information is used by emergency services to prioritise welfare checks and evacuations.',
        ],
      },
      {
        heading: 'Leaving well',
        body: [
          'Tell your out-of-area contact where you are going and when you left. That one call or text covers everyone who will ask about you.',
          'Shut off utilities only if authorities tell you to. Otherwise leave them alone: a wrongly closed valve can cause its own problems on return.',
          'Take a photo of your home as you leave for insurance and damage documentation.',
        ],
      },
      {
        heading: 'Sheltering well',
        body: [
          'Choose a room with few or no windows, above ground level, with a door you can close. Bring water, medication, a flashlight, a radio and a way to signal.',
          'Tell someone outside the building that you are sheltering there, and set a check-in time so silence becomes a signal.',
          'For chemical shelter-in-place: use plastic sheeting and duct tape to seal gaps around doors, windows, and vents. Turn off HVAC. This creates a sealed zone that buys time — it is not indefinitely safe, as oxygen depletes. When authorities give the all-clear, ventilate immediately.',
        ],
      },
      {
        heading: 'Returning home',
        body: [
          'Do not return until authorities say the area is safe. Photograph damage before you move anything, for insurance and for aid applications.',
          'Assume downed lines are live and report them from a distance.',
          'Check for structural damage before entering: cracked foundation, tilting walls, water damage to floors, gas smell. If in doubt, do not enter.',
          'File for FEMA disaster assistance at DisasterAssistance.gov or call 1-800-621-3362 within the registration period after a declared disaster.',
        ],
      },
    ],
    sources: [
      { label: 'Ready.gov — Evacuation', url: 'https://www.ready.gov/evacuation' },
      { label: 'National Weather Service — Turn around, don\'t drown', url: 'https://www.weather.gov/safety/flood-turn-around-dont-drown' },
      { label: 'FEMA — How to prepare for emergencies', url: 'https://www.ready.gov/be-informed' },
      { label: 'Ready.gov — Build a kit', url: 'https://www.ready.gov/kit' },
    ],
  },
  {
    slug: 'power-outage-prep',
    category: 'power',
    title: 'Preparing for a long power outage',
    summary: 'What to unplug, what to keep running, and how to make a battery last several days.',
    quickSteps: [
      'Charge phones, battery banks, medical devices and any power wheelchair as soon as a warning is issued, not when the lights go out.',
      'Keep one light, one radio and one charging method per person, and know where they are in the dark.',
      'Unplug computers, televisions and appliances before power returns, to avoid surge damage when the grid comes back.',
      'Keep cash in small notes. Card readers, cash machines and fuel pumps may all be down at the same time.',
      'Report downed power lines to the utility or 911 from a safe distance. Never approach or drive over one.'
    ],
    sections: [
      {
        heading: 'Before it happens',
        body: [
          'Fill water containers if pressure may be lost, and freeze water bottles to extend freezer time and provide drinking water as they thaw.',
          'If anyone depends on powered medical equipment, register with the utility and local emergency management where those programmes exist, and confirm a backup power plan with the equipment supplier.',
          'Know your circuit breaker panel location and how to reset it. Know how to open an electric garage door manually.',
          'Keep paper copies of important contacts — do not rely on a phone that may lose charge.',
        ],
      },
      {
        heading: 'Making a battery last',
        body: [
          'Put phones in airplane mode, cut brightness, and turn off background sync. A phone in airplane mode can last several times longer.',
          'Charge one device at a time from a battery bank instead of leaving several plugged in and half-charged.',
          'Turn off WiFi and Bluetooth on devices if not needed — both drain battery continuously.',
          'Use a phone\'s flashlight sparingly — it is one of the highest battery drains on a device.',
          'At 20% battery, stop using the phone except for communications. Preserve the last 10% strictly for emergency calls.',
        ],
      },
      {
        heading: 'Staying warm or cool',
        body: [
          'Close off unheated or uncooled rooms and gather in one room. Never burn charcoal or run a generator indoors, and never use a gas oven for heat.',
          'Layer clothing and use blankets in cold; use shade, wet cloths and airflow in heat.',
          'Check on neighbours, especially elderly or immunocompromised, more frequently than you think necessary.',
        ],
      },
      {
        heading: 'Medical equipment priority',
        body: [
          'CPAP/BiPAP: many can run on 12V DC power (car adapter). Some newer units include battery backup. Contact the manufacturer for your specific unit.',
          'Oxygen concentrators: require significant power and cannot run on most portable battery banks. Options: manual hand pump (not practical for most), have small portable oxygen cylinders as backup (coordinate with prescriber), evacuate to a facility with power.',
          'Insulin: does not require refrigeration for up to 28 days at room temperature (below 77°F). Insulin above 86°F degrades faster. Keep in a cooler if above that temperature. Frozen insulin is damaged — do not use.',
          'Dialysis: patients who rely on home dialysis cannot safely miss sessions. This is a life-threatening situation if power is lost for more than 24–48 hours. Have an agreement with a dialysis centre for emergency sessions, and register with local emergency management.',
        ],
      },
      {
        heading: 'When power returns',
        body: [
          'Check the refrigerator and freezer temperatures, reset clocks and alarms, and confirm that smoke and carbon monoxide alarms still work.',
          'Bring systems back gradually, and watch for any burning smell or sparking.',
          'Wait 30 minutes after power is restored before plugging in sensitive electronics — surge protectors help but do not eliminate all risk.',
        ],
      },
    ],
    sources: [
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
      { label: 'FoodSafety.gov — Food safety during a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' },
      { label: 'Department of Energy — Outage preparedness', url: 'https://www.energy.gov/oe/articles/powering-through-outages' },
    ],
  },
];
