import { waterFoodGuides } from '@/content/guides/waterFood';
import { safetyGuides } from '@/content/guides/safety';
import { peopleGuides } from '@/content/guides/people';
import { medicalGuides } from '@/content/guides/medical';
import { shelterGuides } from '@/content/guides/shelter';

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
 *
 * Sources used across guides include: Ready.gov, CDC, FEMA, National Weather Service,
 * American Red Cross, WHO, USDA FSIS, EPA, StopTheBleed.org, SAMHSA, FDA, and others —
 * each cited in the individual guide's sources array.
 */
export const SOURCED_ON = '2026-11-15';

export const guides = [
  ...waterFoodGuides,
  ...safetyGuides,
  ...peopleGuides,
  ...medicalGuides,
  ...shelterGuides,
].map(guide => ({
  ...guide,
  status: 'sourced',
  sourcedOn: SOURCED_ON,
  reviewedBy: null,
}));

export const guideBySlug = slug => guides.find(guide => guide.slug === slug);

export const guidesByCategory = category => guides.filter(guide => guide.category === category);

export const allSlugs = guides.map(guide => guide.slug);
