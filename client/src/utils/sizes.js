// Utilities to provide size/age options similar to Flipkart/Myntra depending on product category

export const CLOTHING_AGE_RANGES = [
  'New Born', '0 - 3 M', '3 - 6 M', '6 - 9 M', '9 - 12 M',
  '12 - 18 M', '18 - 24 M', '2 - 3 Y', '3 - 4 Y', '4 - 5 Y', '5 - 6 Y'
];

// India footwear sizes for kids (approx CM noted)
export const FOOTWEAR_INDIA_SIZES = [
  { label: 'UK 3', cm: 12.8 },
  { label: 'UK 4', cm: 13.4 },
  { label: 'UK 5', cm: 14.0 },
  { label: 'UK 6', cm: 14.7 },
  { label: 'UK 7', cm: 15.3 },
  { label: 'UK 8', cm: 16.0 },
  { label: 'UK 9', cm: 16.6 },
  { label: 'UK 10', cm: 17.3 },
];

export function deriveSizeOptions(category = '', basis = null) {
  // If product explicitly sets basis, honor it
  if (basis === 'age') return CLOTHING_AGE_RANGES;
  if (basis === 'india') return FOOTWEAR_INDIA_SIZES.map((s) => s.label);

  // Otherwise infer from category
  const c = String(category).toLowerCase();
  if (c.includes('foot') || c.includes('shoe') || c.includes('sandal')) {
    return FOOTWEAR_INDIA_SIZES.map((s) => s.label);
  }
  if (c.includes('dress') || c.includes('kurta') || c.includes('lehenga') || c.includes('fashion') || c.includes('boy') || c.includes('girl') || c.includes('ethnic')) {
    return CLOTHING_AGE_RANGES;
  }
  return [];
}
