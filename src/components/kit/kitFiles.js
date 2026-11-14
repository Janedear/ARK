import buildRelayTool from '@/components/arknet/buildRelayTool';
import { TOOLKIT_FILES } from '@/components/toolkit/toolkitFiles';
import { guidanceHtml, contactsText, planWorksheet } from '@/components/kit/kitDocuments';
import { startHereHtml } from '@/components/kit/startHere';
import { meetingPointText } from '@/components/kit/meetingPoints';
import { getLibrarySh, getLibraryPs1 } from '@/components/kit/libraryScripts';
import { HUB_FILES } from '@/components/kit/hubFiles';

const ROOT = 'ARK-offline-kit';

export function buildKitFiles(meetingPoint) {
  const appUrl = `${window.location.origin}/Home`;
  return [
    { path: `${ROOT}/START-HERE.html`, content: startHereHtml(meetingPoint, appUrl) },
    { path: `${ROOT}/MEETING-POINT.txt`, content: `ARK starting meeting point\n\n${meetingPointText(meetingPoint)}\n` },
    { path: `${ROOT}/ARK-Emergency-Guidance.html`, content: guidanceHtml() },
    { path: `${ROOT}/ARK-Offline-Relay.html`, content: buildRelayTool() },
    { path: `${ROOT}/Emergency-Contacts.txt`, content: contactsText() },
    { path: `${ROOT}/Household-Plan-Worksheet.txt`, content: planWorksheet() },
    { path: `${ROOT}/library/get-library.sh`, content: getLibrarySh() },
    { path: `${ROOT}/library/get-library.ps1`, content: getLibraryPs1() },
    ...HUB_FILES.map(([name, content]) => ({ path: `${ROOT}/hub/${name}`, content })),
    ...TOOLKIT_FILES.map(f => ({ path: f.path.replace('ark-toolkit/', `${ROOT}/bridge-toolkit/`), content: f.content })),
  ];
}

export const KIT_CONTENTS = [
  { name: 'Start-here instructions', detail: 'Plain numbered steps for everything in the kit, plus your meeting point.' },
  { name: 'First aid and survival guidance', detail: 'Every article and national number in one page that works offline and prints.' },
  { name: 'Offline message app', detail: 'Write and pass public messages person to person with no signal.' },
  { name: 'Library downloader', detail: 'One click fetches medical and general Wikipedia, offline maps, reader apps and an offline AI (about 3.5 GB).' },
  { name: 'Community hub, no internet needed', detail: 'Turns a laptop or Raspberry Pi into a shared message board and library that phones join over local Wi-Fi. Includes setup and power guide.' },
  { name: 'Contacts and plan worksheet', detail: 'Print, fill in by hand, keep with your kit.' },
  { name: 'Radio and SMS bridge', detail: 'For volunteers linking Meshtastic radio and SMS to ARK.' },
];