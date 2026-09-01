import { CalendarSchema, calendarDayKey, calendarSlotLabel } from './CalendarScreen';

describe('tenant-timezone calendar semantics', () => {
  it('keeps the server timezone in the validated response contract', () => {
    expect(CalendarSchema.parse({ tenantTz: 'Australia/Perth' }).tenantTz).toBe('Australia/Perth');
    expect(() => CalendarSchema.parse({})).toThrow();
    expect(() => CalendarSchema.parse({ tenantTz: 'device-local-ish' })).toThrow();
  });

  it('keys and labels the same instant by tenant time rather than device time', () => {
    const instant = '2026-01-01T15:30:00.000Z';

    expect(calendarDayKey(instant, 'Australia/Perth')).toBe('2026-01-01');
    expect(calendarSlotLabel(instant, 'Australia/Perth')).toEqual({
      day: 'THU 01/01',
      time: '11:30 pm',
    });
    expect(calendarDayKey(instant, 'Australia/Sydney')).toBe('2026-01-02');
    expect(calendarSlotLabel(instant, 'Australia/Sydney')).toEqual({
      day: 'FRI 02/01',
      time: '02:30 am',
    });
  });

  it('handles the repeated hour at the Sydney daylight-saving boundary', () => {
    expect(calendarSlotLabel('2026-04-04T15:30:00.000Z', 'Australia/Sydney').time).toBe('02:30 am');
    expect(calendarSlotLabel('2026-04-04T16:30:00.000Z', 'Australia/Sydney').time).toBe('02:30 am');
  });
});
