import React from 'react';
import { Shield } from 'lucide-react';
import NetworkNavigation from '@/components/network/NetworkNavigation';
import ConnectionNotice from '@/components/network/ConnectionNotice';
import PageOrientation from '@/components/network/PageOrientation';
import '@/components/crisis/fieldOperations.css';
import '@/components/fieldTheme.css';
import '@/components/network/network.css';

export default function Layout({ children, currentPageName }) {
  return <div className="field-shell">
    <div className="network-banner"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Shield className="h-5 w-5" /><span>LIFELINE</span></div><div>PREPAREDNESS PROTOTYPE — NOT EMERGENCY SERVICES, NOT A MESH NETWORK</div></div></div>
    <div className="network-workspace"><NetworkNavigation currentPageName={currentPageName} /><main className="network-main"><ConnectionNotice /><PageOrientation page={currentPageName} />{children}</main></div>
    <footer><div><div>Lifeline</div><div><div>Preparedness and local coordination prototype. Not authorized for operational use.</div><div>No emergency dispatch, no guaranteed message delivery, no offline communications network.</div><div>For immediate danger call your local emergency number. Use verified local guidance and qualified responders.</div></div></div></footer>
  </div>;
}