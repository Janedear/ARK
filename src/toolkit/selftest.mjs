/**
 * Checks that this machine can sign a packet and, if a function URL is set,
 * that the ARK gateway accepts it. Run this before starting a bridge.
 */
import { loadDevice, buildPacket, canonical } from './lib-envelope.mjs';
import { pushPackets } from './lib-gateway.mjs';

const device = await loadDevice();
console.log('signing key ready; public x =', device.x.slice(0, 12) + '…');

const packet = await buildPacket({
  channel: process.env.ARK_CHANNEL || 'selftest',
  alias: 'selftest',
  text: 'ARK toolkit self-test ' + new Date().toISOString(),
});
console.log('signed packet id =', packet.id);
console.log('signature length =', packet.signature.length, '(should be 86)');
console.log('canonical length =', canonical(packet).length, 'bytes');

if (!process.env.ARK_FUNCTION_URL) {
  console.log('ARK_FUNCTION_URL is not set, so the online check was skipped.');
  process.exit(0);
}

try {
  const result = await pushPackets([packet]);
  console.log('gateway accepted', (result.accepted || []).length, 'packet(s) at', result.checked_at);
} catch (error) {
  console.error('gateway refused the packet:', error.message);
  process.exitCode = 1;
}