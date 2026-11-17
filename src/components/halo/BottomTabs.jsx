import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ClipboardList, BookOpen, MessageCircle, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import NetworkNavigation from '@/components/network/NetworkNavigation';

const tabs = [
  { label: 'Home', to: '/Home', icon: Home, pages: ['Lifeline'] },
  { label: 'Plan', to: '/HouseholdPlan', icon: ClipboardList, pages: ['HouseholdPlan', 'PrintPacket'] },
  { label: 'Guides', to: '/Guidance', icon: BookOpen, pages: ['SurvivalLibrary', 'GuideArticle', 'FieldGuide'] },
  { label: 'Messages', to: '/Network', icon: MessageCircle, pages: ['Network'] }
];

export default function BottomTabs({ currentPageName }) {
  const [open, setOpen] = React.useState(false);
  return <nav className="halo-tabs" aria-label="Main sections">
    {tabs.map(t => <Link key={t.to} to={t.to} aria-current={t.pages.includes(currentPageName) ? 'page' : undefined}><t.icon size={21} />{t.label}</Link>)}
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><button type="button"><Menu size={21} />More</button></SheetTrigger>
      <SheetContent side="left" className="halo-tabs-sheet p-0 overflow-y-auto" onClick={e => e.target.closest('a') && setOpen(false)}>
        <SheetTitle className="sr-only">All ARK sections</SheetTitle>
        <NetworkNavigation currentPageName={currentPageName} />
      </SheetContent>
    </Sheet>
  </nav>;
}