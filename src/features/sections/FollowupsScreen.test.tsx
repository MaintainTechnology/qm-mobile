import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FollowupsScreen } from './FollowupsScreen';
import * as Crypto from 'expo-crypto';
import type { FollowupOperationReceipt } from './followup-operation';

const mockPush = jest.fn();
let mockIdentity = 'owner-a';
const mockMutate = jest.fn();
const mockRefetch = jest.fn();
const mockQueries = jest.fn();
let mockRows: unknown[] = [];
const mockDrafts = new Map<string, unknown>();
const mockPreventRemove = jest.fn();
const mockSaveCopy = jest.fn();
let mockReceipts: Partial<Record<'text' | 'call' | 'note', FollowupOperationReceipt>> = {};
jest.mock('expo-crypto', () => {
  const crypto = jest.requireActual('node:crypto') as typeof import('node:crypto');
  return { CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, randomUUID: () => crypto.randomUUID(),
    digestStringAsync: async (_algorithm: string, text: string) => crypto.createHash('sha256').update(text).digest('hex') };
});
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args) }));
jest.mock('@/lib/tenant', () => ({ useTenantMe: () => ({ data: { tenant: { id: `tenant-${mockIdentity}` } }, isError: false }) }));
jest.mock('@/lib/working-draft-storage', () => ({
  createWorkingDraftStore: (scope: unknown) => {
    const key = JSON.stringify(scope);
    return {
      load: async () => mockDrafts.has(key) ? { value: mockDrafts.get(key) } : null,
      save: async (value: unknown) => { await mockSaveCopy(); mockDrafts.set(key, value); },
      remove: async () => { mockDrafts.delete(key); },
    };
  },
}));
jest.mock('@clerk/expo', () => ({
  useAuth: () => ({ userId: mockIdentity, sessionId: mockIdentity }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/lib/useApi', () => ({
  useApiQuery: (...args: unknown[]) => mockQueries(...args),
  useApiMutation: (path: string, _schema: unknown, opts: unknown) => ({
    isPending: false,
    mutate: (body: unknown) => mockMutate(path, body, opts),
  }),
}));
jest.mock('./use-followup-actions', () => ({
  useFollowupActions: (_tenant: string, target: { kind: string; id: string }) => ({
    text: { loading: false, busy: false, receipt: mockReceipts.text ?? null, error: null },
    call: { loading: false, busy: false, receipt: mockReceipts.call ?? null, error: null },
    note: { loading: false, busy: false, receipt: mockReceipts.note ?? null, error: null },
    busy: false,
    refresh: jest.fn(),
    run: async ({ action, ...body }: { action: string }) => {
      mockMutate(`/api/tenant/followups/${action === 'note' ? 'events' : action}`,
        { ...body, ...(target.kind === 'quote' ? { quoteId: target.id } : { conversationId: target.id }) }, {});
      return { status: 'unknown', accepted: false, history: 'pending' };
    },
  }),
}));
jest.mock('./SectionScreen', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    SectionScreen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    SectionGroup: ({
      title,
      count,
      children,
    }: {
      title: string;
      count: number;
      children: React.ReactNode;
    }) => (
      <View>
        <Text>
          {title} {count}
        </Text>
        {children}
      </View>
    ),
    SectionEmpty: ({ title }: { title: string }) => <Text>{title}</Text>,
    SectionLoading: ({ label }: { label: string }) => <Text>{label}</Text>,
  };
});
jest.mock('../quotes/QuoteWorkspace', () => {
  const { Text } = jest.requireActual('react-native');
  return { QuoteWorkspace: ({ quoteId }: { quoteId: string }) => <Text>Owned quote {quoteId}</Text> };
});
jest.mock('@/lib/env', () => ({ apiUrl: (path: string) => `https://quotemax.test${path}` }));

const q = {
  kind: 'quote',
  quote_id: 'quote-a',
  quote_kind: 'final',
  status: 'sent',
  share_token: 'ABC123',
  job_type: 'power_points',
  customer: { first_name: 'Sam', phone: '+61411222333' },
  followed_up_at: '2026-09-08T00:00:00Z',
};
const lead = {
  kind: 'lead',
  conversation_id: 'conversation-a',
  customer: { first_name: 'Jo', phone: '+61411222334' },
};
beforeEach(() => {
  jest.clearAllMocks();
  mockDrafts.clear();
  mockReceipts = {};
  mockSaveCopy.mockReset().mockResolvedValue(undefined);
  mockIdentity = 'owner-a';
  mockRows = [q];
  mockQueries.mockImplementation((_key, path) => ({
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: mockRefetch,
    data:
      path === '/api/tenant/calendar'
        ? { toSchedule: [{ quoteId: 'paid-a' }] }
        : path.includes('/events?')
          ? {
              events: [
                {
                  id: 'event-a',
                  kind: 'note',
                  outcome: 'spoke',
                  summary: 'Spoke with customer',
                  note: 'Call Friday',
                  created_at: '2026-09-08T00:00:00Z',
                  actor_user_id: null,
                },
              ],
            }
          : path.includes('/messages?')
            ? { ok: true, messages: [] }
            : { followups: mockRows },
  }));
});

