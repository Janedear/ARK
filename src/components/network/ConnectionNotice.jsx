import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function ConnectionNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <div className={`network-connection ${online ? '' : 'network-offline'}`} role="status">{online ? <Wifi size={15} /> : <WifiOff size={15} />}<span>{online ? 'Browser connection detected' : 'Browser reports no internet'}<small>{online ? 'A connection indicator does not confirm server access or message delivery. Check receipts in the relay network.' : 'The relay network can queue messages locally while open. Other shared records need internet. ARK does not call for help.'}</small></span><Link to="/PrintPacket">Print packet</Link></div>;
}