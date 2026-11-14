import createRelayRuntime from '@/components/arknet/relayRuntime';
import createNearbyTransport from '@/components/arknet/nearbyTransport';
import standaloneController from '@/components/arknet/standaloneController';
import standaloneTemplate from '@/components/arknet/standaloneTemplate';

/** Self-contained offline relay page: no account, no saved messages, no keys. */
export default function buildRelayTool() {
  return standaloneTemplate.replace('<!--ARK_SCRIPT-->', `<script>(${standaloneController.toString()})(${createRelayRuntime.toString()},${createNearbyTransport.toString()});<\/script>`);
}