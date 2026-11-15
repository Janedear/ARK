export const waterFoodGuides = [
  {
    slug: 'water-safety',
    category: 'water',
    title: 'Drinking water in an outage',
    summary: 'How much to store, exactly how to treat water you are unsure about, and when treating is pointless.',
    quickSteps: [
      'Store at least 1 gallon (about 4 litres) per person per day for drinking and sanitation. Three days minimum, two weeks if you can. Active adults, nursing mothers, and people working in heat need 2 gallons.',
      'Boil uncertain water at a rolling boil for 1 minute, or 3 minutes above roughly 6,500 ft (2,000 m). Let it cool covered before drinking.',
      'If you are told to disinfect with bleach: 8 drops (about 1/8 teaspoon) of unscented 5–8.25% chlorine bleach per gallon of clear water, 16 drops if the water is cloudy, then wait 30 minutes. It should smell faintly of chlorine; if not, repeat once and discard if it still does not.',
      'A do-not-drink notice is different from a boil notice. If the warning is chemical, boiling concentrates it. Use bottled water or another source instead.',
      'Never drink from radiators, hot-water heating systems, swimming pools, spas or water beds. Their chemicals cannot be removed by boiling.'
    ],
    sections: [
      {
        heading: 'Fill up before the pressure drops',
        body: [
          'Fill clean containers, the bathtub and any food-grade buckets while pressure is still available. Label each with the date and rotate stored water every six months.',
          'A bathtub of water is for washing and flushing, not for drinking, unless you have a food-grade liner and treat it first.',
          'Commercial water storage containers (5–55 gallon) with airtight lids are ideal. Glass jars with tight lids work. Avoid milk jugs — the plastic breaks down and old milk residue harbours bacteria.',
        ],
      },
      {
        heading: 'Boiling beats everything else',
        body: [
          'Boiling is the most reliable method against bacteria, viruses and parasites. A rolling boil for one minute is enough at low altitude; add two minutes above 6,500 ft.',
          'Boiling does not remove chemicals, salt or heavy metals. If you suspect those, use bottled water or a filter certified for them.',
          'Let boiled water cool in a covered container. Pouring it back and forth between two clean containers improves the flat taste.',
        ],
      },
      {
        heading: 'Bleach disinfection: exact ratios',
        body: [
          'Use only unscented liquid chlorine bleach with 5–8.25% sodium hypochlorite. Do not use bleach with added cleaners or thickeners.',
          'Clear water: 8 drops (1/8 tsp) per gallon. Cloudy or coloured water: 16 drops per gallon. Stir and let stand 30 minutes before drinking.',
          'The water should have a slight chlorine smell. If not, repeat the dose and wait another 15 minutes. If it still has no smell, discard the water and find another source.',
          'Bleach effectiveness declines after one year. Check the date on the bottle.',
        ],
      },
      {
        heading: 'Filters, tablets and SODIS',
        body: [
          'Use a filter rated for the contaminants you are worried about. Many camping filters handle bacteria and protozoa but not viruses; boiling or chemical treatment covers that gap.',
          'Chlorine dioxide or iodine tablets need the contact time on the label, usually 30 minutes or more, and colder water needs longer. Iodine is not for pregnant people, people with thyroid conditions, or continuous use beyond a few weeks.',
          'SODIS (Solar Water Disinfection): fill a clear PET plastic bottle (not glass, not coloured) and lay it in direct sunlight for 6 hours (1 day cloudy, 2 days overcast). Works against bacteria, viruses, and protozoa when UV index is high enough. Not effective for turbid or deeply coloured water.',
          'Improvised gravity filter: layer fine sand, then coarse sand, then small gravel, then larger gravel in a container with a hole in the bottom. This removes sediment but NOT pathogens — always follow with boiling or chemical treatment.',
        ],
      },
      {
        heading: 'Finding water when stored supply runs out',
        body: [
          'Rainwater: collect from clean roof surfaces into clean containers. First-flush rainwater carries roof debris — discard the first several gallons. Still treat before drinking.',
          'Natural sources: running water is safer than standing water. Upstream of human habitation is safer than downstream. All natural water must be treated regardless of how clear it looks.',
          'After flooding, assume all well water is contaminated until tested. Do not use a flooded well until it has been inspected, pumped out, disinfected, and tested by your health department.',
          'Water from water heaters (if the tank was sealed and not in the flood zone): turn off the power or gas, attach a hose to the tank drain valve, and let gravity fill containers. Treat before drinking if there is any doubt.',
          'Canned vegetables and fruits contain liquid. Juices from canned goods are safe and can supplement water.',
        ],
      },
      {
        heading: 'Waterborne disease: signs and response',
        body: [
          'Common waterborne illnesses: Giardia (1–3 week incubation, greasy diarrhoea, bloating), Cryptosporidium (1–12 day incubation, watery diarrhoea, nausea — resistant to bleach, requires boiling or certified filter), cholera (rapid severe watery diarrhoea — rare in US but possible after major flooding), hepatitis A (2–6 week incubation, jaundice, nausea).',
          'Dehydration stages: mild (thirst, darker urine, headache); moderate (very dark urine, dizziness, dry mouth, rapid heartbeat); severe (no urination, confusion, rapid breathing, sunken eyes). Severe dehydration is a medical emergency.',
          'Oral rehydration: mix 1 litre of treated water + 6 level teaspoons of sugar + 1/2 teaspoon of salt. Stir until dissolved. Sip slowly, especially with vomiting. This replaces electrolytes lost through diarrhoea.',
          'Get medical help for: bloody diarrhoea, signs of severe dehydration, diarrhoea lasting more than 3 days in an adult or 1 day in an infant, any fever above 102°F / 39°C with diarrhoea.',
        ],
      },
      {
        heading: 'Sanitation matters as much as drinking',
        body: [
          'Reserve water for handwashing before meals and after using the toilet. Hand hygiene prevents more illness in a prolonged outage than any water treatment upgrade.',
          'Minimum handwashing: 20 seconds with soap, working it into all surfaces. If water is scarce, hand sanitiser with 60%+ alcohol works for most pathogens but not norovirus or Clostridioides difficile — soap and water is always better.',
          'If plumbing fails, follow your local health department instructions for waste. Do not improvise disposal near wells, streams or gardens.',
        ],
      },
    ],
    sources: [
      { label: 'Ready.gov — Water', url: 'https://www.ready.gov/water' },
      { label: 'CDC — Make water safe during an emergency', url: 'https://www.cdc.gov/water-emergency/about/index.html' },
      { label: 'EPA — Emergency disinfection of drinking water', url: 'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water' },
      { label: 'WHO — SODIS guidance', url: 'https://www.who.int/publications/i/item/9789241598309' },
    ],
  },
  {
    slug: 'food-safety',
    category: 'food',
    title: 'Keeping food safe without power',
    summary: 'The exact time and temperature limits, and how to decide what to throw out without guessing.',
    quickSteps: [
      'Keep the refrigerator and freezer closed. A closed refrigerator holds food safe for about 4 hours. A full freezer holds about 48 hours; a half-full one about 24.',
      'Throw out perishable food that has been above 40°F (4°C) for more than 2 hours. This includes meat, poultry, fish, eggs, soft cheese, cut fruit and cooked leftovers.',
      'Never taste food to decide whether it is safe. Pathogens do not change smell, colour or texture.',
      'Refreeze food only if it still contains ice crystals or is at or below 40°F. Otherwise cook it or discard it.',
      'Never burn charcoal, a camping stove or a generator indoors, in a garage, or in a tent. Carbon monoxide from these kills people every year.'
    ],
    sections: [
      {
        heading: 'Make the cold last',
        body: [
          'Group frozen items together and fill gaps with frozen water bottles or a block of ice. A full freezer stays cold far longer than a half-empty one.',
          'Keep a thermometer in the refrigerator and freezer so you can read the temperature instead of guessing. Refrigerator safe zone: 35–40°F. Freezer safe zone: 0°F or below.',
          'Dry ice extends a full freezer: 50 lbs holds a full freezer 3–4 days. Wear insulated gloves when handling. Dry ice in a refrigerator or cooler: 25 lbs keeps it cold 1–2 days.',
        ],
      },
      {
        heading: 'What is safe to eat — decision guide',
        body: [
          'Still safe regardless of time without power: unopened commercial mayonnaise, peanut butter, jelly, hard cheeses (Parmesan, Romano, Cheddar, Swiss — in original wrapping), processed cheese, grated Parmesan in can, fresh uncut fruits and vegetables, bread, rolls, cakes, muffins.',
          'Safe if the outage was less than 4 hours: opened mayonnaise, salad dressing, ketchup, mustard; most cheeses; eggs in shell; fresh pasta; cooked foods; leftovers. Discard if above 40°F more than 2 hours.',
          'Always discard: raw or cooked meat, poultry, seafood; milk, cream, yogurt; soft cheeses; casseroles, stews, soups; custard, pudding, pie; opened canned meats or fish; tofu.',
          'The mold, bad smell, and sliminess rules only apply after discard — if it passes those checks, that does not mean it is safe.',
        ],
      },
      {
        heading: 'Food preservation without power',
        body: [
          'Salt curing: dry salt draws moisture out and creates an inhospitable environment for bacteria. Requires 2–3% salt by weight for refrigerated safety, 3–8% for room temperature. Fully cured products (like salt cod) can last months.',
          'Smoking: combines heat, drying, and chemical compounds from smoke. Hot smoking (160–180°F) cooks and preserves simultaneously. Requires a consistent heat source and monitoring.',
          'Solar drying: slice thin, lay on clean screens in direct sunlight, cover with cheesecloth to keep insects off. Fruits: 1–2 days. Vegetables: 1–4 days depending on moisture content. Food is done when it snaps, not bends.',
          'Vinegar pickling: a 5% vinegar brine (1 cup vinegar, 1 cup water, 1 tsp salt) with vegetables stored in clean sealed jars inhibits most bacterial growth. Refrigerate if possible, use within weeks if not properly sealed and water-bath processed.',
          'Fermentation: lacto-fermented vegetables (sauerkraut, kimchi) use salt and naturally present bacteria to preserve food. 2% salt by weight, pack tight, keep submerged. Ready in 3–7 days at room temperature. Can last months if kept cool.',
        ],
      },
      {
        heading: 'Caloric needs under stress',
        body: [
          'Sedentary adult (resting, sheltering): 1,600–2,000 kcal/day. Active adult (working, moving, cold): 2,500–3,500 kcal/day. Children: 1,000–2,200 kcal/day depending on age.',
          'Emergency calorie sources per serving: peanut butter (2 tbsp = 190 kcal), canned beans (1 cup = 220–280 kcal), canned tuna (3 oz = 100 kcal), crackers (1 oz = 120 kcal), dried fruit (1/4 cup = 100–130 kcal), trail mix (1/4 cup = 170 kcal).',
          'Protein needs: 0.5–0.8g per pound of body weight per day. Under stress and physical work, aim toward the higher end. Canned fish, beans, lentils, peanut butter, and nuts provide protein without refrigeration.',
          'Rationing: if food supply is uncertain, calculate calories on hand divided by people divided by days you need to last. Adults can tolerate 1,000–1,200 kcal/day for short periods with no long-term harm. Below 800 kcal affects cognition.',
        ],
      },
      {
        heading: 'Special dietary needs',
        body: [
          'Infants: breast milk is safest and needs no preparation. Formula-fed infants under 6 months are at high risk — store a 2-week supply of ready-to-feed formula (no water required). After 6 months, age-appropriate soft foods from unopened containers are acceptable.',
          'Elderly: often have reduced thirst sensation and may not drink enough — offer water regularly. Softer textures from canned goods are easier to manage. Watch for medication interactions (see medical guide).',
          'Diabetics: stable blood sugar depends on consistent carbohydrate intake. Stored foods should include slow-digesting carbs (beans, lentils, whole grain crackers). Keep juice boxes or glucose tablets for hypoglycaemia. Test blood sugar more frequently during stress.',
          'Celiac and allergies: kit foods must be verified against the person's specific restrictions. Cross-contamination risk rises when cooking in limited conditions.',
          'Renal (kidney) patients: often on potassium and phosphorus restrictions. High-potassium foods (bananas, beans, tomatoes) can be harmful. Consult a nephrologist for an emergency food list specific to their stage and treatment.',
        ],
      },
      {
        heading: 'Basic foraging — three reliably safe plants',
        body: [
          'Dandelion (Taraxacum officinale): entire plant edible. Young leaves raw in salads, older leaves cooked. Yellow flowers edible. Roots can be roasted and used as a coffee substitute. Grows in lawns and disturbed ground. Identify by: jagged teeth on leaves pointing back toward stem, hollow stem with milky sap, single flower per stem.',
          'Cattail (Typha latifolia): found near ponds, marshes, and slow streams. Spring: peel young shoots and eat raw or cooked. Early summer: green flower spikes cooked like corn. Late summer: starchy pollen collected for flour. Fall/winter: starchy roots pounded into flour. Do not harvest from polluted water.',
          'Wild raspberry / blackberry (Rubus species): thorned canes with compound leaves, red or black fruit. If it looks like a raspberry and comes off a thorned cane cleanly when ripe, it is safe. No dangerous lookalikes in North America. Leaves also make tea.',
          'Foraging caution: never eat a plant you cannot positively identify. Wash everything. Avoid anything near roads, railroad tracks, or areas that may have been sprayed with pesticides. Never eat mushrooms unless you are trained — the death cap (Amanita phalloides) causes fatal liver failure with no immediate symptoms.',
        ],
      },
      {
        heading: 'A cooler is a second freezer',
        body: [
          'Keep raw meat below ready-to-eat food, and keep ice in sealed containers so meltwater does not contaminate anything.',
          'Check the cooler temperature with the same thermometer. If it rises above 40°F for more than 2 hours, treat the contents as spoiled.',
          'A quality cooler with block ice can hold food safe for 2–3 days. Crush ice melts faster but cools faster — use block ice for extended storage, crush ice for initial rapid cooling.',
        ],
      },
      {
        heading: 'After the power returns',
        body: [
          'Check each item separately rather than judging the whole refrigerator. Discard anything that was above 40°F for more than 2 hours.',
          'Clean and sanitise the refrigerator and freezer before restocking if anything spoiled inside.',
          'When in doubt, throw it out. Food poisoning in a disaster situation — when medical care may be unavailable — is far more dangerous than the loss of food.',
        ],
      },
    ],
    sources: [
      { label: 'FoodSafety.gov — Food safety in a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' },
      { label: 'USDA FSIS — A consumer guide to food quality and safe handling', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics' },
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
      { label: 'CDC — Emergency food safety', url: 'https://www.cdc.gov/disasters/floods/foodwater.html' },
    ],
  },
  {
    slug: 'sanitation-no-water',
    category: 'water',
    title: 'Toilets and waste when water fails',
    summary: 'Keeping waste away from people, water and food when the plumbing stops working.',
    quickSteps: [
      'Stop flushing once you know pressure is lost. Each flush wastes several gallons you may need.',
      'Line the toilet bowl with a double plastic bag, use it, then cover each deposit with sawdust, cat litter or shredded paper and seal the bag when it is about half full.',
      'Keep waste at least 100 feet (30 m) from wells, streams, ditches and the house foundations, and never in a storm drain.',
      'Wash hands with soap and treated water after every contact. If water is short, use hand sanitiser with at least 60% alcohol, but soap and water is better whenever it is available.',
      'Follow your local health department instructions as soon as they publish any. Improper waste handling causes disease outbreaks after floods and long outages.'
    ],
    sections: [
      {
        heading: 'Toilet options without running water',
        body: [
          'Lined bucket toilet: use a 5-gallon bucket with a snap-on seat (sold in camping stores), lined with a heavy-duty bag. After each use, add sawdust, cat litter, or shredded paper to cover and reduce odour. Seal and replace the bag when about half full.',
          'Existing toilet: if the sewer line is intact but water pressure is lost, a toilet can still be flushed manually. Pour 1–3 gallons of water directly into the bowl (not the tank) quickly enough to trigger the siphon. This uses stored water, so reserve it for necessity.',
          'If sewer lines may be damaged (earthquake, major flooding): do NOT flush or use indoor plumbing until cleared by authorities. Sewage can back up into the home through lower drains.',
          'Cat hole latrine for outdoor use: dig 6–8 inches deep, 200 feet from water sources, trails, and camp. Cover completely after use. Good for short-term small groups only.',
        ],
      },
      {
        heading: 'Set up before it is urgent',
        body: [
          'Store heavy-duty bags, gloves, a lidded bucket, disinfectant and paper towels with the rest of the kit. These items run out in shops first.',
          'Decide in advance where the emergency toilet goes: away from food preparation, sleeping areas and any water source.',
          'Stockpile: heavy-duty 33-gallon bags (not standard kitchen bags — they tear), disposable gloves, toilet paper, hand sanitiser, and a tightly-lidded disposal bucket.',
        ],
      },
      {
        heading: 'Managing waste safely',
        body: [
          'Double-bag all waste. Tie each bag securely. Store sealed bags outside the living space in a lidded container until collection resumes.',
          'Disinfect any surface that contacts waste with a diluted bleach solution (1 tablespoon bleach per gallon of water).',
          'Wash hands with soap and water after every contact with waste materials, even when gloves were worn.',
        ],
      },
      {
        heading: 'Long-term: humanure composting',
        body: [
          'For outages lasting weeks to months: a properly managed hot compost pile can safely process human waste. Requires: a minimum pile size of 3 cubic feet, reaching 130–160°F internal temperature for at least 3 days (kills pathogens), regular turning, and a 1-year rest period before use as garden compost.',
          'This is not for initial emergency response — it requires setup, monitoring, and space. It is an option only when normal waste services are suspended indefinitely.',
          'Never use uncomposted human waste on food gardens. The risk of parasitic infection is high.',
        ],
      },
      {
        heading: 'Disposal',
        body: [
          'Sealed bags go out with normal waste once collection resumes. Do not bury waste in a garden or near a well.',
          'If collection has stopped entirely, follow public health guidance for your area rather than improvising a long-term solution.',
        ],
      },
    ],
    sources: [
      { label: 'CDC — Sanitation and hygiene in emergencies', url: 'https://www.cdc.gov/sanitation/' },
      { label: 'Ready.gov — Sanitation', url: 'https://www.ready.gov/sanitation' },
      { label: 'EPA — Water emergencies', url: 'https://www.epa.gov/water-resilience' },
      { label: 'WHO — Emergency sanitation', url: 'https://www.who.int/publications/i/item/9789241548274' },
    ],
  },
  {
    slug: 'rainwater-collection',
    category: 'water',
    title: 'Collecting and using rainwater',
    summary: 'How to safely collect, store, and treat rainwater as a backup drinking source.',
    quickSteps: [
      'Collect from a clean roof surface — metal or hard plastic roofing is safer than asphalt shingles (which leach chemicals). Discard the first 1–2 gallons of each rain event (first-flush debris).',
      'Filter collected water through a cloth to remove debris, then treat by boiling or bleach disinfection before drinking.',
      'Store in clean, food-grade containers with tight-fitting lids. Keep containers in a cool, dark location.',
      'Check local regulations — some states have restrictions on rainwater collection, though most emergency use is exempt.',
      'Rainwater is generally safer than surface water but is not sterile. Always treat before drinking.'
    ],
    sections: [
      {
        heading: 'Setting up collection',
        body: [
          'The simplest system: a clean tarp or plastic sheeting angled into a clean container. Any slope that channels water works.',
          'Gutters and downspouts can be diverted with a first-flush diverter (a vertical pipe that fills and diverts the first dirty flush, then allows clean water to continue to storage).',
          'Collection rate: a 1,000 sq ft roof in a 1-inch rain event produces approximately 600 gallons. Even a 100 sq ft tarp in a 1-inch rain produces 60 gallons — several days of drinking water for a small group.',
        ],
      },
      {
        heading: 'Common contaminants in rainwater',
        body: [
          'Atmospheric: particulates, bird and animal droppings on roof, industrial fallout. Boiling and filtration address most biological risks.',
          'Roof materials: lead paint, zinc from galvanised metal, copper, asphalt chemicals. If your roof has peeling paint or is very old, rainwater from it should not be used for drinking even after treatment — use for sanitation only.',
          'After major industrial events or wildfires: rainwater may carry ash and chemical contaminants not removed by standard treatment. Use only for non-consumption purposes until authorities clear the air quality.',
        ],
      },
    ],
    sources: [
      { label: 'CDC — Make water safe during an emergency', url: 'https://www.cdc.gov/water-emergency/about/index.html' },
      { label: 'EPA — Rainwater collection', url: 'https://www.epa.gov/sites/default/files/2015-11/documents/rainharvesting.pdf' },
    ],
  },
];
