import { canReply } from './chats-api';
import { chatDisplayName, chatInitial, channelLabel, lastMessagePreview, relativeTime } from './format';

describe('relativeTime', () => {
  const now = new Date('2026-08-21T10:00:00.000Z').getTime();

  it('reads seconds-old activity as just now', () => {
    expect(relativeTime('2026-08-21T09:59:40.000Z', now)).toBe('Just now');
  });

  it('shows minutes under an hour', () => {
    expect(relativeTime('2026-08-21T09:48:00.000Z', now)).toBe('12m');
  });

  it('shows hours under a day', () => {
    expect(relativeTime('2026-08-21T04:00:00.000Z', now)).toBe('6h');
  });

  it('shows days under a week', () => {
    expect(relativeTime('2026-08-18T10:00:00.000Z', now)).toBe('3d');
  });

  it('falls back to a short date past a week', () => {
    expect(relativeTime('2026-08-01T10:00:00.000Z', now)).toBe('1 Aug');
  });

  it('never goes negative on clock skew', () => {
    expect(relativeTime('2026-08-21T10:05:00.000Z', now)).toBe('Just now');
  });
});

describe('lastMessagePreview', () => {
  it('prefixes outbound turns with QuoteMax', () => {
    expect(
      lastMessagePreview({
        messages: [{ direction: 'outbound', body: 'Sure thing', created_at: 'x' }],
      }),
    ).toBe('QuoteMax: Sure thing');
  });

  it('leaves inbound turns bare', () => {
    expect(
      lastMessagePreview({ messages: [{ direction: 'inbound', body: 'Got a leak', created_at: 'x' }] }),
    ).toBe('Got a leak');
  });

  it('handles a conversation with no messages', () => {
    expect(lastMessagePreview({ messages: [] })).toBe('No messages yet');
  });
});

describe('chatDisplayName / chatInitial / channelLabel', () => {
  it('prefers the caller name over the raw number', () => {
    expect(chatDisplayName({ first_name: 'Sam', from_number: '+61412345678' })).toBe('Sam');
  });

  it('falls back to the number, then Unknown caller', () => {
    expect(chatDisplayName({ first_name: null, from_number: '+61412345678' })).toBe('+61412345678');
    expect(chatDisplayName({ first_name: null, from_number: null })).toBe('Unknown caller');
  });

  it('initials a name and falls back to # for symbols only', () => {
    expect(chatInitial('Sam')).toBe('S');
    expect(chatInitial('+61412345678')).toBe('6');
    expect(chatInitial('###')).toBe('#');
  });

  it('labels voice vs everything else as SMS', () => {
    expect(channelLabel({ channel: 'voice' })).toBe('Voice');
    expect(channelLabel({ channel: 'sms' })).toBe('SMS');
  });
});

describe('canReply (web parity — voice threads have no sms_conversations row)', () => {
  it('allows SMS threads with a known customer number', () => {
    expect(canReply({ channel: 'sms', from_number: '+61412345678' })).toBe(true);
  });

  it('blocks SMS threads missing a number and all voice threads', () => {
    expect(canReply({ channel: 'sms', from_number: null })).toBe(false);
    expect(canReply({ channel: 'voice', from_number: '+61412345678' })).toBe(false);
  });
});
