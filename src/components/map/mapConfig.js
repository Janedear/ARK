export const CATEGORY_COLORS = {
  water: '#1f6f8b',
  food: '#3f7d43',
  shelter: '#6b4fa0',
  medical: '#a23b3b',
  charging: '#9a7b1f',
  information: '#4a5560',
  supplies: '#b5642b',
};

export const CATEGORY_LIST = Object.keys(CATEGORY_COLORS);

export const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const hasCoords = listing =>
  typeof listing?.latitude === 'number' && typeof listing?.longitude === 'number';