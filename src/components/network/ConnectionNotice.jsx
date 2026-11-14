import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
export default function ConnectionNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener('online', update); window.addEventListener('offline', update); return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); }; }, []);
  return <div className={`network-connection ${online ? '' : 'network-offline'}`} role="status">{online ? <Wifi size={15} /> : <WifiOff size={15} />}<span>{online ? 'Connection detected' : 'No connection · changes cannot be saved'}<small>{online ? 'Shared records update live. Printed guidance is still the dependable fallback.' : 'Your household snapshot may still be visible, but ARK cannot send, save or call for help.'}</small></span><Link to="/PrintPacket">Print packet</Link></div>;
}