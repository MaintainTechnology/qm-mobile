/**
 * Chats-tab presentation helpers (spec E1/E2). Pure functions so the branching in `relativeTime`
 * and `lastMessagePreview` has one place to unit-test.
 *
 * `relativeTime` diffs two instants in epoch millis — that's timezone-safe (no calendar-day
 * comparison), so it does not carry the NSW/QLD timezone trap the au-conventions skill warns
 * about. The day-32+ fallback renders in the device's local timezone, which is correct for
 * "when did this happen" display.
 */
import type { ChatRow } from './chats-api';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now" / "12m" / "3h" / "5d" / "21 Aug" — a compact clock for a list row. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, now - then);
  if (diff < MINUTE) return 'Just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return new Date(then).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

export function chatDisplayName(chat: Pick<ChatRow, 'first_name' | 'from_number'>): string {
  return chat.first_name || chat.from_number || 'Unknown caller';
}

export function chatInitial(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]/g, '');
  return (letters[0] ?? '#').toUpperCase();
}

/** Last-message preview for a row (E1) — outbound turns get a "QuoteMax:" lead-in, same as web. */
export function lastMessagePreview(chat: Pick<ChatRow, 'messages'>): string {
  const last = chat.messages[chat.messages.length - 1];
  if (!last) return 'No messages yet';
  return last.direction === 'outbound' ? `QuoteMax: ${last.body}` : last.body;
}

export function channelLabel(chat: Pick<ChatRow, 'channel'>): string {
  return chat.channel === 'voice' ? 'Voice' : 'SMS';
}