it('offers native quote/history/calendar and logging another touch without reopening', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Log another touch' }));
  expect(mockMutate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Touch note'), 'Call Friday');
  await fireEvent.press(screen.getByRole('button', { name: 'Save touch' }));
  expect(mockMutate).toHaveBeenCalledWith(
    '/api/tenant/followups/events',
    { quoteId: 'quote-a', kind: 'note', outcome: 'spoke', note: 'Call Friday', preserveChase: true },
    expect.anything(),
  );
  expect(mockMutate.mock.calls.some(([path]) => path === '/api/tenant/followups')).toBe(false);
  await fireEvent.press(screen.getByRole('button', { name: 'Contact history' }));
  expect(screen.getByText('Call Friday')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Open quote' }));
  expect(screen.getByText('Owned quote quote-a')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: /Open Calendar/ }));
  expect(mockPush).toHaveBeenCalledWith('/sections/calendar');
});

it('initializes the suggestion once and keeps edits through hiding, filtering and reopening', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  expect(screen.getByLabelText('Follow-up message').props.value).toContain('code ABC123');
  expect(mockMutate).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'My revised follow-up');
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await fireEvent.changeText(screen.getByLabelText('Search follow-ups'), 'No match');
  await fireEvent.changeText(screen.getByLabelText('Search follow-ups'), '');
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  expect(screen.getByLabelText('Follow-up message').props.value).toBe('My revised follow-up');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('keeps unquoted leads away from quote endpoints and initializes enquiry text', async () => {
  mockRows = [{ ...lead, quote_id: 'unrelated-quote' }];
  const screen = await render(<FollowupsScreen />);
  expect(
    screen.queryByRole('button', { name: /Log.*touch|Open quote|Contact history/ }),
  ).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  expect(screen.getByLabelText('Follow-up message').props.value).toContain('your enquiry');
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), '  Still need help?  ');
  await fireEvent.press(screen.getByRole('button', { name: /Send \(/ }));
  expect(mockMutate).toHaveBeenCalledWith(
    '/api/tenant/followups/text',
    { conversationId: 'conversation-a', text: 'Still need help?', expectedRecipient: '+61411222334' },
    expect.anything(),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Messages' }));
  expect(mockQueries).toHaveBeenCalledWith(
    expect.anything(),
    '/api/tenant/followups/messages?conversationId=conversation-a',
    expect.anything(),
  );
});

it('discards the previous account draft when the account changes', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'Account A private draft');
  mockIdentity = 'owner-b';
  mockRows = [lead];
  await screen.rerender(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Follow-up message').props.value).not.toContain('private draft'),
  );
});

it('restores an unsent message after leaving and reopening the screen', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'Ready for Friday?');
  await waitFor(() => expect(screen.queryByText('Saving working copy on this device…')).toBeNull());
  await screen.unmount();
  const reopened = await render(<FollowupsScreen />);
  await fireEvent.press(reopened.getByRole('button', { name: 'Text' }));
  expect(reopened.getByLabelText('Follow-up message').props.value).toBe('Ready for Friday?');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('keeps unsaved text visible and prevents Send and navigation when encrypted storage fails', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  mockSaveCopy.mockRejectedValueOnce(new Error('Storage unavailable'));
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'Keep my changes');
  await waitFor(() => expect(screen.getByText('Storage unavailable')).toBeTruthy());
  expect(mockPreventRemove).toHaveBeenLastCalledWith(true, expect.any(Function));
  await fireEvent.press(screen.getByRole('button', { name: /Send \(/ }));
  expect(mockMutate).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Follow-up message').props.value).toBe('Keep my changes');
});

async function textReceipt(text: string, accepted: boolean): Promise<FollowupOperationReceipt> {
  return { version: 1, requestId: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
    inputHash: await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(['quote', q.quote_id,
      { action: 'text', text, expectedRecipient: q.customer.phone }])),
    status: accepted ? 'accepted' : 'not_found', accepted, history: accepted ? 'complete' : 'pending', eventId: null, outboxId: null };
}

it('visibly reconciles automatic accepted recovery and clears only the matching sent draft on remount', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'Already accepted text');
  await waitFor(() => expect(screen.queryByText('Saving working copy on this device…')).toBeNull());
  await screen.unmount();
  mockReceipts.text = await textReceipt('Already accepted text', true);
  const reopened = await render(<FollowupsScreen />);
  await waitFor(() => expect(reopened.getByText('The provider accepted the previous text request.')).toBeTruthy());
  await fireEvent.press(reopened.getByRole('button', { name: 'Text' }));
  expect(reopened.getByLabelText('Follow-up message').props.value).not.toBe('Already accepted text');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('keeps newer text when automatic recovery confirms an older request', async () => {
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'New unsent text');
  mockReceipts.text = await textReceipt('Different old text', true);
  await screen.rerender(<FollowupsScreen />);
  await waitFor(() => expect(screen.getByText('The provider accepted the previous text request.')).toBeTruthy());
  expect(screen.getByLabelText('Follow-up message').props.value).toBe('New unsent text');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('lets the user restore original input after working-copy expiry while new requests remain blocked', async () => {
  mockReceipts.text = await textReceipt('Original lost text', false);
  const screen = await render(<FollowupsScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
  expect(screen.getByLabelText('Follow-up message').props.editable).toBe(true);
  await fireEvent.changeText(screen.getByLabelText('Follow-up message'), 'Original lost text');
  await fireEvent.press(screen.getByRole('button', { name: /Send \(/ }));
  expect(mockMutate).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry same text request' }));
  expect(mockMutate).toHaveBeenCalledWith('/api/tenant/followups/text', expect.objectContaining({ text: 'Original lost text' }), expect.anything());
});
