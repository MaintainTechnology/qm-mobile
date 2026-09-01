/**
 * Approve/Send mutations for a held quote (spec web-parity D3), matching the request/response
 * shape of `POST /api/quote/[id]/approve` and `POST /api/quote/[id]/send` exactly —
 * quotemate-automation/app/api/quote/[id]/{approve,send}/route.ts. Both routes are idempotent-ish
 * (approve no-ops outside `awaiting_tradie_approval`; send 409s once paid/accepted) so a flaky
 * double-tap never double-sends the customer a quote.
 *
 * A 200 does NOT always mean a send happened: approve can return `already_actioned` with the
 * quote's actual non-send status. Never synthesize `status: 'sent'` locally. Both actions wait for
 * a tenant refetch before settling so a timeout or provider failure is reconciled before retry.
 * 45s budget: the server dispatch (SMS send + best-effort PDF render) can run long on a slow
 * connection, and a client-side abort on a slow *success* would make an immediate retry unsafe.
 */
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { TENANT_ME_KEY, type TenantMe } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';

/** Loose: both routes return a larger payload (sid, channel, quote_id, …) than the app needs.
 *  The fields that determine whether anything was actually sent are retained explicitly. */
export const QuoteActionResultSchema = z.looseObject({
  ok: z.literal(true),
  already_actioned: z.boolean().nullish(),
  status: z.string().nullish(),
  message: z.string().nullish(),
});
export type QuoteActionResult = z.infer<typeof QuoteActionResultSchema>;

type OptimisticCtx = { snapshot?: TenantMe };

export type QuoteActionNotice = {
  kind: 'sent' | 'already_actioned' | 'reconciled';
  message: string;
};

/**
 * Tradie-facing copy from the server result. Only the explicit `sent` state claims delivery;
 * no-op and future/partial 200 shapes remain truthful while the refetched quote becomes canonical.
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
  if (result.status === 'sent') {
    return {
      kind: 'sent',
      message: action === 'approve' ? 'Approved and sent.' : 'Sent to the customer.',
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

/** Shared action mutation. Refetch after both success and failure to resolve ambiguous dispatches. */
function useQuoteActionMutation<TBody extends { quoteId: string }>(path: (vars: TBody) => string) {
  const queryClient = useQueryClient();
  return useApiMutation<TBody, QuoteActionResult>(path, QuoteActionResultSchema, {
    timeoutMs: 45000,
    onSettled: () => queryClient.invalidateQueries({ queryKey: TENANT_ME_KEY }),
  });
}

/** POST /api/quote/[id]/approve — no request body; the route ignores it. */
export function useApproveQuote() {
  return useQuoteActionMutation<{ quoteId: string }>(vars => `/api/quote/${vars.quoteId}/approve`);
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

/** POST /api/quote/[id]/send — `{ channel, to? }`. The route sends from ANY pre-payment status
 *  (a resend of a sent quote is a legitimate nudge; paid/accepted 409), so the same mutation
 *  serves first send and resend — build the body with `sendQuoteVars`. */
export function useSendQuote() {
  return useQuoteActionMutation<SendQuoteVars>(vars => `/api/quote/${vars.quoteId}/send`);
}

/** Surfaces the server's own message (e.g. "No phone number on file…") over a generic failure —
 *  layers on the shared mapper; no quote-specific error code needs special-casing today. */
export function actionErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'QuoteMax did not confirm whether that was sent. The quote was refreshed — check its status before trying again.';
  }
  return apiErrorMessage(error, 'That didn’t go through — try again.');
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
  // and ignores the ride-along `quoteId` (same shape trick as useSendQuote).
  return useApiMutation<{ quoteId: string; display_mode: DisplayMode }, QuoteActionResult>(
    vars => `/api/quote/${vars.quoteId}/display-mode`,
    QuoteActionResultSchema,
    {
      method: 'PATCH',
      invalidates: [TENANT_ME_KEY],
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
