import { compareQueueEntries, type QueueEntry } from '@/features/trades/hub/quote-queue';
import type { ReportingWindow } from './reporting-period';

/** Recent reporting follows root jobs and the selected period; the live queue remains unbounded. */
export function recentWorkEntries(
  entries: readonly QueueEntry[],
  window: ReportingWindow | null,
): QueueEntry[] {
  return entries
    .filter(entry => {
      if (
        entry.kind === 'quote' &&
        entry.quote.quote_kind != null &&
        entry.quote.quote_kind !== 'initial'
      )
        return false;
      if (!window) return true;
      const instant = entry.createdAt ? Date.parse(entry.createdAt) : NaN;
      return (
        Number.isFinite(instant) &&
        instant >= window.from.getTime() &&
        instant <= window.to.getTime()
      );
    })
    .sort((a, b) => compareQueueEntries(a, b, 'newest'))
    .slice(0, 3);
}
