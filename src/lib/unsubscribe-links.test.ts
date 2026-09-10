import config from '../../app.json';
import { redirectSystemPath } from '@/app/+native-intent';
import { safeDestination } from './destinations';
import { privacySafeRoute } from './monitoring-safety';
import { unsubscribeToken } from '@/features/support/unsubscribe-contract';

const token = `eyJ0IjoiZml4dHVyZSIsImUiOiJwcml2YXRlQGV4YW1wbGUudGVzdCJ9.${'a'.repeat(43)}`;
const destination = `/unsubscribe?token=${token}`;
it.each([
  `https://quotemax.com.au/api/email/unsubscribe/${token}`,
  `https://www.quotemax.com.au/api/email/unsubscribe/${token}`,
  `https://quotemax.com.au/app/unsubscribe?token=${token}`,
  `quotemax://unsubscribe?token=${token}`,
  `quotemax:///unsubscribe?token=${token}`,
  `/api/email/unsubscribe/${token}`,
  `/app/unsubscribe?token=${token}`,
  destination,
])('maps only an explicit unsubscribe capability to a public native confirmation (%s)', link => {
  expect(safeDestination(link)).toEqual({ audience: 'public', path: '/unsubscribe', href: destination });
  for (const initial of [true, false]) expect(redirectSystemPath({ path: link, initial })).toBe(`/resolve-link?target=${encodeURIComponent(destination)}`);
});
it.each([
  `https://evil.test/api/email/unsubscribe/${token}`,
  `https://quotemax.com.au.evil.test/api/email/unsubscribe/${token}`,
  `https://user@quotemax.com.au/api/email/unsubscribe/${token}`,
  `https://quotemax.com.au:9999/api/email/unsubscribe/${token}`,
  `https://quotemax.com.au/api/email/unsubscribe/${token}#hidden`,
  `https://quotemax.com.au/api/email/unsubscribe/${token}?extra=1`,
  `https://quotemax.com.au/api/email/unsubscribe/${token}/other`,
  `https://quotemax.com.au/api/email/unsubscribe/%2F${token}`,
  `quotemax://unsubscribe?token=${token}&token=${token}`,
  `quotemax://unsubscribe?token=${token}&email=other@example.test`,
  `quotemax://unsubscribe?token=${token}&constructor=x`,
  `quotemax://unsubscribe?token=${token}&__proto__=x`,
  'quotemax://unsubscribe',
  '/api/email/unsubscribe/bad',
])('rejects untrusted, malformed, duplicated or ambiguous unsubscribe links (%s)', link => {
  expect(safeDestination(link)).toBeNull(); expect(redirectSystemPath({ path: link, initial: true })).toBe('/invalid-link');
});
it('keeps signed capabilities out of telemetry paths and never treats decoded text as identity', () => {
  expect(unsubscribeToken(token)).toBe(token); expect(unsubscribeToken([token])).toBeNull();
  expect(privacySafeRoute(destination)).toBe('/unsubscribe');
  expect(privacySafeRoute(`/api/email/unsubscribe/${token}`)).toBe('/api/email/unsubscribe');
  expect(privacySafeRoute(`/resolve-link?target=${encodeURIComponent(destination)}`)).toBe('/resolve-link');
});
it('claims only the two approved HTTPS unsubscribe prefixes in the native Android manifest', () => {
  const entries = config.expo.android.intentFilters.flatMap(filter => filter.data).filter(item => item.pathPrefix.includes('unsubscribe'));
  expect(entries).toEqual([
    { scheme: 'https', host: 'quotemax.com.au', pathPrefix: '/api/email/unsubscribe/' },
    { scheme: 'https', host: 'www.quotemax.com.au', pathPrefix: '/api/email/unsubscribe/' },
  ]);
});
