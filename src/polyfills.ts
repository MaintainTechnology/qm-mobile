/**
 * Runtime polyfills the AI SDK needs on native. Imported once, first thing, from app/_layout.tsx.
 *
 * Without these you get "Property 'structuredClone' doesn't exist" the moment a stream starts.
 * https://ai-sdk.dev/docs/getting-started/expo#polyfills
 */
// `@supabase/supabase-js` builds every request through `URL`/`URLSearchParams`, which Hermes
// only partially implements — without this the first query throws. Must precede any Supabase import.
import 'react-native-url-polyfill/auto';

import structuredClonePolyfill from '@ungap/structured-clone';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    const { polyfillGlobal } = await import('react-native/Libraries/Utilities/PolyfillFunctions');
    const { TextEncoderStream, TextDecoderStream } =
      await import('@stardazed/streams-text-encoding');

    if (!('structuredClone' in globalThis)) {
      polyfillGlobal('structuredClone', () => structuredClonePolyfill);
    }

    polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
    polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
  };

  void setupPolyfills();
}

export {};
