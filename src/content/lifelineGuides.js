import { waterFoodGuides } from '@/content/guides/waterFood';
import { safetyGuides } from '@/content/guides/safety';
import { peopleGuides } from '@/content/guides/people';

export const guideCategories = [
  { key: 'water', label: 'Water & sanitation' },
  { key: 'food', label: 'Food safety' },
  { key: 'medical', label: 'Medical escalation' },
  { key: 'power', label: 'Power, generators & carbon monoxide' },
  { key: 'weather', label: 'Extreme heat & cold' },
  { key: 'evacuation', label: 'Evacuation & sheltering' },
  { key: 'communication', label: 'Communication failure' },
  { key: 'reunification', label: 'Family reunification' },
  { key: 'community', label: 'Community assistance' },
];

/**
 * Every article is written from published government and humanitarian guidance.
 * None has been reviewed by a clinician or by this user's local emergency authority,
 * so the app must never present them as verified or official.
 */
export const SOURCED_ON = '2026-11-14';

export const guides = [...waterFoodGuides, ...safetyGuides, ...peopleGuides].map(guide => ({
  ...guide,
  status: 'sourced',
  sourcedOn: SOURCED_ON,
  reviewedBy: null,
}));

export const guideBySlug = slug => guides.find(guide => guide.slug === slug);