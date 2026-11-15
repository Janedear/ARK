import server from '@/hub/ark-hub.mjs?raw';
import core from '@/hub/hub-core.mjs?raw';
import filesIndex from '@/hub/hub-files.mjs?raw';
import zipModule from '@/hub/hub-zip.mjs?raw';
import page from '@/hub/hub-page.html?raw';
import selftest from '@/hub/selftest.mjs?raw';
import startSh from '@/hub/start-hub.sh?raw';
import startCmd from '@/hub/start-hub.cmd?raw';
import guide from '@/hub/HUB-GUIDE.md?raw';
import continuity from '@/hub/CONTINUITY.md?raw';

export const HUB_FILES = [
  ['ark-hub.mjs', server], ['hub-core.mjs', core], ['hub-files.mjs', filesIndex], ['hub-zip.mjs', zipModule], ['hub-page.html', page],
  ['selftest.mjs', selftest], ['start-hub.sh', startSh], ['start-hub.cmd', startCmd.replace(/\r?\n/g, '\r\n')],
  ['HUB-GUIDE.md', guide], ['CONTINUITY.md', continuity],
];