/**
 * Quote display controls and delivery exports. All Approve/Send actions pass
 * through useQuoteDelivery's encrypted receipt before dispatch. Quote refreshes
 * are separate from the authoritative SMS operation read; neither a status code
 * nor a missing response establishes delivery to the customer.
 */
import { useQueryClient } from '@tanstack/react-query';

import { apiErrorMessage } from '@/lib/api';
import { TENANT_ME_KEY, type TenantMe } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';
import { ownedQuoteKey } from './owned-quote';
import { DeliveryReceiptError } from './delivery-receipt';
import { QuoteActionResultSchema, type QuoteActionResult } from './delivery-schema';
export { QuoteActionResultSchema, type QuoteActionResult } from './delivery-schema';
export { useQuoteDelivery } from './use-quote-delivery';
export { deliveryReceiptNotice } from './delivery-receipt';

type OptimisticCtx = { snapshot?: TenantMe };

export type QuoteActionNotice = {
  kind: 'provider_accepted' | 'already_actioned' | 'reconciled';
  message: string;
};

/**
 * A successful provider request means acceptance, not carrier-confirmed delivery.
 */
export function quoteActionNotice(
  result: QuoteActionResult,
  action: 'approve' | 'send',
): QuoteActionNotice {
  if (result.already_actioned) {
    const state = result.status?.trim().replace(/_/g, ' ');
    return {
      kind: 'already_actioned',
      message:
        result.message?.trim() ||
        (state
          ? `Nothing was sent — this quote is already ${state}. Its current status has been refreshed.`
          : 'Nothing was sent — this quote was already actioned. Its current status has been refreshed.'),
    };
  }
  if (
    result.accepted === true ||
    (result.status === 'sent' && !!(result.sid?.trim() || result.messageId?.trim()))
  ) {
    return {
      kind: 'provider_accepted',
      message:
        action === 'approve'
          ? 'Approved. The provider accepted the message; customer delivery is not yet confirmed.'
          : 'The provider accepted the message; customer delivery is not yet confirmed.',
    };
  }
  const state = result.status?.trim().replace(/_/g, ' ');
  return {
    kind: 'reconciled',
    message:
      result.message?.trim() ||
      (state
        ? `Quote action completed with status ${state}. The current quote has been refreshed.`
        : 'Quote action accepted. The current quote has been refreshed; delivery was not confirmed.'),
  };
}

/** The send route's two channels, verbatim (route.ts: `channel must be 'sms' or 'email'`). */
export type SendChannel = 'sms' | 'email';

/** `{ channel, to? }` per the route's body schema; `quoteId` rides along for the path builder and
 *  is ignored by the server (same shape trick as useSetDisplayMode). */
export type SendQuoteVars = { quoteId: string; channel: SendChannel; to?: string };

/**
 * Mirrors the web SendQuotePanel `to` rule exactly (app/dashboard/quote/[token]/
 * SendQuotePanel.tsx): an override goes up ONLY when the tradie typed one — SMS never overrides
 * an on-file number (the web hides the input entirely), and email only when the typed address
 * differs from what's on file. Otherwise `to` is omitted and the server resolves the recipient
 * through its own 4-source contact chain (lib/quote/send-customer.ts).
 */
export function sendQuoteVars(
  quoteId: string,
  channel: SendChannel,
  onFile: string | null,
  typed: string,
): SendQuoteVars {
  const entered = typed.trim();
  const to =
    channel === 'sms'
      ? onFile
        ? undefined
        : entered || undefined
      : entered && entered !== (onFile ?? '')
        ? entered
        : undefined;
  return to ? { quoteId, channel, to } : { quoteId, channel };
}

/** Surfaces the server's own message (e.g. "No phone number on file…") over a generic failure —
 *  layers on the shared mapper; no quote-specific error code needs special-casing today. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof DeliveryReceiptError) return error.message;
  if (error instanceof Error && error.name === 'AbortError') {
    return 'QuoteMax did not confirm whether that was sent. Refresh delivery status; another send remains blocked.';
  }
  return apiErrorMessage(
    error,
    'QuoteMax did not confirm this delivery. Refresh delivery status before taking another action.',
  );
}

export type DisplayMode = 'itemised' | 'summary' | null;

/**
 * PATCH /api/quote/[id]/display-mode — the web detail pane's "Layout for this
 * quote" toggle (page.tsx QuoteDisplayModeToggle): null inherits the tenant
 * default, else forces the customer page itemised/summary. Same optimistic
 * write-through the status actions use, on the same shared cache.
 */
export function useSetDisplayMode() {
  const queryClient = useQueryClient();
  // Vars double as the PATCH body: the route's BodySchema reads `display_mode`
  // and ignores the ride-along `quoteId`.
  return useApiMutation<{ quoteId: string; display_mode: DisplayMode }, QuoteActionResult>(
    vars => `/api/quote/${vars.quoteId}/display-mode`,
    QuoteActionResultSchema,
    {
      method: 'PATCH',
      invalidates: [TENANT_ME_KEY],
      onSettled: (_data, _error, vars) =>
        queryClient.invalidateQueries({ queryKey: ownedQuoteKey(vars.quoteId) }),
      onMutate: async vars => {
        await queryClient.cancelQueries({ queryKey: TENANT_ME_KEY });
        const snapshot = queryClient.getQueryData<TenantMe>(TENANT_ME_KEY);
        if (snapshot) {
          queryClient.setQueryData<TenantMe>(TENANT_ME_KEY, {
            ...snapshot,
            quotes: snapshot.quotes.map(q =>
              q.id === vars.quoteId ? { ...q, display_mode: vars.display_mode } : q,
            ),
          });
        }
        return { snapshot } satisfies OptimisticCtx;
      },
      onError: (_err, _vars, ctx) => {
        const snapshot = (ctx as OptimisticCtx | undefined)?.snapshot;
        if (snapshot) queryClient.setQueryData(TENANT_ME_KEY, snapshot);
      },
    },
  );
}
