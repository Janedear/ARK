import React from 'react';
import { BookOpen, ClipboardCheck, MessagesSquare, Router } from 'lucide-react';
import { ArkMark } from '@/components/halo/brand';

const features = [
  { icon: BookOpen, title: 'Essential guides', text: 'Easy steps for power cuts, first aid, water and staying safe. On your phone, no signal needed.' },
  { icon: ClipboardCheck, title: 'Household plan', text: 'Where to meet, who to call, and what to pack, all in one place for your family.' },
  { icon: MessagesSquare, title: 'Local messages', text: 'Send short notes that are passed phone to phone until they reach the people nearby.' },
  { icon: Router, title: 'ARK Hub', text: 'Turn an old laptop into a Wi-Fi noticeboard for your street when the internet is out.' }
];

export default function FeatureCards() {
  return <>
    <section className="halo-features">
      {features.map(f => <article key={f.title}>
        <span className="halo-icon"><f.icon size={28} strokeWidth={1.5} /></span>
        <h3>{f.title}</h3>
        <p>{f.text}</p>
      </article>)}
    </section>
    <div className="halo-pillars" aria-hidden="true"><span /><ArkMark size={34} /><b>Prepare</b><i>•</i><b>Connect</b><i>•</i><b>Recover</b><span /></div>
  </>;
}