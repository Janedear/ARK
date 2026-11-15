/**
 * Real, published crisis contacts. These are national US services only.
 * They are location-independent, so they are useful before anyone has added
 * local listings. Local numbers still have to be verified by a person.
 *
 * Notes on reliability during disasters:
 * - 911 and 988: staffed 24/7, landline and cell, text-to-911 available in many areas
 * - Hotlines marked [TEXT] accept SMS when voice lines are congested
 * - Many services maintain web chat as a backup when phone lines are saturated
 * - TTY/TDD numbers are listed for each service where available
 */
export const emergencyContacts = [
  // ─── IMMEDIATE EMERGENCY ──────────────────────────────────────────────────
  {
    name: 'Emergency services',
    number: '911',
    textNumber: '911',
    ttyNumber: '911',
    use: 'Fire, medical emergency, crime in progress, someone in immediate danger. Available 24/7. Text-to-911 available in most US counties — confirm availability in your area before disaster.',
    url: 'https://www.911.gov/',
    category: 'immediate',
    worksWithoutInternet: true,
  },
  {
    name: 'Poison Control',
    number: '1-800-222-1222',
    ttyNumber: '1-800-222-1222',
    use: 'Swallowed something dangerous, carbon monoxide exposure, chemical on skin or in eyes, drug overdose. Available 24/7. Call 911 instead if the person is unconscious, seizing, or not breathing.',
    url: 'https://poison.org/',
    category: 'immediate',
    worksWithoutInternet: true,
  },

  // ─── CRISIS AND MENTAL HEALTH ──────────────────────────────────────────────
  {
    name: 'Suicide & Crisis Lifeline',
    number: '988',
    textNumber: '988',
    ttyNumber: '1-800-799-4TTY (4889)',
    use: 'Call or text 988 for a mental health crisis, suicidal thoughts, or severe distress, for yourself or someone with you. Available 24/7. Disaster stress and grief are valid reasons to call.',
    url: 'https://988lifeline.org/',
    category: 'crisis',
    worksWithoutInternet: true,
  },
  {
    name: 'Crisis Text Line',
    number: null,
    textNumber: 'Text HOME to 741741',
    use: 'Text-based crisis counselling. Available 24/7. Useful when calling is not private or not possible. Connect to a live crisis counsellor within minutes.',
    url: 'https://www.crisistextline.org/',
    category: 'crisis',
    worksWithoutInternet: false,
    note: 'Requires SMS delivery — may not work in complete network outage.',
  },
  {
    name: 'SAMHSA National Helpline',
    number: '1-800-662-4357',
    ttyNumber: '1-800-487-4889',
    use: 'Substance use disorder and mental health referrals. Free, confidential, 24/7. Bilingual (English/Spanish). Treatment facility locator at findtreatment.gov.',
    url: 'https://www.samhsa.gov/find-help/national-helpline',
    category: 'crisis',
    worksWithoutInternet: true,
  },

  // ─── DISASTER ASSISTANCE ──────────────────────────────────────────────────
  {
    name: 'FEMA Helpline',
    number: '1-800-621-3362',
    ttyNumber: '1-800-462-7585',
    textNumber: null,
    use: 'Disaster assistance registration and status after a federally declared event. Available 7 days a week, 7am–1am ET. Online: DisasterAssistance.gov. Apply as soon as possible — there are deadlines.',
    url: 'https://www.disasterassistance.gov/',
    category: 'disaster',
    worksWithoutInternet: true,
  },
  {
    name: 'American Red Cross',
    number: '1-800-733-2767',
    use: 'Shelter locations, emergency assistance, blood drives, and Safe and Well registrations. Local chapters provide immediate disaster relief. Online: SafeAndWell.RedCross.org to register or search for missing people.',
    url: 'https://www.redcross.org/get-help.html',
    category: 'disaster',
    worksWithoutInternet: true,
  },
  {
    name: '211 — Local services',
    number: '211',
    textNumber: 'Text your ZIP code to 898-211',
    use: 'Free referral service for local food, shelter, heating/cooling assistance, utility help, transportation, childcare, and disaster services. Available 24/7 in most areas. Know which services are open near you.',
    url: 'https://www.211.org/',
    category: 'disaster',
    worksWithoutInternet: true,
  },

  // ─── SAFETY AND PROTECTION ────────────────────────────────────────────────
  {
    name: 'National Domestic Violence Hotline',
    number: '1-800-799-7233',
    textNumber: 'Text START to 88788',
    ttyNumber: '1-800-787-3224',
    use: 'Safety planning and shelter referrals. Available 24/7. Disasters create or escalate domestic violence — this resource remains available throughout. Chat at thehotline.org.',
    url: 'https://www.thehotline.org/',
    category: 'safety',
    worksWithoutInternet: true,
  },
  {
    name: 'National Child Abuse Hotline',
    number: '1-800-422-4453',
    textNumber: null,
    use: 'Child abuse reporting and intervention crisis counselling. Available 24/7. Crises increase risk of harm to children — report concerns immediately.',
    url: 'https://www.childhelp.org/hotline/',
    category: 'safety',
    worksWithoutInternet: true,
  },
  {
    name: 'Adult Protective Services (Elder abuse)',
    number: '1-800-677-1116 (Eldercare Locator)',
    use: 'Report elder abuse or find local APS. Eldercare Locator connects to local services. Local APS numbers vary by county — look up your county\'s number now and store it.',
    url: 'https://eldercare.acl.gov/',
    category: 'safety',
    worksWithoutInternet: true,
  },
  {
    name: 'National Center for Missing and Exploited Children',
    number: '1-800-843-5678',
    use: 'Report a missing child or sighting. Available 24/7. CyberTipline for online exploitation. During disasters, also coordinates with local authorities on child missing persons.',
    url: 'https://www.missingkids.org/',
    category: 'safety',
    worksWithoutInternet: true,
  },

  // ─── UTILITIES ────────────────────────────────────────────────────────────
  {
    name: 'Report downed power lines',
    number: 'Your utility company emergency line',
    use: 'Every major utility has a 24/7 emergency line for outages and downed lines. Store your specific utility\'s number now — this varies by region. Never approach a downed line. Report from a safe distance.',
    url: 'https://www.eei.org/en/resources/electric-company-finder',
    category: 'utilities',
    worksWithoutInternet: true,
    note: 'Find your local utility at eei.org/en/resources/electric-company-finder',
  },
  {
    name: 'Natural gas emergency',
    number: 'Your gas utility emergency line',
    use: 'If you smell gas: leave immediately, do not use any electrical switches or phones inside the building, call from outside or from a neighbour\'s. Every gas utility has a 24/7 emergency line. Store yours now.',
    url: 'https://www.aga.org/',
    category: 'utilities',
    worksWithoutInternet: true,
    note: 'The American Gas Association directory at aga.org can help locate your utility.',
  },

  // ─── MEDICAL ──────────────────────────────────────────────────────────────
  {
    name: 'FEMA Region emergency medical contacts',
    number: 'See regional listing',
    use: 'FEMA has 10 regional offices coordinating medical surge capacity during declared disasters. Contact through FEMA Helpline (1-800-621-3362) or directly at fema.gov/about/offices/regions.',
    url: 'https://www.fema.gov/about/offices/regions',
    category: 'medical',
    worksWithoutInternet: false,
  },

  // ─── TRANSPORTATION AND COAST GUARD ───────────────────────────────────────
  {
    name: 'US Coast Guard — Maritime distress',
    number: '1-800-418-7314',
    use: 'Marine emergencies, flooding rescue, and water rescue coordination. VHF-FM Channel 16 is the standard maritime distress frequency for anyone with a marine radio.',
    url: 'https://www.uscg.mil/rescue/',
    category: 'transport',
    worksWithoutInternet: true,
  },

  // ─── COMMUNICATIONS ───────────────────────────────────────────────────────
  {
    name: 'FCC Consumer Helpline',
    number: '1-888-225-5322',
    ttyNumber: '1-888-835-5322',
    use: 'Report communications outages, issues with emergency alerts not reaching you, or problems with EAS (Emergency Alert System). Not for immediate emergencies.',
    url: 'https://consumercomplaints.fcc.gov/',
    category: 'communications',
    worksWithoutInternet: true,
  },
  {
    name: 'ARRL (Ham Radio Emergency)',
    number: null,
    use: 'Amateur Radio Emergency Service (ARES) operators provide communications infrastructure during disasters when commercial infrastructure fails. Contact through your local ARRL section. If a ham operator is in your community, they are a critical resource.',
    url: 'https://www.arrl.org/ares',
    category: 'communications',
    worksWithoutInternet: false,
    note: 'Find your local ARES group at arrl.org/sections.',
  },

  // ─── INTERNATIONAL ────────────────────────────────────────────────────────
  {
    name: 'US State Department — Americans abroad',
    number: '1-888-407-4747 (from US) / +1-202-501-4444 (from abroad)',
    use: 'Emergency assistance for US citizens overseas. If you have family abroad in a disaster zone, they should contact the nearest US Embassy or Consulate. Available 24/7 for emergencies.',
    url: 'https://travel.state.gov/content/travel/en/international-travel/emergencies/what-state-dept-can.html',
    category: 'international',
    worksWithoutInternet: true,
  },
  {
    name: 'International Red Cross — Family links',
    number: null,
    use: 'For locating family members separated by international disasters, conflict, or migration. Restoring Family Links service. Operates through national Red Cross/Red Crescent societies in each country.',
    url: 'https://familylinks.icrc.org/',
    category: 'international',
    worksWithoutInternet: false,
  },
];

export const contactsNote = 'Published national US services, checked against each organisation\'s own page. Outside the United States, use your local equivalent — most of these numbers will not work internationally. TTY/TDD numbers are listed for Deaf and hard-of-hearing users. Numbers marked [TEXT] accept SMS, which often works when voice calls cannot connect in a congested network.';

/**
 * Quick reference: services that remain reachable with a standard phone call
 * when internet and power are out but cell towers are operational.
 */
export const worksWithPhoneOnly = emergencyContacts.filter(c => c.worksWithoutInternet && c.number);
