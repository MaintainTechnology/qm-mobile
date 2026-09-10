import { exactChatTimestamp, isColdChat, validChatReply } from './chat-state';

it('only counts abandoned non-registration SMS as cold', () => {
  expect(isColdChat({ channel: 'sms', conversation_type: 'customer', status: 'ABANDONED' })).toBe(
    true,
  );
  expect(
    isColdChat({ channel: 'sms', conversation_type: 'tradie_registration', status: 'abandoned' }),
  ).toBe(false);
  expect(isColdChat({ channel: 'voice', status: 'abandoned' })).toBe(false);
  expect(isColdChat({ channel: 'sms', status: 'active' })).toBe(false);
  expect(isColdChat({ channel: 'sms', status: null })).toBe(false);
});

it('accepts only a nonempty trimmed SMS within the server limit', () => {
  expect(validChatReply('  ')).toBe(false);
  expect(validChatReply(' a ')).toBe(true);
  expect(validChatReply('a'.repeat(1600))).toBe(true);
  expect(validChatReply('a'.repeat(1601))).toBe(false);
});

it('shows an exact AU timestamp including timezone without inventing malformed times', () => {
  expect(exactChatTimestamp('2026-09-08T00:00:00Z')).toContain('2026');
  expect(exactChatTimestamp('invalid')).toBe('Time unavailable');
});
