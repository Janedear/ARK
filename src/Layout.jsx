import React from 'react';
import NetworkNavigation from '@/components/network/NetworkNavigation';
import ConnectionNotice from '@/components/network/ConnectionNotice';
import PageOrientation from '@/components/network/PageOrientation';
import HaloHeader from '@/components/halo/HaloHeader';
import BottomTabs from '@/components/halo/BottomTabs';
import { ArkMark } from '@/components/halo/brand';
import '@/components/crisis/fieldOperations.css';
import '@/components/fieldTheme.css';
import '@/components/network/network.css';
import '@/components/halo/halo.css';
import '@/components/halo/haloApp.css';

export default function Layout({ children, currentPageName }) {
  return <div className="field-shell halo-shell">
    <HaloHeader />
    <div className="network-workspace"><NetworkNavigation currentPageName={currentPageName} /><main className="network-main"><ConnectionNotice /><PageOrientation page={currentPageName} />{children}</main></div>
    <footer className="halo-footer">
      <div className="halo-footer-brand"><ArkMark size={26} /><span>Prepare <i>•</i> Connect <i>•</i> Recover</span></div>
      <p>ARK, a HaloSuite product. Preparedness and local coordination prototype. Not authorized for operational use.</p>
      <p>No emergency dispatch or guaranteed delivery. Public relay tools are not a native mesh network. For immediate danger call your local emergency number.</p>
    </footer>
    <BottomTabs currentPageName={currentPageName} />
  </div>;
}