// Shared UI reads the device's persisted appearance preference. Use the
// installed package's native-storage mock in the Node-based test runner.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Importing Clerk's native singleton starts MessageChannel workers even when a
// unit test only imports a screen's pure helpers. Keep Node tests hermetic; a
// suite that exercises Clerk behaviour can replace this mock locally.
jest.mock('@clerk/expo', () => ({
  ClerkProvider: ({ children }: { children: unknown }) => children,
  isClerkAPIResponseError: () => false,
  useAuth: () => ({
    getToken: jest.fn(async () => 'test-clerk-token'),
    isLoaded: true,
    isSignedIn: true,
    sessionId: 'test-session',
    signOut: jest.fn(async () => undefined),
    userId: 'test-user',
  }),
  useClerk: () => ({ setActive: jest.fn(async () => undefined) }),
  useSessionList: () => ({
    isLoaded: true,
    sessions: [],
    setActive: jest.fn(async () => undefined),
  }),
  useUser: () => ({ isLoaded: true, user: null }),
}));

jest.mock('@clerk/expo/token-cache', () => ({
  tokenCache: {
    getToken: jest.fn(async () => null),
    saveToken: jest.fn(async () => undefined),
  },
}));

// Monitoring is verified through its pure privacy boundary in unit tests. No
// test may start a native transport or emit a real event.
jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  init: jest.fn(),
  setTag: jest.fn(),
  setTags: jest.fn(),
  withScope: (callback: (scope: { setTags: jest.Mock }) => unknown) =>
    callback({ setTags: jest.fn() }),
  wrap: (component: unknown) => component,
}));
