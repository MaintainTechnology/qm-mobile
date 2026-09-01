import * as WebBrowser from 'expo-web-browser';

import { captureAppError } from '@/lib/monitoring';

export type ExternalProvider = 'stripe' | 'felt';

const PROVIDER_HOSTS: Readonly<Record<ExternalProvider, ReadonlySet<string>>> = {
  stripe: new Set(['billing.stripe.com', 'connect.stripe.com']),
  felt: new Set(['felt.com', 'www.felt.com']),
};

export class UnsafeExternalDestinationError extends Error {
  constructor(provider: ExternalProvider) {
    super(`QuoteMax blocked an unapproved ${provider} destination.`);
    this.name = 'UnsafeExternalDestinationError';
  }
}

export function validatedProviderUrl(rawUrl: string, provider: ExternalProvider): string | null {
  try {
    const parsed = new URL(rawUrl);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      !PROVIDER_HOSTS[provider].has(parsed.hostname.toLowerCase())
    ) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Opens only a known provider host and waits for the browser sheet/tab to
 * close. The caller then refetches authoritative server state; a return URL
 * alone never means billing, onboarding or an edit succeeded.
 */
export async function openProviderHandoff(
  rawUrl: string,
  provider: ExternalProvider,
): Promise<WebBrowser.WebBrowserResult['type']> {
  try {
    const url = validatedProviderUrl(rawUrl, provider);
    if (!url) throw new UnsafeExternalDestinationError(provider);
    const result = await WebBrowser.openBrowserAsync(url);
    return result.type;
  } catch (error) {
    captureAppError(error, {
      kind: 'provider',
      operationId: `${provider}.handoff.open`,
    });
    throw error;
  }
}
