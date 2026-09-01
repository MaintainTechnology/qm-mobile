import { lastUpdatedLabel, offlineStatusCopy } from './NetworkStatusBanner';

const NOW = Date.UTC(2026, 8, 1, 4, 0, 0);

describe('offline cache copy', () => {
  it('distinguishes no cached server data', () => {
    expect(lastUpdatedLabel(0, NOW)).toBeNull();
    expect(offlineStatusCopy(0, NOW)).toContain('no saved server data');
  });

  it('labels recent cached data without claiming a write will sync', () => {
    const copy = offlineStatusCopy(NOW - 2 * 60_000, NOW);
    expect(copy).toContain('last updated 2 min ago');
    expect(copy).toContain('Changes need a connection');
    expect(copy).not.toMatch(/sent|paid|will sync/i);
  });

  it('uses honest hour and day units for stale persisted data', () => {
    expect(lastUpdatedLabel(NOW - 3 * 60 * 60_000, NOW)).toBe('last updated 3 hr ago');
    expect(lastUpdatedLabel(NOW - 24 * 60 * 60_000, NOW)).toBe('last updated 1 day ago');
  });
});
