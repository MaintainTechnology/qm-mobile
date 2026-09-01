export type SignOutDependencies = {
  unregisterPush: () => Promise<void>;
  clerkSignOut: () => Promise<void>;
  clearLocalState: () => Promise<void>;
  navigateToWelcome: () => void;
};

/** Shared sign-out ordering for every escape hatch in the app. */
export async function signOutWithCleanup(deps: SignOutDependencies): Promise<void> {
  try {
    await deps.unregisterPush();
  } catch {
    // Best-effort. Clerk must still be signed out when the device is offline.
  }

  let signOutFailure: unknown;
  try {
    await deps.clerkSignOut();
  } catch (error) {
    signOutFailure = error;
  }

  try {
    await deps.clearLocalState();
  } catch {
    // The identity-scoped persistence buster is the second line of defence on
    // the next launch. Navigation and Clerk sign-out must not be trapped by a
    // local storage failure.
  } finally {
    deps.navigateToWelcome();
  }

  if (signOutFailure) throw signOutFailure;
}
