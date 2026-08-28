import { signOutWithCleanup } from './sign-out';

describe('shared sign-out flow', () => {
  it('unregisters push before Clerk signOut, then clears cache and navigates', async () => {
    const order: string[] = [];
    await signOutWithCleanup({
      unregisterPush: async () => {
        order.push('unregister');
      },
      clerkSignOut: async () => {
        order.push('signOut');
      },
      clearQueryCache: () => {
        order.push('clear');
      },
      navigateToWelcome: () => {
        order.push('navigate');
      },
    });

    expect(order).toEqual(['unregister', 'signOut', 'clear', 'navigate']);
  });

  it('cleanup failure never blocks Clerk signOut, cache clearing, or welcome navigation', async () => {
    const order: string[] = [];

    await signOutWithCleanup({
      unregisterPush: async () => {
        order.push('unregister');
        throw new Error('offline');
      },
      clerkSignOut: async () => {
        order.push('signOut');
      },
      clearQueryCache: () => {
        order.push('clear');
      },
      navigateToWelcome: () => {
        order.push('navigate');
      },
    });

    expect(order).toEqual(['unregister', 'signOut', 'clear', 'navigate']);
  });

  it('still clears cache and navigates if Clerk signOut rejects', async () => {
    const clearQueryCache = jest.fn();
    const navigateToWelcome = jest.fn();

    await expect(
      signOutWithCleanup({
        unregisterPush: async () => undefined,
        clerkSignOut: async () => {
          throw new Error('Clerk unavailable');
        },
        clearQueryCache,
        navigateToWelcome,
      }),
    ).rejects.toThrow('Clerk unavailable');

    expect(clearQueryCache).toHaveBeenCalledTimes(1);
    expect(navigateToWelcome).toHaveBeenCalledTimes(1);
  });
});
