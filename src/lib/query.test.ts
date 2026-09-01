import { netInfoIsOnline, queryScopeBuster } from './query';

describe('query persistence scope', () => {
  it('partitions cache payloads by authenticated Clerk identity and app version', () => {
    expect(queryScopeBuster('1.1.0', 'user_a')).toBe('1.1.0:clerk:user_a');
    expect(queryScopeBuster('1.1.0', 'user_b')).not.toBe(queryScopeBuster('1.1.0', 'user_a'));
    expect(queryScopeBuster('1.2.0', 'user_a')).not.toBe(queryScopeBuster('1.1.0', 'user_a'));
    expect(queryScopeBuster('1.1.0', null)).toBe('1.1.0:clerk:signed-out');
  });
});

describe('native network state', () => {
  it('treats explicit transport or reachability failure as offline', () => {
    expect(netInfoIsOnline({ isConnected: false, isInternetReachable: null })).toBe(false);
    expect(netInfoIsOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('does not invent an outage while reachability is still unknown', () => {
    expect(netInfoIsOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
    expect(netInfoIsOnline({ isConnected: null, isInternetReachable: null })).toBe(true);
  });
});
