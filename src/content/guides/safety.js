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
      { heading: 'Why proximity is the whole problem', body: ['Carbon monoxide from a generator can seep through a window, a vent or a wall opening even when the unit sits outside. Twenty feet with the exhaust directed away is the minimum published guidance.', 'Smaller spaces are more dangerous: a garage or a tent concentrates the gas. Every year people die running generators in exactly those places.'], },
      { heading: 'Run it properly', body: ['Let the generator cool completely before refuelling, and store fuel outside the living space in an approved container.', 'Never store more fuel than you can safely handle, and never near a water heater, furnace or any pilot light.'], },
      { heading: 'Alarms and detection', body: ['A carbon monoxide alarm is the only reliable warning. Replace the unit by the date on the back even if it still beeps when tested.', 'Do not rely on the smell of exhaust. Carbon monoxide has no smell.'], },
      { heading: 'Batteries, candles and heat', body: ['Charge lithium battery banks on a hard surface, never on bedding or in a hot closed space, and never use one that is swollen or damaged.', 'Candles start fires during outages. Use flashlights and battery lanterns instead.'], },
    ],
    sources: [
      { label: 'CDC — Carbon monoxide poisoning prevention', url: 'https://www.cdc.gov/carbon-monoxide' },
      { label: 'CPSC — Generator safety', url: 'https://www.cpsc.gov/Safety-Education/Safety-Education-Centers/Carbon-Monoxide-Information-Center' },
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
    ],
  },
  {
    slug: 'extreme-heat-cold',
    category: 'weather',
    title: 'Extreme heat and cold',
    summary: 'Recognising the point where heat or cold becomes an emergency, and using the safest space you actually have.',
    quickSteps: [
      'Confusion, fainting, hot dry skin or a body temperature that feels dangerously high in heat is an emergency. Call 911 and cool the person while you wait.',
      'In cold, unstoppable shivering, slurred speech, clumsiness or drowsiness suggests hypothermia. Get the person dry, warm the body slowly, and call for help.',
      'Never leave anyone in a parked vehicle in heat or cold, and never use a stove, oven or grill to heat a home.',
      'Check on people living alone, older adults, infants and anyone with a chronic illness or medication that affects temperature control. They are at highest risk.',
      'Drink water before you feel thirsty. In heat, avoid alcohol and heavy exertion in the middle of the day.'
    ],
    sections: [
      { heading: 'Heat: act early', body: ['Heat illness escalates from cramps and heavy sweating to exhaustion, then confusion and collapse. Stop activity at the first cramps and move to shade or a cooler room.', 'Use shade, wet cloths on the neck and wrists, and moving air. Close curtains and windows during the day if the outside air is hotter, and open them at night if it cools.'], },
      { heading: 'Cold: warm the body, not the room', body: ['Layer clothing, stay dry, and cover the head and hands. Wet clothing loses heat far faster than dry clothing.', 'Warm a hypothermic person gradually with blankets and body heat. Do not give alcohol, do not rub the skin, and do not apply direct high heat.'], },
      { heading: 'Frostbite', body: ['Numb, pale, waxy skin is frostbite. Do not rub it and do not walk on frostbitten feet. Warm the area in water that is comfortably warm to the touch, not hot, and get medical help.', 'If there is any chance the area will refreeze, do not start warming it.'], },
      { heading: 'Using public space', body: ['If your home becomes unsafe, use a public cooling or warming centre if one is open and you can reach it safely. Take medication, water and ID.', 'Tell someone where you are going, especially if you live alone.'], },
    ],
    sources: [
      { label: 'National Weather Service — Heat safety', url: 'https://www.weather.gov/safety/heat' },
      { label: 'National Weather Service — Cold safety', url: 'https://www.weather.gov/safety/cold' },
      { label: 'CDC — Heat and health', url: 'https://www.cdc.gov/heat-health/' },
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
      { heading: 'Leaving well', body: ['Tell your out-of-area contact where you are going and when you left. That one call or text covers everyone who will ask about you.', 'Shut off utilities only if authorities tell you to. Otherwise leave them alone: a wrongly closed valve can cause its own problems on return.'], },
      { heading: 'Sheltering well', body: ['Choose a room with few or no windows, above ground level, with a door you can close. Bring water, medication, a flashlight, a radio and a way to signal.', 'Tell someone outside the building that you are sheltering there, and set a check-in time so silence becomes a signal.'], },
      { heading: 'If you cannot leave', body: ['Move up, not in. Signal from a window so rescuers can see you. Do not hide.', 'Keep shoes on and a flashlight within reach. In a sudden event, debris and darkness cause as many injuries as the event itself.'], },
      { heading: 'Returning', body: ['Do not return until authorities say the area is safe. Photograph damage before you move anything, for insurance and for aid applications.', 'Assume downed lines are live and report them from a distance.'], },
    ],
    sources: [
      { label: 'Ready.gov — Evacuation', url: 'https://www.ready.gov/evacuation' },
      { label: 'National Weather Service — Turn around, don’t drown', url: 'https://www.weather.gov/safety/flood-turn-around-dont-drown' },
      { label: 'FEMA — How to prepare for emergencies', url: 'https://www.ready.gov/be-informed' },
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
      { heading: 'Before it happens', body: ['Fill water containers if pressure may be lost, and freeze water bottles to extend freezer time and provide drinking water as they thaw.', 'If anyone depends on powered medical equipment, register with the utility and local emergency management where those programmes exist, and confirm a backup power plan with the equipment supplier.'], },
      { heading: 'Making a battery last', body: ['Put phones in airplane mode, cut brightness, and turn off background sync. A phone in airplane mode can last several times longer.', 'Charge one device at a time from a battery bank instead of leaving several plugged in and half-charged.'], },
      { heading: 'Staying warm or cool', body: ['Close off unheated or uncooled rooms and gather in one room. Never burn charcoal or run a generator indoors, and never use a gas oven for heat.', 'Layer clothing and use blankets in cold; use shade, wet cloths and airflow in heat.'], },
      { heading: 'When power returns', body: ['Check the refrigerator and freezer temperatures, reset clocks and alarms, and confirm that smoke and carbon monoxide alarms still work.', 'Bring systems back gradually, and watch for any burning smell or sparking.'], },
    ],
    sources: [
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
      { label: 'FoodSafety.gov — Food safety during a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' },
      { label: 'Department of Energy — Outage preparedness', url: 'https://www.energy.gov/oe/articles/powering-through-outages' },
    ],
  },
];