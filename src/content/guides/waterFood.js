export const waterFoodGuides = [
  {
    slug: 'water-safety',
    category: 'water',
    title: 'Drinking water in an outage',
    summary: 'How much to store, exactly how to treat water you are unsure about, and when treating is pointless.',
    quickSteps: [
      'Store at least 1 gallon (about 4 litres) per person per day for drinking and sanitation. Three days minimum, two weeks if you can.',
      'Boil uncertain water at a rolling boil for 1 minute, or 3 minutes above roughly 6,500 ft (2,000 m). Let it cool covered before drinking.',
      'If you are told to disinfect with bleach: 8 drops (about 1/8 teaspoon) of unscented 5–8.25% chlorine bleach per gallon of clear water, 16 drops if the water is cloudy, then wait 30 minutes. It should smell faintly of chlorine; if not, repeat once and discard if it still does not.',
      'A do-not-drink notice is different from a boil notice. If the warning is chemical, boiling concentrates it. Use bottled water or another source instead.',
      'Never drink from radiators, hot-water heating systems, swimming pools, spas or water beds. Their chemicals cannot be removed by boiling.'
    ],
    sections: [
      { heading: 'Fill up before the pressure drops', body: ['Fill clean containers, the bathtub and any food-grade buckets while pressure is still available. Label each with the date and rotate stored water every six months.', 'A bathtub of water is for washing and flushing, not for drinking, unless you have a food-grade liner and treat it first.'], },
      { heading: 'Boiling beats everything else', body: ['Boiling is the most reliable method against bacteria, viruses and parasites. A rolling boil for one minute is enough at low altitude; add two minutes above 6,500 ft.', 'Boiling does not remove chemicals, salt or heavy metals. If you suspect those, use bottled water or a filter certified for them.'], },
      { heading: 'Filters, tablets and bleach', body: ['Use a filter rated for the contaminants you are worried about. Many camping filters handle bacteria and protozoa but not viruses; boiling or chemical treatment covers that gap.', 'Chlorine dioxide or iodine tablets need the contact time on the label, usually 30 minutes or more, and colder water needs longer. Iodine is not for pregnant people, people with thyroid conditions, or continuous use beyond a few weeks.'], },
      { heading: 'Sanitation matters as much as drinking', body: ['Reserve water for handwashing before meals and after using the toilet. Hand hygiene prevents more illness in a prolonged outage than any water treatment upgrade.', 'If plumbing fails, follow your local health department instructions for waste. Do not improvise disposal near wells, streams or gardens.'], },
    ],
    sources: [
      { label: 'Ready.gov — Water', url: 'https://www.ready.gov/water' },
      { label: 'CDC — Make water safe during an emergency', url: 'https://www.cdc.gov/water-emergency/about/index.html' },
      { label: 'EPA — Emergency disinfection of drinking water', url: 'https://www.epa.gov/ground-water-and-drinking-water/emergency-disinfection-drinking-water' },
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
      { heading: 'Make the cold last', body: ['Group frozen items together and fill gaps with frozen water bottles or a block of ice. A full freezer stays cold far longer than a half-empty one.', 'Keep a thermometer in the refrigerator and freezer so you can read the temperature instead of guessing.'], },
      { heading: 'A cooler is a second freezer', body: ['Keep raw meat below ready-to-eat food, and keep ice in sealed containers so meltwater does not contaminate anything.', 'Check the cooler temperature with the same thermometer. If it rises above 40°F for more than 2 hours, treat the contents as spoiled.'], },
      { heading: 'Eating well without cooking', body: ['Plan for meals that need no heat: canned beans and fish, nut butters, crackers, shelf-stable milk, dried fruit, cereal. Keep a manual can opener with the food, not in a drawer at home.', 'Rotate the pantry every six months and eat what you store, so nothing in the kit is unfamiliar when it matters.'], },
      { heading: 'After the power returns', body: ['Check each item separately rather than judging the whole refrigerator. Discard anything that was above 40°F for more than 2 hours.', 'Clean and sanitise the refrigerator and freezer before restocking if anything spoiled inside.'], },
    ],
    sources: [
      { label: 'FoodSafety.gov — Food safety in a power outage', url: 'https://www.foodsafety.gov/food-safety-charts/food-safety-during-power-outage' },
      { label: 'USDA FSIS — A consumer guide to food quality and safe handling', url: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics' },
      { label: 'Ready.gov — Power outages', url: 'https://www.ready.gov/power-outages' },
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
      { heading: 'Set up before it is urgent', body: ['Store heavy-duty bags, gloves, a lidded bucket, disinfectant and paper towels with the rest of the kit. These items run out in shops first.', 'Decide in advance where the emergency toilet goes: away from food preparation, sleeping areas and any water source.'], },
      { heading: 'Keep it separate', body: ['Designate one container as the toilet and never use it for anything else. Keep a lid on it and keep it outside the main living space if you can.', 'People who are ill, pregnant, very young or immunocompromised should have the cleanest available option and the shortest distance to it.'], },
      { heading: 'Disposal', body: ['Sealed bags go out with normal waste once collection resumes. Do not bury waste in a garden or near a well.', 'If collection has stopped entirely, follow public health guidance for your area rather than improvising a long-term solution.'], },
    ],
    sources: [
      { label: 'CDC — Sanitation and hygiene in emergencies', url: 'https://www.cdc.gov/sanitation/' },
      { label: 'Ready.gov — Sanitation', url: 'https://www.ready.gov/sanitation' },
      { label: 'EPA — Water emergencies', url: 'https://www.epa.gov/water-resilience' },
    ],
  },
];