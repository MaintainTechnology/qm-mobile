/**
 * LLM streaming for the app.
 *
 * ─── Where the model actually runs ────────────────────────────────────────────────────────────
 * Nowhere in this app. The QuoteMax backend owns the provider credentials and the pricing-book
 * context; this module only streams the response back over HTTP.
 *
 * This is not a style preference. A React Native bundle is a zip file — anything shipped in it,
 * including every `EXPO_PUBLIC_*` value, can be read off a device in minutes. A provider key in
 * the app is a key on a billboard. So there is deliberately no `@ai-sdk/anthropic` (or any other
 * provider package) in package.json: those belong on the server.
 *
 * The AI SDK's Expo guide shows the model being called from an Expo API route. That pattern is
 * for apps whose server *is* the Expo project. QuoteMax already has a backend, so the route lives
 * there and this app is purely a client.
 */
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';
import { useMemo } from 'react';

import { apiUrl } from '@/lib/env';
import { authHeader } from '@/lib/session';

/** Backend endpoint that proxies to the model. Must return an AI SDK UI message stream. */
const QUOTE_ASSISTANT_ENDPOINT = '/ai/quote-assistant';

/**
 * Streams a conversation with the quoting assistant.
 *
 * Note the `fetch` override: React Native's global `fetch` buffers the entire response before
 * resolving, so a stream would arrive as one lump at the end. `expo/fetch` streams properly.
 */
export function useQuoteAssistant() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiUrl(QUOTE_ASSISTANT_ENDPOINT),
        fetch: expoFetch as unknown as typeof globalThis.fetch,
        headers: authHeader,
      }),
    [],
  );

  return useChat({ transport });
}
