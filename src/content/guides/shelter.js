/**
 * Shelter guide for disaster scenarios.
 * Covers structural safety assessment, improvised shelter, sanitation
 * without running water, and multi-household living.
 */

export const shelterGuides = [
  {
    slug: 'structural-safety',
    category: 'evacuation',
    title: 'Is my building safe to stay in?',
    summary: 'A non-expert walk-around inspection to assess whether your building is safe to occupy after a disaster.',
    quickSteps: [
      'Do not enter a building if you smell gas. Leave the area, call your gas utility from a safe distance.',
      'Do not enter a building with visible major structural damage: large cracks in foundation, walls leaning out of plumb, partial collapse, floor that visibly bounces or sags.',
      'If the building passed a walk-around but you are unsure: stay on the lowest liveable floor, near load-bearing walls. Avoid rooms with heavy items above, damaged ceilings, or large spans with no support.',
      'After a flood: assume the floor is structurally weakened, the electrical system is dangerous, and the building may have contaminated the walls and floors with sewage. Wear rubber-soled shoes and do not use electrical switches.',
      'Downed power line nearby: assume the ground is electrified up to 35 feet from the line. Do not approach. Call utility company and 911.'
    ],
    sections: [
      {
        heading: 'Walk-around inspection',
        body: [
          'Foundation: look for large diagonal cracks (not hairline) at corners of windows and doors, cracks wider than 1/4 inch, cracks through which you can see daylight, walls that are bowing outward, foundation has shifted or is separated from the sill.',
          'Structure: check that the building is still square — look at the ridge of the roof from a distance. A ridge that sags or bows suggests structural failure. Walls should be vertical. Doors or windows that have changed fit dramatically (now bind or fall open) indicate structural movement.',
          'Roof: visible holes in the roof allow water damage that accelerates structural failure. Missing sections of roofing after a storm should be tarped immediately.',
          'Chimney: a cracked, leaning, or partially collapsed chimney is a falling hazard and must not be used for heating until inspected.',
          'Interior: floors that slope or bounce, ceilings with large water stains and sagging, walls with new and large cracks. Smell: gas (call utility, leave), burning or electrical (treat as fire risk), sewage or mould (ventilate, wear a mask).',
        ],
      },
      {
        heading: 'Post-flood building assessment',
        body: [
          'Electrical: do not use switches, outlets, or appliances in a flooded building until a licensed electrician has inspected the system. Electricity and water together cause electrocution.',
          'Gas: if you suspect a gas leak (smell, hissing), do not use any electrical devices (including light switches), leave immediately, and call the gas company from outside.',
          'Floors: wood floors that have been submerged may buckle and become unstable. Test before full weight. Concrete slabs in flooded structures may have undermined soil beneath them.',
          'Contamination: floodwater typically contains sewage. Everything it touched — carpet, drywall, insulation, wood framing — must be cleaned and disinfected or removed to prevent mould and disease. Mould begins growing within 24–48 hours in damp conditions.',
          'Structural capacity: a building that held during the flood event is not necessarily safe after — repeated saturation cycles weaken wood and masonry. If in doubt, have it inspected before occupying long-term.',
        ],
      },
      {
        heading: 'Red-tag and yellow-tag systems',
        body: [
          'After major disasters, local authorities and engineers conduct rapid assessments and post coloured placards on buildings.',
          'Green placard (Inspected): structure is safe to occupy. May have minor cosmetic damage.',
          'Yellow placard (Restricted Use): structure has damage that restricts use. Access may be limited to brief entry to retrieve belongings. Do not live in a yellow-tagged building without specific permission.',
          'Red placard (Unsafe): structure is unsafe for entry. Do not enter for any reason until cleared by an engineer.',
          'No placard: has not been inspected. Treat as potentially unsafe. When in doubt, stay out.',
        ],
      },
    ],
    sources: [
      { label: 'FEMA — Repairing your flooded home', url: 'https://www.fema.gov/pdf/rebuild/recover/fema_nfip_repairingfloodedhome.pdf' },
      { label: 'California OES — Post-disaster safety assessment', url: 'https://www.caloes.ca.gov/for-governments-tribal/planning-preparedness/structural-safety-assessment' },
    ],
  },
  {
    slug: 'improvised-shelter',
    category: 'evacuation',
    title: 'Emergency and improvised shelter',
    summary: 'Building a shelter from available materials when you cannot stay in your home and public shelters are not accessible.',
    quickSteps: [
      'Vehicle shelter: a car provides excellent protection from wind, rain, and moderate cold. Run the engine for warmth only 10 minutes per hour with a window cracked and exhaust clear of snow (carbon monoxide risk).',
      'Debris hut (woodland): pile dead leaves, pine needles, or dry grass over a simple ridge pole frame until the pile is 4 feet thick. The pile should be much larger than expected — compression during sleep removes most insulating value.',
      'Tarp shelter: a single tarp with paracord between two anchor points creates a roof. Angle it steeply for rain drainage. Insulate the ground beneath you — the ground conducts heat away from the body faster than cold air does.',
      'Insulate from the ground first: lying directly on cold ground causes rapid heat loss. Even a single layer of dry leaves, cardboard, pine boughs, or a sleeping pad dramatically reduces heat loss.',
      'Size matters: a smaller enclosed space retains body heat better than a large open space. Build smaller than feels comfortable.'
    ],
    sections: [
      {
        heading: 'Shelter site selection',
        body: [
          'Never shelter in a ravine, dry creek bed, or low area during or after rain — flash flooding can occur with no warning.',
          'Never shelter under a single large tree in an electrical storm (lightning), or under any dead tree (falling hazard).',
          'Preferred site: naturally sheltered from prevailing wind (behind a ridge, among dense trees), on elevated ground, with access to a water source nearby (but not too close — insects, flooding, and animal activity).',
          'Consider rescue: if rescue is possible, stay visible and near accessible terrain. An elaborate hidden shelter in deep woods may prevent rescue. Balance warmth and concealment against visibility.',
        ],
      },
      {
        heading: 'Weatherproofing a damaged building',
        body: [
          'Missing roof sections: cover with plastic sheeting or a tarp. Run the tarp from the ridge over the missing section and secure with battens (long boards) weighted or nailed at the edges. Secure every 2 feet in high wind.',
          'Broken windows: cover with plastic sheeting, plywood, or cardboard secured with tape or staples. Seal the edges. This keeps out rain, wind, and insects. Any hard material is better than none.',
          'Leaking roof (minor): identify the entry point from inside during rain. Place containers beneath active leaks. Mark the inside ceiling location for repair when accessible.',
          'Heating a damaged building: concentrate heat in the least-damaged interior room. Close doors to unheated spaces. Use the smallest safe space that holds the number of people. Human body heat alone significantly warms a small insulated room.',
        ],
      },
      {
        heading: 'Sanitation without running water',
        body: [
          'See the waterFood guide for full sanitation detail. Summary: a bucket toilet with a liner and cover material (sawdust, cat litter, shredded paper) is the first line.',
          'Hand hygiene: the single highest-impact hygiene behaviour. Set up a handwashing station with a container of treated water, soap, and a bucket to catch waste water. 20 seconds with soap after using the toilet and before handling food.',
          'Dish sanitation: wash with a small amount of water and soap, rinse with the smallest amount of treated water possible. Air dry — towel drying with shared towels can re-contaminate.',
          'Body hygiene: a full sponge bath with 1–2 litres of water is adequate for hygiene. Prioritise: hands, face, groin, feet. Wet wipes are an effective short-term alternative.',
          'Waste water disposal: dispose of grey water (washing, cooking) at least 100 feet from water sources. Do not allow it to pool near living areas.',
        ],
      },
      {
        heading: 'Pest control without chemicals',
        body: [
          'Insects: eliminate standing water within 100 yards to reduce mosquito breeding. Screen any openings into the shelter. Wear long sleeves and use DEET or picaridin-based repellents (stockpile a supply). Treat clothing with permethrin for tick prevention.',
          'Rodents: rats and mice move into human habitations after disasters for food and warmth. Keep all food in sealed hard-sided containers — rodents can chew through plastic bags. Remove debris and clutter that provides nesting sites. Traps without poisons are effective and do not create secondary poisoning risk.',
          'Flies: cover all food. Dispose of waste promptly. A covered latrine bucket reduces fly contact with waste significantly.',
          'Bed bugs: brought in through shared shelter items (sleeping bags, clothing from public shelters). Inspect before bringing items into a clean space. High heat (above 120°F) or extreme cold kills them. In an emergency, isolation of suspected items is the practical response.',
        ],
      },
      {
        heading: 'Security without alerting others',
        body: [
          'The most effective security is not advertising that you have resources. Covered windows, reduced light at night, and low noise reduce the chance that your location becomes a target.',
          'Simple perimeter alerts: dry leaves, gravel, or a string with cans around the perimeter of a shelter provide noise alerts without weapons or confrontation.',
          'Never engage a potential threat if avoidance is possible. Having valuables is not worth a violent confrontation. Have a secondary plan to leave quickly if needed.',
          'Community is better security than isolation: an organised group of neighbours watching for each other provides more protection than any individual household alone.',
        ],
      },
      {
        heading: 'Multi-family living: conflict prevention',
        body: [
          'Shared space stress is predictable: loss of privacy, reduced personal control, and resource competition cause conflict even among friendly people. Acknowledge this explicitly and early.',
          'Establish agreements on day one: who makes decisions, how chores are divided, what spaces are shared vs private (even a corner with a visual barrier provides psychological privacy), how resources are allocated, and how disagreements will be resolved.',
          'Resource transparency: a shared visible inventory of food, water, and fuel reduces rumour and resentment. Everyone knowing what exists and how long it will last reduces conflict.',
          'Assign roles that use people\'s skills: idle people in stressful confined spaces is a conflict generator. Purposeful activity reduces tension.',
          'Children: shared shelter with multiple children is chaotic. Create child-appropriate activity and structure. Children model adult stress — calm adult behaviour is the most effective child management tool.',
          'Conflict escalation: physical confrontation in a shared shelter is a catastrophic outcome for everyone. Designate a de-escalation process before it is needed. If two people cannot be near each other, separate their schedules (different shift patterns, different zones) rather than force cohabitation.',
        ],
      },
    ],
    sources: [
      { label: 'Ready.gov — Shelter', url: 'https://www.ready.gov/shelter' },
      { label: 'FEMA — Repairing your home after a disaster', url: 'https://www.fema.gov/assistance/individual/program/essential-assistance' },
      { label: 'CDC — Healthy homes and lead', url: 'https://www.cdc.gov/healthyhomes/' },
      { label: 'Wilderness Medical Society — Improvised shelter', url: 'https://www.wms.org/medicine/wilderness-first-responder' },
    ],
  },
];
