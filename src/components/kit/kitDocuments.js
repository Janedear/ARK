import { guides, guideCategories, SOURCED_ON } from '@/content/lifelineGuides';
import { emergencyContacts } from '@/content/emergencyContacts';

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function guidanceHtml() {
  const contacts = emergencyContacts.map(c => `<li><b>${esc(c.name)} — ${esc(c.number)}</b><br>${esc(c.use)}</li>`).join('');
  const articles = guideCategories.map(cat => {
    const items = guides.filter(g => g.category === cat.key);
    if (!items.length) return '';
    return `<h2 class="cat">${esc(cat.label)}</h2>` + items.map(g => `<article><h3>${esc(g.title)}</h3><p><i>${esc(g.summary)}</i></p><h4>Do these first</h4><ol>${g.quickSteps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>${g.sections.map(s => `<h4>${esc(s.heading)}</h4>${s.body.map(p => `<p>${esc(p)}</p>`).join('')}`).join('')}<p class="src">Sources: ${g.sources.map(s => `${esc(s.label)} (${esc(s.url)})`).join('; ')}</p></article>`).join('');
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARK emergency guidance</title><style>body{font:17px/1.55 -apple-system,Segoe UI,Arial,sans-serif;max-width:760px;margin:0 auto;padding:20px;color:#1d2b25}h1{font-size:28px}.cat{margin-top:40px;border-top:3px solid #203B32;padding-top:12px}article{border-bottom:1px solid #ccc;padding-bottom:16px}.warn{border:2px solid #8a2c1c;padding:12px;border-radius:6px}.src{font-size:13px;color:#555}@media print{article{break-inside:avoid-page}}</style></head><body><h1>ARK emergency guidance</h1><p class="warn"><b>Life-threatening emergency: call 911.</b> Written from published government and humanitarian guidance on ${SOURCED_ON}. Not reviewed by a clinician or your local emergency authority. This file works with no internet.</p><h2>National contacts (US)</h2><ul>${contacts}</ul>${articles}</body></html>`;
}

export const contactsText = () => 'ARK national emergency contacts (US)\n\n' +
  emergencyContacts.map(c => `${c.name}: ${c.number}\n  ${c.use}\n  ${c.url}`).join('\n\n') +
  '\n\nLocal numbers are not included. Write yours here before you need them:\n\n' +
  ['Local police (non-emergency)', 'Power company outage line', 'Water utility', 'Nearest hospital', 'Doctor / pharmacy', 'School or care home'].map(l => `${l}: ______________________`).join('\n') + '\n';

export const planWorksheet = () => `ARK household plan — fill in by hand, keep with your kit

Household name: ______________________   Last reviewed: __________

PEOPLE (name, phone, medication or needs)
1. ___________________________________________________
2. ___________________________________________________
3. ___________________________________________________
4. ___________________________________________________

OUT-OF-AREA CONTACT everyone calls or texts to check in
Name: ____________________  Phone: ____________________

MEETING POINTS
Just outside the home: ________________________________
In the neighbourhood: _________________________________
If the area must be evacuated: _________________________

MEDICAL AND ACCESS NEEDS to carry or plan for
_______________________________________________________

PETS (food, carrier, records): __________________________

KIT LOCATION and what needs replacing
_______________________________________________________

Do not write a full street address on copies you hand to others.
`;