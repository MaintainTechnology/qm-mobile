import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useAccountIdentityBoundary } from './use-account-identity-boundary';

const cleanup = jest.fn<Promise<void>, []>();
const cache = jest.fn();
const deps = { initialiseServerCache: cache, clearLocalState: cleanup };
type Props = { userId: string | null; sessionId?: string; tenantId?: string; isLoaded?: boolean };
function Harness({ userId, sessionId = 'session_A', tenantId, isLoaded = true }: Props) {
  const state = useAccountIdentityBoundary({ userId, sessionId, tenantId: tenantId ?? null, isLoaded }, deps);
  return state.ready ? <Text>{`Private workspace ${userId}`}</Text> : <Text onPress={state.retry}>{state.failed ? 'Retry cleanup' : 'Opening account'}</Text>;
}
beforeEach(() => { jest.clearAllMocks(); cleanup.mockResolvedValue(undefined); });

it('waits for resolved Clerk identity without purging cold-launch drafts', async () => {
  const view = await render(<Harness userId={null} isLoaded={false} />);
  expect(screen.queryByText(/Private workspace/)).toBeNull();
  expect(cleanup).not.toHaveBeenCalled(); expect(cache).not.toHaveBeenCalled();
  await view.rerender(<Harness userId="user_A" />);
  expect(screen.getByText('Private workspace user_A')).toBeTruthy();
  expect(cleanup).not.toHaveBeenCalled();
});
it('hides both accounts during a slow transition and opens only the latest identity', async () => {
  let finish!: () => void;
  cleanup.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  const view = await render(<Harness userId="user_A" />);
  await view.rerender(<Harness userId="user_B" sessionId="session_B" />);
  expect(screen.queryByText(/Private workspace/)).toBeNull(); expect(cleanup).toHaveBeenCalledTimes(1);
  await act(async () => finish());
  expect(screen.getByText('Private workspace user_B')).toBeTruthy();
});
it('keeps the new workspace closed after cleanup failure and allows deliberate retry', async () => {
  cleanup.mockRejectedValueOnce(new Error('encrypted purge failed'));
  const view = await render(<Harness userId="user_A" />);
  await view.rerender(<Harness userId="user_B" sessionId="session_B" />);
  expect(screen.getByText('Retry cleanup')).toBeTruthy();
  expect(screen.queryByText(/Private workspace/)).toBeNull();
  await act(async () => screen.getByText('Retry cleanup').props.onPress());
  expect(screen.getByText('Private workspace user_B')).toBeTruthy();
});
