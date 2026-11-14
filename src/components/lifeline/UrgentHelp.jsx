import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export default function UrgentHelp() {
  return <section className="ll-urgent" aria-labelledby="urgent-title">
    <div>
      <h2 id="urgent-title"><AlertTriangle size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: '-3px' }} />In immediate danger</h2>
      <p className="ll-muted">Call your local emergency number now. In the United States that is 911. Lifeline cannot call anyone for you and does not dispatch responders.</p>
    </div>
    <Link to="/ResponseHub" className="ll-btn">Ask your community for help</Link>
  </section>;
}