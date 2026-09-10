import { render, waitFor } from '@testing-library/react-native';
import ResolveLinkScreen from '@/app/resolve-link';
import { redirectSystemPath } from '@/app/+native-intent';
import { themes as mockThemes } from '@/lib/theme';

let mockSignedIn = false;
let mockLoaded = true;
let mockTarget: string | string[] = '';
const mockReplace = jest.fn();
jest.mock('@clerk/expo', () => ({ useAuth: () => ({ isLoaded: mockLoaded, isSignedIn: mockSignedIn }) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ target: mockTarget }), useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
beforeEach(() => { mockLoaded = true; mockSignedIn = false; mockReplace.mockClear(); });
it.each([{ signedIn: false, loaded: false }, { signedIn: false, loaded: true }, { signedIn: true, loaded: true }])('opens the public confirmation without a sign-in detour (signedIn=$signedIn, loaded=$loaded)', async ({ signedIn, loaded }) => {
  mockSignedIn = signedIn; mockLoaded = loaded;
  const token = `${'p'.repeat(30)}.${'s'.repeat(43)}`;
  const path = redirectSystemPath({ path: `https://quotemax.com.au/api/email/unsubscribe/${token}`, initial: true });
  mockTarget = new URL(path, 'quotemax://app').searchParams.get('target')!;
  await render(<ResolveLinkScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(`/unsubscribe?token=${token}`));
  expect(mockReplace.mock.calls.every(([value]) => typeof value === 'string')).toBe(true);
});
it('keeps authenticated destinations waiting for Clerk before choosing their sign-in continuation', async () => {
  mockLoaded = false; mockTarget = '/quotes?quoteId=q_1'; const ui = await render(<ResolveLinkScreen />);
  expect(mockReplace).not.toHaveBeenCalled(); mockLoaded = true; await ui.rerender(<ResolveLinkScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/sign-in', params: { intent: '/quotes?quoteId=q_1' } }));
});
it.each(['/admin', '/unsubscribe?token=bad'])('keeps staff or invalid input in recovery while Clerk is loading (%s)', async target => {
  mockLoaded = false; mockTarget = target; await render(<ResolveLinkScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/invalid-link'));
});
it('rejects duplicated resolver targets rather than choosing a capability from an ambiguous link', async () => {
  const token = `${'p'.repeat(30)}.${'s'.repeat(43)}`;
  mockTarget = [`/unsubscribe?token=${token}`, '/support']; await render(<ResolveLinkScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/invalid-link'));
});
