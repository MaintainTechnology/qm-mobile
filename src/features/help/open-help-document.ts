import * as WebBrowser from 'expo-web-browser';

import { apiUrl } from '@/lib/env';
import { captureAppError } from '@/lib/monitoring';

import { type HelpDocument, isApprovedHelpDocumentPath } from './help-documents';

export class UnavailableHelpDocumentError extends Error {
  constructor() {
    super('That help document is not available in this app audience.');
    this.name = 'UnavailableHelpDocumentError';
  }
}

/** Open one exact public static asset without carrying auth or customer data into its URL. */
export async function openHelpDocument(document: HelpDocument): Promise<void> {
  try {
    if (document.audience !== 'tradie' || !isApprovedHelpDocumentPath(document.path)) {
      throw new UnavailableHelpDocumentError();
    }
    await WebBrowser.openBrowserAsync(apiUrl(document.path));
  } catch (error) {
    captureAppError(error, {
      kind: 'provider',
      operationId: 'help.document.open',
      route: '/sections/help',
    });
    throw error;
  }
}
