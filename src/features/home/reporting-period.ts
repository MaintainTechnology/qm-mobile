export type ReportingPeriod = 'all' | 'year' | 'month' | 'week';
export type ReportingWindow = { from: Date; to: Date };

export const REPORTING_PERIODS: readonly { key: ReportingPeriod; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'year', label: 'This year' },
  { key: 'month', label: 'This month' },
  { key: 'week', label: 'This week' },
];

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

/** Resolve a business-calendar midnight, including changed UTC offset at DST boundaries. */
function businessMidnight(calendarDay: Date, timeZone: string): Date {
  const wall = Date.UTC(
    calendarDay.getUTCFullYear(),
    calendarDay.getUTCMonth(),
    calendarDay.getUTCDate(),
  );
  let candidate = wall;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const part = zonedParts(new Date(candidate), timeZone);
    const displayed = Date.UTC(
      part.year,
      part.month - 1,
      part.day,
      part.hour,
      part.minute,
      part.second,
    );
    const correction = wall - displayed;
    if (correction === 0) return new Date(candidate);
    candidate += correction;
  }
  throw new Error('The reporting timezone could not be resolved.');
}

/** All is unbounded; other periods use business-local start and the end of today, Monday weeks. */
export function reportingPeriodWindow(
  period: ReportingPeriod,
  now: Date,
  timeZone: string,
): ReportingWindow | null {
  if (period === 'all') return null;
  const part = zonedParts(now, timeZone);
  const today = new Date(Date.UTC(part.year, part.month - 1, part.day));
  const start = new Date(today);
  if (period === 'year') start.setUTCMonth(0, 1);
  else if (period === 'month') start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return {
    from: businessMidnight(start, timeZone),
    to: new Date(businessMidnight(tomorrow, timeZone).getTime() - 1),
  };
}
