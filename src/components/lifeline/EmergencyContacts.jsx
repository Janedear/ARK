import React from 'react';
import { Phone } from 'lucide-react';
import { emergencyContacts, contactsNote } from '@/content/emergencyContacts';
import '@/components/lifeline/lifeline.css';

export default function EmergencyContacts() {
  return <section className="ll-card" style={{ marginTop: 18 }}>
    <h2><Phone size={16} style={{ marginRight: 8, verticalAlign: -2 }} />Numbers that work without this app</h2>
    <p className="ll-muted" style={{ marginTop: 6 }}>
      Write these on paper and keep them with your kit. None of them depend on ARK, an account, or a charged phone you still have.
    </p>
    <div className="ll-list" style={{ marginTop: 12 }}>
      {emergencyContacts.map(contact => <div className="ll-item" key={contact.number}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <b>{contact.name}</b>
          <a href={`tel:${contact.number.replace(/[^0-9+]/g, '')}`} style={{ fontFamily: 'var(--font-heading)', fontSize: 16, textDecoration: 'underline' }}>{contact.number}</a>
        </div>
        <div className="ll-muted" style={{ marginTop: 4 }}>{contact.use}</div>
        <div className="ll-eyebrow" style={{ marginTop: 6 }}><a href={contact.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>{contact.url.replace('https://', '')}</a></div>
      </div>)}
    </div>
    <p className="ll-muted" style={{ marginTop: 12 }}>{contactsNote}</p>
  </section>;
}