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
    <div className="network-banner"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Shield className="h-5 w-5" /><span>NCRS-P PROTOTYPE</span></div><div>DEMONSTRATION SYSTEM — NOT CONNECTED TO REAL INFRASTRUCTURE</div></div></div>
    <div className="network-workspace"><NetworkNavigation currentPageName={currentPageName} /><main className="network-main"><ConnectionNotice /><PageOrientation page={currentPageName} />{children}</main></div>
    <footer><div><div>National Cyber Resilience & Snap-Back Platform</div><div><div>Planning and demonstration workspace. Not authorized for operational use.</div><div>No emergency dispatch, infrastructure control, or offline communications network.</div><div>Use verified local guidance and qualified, authorized responders.</div></div></div></footer>
  </div>;
}