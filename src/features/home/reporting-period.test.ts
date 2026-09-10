import { reportingPeriodWindow } from './reporting-period';

describe('business reporting periods', () => {
  it('leaves all-time unbounded', () => {
    expect(reportingPeriodWindow('all', new Date(), 'Australia/Sydney')).toBeNull();
  });
  it('uses Monday in the business zone when the UTC/device day is still Sunday', () => {
    const window = reportingPeriodWindow(
      'week',
      new Date('2026-09-06T22:00:00Z'),
      'Australia/Sydney',
    );
    expect(window?.from.toISOString()).toBe('2026-09-06T14:00:00.000Z');
    expect(window?.to.toISOString()).toBe('2026-09-07T13:59:59.999Z');
  });
  it('resolves both sides of an Australian DST transition separately', () => {
    const window = reportingPeriodWindow(
      'week',
      new Date('2026-10-04T05:00:00Z'),
      'Australia/Sydney',
    );
    expect(window?.from.toISOString()).toBe('2026-09-27T14:00:00.000Z');
    expect(window?.to.toISOString()).toBe('2026-10-04T12:59:59.999Z');
  });
  it('preserves half-hour zones and calendar year boundaries', () => {
    const now = new Date('2026-01-01T01:00:00Z');
    expect(reportingPeriodWindow('year', now, 'Australia/Adelaide')?.from.toISOString()).toBe(
      '2025-12-31T13:30:00.000Z',
    );
    expect(reportingPeriodWindow('month', now, 'Australia/Perth')?.from.toISOString()).toBe(
      '2025-12-31T16:00:00.000Z',
    );
  });
});
