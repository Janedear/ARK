import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function ConnectionNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <div className={`network-connection ${online ? '' : 'network-offline'}`} role="status">{online ? <Wifi size={15} /> : <WifiOff size={15} />}<span>{online ? 'Network detected · service availability not verified' : 'Browser reports offline · shared records cannot sync'}<small>{online ? 'This prototype is an online coordination workspace, not a mesh network.' : 'This open screen may remain visible, but it is not a saved offline copy.'}</small></span><Link to="/FieldGuide">Fallback guide</Link></div>;
}