import { rewriteIncomingSystemPath } from '@/lib/destinations';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return rewriteIncomingSystemPath(path);
  } catch {
    // SDK 54 warns that errors escaping this hook may crash app launch.
    return '/invalid-link';
  }
}
