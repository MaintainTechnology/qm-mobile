import type { ChatRow } from './chats-api';

/** Matches web isColdChat and server analytics; age alone never means abandoned. */
export function isColdChat(
  chat: Pick<ChatRow, 'channel' | 'conversation_type' | 'status'>,
): boolean {
  return (
    chat.channel === 'sms' &&
    chat.conversation_type !== 'tradie_registration' &&
    (chat.status ?? '').toLowerCase() === 'abandoned'
  );
}

export function validChatReply(draft: string): boolean {
  const body = draft.trim();
  return body.length > 0 && body.length <= 1600;
}

export function exactChatTimestamp(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}
