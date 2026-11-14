export const guideCategories = [
  { key: 'water', label: 'Water & sanitation' },
  { key: 'food', label: 'Food safety' },
  { key: 'medical', label: 'Medical escalation' },
  { key: 'power', label: 'Power, generators & carbon monoxide' },
  { key: 'weather', label: 'Extreme heat & cold' },
  { key: 'evacuation', label: 'Evacuation & sheltering' },
  { key: 'communication', label: 'Communication failure' },
  { key: 'reunification', label: 'Family reunification' },
  { key: 'community', label: 'Community assistance' }
];

export const guides = [
  {
    slug: 'water-safety',
    category: 'water',
    title: 'Drinking water in an outage',
    summary: 'How much to store, how to treat water you are unsure about, and where not to get it.',
    quickSteps: [
      'Store at least 1 gallon per person per day for drinking and sanitation, with a 3-day minimum and a 2-week goal.',
      'If a boil-water notice is issued, follow it exactly. Boiling for 1 minute kills most pathogens; at high altitude boil for 3 minutes.',
      'Never drink from pools, spas, water beds, radiators or toilet tanks.'
    ],
    sections: [
      { heading: 'Before water runs low', body: ['Fill clean containers while pressure is still available. Rotate stored water and label it with the date.', 'Keep a backup treatment method that does not need power: unscented household bleach, purification tablets, or a filter rated for the contaminants you are concerned about.'] },
      { heading: 'When the supply is uncertain', body: ['Follow the notice from your water utility or local authority. Guidance differs between a boil notice, a do-not-drink notice, and a do-not-use notice.', 'Clear-looking water is not necessarily safe. Cloudy water should be filtered or settled first, then treated by the method the notice specifies.'] },
      { heading: 'Sanitation', body: ['Reserve water for handwashing and for keeping waste separate from living areas. Hand hygiene is one of the highest-value actions in a prolonged outage.', 'If plumbing fails, follow local public health instructions for waste disposal rather than improvising near water sources.'] }
    ],
    sources: [
      { label: 'Ready.gov, water', url: 'https://www.ready.gov/water' },
      { label: 'Ready.gov, emergency supply kit', url: 'https://www.ready.gov/kit' }
    ]
  },
  {
    slug: 'food-safety',
    category: 'food',
    title: 'Keeping food safe without power',
    summary: 'What stays cold, what must be thrown out, and how to plan meals that need no cooking.',
    quickSteps: [
      'Keep refrigerator and freezer doors closed. A closed refrigerator keeps food safe for about 4 hours; a full freezer for about 48 hours, or 24 hours if half full.',
      'Discard perishable food that has been above 40°F (4°C) for more than 2 hours.',
      'Never taste food to decide whether it is safe.'
    ],
    sections: [
      { heading: 'During the outage', body: ['Group items together in the freezer to hold cold longer. A block of ice or frozen water bottles extends that time.', 'If you use a cooler, keep ice separate from ready-to-eat food and check the temperature with a thermometer.'] },
      { heading: 'When power returns', body: ['Check each item individually. Food that still contains ice crystals or is at or below 40°F can be refrozen, though quality may suffer.', 'Clean and sanitise the refrigerator before restocking if food spoiled inside it.'] },
      { heading: 'Cooking without power', body: ['Never use a charcoal grill, camping stove or generator indoors, in a garage, or in any enclosed space.', 'Choose foods that need no cooking: canned goods, nut butters, crackers, shelf-stable milk. Keep a manual can opener with the kit.'] }
    ],
    sources: [
      { label: 'FoodSafety.gov, food safety during a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' },
      { label: 'Ready.gov, power outages', url: 'https://www.ready.gov/power-outages' }
    ]
  },
  {
    slug: 'medical-escalation',
    category: 'medical',
    title: 'Medical emergencies and escalation',
    summary: 'Who to call, what to say, and the difference between self-care guidance and emergency care.',
    quickSteps: [
      'For a life-threatening emergency, call your local emergency number immediately. In the United States that is 911.',
      'Follow the dispatcher or a trained responder. Lifeline does not provide treatment instructions.',
      'Write down medication names, doses, allergies and conditions in advance so you can read them to a responder.'
    ],
    sections: [
      { heading: 'What this app will not do', body: ['Lifeline does not diagnose, prescribe, or replace a clinician or dispatcher. It will not tell you how to treat a serious injury.', 'Guidance here is limited to preparation and escalation: keeping medication, records and contact routes ready, and knowing who to reach.'] },
      { heading: 'Preparing for a medical need in an outage', body: ['Keep at least 7 days of prescription medication where you can grab it, plus a written list of doses and prescriber contacts.', 'For powered medical equipment, register with your utility and local emergency management where such programmes exist, and plan a backup power source with your equipment supplier.'] },
      { heading: 'When services are overwhelmed', body: ['Expect delays. Report the location, the number of people, the condition, and whether the person is breathing.', 'Do not move someone with a suspected spinal injury unless they are in immediate danger.'] }
    ],
    sources: [
      { label: 'American Red Cross, emergency preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html' },
      { label: 'Ready.gov, emergency supply kit', url: 'https://www.ready.gov/kit' }
    ]
  },
  {
    slug: 'generator-carbon-monoxide',
    category: 'power',
    title: 'Generators and carbon monoxide',
    summary: 'Carbon monoxide kills quietly. Placement and alarms matter more than generator size.',
    quickSteps: [
      'Run generators outdoors only, at least 20 feet from doors, windows and vents, with the exhaust pointed away.',
      'Never run a generator in a garage, basement, crawlspace or attached carport, even with the door open.',
      'Keep working carbon monoxide alarms on every level and test them monthly.'
    ],
    sections: [
      { heading: 'Symptoms to act on', body: ['Headache, dizziness, nausea, weakness, chest pain and confusion can indicate carbon monoxide exposure. Get everyone into fresh air and call for emergency help. Do not go back inside to investigate alone.', 'Pets can be affected first because they are smaller.'] },
      { heading: 'Using a generator safely', body: ['Let the generator cool before refuelling, and store fuel outside in an approved container.', 'Never backfeed a home by plugging a generator into a wall outlet. Use a transfer switch installed by a qualified electrician.'] },
      { heading: 'Battery and heat safety', body: ['Lithium battery banks should not be charged on soft furnishings or in a closed hot space, and should never be damaged or punctured.', 'Candles are a leading cause of home fires during outages. Use flashlights and battery lanterns instead.'] }
    ],
    sources: [
      { label: 'CDC, carbon monoxide poisoning prevention', url: 'https://www.cdc.gov/carbon-monoxide' },
      { label: 'Ready.gov, power outages', url: 'https://www.ready.gov/power-outages' }
    ]
  },
  {
    slug: 'extreme-heat-cold',
    category: 'weather',
    title: 'Extreme heat and cold',
    summary: 'Recognising danger signs and using the coolest or warmest safe space you actually have.',
    quickSteps: [
      'Move to the coolest available space during heat, and the warmest safe space during cold. Check on neighbours who live alone.',
      'Drink water before you feel thirsty. Avoid alcohol and heavy exertion in heat.',
      'Never use a stove, oven or grill to heat a home, and never bring a barbecue inside.'
    ],
    sections: [
      { heading: 'Heat', body: ['Heat illness escalates from cramps and heavy sweating to confusion and collapse. Confusion or fainting in heat is an emergency.', 'Use shade, wet cloths and airflow. Opening windows at night and closing them with curtains during the day helps if outdoor air is cooler.'] },
      { heading: 'Cold', body: ['Layer clothing, keep dry, and cover the head and hands. Shivering that will not stop, slurred speech and clumsiness suggest hypothermia.', 'Close off unheated rooms and gather in one room. Never burn charcoal indoors.'] },
      { heading: 'Vulnerable people first', body: ['Older adults, infants, people with chronic illness, and people on medication that affects temperature regulation are at highest risk.', 'If your home becomes unsafe, use a public cooling or warming location if one is open and reachable.'] }
    ],
    sources: [
      { label: 'National Weather Service, heat safety', url: 'https://www.weather.gov/safety/heat' },
      { label: 'National Weather Service, cold safety', url: 'https://www.weather.gov/safety/cold' }
    ]
  },
  {
    slug: 'evacuation-sheltering',
    category: 'evacuation',
    title: 'Evacuation and sheltering in place',
    summary: 'When to go, when to stay, and what to take if you have two minutes.',
    quickSteps: [
      'If an official evacuation order covers you, leave. Follow the route authorities give, not a shortcut.',
      'If told to shelter in place, go inside, close windows and ventilation, and take your kit to an interior room.',
      'Take identification, medication, water, chargers and your written contact card.'
    ],
    sections: [
      { heading: 'Leaving', body: ['Tell your out-of-area contact where you are going and when you left. That contact becomes the relay for everyone else.', 'Do not enter floodwater on foot or by vehicle. Moving water is more powerful than it looks.'] },
      { heading: 'Sheltering', body: ['Choose a room with few or no windows. Bring water, medication, a flashlight, a radio and a way to signal for help.', 'Tell someone outside your home that you are sheltering and set a check-in time.'] },
      { heading: 'If you cannot leave', body: ['Move to the highest safe floor in a flood, never into a closed attic with no exit.', 'Signal from a window. Do not hide from rescuers.'] }
    ],
    sources: [
      { label: 'Ready.gov, evacuation', url: 'https://www.ready.gov/evacuation' },
      { label: 'American Red Cross, emergency preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html' }
    ]
  },
  {
    slug: 'communication-failure',
    category: 'communication',
    title: 'When phones and internet fail',
    summary: 'A simple plan that works without apps, accounts or signal.',
    quickSteps: [
      'Agree in advance: one out-of-area contact, one check-in time, and one backup meeting place.',
      'Write contact numbers on paper for every household member. Your phone may be dead when you need it.',
      'Send short text messages rather than calls when the network is congested; texts often get through later.'
    ],
    sections: [
      { heading: 'Before it happens', body: ['Choose a contact outside your region. Local lines saturate first; long-distance routes are often clearer.', 'Give every member the same printed card with the contact, meeting points and any medical information a responder would need.'] },
      { heading: 'During an outage', body: ['Conserve battery: reduce brightness, close apps, and keep the phone off until a scheduled check-in window.', 'Do not assume a message arrived. Delivery in Lifeline is only confirmed when a recipient acts on it, and this app cannot send messages without a connection.'] },
      { heading: 'What Lifeline cannot do', body: ['Lifeline is a web application. It cannot create a radio link, a Bluetooth mesh, or a satellite connection, and it cannot deliver messages while you are offline.', 'Plan on paper and on existing communications equipment as the dependable path.'] }
    ],
    sources: [
      { label: 'Ready.gov, emergency communications plan', url: 'https://www.ready.gov/plan' },
      { label: 'Ready.gov, emergency supply kit', url: 'https://www.ready.gov/kit' }
    ]
  },
  {
    slug: 'family-reunification',
    category: 'reunification',
    title: 'Finding each other again',
    summary: 'Meeting points, school and care-setting procedures, and how to report a missing person.',
    quickSteps: [
      'Use the two meeting points from your household plan: one near home, one outside the neighbourhood.',
      'Know your school or care provider written reunification procedure and who is authorised to collect each person.',
      'To report someone missing, contact local authorities with a recent photo, what they were wearing and where they were last seen.'
    ],
    sections: [
      { heading: 'Set it up now', body: ['Write down who collects each child, with a backup. Confirm the care setting will release a child only to listed people.', 'For a household member with dementia or a communication disability, keep an identification card and consider a locating service.'] },
      { heading: 'During separation', body: ['Go to the agreed meeting point and stay there long enough to be found. Leave a written note at home saying where you went and when.', 'Check in with the out-of-area contact, who can connect reports from different family members.'] },
      { heading: 'After reunification', body: ['Tell your out-of-area contact that everyone is accounted for, and tell anyone who was searching.', 'Record where each person was and how they were found. This matters for later recovery and for reviews.'] }
    ],
    sources: [
      { label: 'Ready.gov, plan ahead for disasters', url: 'https://www.ready.gov/plan' },
      { label: 'American Red Cross, emergency preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html' }
    ]
  },
  {
    slug: 'community-assistance',
    category: 'community',
    title: 'Helping neighbours without creating harm',
    summary: 'How to organise local help while protecting vulnerable people and avoiding unsafe dispatch.',
    quickSteps: [
      'Work through an identified local coordinator and a staffed, safe location where possible.',
      'Share needs, not identities. Never publish a vulnerable person address on a public board.',
      'Only accept tasks you are trained and equipped to do. Unverified volunteers should not perform medical, electrical or security work.'
    ],
    sections: [
      { heading: 'Intake that includes everyone', body: ['Offer a paper route for people without a phone, an account or identification. Assistance should not depend on owning a device.', 'Use a local reference code instead of a full name where practical, and ask before sharing anyone details.'] },
      { heading: 'Matching help to need', body: ['Record what is needed, where it can be delivered safely, and who accepted it. Confirm with the person that help actually arrived.', 'Do not send volunteers into damaged structures, floodwater or areas under an official evacuation order.'] },
      { heading: 'Reporting and protection', body: ['Set one route for concerns about a volunteer or a request, and one person responsible for acting on them.', 'Keep records of who received what, so recovery support can be targeted and duplication reduced.'] }
    ],
    sources: [
      { label: 'Ready.gov, volunteer and donate responsibly', url: 'https://www.ready.gov/volunteer' },
      { label: 'American Red Cross, emergency preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html' }
    ]
  },
  {
    slug: 'power-outage-prep',
    category: 'power',
    title: 'Preparing for a long power outage',
    summary: 'What to unplug, what to keep running, and how to make a battery last for days.',
    quickSteps: [
      'Charge phones, battery banks and medical equipment whenever a warning is issued.',
      'Keep one light, one radio and one charging method per person, and know where they are in the dark.',
      'Turn off and unplug electronics before power returns to avoid surge damage.'
    ],
    sections: [
      { heading: 'Before the outage', body: ['Fill water containers and bathtubs if pressure may be lost, and freeze water bottles to extend freezer time.', 'Keep cash in small notes, since card readers and cash machines may be down.'] },
      { heading: 'Conserving power', body: ['Use airplane mode and low brightness on phones. Charge one device at a time from a battery bank rather than leaving everything plugged in.', 'Keep the refrigerator closed. Run the generator only for essentials and only outdoors.'] },
      { heading: 'When power returns', body: ['Check the refrigerator temperature, then reset clocks and alarms. Verify that smoke and carbon monoxide alarms still work.', 'Report downed lines to the utility from a safe distance. Never approach or drive over a fallen line.'] }
    ],
    sources: [
      { label: 'Ready.gov, power outages', url: 'https://www.ready.gov/power-outages' },
      { label: 'FoodSafety.gov, food safety during a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' }
    ]
  }
];

export const guideBySlug = slug => guides.find(g => g.slug === slug);