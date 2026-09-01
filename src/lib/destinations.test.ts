import { rewriteIncomingSystemPath, safeDestination } from './destinations';

describe('safeDestination', () => {
  it('accepts only registered routes and their explicit query shapes', () => {
    expect(safeDestination('/quotes?quoteId=q_123')).toEqual({
      audience: 'authenticated',
      href: '/quotes?quoteId=q_123',
      path: '/quotes',
    });
    expect(safeDestination('/chats?chatId=chat-9')?.audience).toBe('authenticated');
    expect(safeDestination('/welcome')?.audience).toBe('public');
    expect(safeDestination('/support')).toEqual({
      audience: 'public',
      href: '/support',
      path: '/support',
    });
    expect(
      safeDestination(
        '/sign-up?code=ACME-7K2P&intent=abc123.def456&source=flyer&referral=matt&plan=pro&interval=year&returnTo=%2Fquotes%3FquoteId%3Dq_1',
      )?.path,
    ).toBe('/sign-up');
    expect(safeDestination('/sections/billing?stripe=return')?.path).toBe('/sections/billing');
    expect(safeDestination('/sections/payouts?stripe=refresh')?.path).toBe('/sections/payouts');
    expect(safeDestination('/quotes?unexpected=1')).toBeNull();
    expect(safeDestination('/sections/billing?stripe=refresh')).toBeNull();
    expect(safeDestination('/sections/payouts?stripe=complete')).toBeNull();
    expect(safeDestination('/sign-up?intent=/quotes')).toBeNull();
    expect(safeDestination('/sign-up?returnTo=https%3A%2F%2Fevil.test')).toBeNull();
    expect(safeDestination('/sign-up?plan=enterprise')).toBeNull();
    expect(safeDestination('/admin')).toBeNull();
  });

  it('accepts only an explicit success provisioning readiness flag', () => {
    expect(safeDestination('/success?ready=1')?.href).toBe('/success?ready=1');
    expect(safeDestination('/success?ready=0')?.href).toBe('/success?ready=0');
    expect(safeDestination('/success?ready=true')).toBeNull();
  });

  it('rejects external, protocol-relative, malformed and traversal-like input', () => {
    expect(safeDestination('https://evil.example/app/quotes?quoteId=q_1')).toBeNull();
    expect(safeDestination('//evil.example/quotes')).toBeNull();
    expect(safeDestination('/quotes?quoteId=../../other-tenant')).toBeNull();
    expect(safeDestination('/quotes#hidden')).toBeNull();
  });

  it('maps only the deliberately claimed /app HTTPS namespace', () => {
    expect(safeDestination('https://quotemax.com.au/app/quotes?quoteId=q_1')?.href).toBe(
      '/quotes?quoteId=q_1',
    );
    expect(safeDestination('https://www.quotemax.com.au/q/public-token')).toBeNull();
  });

  it('understands both custom-scheme URL shapes', () => {
    expect(safeDestination('quotemax://quotes?quoteId=q_1')?.href).toBe('/quotes?quoteId=q_1');
    expect(safeDestination('quotemax:///chats?chatId=c_1')?.href).toBe('/chats?chatId=c_1');
  });
});

describe('rewriteIncomingSystemPath', () => {
  it('routes trusted external intents through the auth-aware resolver', () => {
    expect(rewriteIncomingSystemPath('quotemax://quotes?quoteId=q_1')).toBe(
      '/resolve-link?target=%2Fquotes%3FquoteId%3Dq_1',
    );
  });

  it('fails malformed or unclaimed external links into recovery', () => {
    expect(rewriteIncomingSystemPath('https://evil.example/app/quotes')).toBe('/invalid-link');
    expect(rewriteIncomingSystemPath('not a url')).toBe('/invalid-link');
  });

  it('does not break Expo development URLs or ordinary in-app paths', () => {
    expect(rewriteIncomingSystemPath('exp://10.0.0.2:8081/--/quotes')).toBe(
      'exp://10.0.0.2:8081/--/quotes',
    );
    expect(rewriteIncomingSystemPath('/quotes?quoteId=q_1')).toBe('/quotes?quoteId=q_1');
  });
});
