/**
 * Helpers for the listing details added to products in Sanity:
 * tagSize, measurements, condition, flaws, brand, fabric, era.
 */

/** "m " → "M", "34w 32l" → "34W 32L" — so the size filter groups them. */
export const normaliseSize = (size) =>
  typeof size === 'string' ? size.trim().replace(/\s+/g, ' ').toUpperCase() : '';

const LETTER_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL'];

/** Letter sizes first (XS…XXL), then numeric sizes ascending, then anything else. */
export const sortSizes = (sizes) =>
  [...sizes].sort((a, b) => {
    const la = LETTER_ORDER.indexOf(a);
    const lb = LETTER_ORDER.indexOf(b);
    if (la !== -1 || lb !== -1) return (la === -1 ? 99 : la) - (lb === -1 ? 99 : lb);
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });

/** Worst → best, so the meter reads left to right. */
export const CONDITIONS = [
  { value: 'well_worn', label: 'Well-worn', note: 'Visible wear, priced for it. Flaws listed below.' },
  { value: 'good', label: 'Good', note: 'Worn and loved, with light signs of wear.' },
  { value: 'very_good', label: 'Very good', note: 'Minimal wear. Any small flaws are listed.' },
  { value: 'near_new', label: 'Near new', note: 'Barely worn. No noticeable flaws.' },
];

export const conditionIndex = (value) => CONDITIONS.findIndex((c) => c.value === value);

/** Display order + labels. Only filled values are shown, so tops and bottoms sort themselves out. */
export const MEASUREMENT_FIELDS = [
  ['chest', 'Chest (pit to pit)'],
  ['shoulder', 'Shoulder'],
  ['length', 'Length'],
  ['sleeve', 'Sleeve'],
  ['waist', 'Waist'],
  ['hip', 'Hip'],
  ['rise', 'Rise'],
  ['inseam', 'Inseam'],
  ['legOpening', 'Leg opening'],
];

export const measurementRows = (m) =>
  MEASUREMENT_FIELDS
    .filter(([key]) => typeof m?.[key] === 'number' && m[key] > 0)
    .map(([key, label]) => ({ key, label, value: m[key] }));

const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
export const inches = (n) => `${fmt(n)}″`;
export const cm = (n) => `${fmt(Math.round(n * 2.54 * 10) / 10)} cm`;
