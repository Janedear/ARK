/**
 * Real, published crisis contacts. These are national US services only.
 * They are location-independent, so they are useful before anyone has added
 * local listings. Local numbers still have to be verified by a person.
 */
export const emergencyContacts = [
  { name: 'Emergency services', number: '911', use: 'Fire, medical emergency, crime in progress, someone in immediate danger.', url: 'https://www.911.gov/' },
  { name: 'Suicide & Crisis Lifeline', number: '988', use: 'Call or text for a mental health crisis, for yourself or someone with you.', url: 'https://988lifeline.org/' },
  { name: 'Poison Control', number: '1-800-222-1222', use: 'Swallowed something, carbon monoxide exposure, chemical on skin or in eyes.', url: 'https://poison.org/' },
  { name: '211', number: '211', use: 'Local food, shelter, heating and utility help, and which services are open.', url: 'https://www.211.org/' },
  { name: 'FEMA Helpline', number: '1-800-621-3362', use: 'Disaster assistance applications and status after a declared event.', url: 'https://www.disasterassistance.gov/' },
  { name: 'American Red Cross', number: '1-800-733-2767', use: 'Shelter locations, emergency assistance, and safe-and-well registrations.', url: 'https://www.redcross.org/get-help.html' },
  { name: 'SAMHSA National Helpline', number: '1-800-662-4357', use: 'Substance use and mental health referrals.', url: 'https://www.samhsa.gov/find-help/national-helpline' },
  { name: 'National Domestic Violence Hotline', number: '1-800-799-7233', use: 'Safety planning and shelter during an emergency, when home is not safe.', url: 'https://www.thehotline.org/' },
];

export const contactsNote = 'Published national US services, checked against each organisation’s own page. Outside the United States, use your local equivalent — these numbers will not work.';