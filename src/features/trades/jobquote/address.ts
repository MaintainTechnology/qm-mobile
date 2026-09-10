/** Same Geoscape address display contract used by the web job form. */
export function suburbFromAddress(
  address: string,
  state?: string | null,
  postcode?: string | null,
): string | null {
  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  let tail = parts[parts.length - 1] ?? '';
  if (postcode) tail = tail.replace(postcode, '');
  if (state && /^(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)$/i.test(state)) {
    tail = tail.replace(new RegExp(`\\b${state}\\b`, 'i'), '');
  }
  tail = tail.replace(/\b\d{4}\b/g, '').replace(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b/gi, '');
  const suburb = tail.replace(/\s+/g, ' ').trim();
  return suburb.length > 1 ? suburb : null;
}
