import * as WebBrowser from 'expo-web-browser';

import {
  openProviderHandoff,
  UnsafeExternalDestinationError,
  validatedProviderUrl,
} from './provider-handoff';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));

const openBrowser = jest.mocked(WebBrowser.openBrowserAsync);

beforeEach(() => openBrowser.mockReset());

describe('validatedProviderUrl', () => {
  it('allows only the exact retained Stripe and Felt hosts', () => {
    expect(validatedProviderUrl('https://connect.stripe.com/setup/x', 'stripe')).toBe(
      'https://connect.stripe.com/setup/x',
    );
    expect(validatedProviderUrl('https://felt.com/map/abc', 'felt')).toBe(
      'https://felt.com/map/abc',
    );
    expect(validatedProviderUrl('https://stripe.com.evil.test/x', 'stripe')).toBeNull();
    expect(validatedProviderUrl('https://attacker.test/x', 'felt')).toBeNull();
  });

  it('rejects insecure, credential-bearing and malformed URLs', () => {
    expect(validatedProviderUrl('http://connect.stripe.com/x', 'stripe')).toBeNull();
    expect(validatedProviderUrl('https://user:pass@connect.stripe.com/x', 'stripe')).toBeNull();
    expect(validatedProviderUrl('not a url', 'stripe')).toBeNull();
  });
});

describe('openProviderHandoff', () => {
  it('returns the browser outcome so callers can refresh without claiming success', async () => {
    openBrowser.mockResolvedValue({ type: 'cancel' as WebBrowser.WebBrowserResultType });
    await expect(
      openProviderHandoff('https://billing.stripe.com/p/session/abc', 'stripe'),
    ).resolves.toBe('cancel');
    expect(openBrowser).toHaveBeenCalledTimes(1);
  });

  it('never launches an unapproved URL', async () => {
    await expect(openProviderHandoff('https://evil.test/stripe', 'stripe')).rejects.toBeInstanceOf(
      UnsafeExternalDestinationError,
    );
    expect(openBrowser).not.toHaveBeenCalled();
  });
});
