import readme from '@/toolkit/README.md?raw';
import pkg from '@/toolkit/package.template.json?raw';
import envExample from '@/toolkit/env.example?raw';
import libEnvelope from '@/toolkit/lib-envelope.mjs?raw';
import libGateway from '@/toolkit/lib-gateway.mjs?raw';
import libQueue from '@/toolkit/lib-queue.mjs?raw';
import bridgeMeshtastic from '@/toolkit/bridge-meshtastic.mjs?raw';
import bridgeSms from '@/toolkit/bridge-sms.mjs?raw';
import selftest from '@/toolkit/selftest.mjs?raw';
import service from '@/toolkit/ark-bridge.service?raw';

const ROOT = 'ark-toolkit';

export const TOOLKIT_FILES = [
  { path: `${ROOT}/README.md`, label: 'README.md', purpose: 'Setup steps, requirements, limits, troubleshooting', content: readme },
  { path: `${ROOT}/package.json`, label: 'package.json', purpose: 'Dependencies and the run scripts', content: pkg },
  { path: `${ROOT}/.env.example`, label: '.env.example', purpose: 'Every setting the bridges need, blank where it matters', content: envExample },
  { path: `${ROOT}/lib/envelope.mjs`, label: 'lib/envelope.mjs', purpose: 'Creates the device key and signs each packet', content: libEnvelope },
  { path: `${ROOT}/lib/gateway.mjs`, label: 'lib/gateway.mjs', purpose: 'Talks to the ARK relay function, waits and retries', content: libGateway },
  { path: `${ROOT}/lib/queue.mjs`, label: 'lib/queue.mjs', purpose: 'Keeps unsent packets on disk until ARK confirms them', content: libQueue },
  { path: `${ROOT}/bridges/meshtastic.mjs`, label: 'bridges/meshtastic.mjs', purpose: 'Radio bridge over MQTT, both directions', content: bridgeMeshtastic },
  { path: `${ROOT}/bridges/sms.mjs`, label: 'bridges/sms.mjs', purpose: 'SMS bridge through an open-source Android gateway', content: bridgeSms },
  { path: `${ROOT}/selftest.mjs`, label: 'selftest.mjs', purpose: 'Proves signing and the gateway connection before you rely on it', content: selftest },
  { path: `${ROOT}/ark-bridge.service`, label: 'ark-bridge.service', purpose: 'Systemd unit so a bridge restarts itself', content: service },
];

export const toolkitSize = TOOLKIT_FILES.reduce((total, file) => total + file.content.length, 0);