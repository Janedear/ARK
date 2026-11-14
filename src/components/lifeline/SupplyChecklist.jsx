import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { supplyTemplate, supplyCategories } from '@/components/lifeline/supplyTemplate';

export default function SupplyChecklist({ householdId, supplies, onChange }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');

  const seed = async () => {
    await base44.entities.SupplyItem.bulkCreate(supplyTemplate.map(s => ({ ...s, household_id: householdId, packed: false })));
    onChange();
  };

  const toggle = async item => {
    await base44.entities.SupplyItem.update(item.id, { packed: !item.packed });
    onChange();
  };

  const add = async e => {
    e.preventDefault();
    if (!label.trim()) return;
    await base44.entities.SupplyItem.create({ household_id: householdId, label, category: 'tools', packed: false });
    setLabel('');
    setAdding(false);
    onChange();
  };

  const packed = supplies.filter(s => s.packed).length;

  return <section className="ll-card">
    <h2>Supply checklist</h2>
    <p className="ll-muted">{supplies.length ? `${packed} of ${supplies.length} packed.` : 'Start from the standard checklist, then edit it to fit your household.'}</p>
    {supplies.length === 0 && <button className="ll-btn" onClick={seed}>Start the checklist</button>}
    {supplyCategories.map(cat => {
      const items = supplies.filter(s => s.category === cat);
      if (!items.length) return null;
      return <div key={cat} style={{ marginTop: 18 }}>
        <div className="ll-eyebrow">{cat}</div>
        {items.map(i => <label className="ll-check" key={i.id}>
          <input type="checkbox" checked={!!i.packed} onChange={() => toggle(i)} />
          <span><b style={{ fontSize: 15, fontWeight: 600 }}>{i.label}</b>{i.quantity ? <span className="ll-muted"> · {i.quantity}</span> : null}</span>
        </label>)}
      </div>;
    })}
    {supplies.length > 0 && (adding
      ? <form onSubmit={add} style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} placeholder="Add your own item" style={{ flex: 1, minWidth: 180, minHeight: 42, padding: '9px 11px', border: '1px solid var(--input)', borderRadius: 6 }} />
        <button className="ll-btn">Add</button>
      </form>
      : <button className="ll-btn ghost" style={{ marginTop: 14 }} onClick={() => setAdding(true)}>Add an item</button>)}
  </section>;
}