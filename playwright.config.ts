/**
 * E2E QA of the Expo WEB build (react-native-web renders the same components as native).
 * The QuoteMax backend is route-mocked per spec (e2e/mocks.ts) — these tests verify the app,
 * not the backend. Clerk runs live against the development instance (pk_test), using Clerk's
 * test-mode conventions (+clerk_test emails, 424242 codes) so no real emails are sent.
 */
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  // Metro dev-server + a shared Clerk dev instance: serial keeps runs deterministic.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8090',
    // A tradie's phone, not a desktop.
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx expo start --web --port 8090',
    url: 'http://localhost:8090',
    reuseExistingServer: true,
    // First Metro web bundle compiles from cold in minutes, not seconds.
    timeout: 300_000,
  },
});
