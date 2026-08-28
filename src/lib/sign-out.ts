export type SignOutDependencies = {
  unregisterPush: () => Promise<void>;
  clerkSignOut: () => Promise<void>;
  clearQueryCache: () => void;
  navigateToWelcome: () => void;
};

/** Shared sign-out ordering for every escape hatch in the app. */
export async function signOutWithCleanup(deps: SignOutDependencies): Promise<void> {
  try {
    await deps.unregisterPush();
  } catch {
    // Best-effort. Clerk must still be signed out when the device is offline.
  }

  try {
    await deps.clerkSignOut();
  } finally {
    deps.clearQueryCache();
    deps.navigateToWelcome();
  }
}
