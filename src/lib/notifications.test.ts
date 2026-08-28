import { notificationUrl, registrationDecision } from './notifications';

describe('notificationUrl', () => {
  it('accepts the backend deep-link shapes', () => {
    expect(notificationUrl({ url: '/quotes?quoteId=q_1' })).toBe('/quotes?quoteId=q_1');
    expect(notificationUrl({ url: '/chats?chatId=c_9' })).toBe('/chats?chatId=c_9');
  });

  it('rejects anything that could leave the app — push payloads are a trust boundary', () => {
    expect(notificationUrl({ url: 'https://evil.example/quotes' })).toBeNull();
    // Protocol-relative: starts with '/' but is an external URL.
    expect(notificationUrl({ url: '//evil.example/quotes' })).toBeNull();
    expect(notificationUrl({ url: 'quotes' })).toBeNull();
  });

  it('rejects missing or malformed data without throwing', () => {
    expect(notificationUrl(undefined)).toBeNull();
    expect(notificationUrl(null)).toBeNull();
    expect(notificationUrl('/quotes')).toBeNull();
    expect(notificationUrl({})).toBeNull();
    expect(notificationUrl({ url: 42 })).toBeNull();
  });
});

describe('registrationDecision', () => {
  const onDevice = { isDevice: true, appOwnership: null, permissionStatus: 'undetermined' };

  it('skips simulators — they have no push service', () => {
    expect(registrationDecision({ ...onDevice, isDevice: false })).toBe('skip');
  });

  it('skips Expo Go — remote push unsupported since SDK 53', () => {
    expect(registrationDecision({ ...onDevice, appOwnership: 'expo' })).toBe('skip');
  });

  it('registers silently when permission is already granted', () => {
    expect(registrationDecision({ ...onDevice, permissionStatus: 'granted' })).toBe('register');
  });

  it('asks (pre-prompt first) when undetermined', () => {
    expect(registrationDecision(onDevice)).toBe('ask');
  });

  it('never re-prompts after a denial', () => {
    expect(registrationDecision({ ...onDevice, permissionStatus: 'denied' })).toBe('skip');
  });
});
