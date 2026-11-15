/**
 * Medical reference guide for disaster scenarios.
 *
 * IMPORTANT: This guide is written from published government, humanitarian,
 * and medical organisation guidance. It has not been reviewed by a clinician.
 * It does not diagnose, prescribe, or replace professional medical care.
 * In any situation where professional care is accessible, seek it.
 * This guide exists for situations where it is not.
 */

export const medicalGuides = [
  {
    slug: 'vital-signs',
    category: 'medical',
    title: 'Normal vital signs by age',
    summary: 'The numbers that define normal — and what deviations tell you.',
    quickSteps: [
      'Pulse: find at the wrist (radial) below the thumb, or at the side of the neck (carotid). Count beats for 30 seconds and multiply by 2.',
      'Respirations: count chest rises for 30 seconds and multiply by 2. Watch without telling the person — awareness changes the breathing rate.',
      'Temperature: 98.6°F / 37°C is average adult; normal range is 97–99°F. Fever in adults is 100.4°F / 38°C or above.',
      'Level of consciousness: AVPU scale — Alert (responds normally), Voice (responds to voice), Pain (responds only to pain stimulus), Unresponsive.',
      'Write down vitals with the time taken. Changes over time are more important than a single reading.'
    ],
    sections: [
      {
        heading: 'Normal ranges by age',
        body: [
          'Newborn (0–1 month): Heart rate 100–160 bpm. Respirations 30–60 per minute. Temperature 97.7–99.5°F / 36.5–37.5°C. Blood pressure not measurable without equipment.',
          'Infant (1 month–1 year): Heart rate 100–160 bpm. Respirations 20–40 per minute. Temperature 97.9–100.4°F.',
          'Toddler/child (1–10 years): Heart rate 70–120 bpm. Respirations 20–30 per minute (younger end) to 15–20 (older end). Temperature 97.9–100.4°F.',
          'Adolescent (10–18 years): Heart rate 60–100 bpm. Respirations 12–20 per minute. Temperature 97.9–100.4°F.',
          'Adult (18–65 years): Heart rate 60–100 bpm. Respirations 12–20 per minute. Temperature 97–99°F.',
          'Elderly (65+): Heart rate may be slower, especially on beta-blockers. Respirations 12–20. Temperature baseline may be lower — 97°F may be their normal. A temperature of 99°F in an elderly person may be a significant fever.',
        ],
      },
      {
        heading: 'When vital signs are concerning',
        body: [
          'Heart rate above 100 at rest in an adult (tachycardia): fever, dehydration, blood loss, pain, anxiety, medication, heart condition. Combined with low blood pressure signs (pallor, dizziness): possible shock.',
          'Heart rate below 60 at rest in a non-athlete adult (bradycardia): medication side effect (beta-blockers), hypothyroidism, heart block. If accompanied by dizziness, fainting, or chest pain: emergency.',
          'Respirations above 20 per minute at rest in an adult: fever, infection, respiratory illness, pain, anxiety, heart failure. Above 30 per minute: serious respiratory distress.',
          'Respirations below 12 per minute in an adult: opioid overdose, sedative overdose, severe neurological event. Below 8 per minute: respiratory failure. Begin rescue breathing.',
          'Temperature above 104°F / 40°C in an adult: seek immediate cooling and medical care. Temperature above 107°F / 41.7°C: organ damage risk.',
          'Temperature below 95°F / 35°C: hypothermia. Begin rewarming. See extreme cold guide.',
        ],
      },
      {
        heading: 'Pulse oximetry (if available)',
        body: [
          'Normal SpO2 (blood oxygen saturation): 95–100%. Below 95%: low oxygen, medical evaluation needed. Below 90%: emergency.',
          'Pulse oximeters are inexpensive (~$20–$30) and highly useful in a preparedness kit. They work best on clean, warm fingers. Nail polish can interfere — use a different finger.',
          'Note: pulse oximeters are less accurate in people with darker skin tones, particularly at the borderline low ranges. Err toward more conservative thresholds if the reading seems inconsistent with symptoms.',
        ],
      },
    ],
    sources: [
      { label: 'American Heart Association — Vital signs', url: 'https://www.heart.org/en/health-topics/heart-attack/diagnosing-a-heart-attack/understanding-blood-pressure-readings' },
      { label: 'Merck Manual — Normal vital signs', url: 'https://www.merckmanuals.com/professional/special-subjects/reference-values/normal-vital-signs' },
    ],
  },
  {
    slug: 'wound-care',
    category: 'medical',
    title: 'Wound care',
    summary: 'Deciding how serious a wound is, cleaning it correctly, and knowing when to seek care.',
    quickSteps: [
      'Stop bleeding first: direct pressure for 10 minutes without removing the cloth.',
      'Clean once bleeding is controlled: rinse with clean water under pressure (a syringe, a bag with a small hole, or a water bottle with a pinhole) for 5–10 minutes.',
      'Signs of infection (developing over 1–3 days): increasing redness spreading from the wound, warmth, swelling, pus, red streaks tracking from the wound (serious), fever. Treat infection as a medical emergency in a disaster scenario.',
      'Never close (suture or tape closed) a wound that has not been thoroughly cleaned, that is more than 6 hours old, or that appears infected.',
      'Tetanus risk: any puncture wound, animal bite, wound with soil contamination, or wound in someone not up to date on tetanus vaccination — these need medical attention if at all possible.'
    ],
    sections: [
      {
        heading: 'Wound severity decision tree',
        body: [
          'Minor (self-treat): bleeding controlled in under 10 minutes of direct pressure, wound edges close together on their own, clean wound on a non-critical body area, no sign of deep structure involvement (tendon, bone, nerve).',
          'Serious (needs medical care, prioritise): wound that cannot be controlled with 10 minutes of direct pressure, wound that gaps open and will not hold closed, wound on the face, hand, foot, or over a joint (function at risk), wound with foreign material that cannot be removed, animal or human bite, any sign of infection.',
          'Life-threatening (immediate emergency): arterial bleeding (bright red, pulsing), wound to the chest or abdomen, wound with exposed bone, tendon, or organ, wound with progressive shock signs.',
        ],
      },
      {
        heading: 'Wound cleaning technique',
        body: [
          'Wash your hands before and after. Wear gloves if available.',
          'Remove visible debris gently with clean tweezers or a gloved hand. Do not probe deeply — stop if you feel resistance.',
          'Irrigate: 50–100mL of clean water delivered under pressure cleans more effectively than any antiseptic alone. A 10–20mL syringe with a small-bore tip is ideal. Rinse until the wound bed looks clean.',
          'Antiseptic options: povidone-iodine solution (diluted to 0.5–1% if using concentrated form), or Dakin\'s solution. These can damage tissue in concentration — dilute properly. Hydrogen peroxide and undiluted betadine damage tissue and delay healing — avoid on fresh wounds.',
          'Do not irrigate puncture wounds — this can push contamination deeper.',
        ],
      },
      {
        heading: 'Wound closure',
        body: [
          'Steri-strips or butterfly bandages: for minor wounds with clean, well-opposed edges. Clean and dry the skin around the wound before applying. Cross the wound, pulling the edges together gently. Leave in place 5–7 days.',
          'Do not use wound closure strips on: infected wounds, wounds more than 6 hours old in a dirty environment, puncture wounds, animal bites, heavily contaminated wounds, wounds with tension across the closure.',
          'If wound closure material is unavailable and medical care is not accessible: cover with a non-stick dressing and keep clean and moist (moist wound healing). The wound will heal by secondary intention (granulation). This takes longer but is safer than closing a contaminated wound.',
        ],
      },
      {
        heading: 'Improvised equipment',
        body: [
          'Tourniquet: a belt, necktie, or torn 2-inch-wide strip of cloth — apply above the wound, twist with a stick, and secure. Write the application time.',
          'Splint: any rigid material (board, rolled magazine, sticks) padded with soft material and secured with strips of cloth above and below the injury.',
          'Stretcher: a door, a board, or two sturdy poles with a tarp or coats threaded through them. Requires at least 2 people. Keep the patient horizontal and still.',
          'Sling: a large triangular bandage or a folded scarf. Place under the forearm, tie at the neck, secure the elbow with a second strip.',
        ],
      },
      {
        heading: 'Stockpile: OTC medications with evidence in disaster scenarios',
        body: [
          'Ibuprofen (Advil, Motrin): anti-inflammatory, pain, fever. Adult dose: 400–600mg every 6–8 hours with food. Not for children under 6 months, people with kidney disease, peptic ulcer, or on blood thinners.',
          'Acetaminophen (Tylenol): pain and fever, safer for stomach. Adult dose: 500–1000mg every 6–8 hours. Maximum 3,000mg/day for most adults, 2,000mg/day for elderly. Never exceed the daily limit — serious liver damage can occur with overdose.',
          'Diphenhydramine (Benadryl): antihistamine for allergic reactions. Adult dose: 25–50mg every 6–8 hours. Also has sedative effects (useful for sleep in extreme stress — use cautiously).',
          'Loperamide (Imodium): anti-diarrhoeal. 2mg per dose, up to 16mg/day. Important: do not use if bloody diarrhoea or fever — these suggest invasive bacterial infection where slowing gut motility can worsen the illness.',
          'Oral rehydration salts (ORS): a prepared formulation for dehydration from diarrhoea, vomiting, or heat. The WHO formulation works; Pedialyte or similar are equivalent. Can be made: 1 litre treated water + 6 teaspoons sugar + 1/2 teaspoon salt.',
          'Antacids (calcium carbonate, aluminum hydroxide): gastric distress from stress or unfamiliar food is common in disasters. Standard OTC doses.',
          'Topical antibiotic ointment (bacitracin, Neosporin): reduces infection risk in minor wounds. Apply a thin layer under a sterile dressing.',
          'Topical hydrocortisone 1%: contact dermatitis, insect bites, mild rashes. Standard OTC doses.',
          'Clotrimazole antifungal cream: fungal skin infections increase in hot humid conditions with limited hygiene access.',
        ],
      },
      {
        heading: 'Medication dosing by weight (paediatric)',
        body: [
          'Ibuprofen (children 6 months and older): 5–10mg per kg body weight per dose, every 6–8 hours. Max 40mg/kg/day. Available as 100mg/5mL suspension.',
          'Acetaminophen (all ages): 10–15mg per kg per dose, every 4–6 hours. Max 5 doses in 24 hours. Available as 160mg/5mL suspension for children.',
          'Weight reference: a typical 1-year-old weighs about 10kg (22 lbs). A 5-year-old: about 18kg (40 lbs). An 8-year-old: about 25kg (55 lbs). A 12-year-old: about 40kg (88 lbs).',
          'When in doubt, use the lower end of the dosing range. The risk of under-dosing is less severe than the risk of over-dosing.',
        ],
      },
    ],
    sources: [
      { label: 'CDC — Wound care', url: 'https://www.cdc.gov/disasters/woundcare.html' },
      { label: 'StopTheBleed.org', url: 'https://www.stopthebleed.org/' },
      { label: 'WHO — Essential medicines', url: 'https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.02' },
    ],
  },
  {
    slug: 'mental-health-disaster',
    category: 'medical',
    title: 'Mental health in disasters',
    summary: 'Normal reactions, when to be concerned, and how to support yourself and others.',
    quickSteps: [
      'Acute stress responses (shaking, crying, confusion, difficulty thinking, nausea after a traumatic event) are normal human reactions, not signs of mental illness.',
      'The most effective immediate support is not therapy — it is safety, calm presence, practical help, and connection to others.',
      'Children who act out, regress, have nightmares, or cling excessively after a disaster are displaying normal stress responses. Maintain routines as much as possible.',
      'Suicidal risk increases during and after disasters. The 988 Lifeline (call or text 988) remains staffed. Take any mention of suicide seriously — ask directly, listen, stay present.',
      'Your own stress matters. You cannot help others effectively if you are exhausted, dehydrated, or not sleeping. This is not selfishness — it is operational necessity.'
    ],
    sections: [
      {
        heading: 'Acute stress response (first hours to days)',
        body: [
          'What is normal: shock and disbelief, numbness, crying, difficulty concentrating, irritability, physical symptoms (nausea, trembling, headache, heart pounding). These are physiological responses to extreme stress — the nervous system activating its emergency response.',
          'What to do: address physical needs first (warmth, water, safety). Do not force the person to talk. Stay calm and present. Physical contact (a hand on a shoulder) with consent can help. Avoid minimising ("you\'ll be fine") — acknowledge what happened.',
          'Psychological First Aid (PFA): the evidence-based approach is not therapy. It is: ensuring safety, meeting practical needs, reducing distress by being calm and present, connecting the person to social support and information, and protecting from further harm.',
        ],
      },
      {
        heading: 'Supporting children',
        body: [
          'Children read adult behaviour as a cue. Your calm (or your visible-but-managed distress) communicates safety or danger more than words.',
          'Age-appropriate communication: very young children (under 5) need physical comfort and routine. School-age children (6–12) can handle honest, simple explanations. Adolescents need honest information and a role in family decision-making.',
          'Common stress responses in children: regression (bedwetting in toilet-trained children, thumb-sucking), clingy behaviour, sleep problems, repetitive play related to the event, withdrawal, appetite changes. These are normal and temporary if needs are met.',
          'What helps children: maintaining predictable routines as much as possible, limiting media exposure to the disaster, honest age-appropriate answers to questions, physical play and activity, creative expression (drawing, stories), reassurance that adults are working to keep them safe.',
          'When to be more concerned: persistent sleep problems beyond 2 weeks, inability to separate from parents without extreme distress after 2–4 weeks, regression that is not improving, statements about not wanting to live.',
        ],
      },
      {
        heading: 'PTSD early signs and intervention',
        body: [
          'Acute stress disorder (days to 4 weeks after trauma): intrusive memories or nightmares, avoidance of reminders, hypervigilance (constant scanning for threat), negative mood and thoughts, difficulty functioning. This is common — it does not mean PTSD will develop.',
          'PTSD (symptoms persisting beyond 4 weeks): same symptoms plus significant impairment in daily functioning. Requires professional treatment. Effective treatments exist (Cognitive Processing Therapy, Prolonged Exposure, EMDR).',
          'Protective factors (reduce risk): social connection, sense of safety, a sense of meaning or purpose, prior resilience, access to basic needs, return to routine.',
          'Risk factors (increase risk): pre-existing mental health condition, prior trauma history, lack of social support, prolonged exposure to the traumatic event, significant losses.',
          'Natural recovery is the most common outcome. Most people exposed to trauma do not develop PTSD. Supporting recovery means supporting connection, safety, and meaning.',
        ],
      },
      {
        heading: 'Suicide risk during and after disasters',
        body: [
          'Disaster does increase suicide risk, particularly for: people who lost significant property or livelihood, people with pre-existing mental health conditions, people experiencing grief, elderly people who are isolated, emergency responders and volunteers (secondary trauma).',
          'Direct question approach: asking someone "Are you thinking about suicide?" does NOT increase risk — it reduces it by opening a conversation. If someone seems hopeless, despairing, or is giving away possessions, ask directly.',
          'If someone expresses suicidal thoughts: listen. Do not minimise. Do not argue or tell them they have things to live for. Remove access to means (guns, medication stockpiles) if at all possible. Stay with them. Call 988.',
          'Resources: 988 Suicide & Crisis Lifeline (call or text 988). Crisis Text Line (text HOME to 741741). Both are available 24/7.',
        ],
      },
      {
        heading: 'Self-care for responders and helpers',
        body: [
          'Compassion fatigue is real: prolonged exposure to others\' suffering depletes psychological reserves. Signs: emotional numbness, cynicism, reduced empathy, physical exhaustion, nightmares about others\' experiences.',
          'Minimum self-maintenance: sleep (even 4–6 hours in intervals is better than none), hydration and food, brief periods away from the immediate crisis even if only 10 minutes, human connection (not all conversations need to be about the emergency).',
          'Rotate roles: no single person should perform emotionally demanding work (casualty management, family notifications, crisis support) continuously. Rotate to practical tasks.',
          'After the acute phase: a brief structured debrief (what happened, what you felt, what it means, what you learned) reduces the lasting impact. This is not mandatory therapy — it is a normal conversation with a trusted person.',
        ],
      },
    ],
    sources: [
      { label: 'SAMHSA — Disaster behavioral health', url: 'https://www.samhsa.gov/disaster-preparedness' },
      { label: 'CDC — Mental health and disaster', url: 'https://www.cdc.gov/natural-disasters/mental-health/index.html' },
      { label: 'NCTSN — Psychological First Aid guide', url: 'https://www.nctsn.org/resources/psychological-first-aid-pfa-field-operations-guide-2nd-edition' },
    ],
  },
  {
    slug: 'special-populations-medical',
    category: 'medical',
    title: 'Medical care for special populations',
    summary: 'Insulin without refrigeration, dialysis emergencies, oxygen-dependent patients, and other situations requiring advance planning.',
    quickSteps: [
      'Insulin: opened vials survive 28 days at room temperature (below 77°F / 25°C). Insulin above 86°F / 30°C degrades faster. Never freeze insulin. Store out of direct sunlight.',
      'Dialysis patients: a missed session is life-threatening. Activate an emergency plan with a dialysis centre before disaster. Know your centre\'s emergency backup location.',
      'Oxygen-dependent patients: home concentrators require power. Backup compressed oxygen cylinders must be in place before an outage. Know their duration and have a plan for resupply.',
      'Register with your utility company and local emergency management if you or a household member depends on powered medical equipment.',
      'Keep a minimum 7-day supply of all prescription medications in your go-bag at all times. Rotate so they do not expire.'
    ],
    sections: [
      {
        heading: 'Insulin storage without refrigeration',
        body: [
          'Opened insulin vials: stable at room temperature (below 77°F / 25°C) for 28 days. Insulin pens (opened): typically 28 days at room temperature — verify for the specific product, as ranges vary (14–56 days depending on formulation).',
          'Unopened insulin: should be refrigerated (36–46°F / 2–8°C) and is good until the printed expiration date.',
          'Heat above 86°F / 30°C accelerates insulin degradation. Above 98.6°F / 37°C: significant degradation. If insulin has been in excessive heat, it may still appear clear (especially long-acting insulin) while being partially inactivated — blood sugar not responding as expected is a sign.',
          'If insulin must be kept cooler: an insulated pouch with a cold pack (not direct ice contact) can maintain temperature. FRIO cooling wallets use evaporative cooling to keep insulin below 80°F for up to 45 hours without refrigeration in temperatures up to 104°F.',
          'Signs that insulin has degraded: for clear rapid-acting or long-acting analogue insulins — if it appears cloudy or clumped, discard. For NPH or premixed (normally cloudy): appears stringy, granular, or clumped after gentle rolling, discard.',
          'Sick day rules during a disaster: illness increases insulin requirements. Test blood sugar more frequently. For Type 1: do NOT skip insulin even if not eating — the absence of food does not eliminate the need for basal insulin. Contact a medical provider if blood sugar is persistently above 250mg/dL.',
        ],
      },
      {
        heading: 'Dialysis emergency',
        body: [
          'Hemodialysis patients who miss a session accumulate potassium, fluid, and uremic toxins. Effects: lethargy, confusion, muscle weakness (from potassium), difficulty breathing (from fluid overload), irregular heartbeat. This is life-threatening within 1–3 missed sessions depending on residual kidney function.',
          'Emergency dietary restriction during dialysis disruption: low-potassium diet reduces accumulation rate. High-potassium foods to avoid: bananas, oranges, potatoes, tomatoes, beans, nuts, dairy, chocolate. This buys time, it does not replace dialysis.',
          'Know these in advance: your dialysis centre\'s emergency operating plan and backup location, the contact for your dialysis social worker, the hospital that can provide emergency inpatient dialysis. Have these numbers written down.',
          'Peritoneal dialysis patients: manual PD exchanges can continue without electricity. Know how to perform exchanges without a cycler. Keep a 2-week supply of PD solution on hand.',
          'Federal law requires dialysis centres in FEMA-declared disasters to accept out-of-network patients at no additional cost to the patient. This applies during declared federal disasters.',
        ],
      },
      {
        heading: 'Oxygen-dependent patients',
        body: [
          'Home oxygen concentrators require continuous power and cannot function during an outage. This requires advance planning — not emergency improvisation.',
          'Compressed oxygen cylinders: backup supply that does not require power. Duration depends on flow rate and cylinder size. An E cylinder at 2 L/min lasts approximately 5 hours. Keep at minimum a 48-hour supply on hand.',
          'Portable concentrators: some run on battery packs and car power. Know your device\'s battery duration and charging time.',
          'Register with your utility\'s medical baseline or life support programme. Utilities prioritise restoration for registered medical addresses.',
          'Register with local emergency management\'s Access and Functional Needs registry. This triggers welfare checks and evacuation priority.',
          'If the patient\'s oxygen needs exceed backup capacity: evacuation to a hospital or care facility may be necessary before the backup is exhausted, not after.',
        ],
      },
      {
        heading: 'Implanted cardiac devices',
        body: [
          'Pacemakers and ICDs (implantable cardioverter defibrillators): generally unaffected by power outages. The device runs on its own internal battery (5–10+ year lifespan).',
          'If the device fires (ICD shock): the person feels a sudden strong jolt. This is normal device function. Have them sit or lie down. If they feel multiple shocks, lose consciousness, or have chest pain, call 911.',
          'Electromagnetic interference: keep strong magnets and certain high-power devices away from the implant site. Consumer electronics at normal distances are safe. Notify all medical personnel of the device before any procedure.',
          'A wallet card describing the device should be carried at all times. This is especially critical when normal medical records are unavailable.',
        ],
      },
      {
        heading: 'Pregnancy during a disaster',
        body: [
          'First trimester: stress and dehydration can worsen morning sickness. Adequate hydration and small frequent meals are important.',
          'Third trimester: know the location and emergency status of your nearest hospital. Have transport arranged. Identify backup birth options if hospital access is compromised.',
          'Signs requiring immediate medical care at any stage: heavy vaginal bleeding, severe abdominal pain, significant decrease in fetal movement (after 28 weeks), severe headache with visual changes or swelling (pre-eclampsia signs), regular contractions before 37 weeks (preterm labour).',
          'Emergency birth: see the people guide for step-by-step emergency delivery. Call 911 and follow dispatcher guidance.',
          'Post-birth: breastfeeding is safer than formula in a disaster (no formula preparation, no clean water requirement). Breastfeeding rates increase post-disaster in some communities — this is protective.',
        ],
      },
    ],
    sources: [
      { label: 'FDA — Insulin storage and changing', url: 'https://www.fda.gov/drugs/resourcesforyou/consumers/ucm104894.htm' },
      { label: 'DaVita — Dialysis and emergencies', url: 'https://www.davita.com/education/patient-education-kit/emergency-preparedness' },
      { label: 'FEMA — People with disabilities and others with access and functional needs', url: 'https://www.ready.gov/disability' },
    ],
  },
];
