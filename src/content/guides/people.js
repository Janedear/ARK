export const peopleGuides = [
  {
    slug: 'medical-escalation',
    category: 'medical',
    title: 'Medical emergencies and escalation',
    summary: 'What to say, what to have ready, and which signs mean call immediately rather than wait.',
    quickSteps: [
      'Call 911 for chest pain, difficulty breathing, sudden weakness or drooping on one side, a seizure, severe bleeding that will not stop, a severe allergic reaction, or anyone who is unresponsive.',
      'Follow the dispatcher exactly. They can talk you through what to do while help travels, and that is more reliable than any written page.',
      'For suspected poisoning, call Poison Control at 1-800-222-1222 in the United States, or 911 if the person is unconscious, fitting or not breathing.',
      'Apply firm, continuous pressure to a bleeding wound with a clean cloth. Do not keep lifting it to check.',
      'Do not move someone with a suspected spinal injury unless they are in immediate danger where they are.'
    ],
    sections: [
      { heading: 'What ARK will not do', body: ['ARK does not diagnose, prescribe or replace a clinician or dispatcher. Nothing here tells you how to treat a serious injury.', 'Everything on this page is about recognising an emergency, escalating fast, and having the information ready that a responder needs.'], },
      { heading: 'Signs that mean call now', body: ['Stroke: face drooping, arm weakness, speech difficulty, sudden loss of balance or vision. Note the time symptoms started; treatment decisions depend on it.', 'Heart attack: chest pressure or squeezing, pain spreading to the arm, jaw or back, shortness of breath, cold sweat. Call first, then chew aspirin only if the dispatcher tells you to.', 'Severe allergic reaction: swelling of the face or throat, difficulty breathing, widespread hives. Use a prescribed epinephrine auto-injector if there is one, then call 911. Symptoms can return after the first dose.'], },
      { heading: 'Have this ready to read out', body: ['A written list of every medication, dose and prescriber, plus allergies, conditions and any implant that carries a card.', 'At least seven days of prescription medication in the go-bag, and the phone numbers of the prescriber and pharmacy written down.'], },
      { heading: 'When services are overwhelmed', body: ['Expect delays. Say clearly: where you are, how many people need help, what the condition is, and whether the person is breathing.', 'Keep trying. Do not give up on one call and stop: send someone to the road to flag down help, and keep the line clear for a callback.'], },
    ],
    sources: [
      { label: 'American Red Cross — Emergency preparedness', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies.html' },
      { label: 'America’s Poison Centers', url: 'https://poison.org/' },
      { label: 'CDC — Stroke signs', url: 'https://www.cdc.gov/stroke/signs-symptoms/index.html' },
      { label: 'American Heart Association — Warning signs of a heart attack', url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack' },
    ],
  },
  {
    slug: 'communication-failure',
    category: 'communication',
    title: 'When phones and internet fail',
    summary: 'A plan that works on paper, without apps, accounts or signal.',
    quickSteps: [
      'Agree in advance on one out-of-area contact, one check-in time, and two meeting places. Write them down for every household member.',
      'Send short text messages instead of calling when the network is congested. Texts queue and often arrive when a call cannot get through.',
      'Conserve battery: airplane mode, lowest brightness, and the phone off between agreed check-in windows.',
      'Give every person a printed card with the out-of-area contact, meeting points, and allergies or medication a responder would need.',
      'Do not assume a message arrived. Silence is not confirmation that someone is safe.'
    ],
    sections: [
      { heading: 'Why out-of-area contacts work', body: ['Local towers and lines saturate first. A contact in another region is often reachable when everyone nearby is not, and can relay messages between your household and the people looking for you.', 'Tell that contact the plan now, while nothing is wrong, so they know what to expect and what to do with the information.'], },
      { heading: 'During an outage', body: ['If you have a battery radio, use it for official information instead of repeatedly checking a phone that cannot load anything.', 'Write down times and decisions as they happen. Under stress, people misremember sequence, and later records matter for aid and for learning.'], },
      { heading: 'What ARK cannot do', body: ['ARK is a web application. It cannot create a radio link, a Bluetooth mesh or a satellite connection, and it cannot deliver a message while you have no connection at all.', 'Treat paper and existing equipment as the dependable path. ARK is an extra layer, not the base layer.'], },
    ],
    sources: [
      { label: 'Ready.gov — Make a plan', url: 'https://www.ready.gov/plan' },
      { label: 'FEMA — Family communication plan', url: 'https://www.ready.gov/plan' },
      { label: 'American Red Cross — Emergency contact cards', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/make-a-plan.html' },
    ],
  },
  {
    slug: 'family-reunification',
    category: 'reunification',
    title: 'Finding each other again',
    summary: 'Meeting points, school and care procedures, and how to report someone missing.',
    quickSteps: [
      'Use the two meeting points in your household plan: one just outside the home, one outside the neighbourhood.',
      'Know your school or care provider’s written reunification procedure and confirm who is authorised to collect each person.',
      'Go to the agreed meeting point and stay long enough to be found. Leave a written note at home saying where you went and when.',
      'To report someone missing, contact local authorities with a recent photo, what they were wearing, and where they were last seen.',
      'Tell your out-of-area contact when everyone is accounted for, so they can stop worrying and tell anyone else who is asking.'
    ],
    sections: [
      { heading: 'Set it up now', body: ['Write down who collects each child and a backup, and confirm the care setting will only release a child to those people.', 'For someone with dementia or a communication disability, keep an ID card with their details and consider a locating service or a wearable ID.'], },
      { heading: 'During separation', body: ['Children should know two things cold: the meeting place, and the out-of-area contact’s number. Practice saying the number out loud.', 'Check in with the out-of-area contact, who can connect reports from different family members and stop duplicated searching.'], },
      { heading: 'After reunification', body: ['Tell everyone who was searching, not just your contact. Search teams waste effort on people who are already safe.', 'Note where each person was and how they were found. It helps recovery paperwork and it is how a household gets better prepared next time.'], },
    ],
    sources: [
      { label: 'Ready.gov — Make a plan', url: 'https://www.ready.gov/plan' },
      { label: 'American Red Cross — Reunification', url: 'https://www.redcross.org/get-help/how-to-prepare-for-emergencies/make-a-plan.html' },
      { label: 'National Center for Missing & Exploited Children — Resources', url: 'https://www.missingkids.org/gethelpnow' },
    ],
  },
  {
    slug: 'community-assistance',
    category: 'community',
    title: 'Helping neighbours without creating harm',
    summary: 'How to organise local help, protect vulnerable people, and avoid becoming a second emergency.',
    quickSteps: [
      'Work through an identified coordinator and a staffed, safe location wherever one exists.',
      'Share needs, not identities. Never publish a vulnerable person’s address, condition or location on a public board.',
      'Only accept tasks you are trained and equipped for. Untrained volunteers should not do medical care, electrical work or security duties.',
      'Offer a paper route for people with no phone, no account or no identification. Help must not depend on owning a device.',
      'Do not send volunteers into damaged buildings, floodwater, or areas under an evacuation order.'
    ],
    sections: [
      { heading: 'Intake that includes everyone', body: ['Record what is needed, where it can safely be delivered, how to reach the person, and whether they consent to being contacted.', 'Use a local reference code instead of a full name where practical, and ask before passing anyone’s details on.'], },
      { heading: 'Matching help to need', body: ['Confirm with the person that help actually arrived. A claimed delivery is not a delivery, and in a crisis the difference matters.', 'Keep a written record of who received what, so recovery support can be targeted and effort is not duplicated.'], },
      { heading: 'Protecting people', body: ['Set one route for concerns about a volunteer or a request, and name one person responsible for acting on them.', 'Never ask for or record bank details, passwords or identity documents as part of informal aid.'], },
    ],
    sources: [
      { label: 'Ready.gov — Volunteering and donating', url: 'https://www.ready.gov/volunteer' },
      { label: 'FEMA — Volunteer and donate responsibly', url: 'https://www.fema.gov/how-you-can-help' },
      { label: 'American Red Cross — Volunteer', url: 'https://www.redcross.org/volunteer.html' },
    ],
  },
];