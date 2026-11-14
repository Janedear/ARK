import buildRelayTool from '@/components/arknet/buildRelayTool';
import { TOOLKIT_FILES } from '@/components/toolkit/toolkitFiles';
import { guidanceHtml, contactsText, planWorksheet } from '@/components/kit/kitDocuments';

const ROOT = 'ARK-offline-kit';

const startHere = () => `ARK offline kit
Downloaded ${new Date().toLocaleString()}

Open these on any phone or computer. None of them need internet once saved.

1. ARK-Emergency-Guidance.html
   Every guidance article and the national emergency numbers. Open it in a browser, or print it.

2. ARK-Offline-Relay.html
   Write public messages and pass them between people with no account and no signal.
   Open it in a full browser (Chrome, Firefox, Safari) and check it can save before relying on it.

3. Emergency-Contacts.txt and Household-Plan-Worksheet.txt
   Print both. Fill in local numbers and your plan by hand.

4. bridge-toolkit/
   Only for someone willing to run a small program on a computer that stays on.
   Connects radio (Meshtastic) and SMS to the live ARK app. Start with bridge-toolkit/README.md.

Limits, plainly:
- ARK does not dispatch help or call anyone. For immediate danger call 911.
- Relay messages are public and unencrypted. Never include medical details or home addresses.
- Guidance is sourced but not reviewed by a clinician.
- Files saved in a browser can be cleared. Keep paper copies.

Live app: ${window.location.origin}/Home
`;

export function buildKitFiles() {
  return [
    { path: `${ROOT}/START-HERE.txt`, content: startHere() },
    { path: `${ROOT}/ARK-Emergency-Guidance.html`, content: guidanceHtml() },
    { path: `${ROOT}/ARK-Offline-Relay.html`, content: buildRelayTool() },
    { path: `${ROOT}/Emergency-Contacts.txt`, content: contactsText() },
    { path: `${ROOT}/Household-Plan-Worksheet.txt`, content: planWorksheet() },
    ...TOOLKIT_FILES.map(f => ({ path: f.path.replace('ark-toolkit/', `${ROOT}/bridge-toolkit/`), content: f.content })),
  ];
}

export const KIT_CONTENTS = [
  { name: 'Emergency guidance', detail: 'Every article and national number in one page that opens with no internet, and prints.' },
  { name: 'Offline relay tool', detail: 'Write and pass public messages between people with no account and no signal.' },
  { name: 'Contacts and plan worksheet', detail: 'Print, fill in by hand, keep with your kit.' },
  { name: 'Radio and SMS bridge scripts', detail: `For volunteers: ${TOOLKIT_FILES.length} files to link Meshtastic radio and SMS to ARK.` },
];