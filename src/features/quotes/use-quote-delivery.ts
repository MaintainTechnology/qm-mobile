import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { apiRequest } from '@/lib/api';
import { MissingClerkTokenError, requireClerkToken } from '@/lib/auth-token';
import { TENANT_ME_KEY } from '@/lib/tenant';

import {
  beginAnotherQuoteDelivery,
  DeliveryReceiptError,
  loadDeliveryReceipt,
  reconcileQuoteDelivery,
  retryQuoteDelivery,
  runQuoteDelivery,
  type DeliveryInput,
  type DeliveryReceipt,
  type DeliveryScope,
} from './delivery-receipt';
import {
  QuoteActionResultSchema,
  QuoteDeliveryReadbackSchema,
  SmsRetrySchema,
  FinalPaymentReadbackSchema,
} from './delivery-schema';
import { ownedQuoteKey } from './owned-quote';

export type ReviewedDelivery = { expected_revision: string; reviewedDestination: string };
export type ReviewedSend = ReviewedDelivery & {
  channel: 'sms' | 'email';
  to?: string;
  resend: boolean;
};
type DeliveryView = {
  key: string;
  receipt: DeliveryReceipt | null;
  isLoading: boolean;
  isPending: boolean;
  error: unknown;
};

/** Scope must come from the currently authenticated owner's quote read. All
 * automatic recovery is GET-only. Every POST needs a separate explicit UI action. */
export function useQuoteDelivery(
  quote: { quoteId: string; tenantId: string; purpose?: 'balance' } | null,
) {
  const { userId, sessionId, getToken } = useAuth();
  const cache = useQueryClient();
  const scope: DeliveryScope | null = userId && quote ? { userId, ...quote } : null;
  const key = JSON.stringify([userId, sessionId, quote?.tenantId, quote?.quoteId, quote?.purpose]);
  const current = useRef({ key, active: true });
  current.current.key = key;
  const [view, setView] = useState<DeliveryView>({
    key,
    receipt: null,
    isLoading: true,
    isPending: false,
    error: null,
  });
  const active = () => current.current.active && current.current.key === key;
  const update = (changes: Partial<DeliveryView>) => {
    if (active()) setView(previous => ({ ...previous, ...changes, key }));
  };
  const verifiedScope = () => {
    if (!scope || !active()) throw new DeliveryReceiptError('identity');
    return scope;
  };
  const token = async () => {
    if (!active() || !scope) throw new MissingClerkTokenError();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = requireClerkToken(
        await Promise.race([
          getToken(),
          new Promise<null>(resolve => {
            timer = setTimeout(() => resolve(null), 5000);
          }),
        ]),
      );
      if (!active()) throw new MissingClerkTokenError();
      return result;
    } finally {
      clearTimeout(timer);
    }
  };
  const read = async (receipt: DeliveryReceipt) => {
    const scoped = verifiedScope();
    if (scoped.purpose === 'balance') {
      const path =
        `/api/quote/${encodeURIComponent(scoped.quoteId)}/request-final-payment` +
        (receipt.initial ? '' : `?requestId=${encodeURIComponent(receipt.requestId)}`);
      const result = await apiRequest(path, FinalPaymentReadbackSchema, { token: await token() });
      if (!active() || result.finalQuoteId.toLowerCase() !== scoped.quoteId.toLowerCase())
        throw new DeliveryReceiptError('identity');
      if (result.status === 'not_created')
        throw new DeliveryReceiptError('missing_readback', receipt);
      // The server proves the child belongs to this final quote. The durable
      // operation stays keyed to its reviewed parent even before a child exists.
      return { ...result, quoteId: scoped.quoteId };
    }
    const path =
      `/api/tenant/sms-delivery?quoteId=${encodeURIComponent(scoped.quoteId)}` +
      (receipt.initial ? '' : `&requestId=${encodeURIComponent(receipt.requestId)}`);
    const result = await apiRequest(path, QuoteDeliveryReadbackSchema, {
      token: await token(),
      diagnosticPath: '/api/tenant/sms-delivery',
    });
    if (!active()) throw new DeliveryReceiptError('identity');
    return result;
  };
  const invalidate = async () => {
    if (!scope || !active()) return;
    await Promise.all([
      cache.invalidateQueries({ queryKey: TENANT_ME_KEY }),
      cache.invalidateQueries({ queryKey: ownedQuoteKey(scope.quoteId) }),
    ]);
  };
  const refresh = async () => {
    const scoped = verifiedScope();
    update({ isLoading: true, error: null });
    try {
      const local = await loadDeliveryReceipt(scoped);
      update({ receipt: local });
      const receipt = await reconcileQuoteDelivery(scoped, read);
      update({ receipt });
      return receipt;
    } catch (error) {
      update({ error });
      throw error;
    } finally {
      update({ isLoading: false });
      await invalidate();
    }
  };
  useEffect(() => {
    const identity = current.current;
    identity.active = true;
    setView({ key, receipt: null, isLoading: !!scope, isPending: false, error: null });
    if (scope) void refresh().catch(() => undefined);
    return () => {
      identity.active = false;
    };
    // Each account/session/tenant/quote change creates a fresh visible state.
    // Functions deliberately capture that identity; old completions are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const action = async (input: DeliveryInput) => {
    const scoped = verifiedScope();
    update({ isPending: true, error: null });
    try {
      const result = await runQuoteDelivery(scoped, input, async body => {
        const response = await apiRequest(
          `/api/quote/${encodeURIComponent(scoped.quoteId)}/${input.action}`,
          QuoteActionResultSchema,
          {
            method: 'POST',
            body,
            token: await token(),
            timeoutMs: 60000,
          },
        );
        if (!active()) throw new DeliveryReceiptError('identity');
        return response;
      });
      return result;
    } catch (error) {
      update({ error });
      throw error;
    } finally {
      try {
        update({ receipt: await loadDeliveryReceipt(scoped) });
      } catch (error) {
        update({ error });
      }
      update({ isPending: false });
      await invalidate();
    }
  };
  const retry = async () => {
    const scoped = verifiedScope();
    update({ isPending: true, error: null });
    try {
      const receipt = await retryQuoteDelivery(scoped, read, async id => {
        const result = await apiRequest('/api/tenant/sms-delivery', SmsRetrySchema, {
          method: 'POST',
          body: { id },
          token: await token(),
        });
        if (!active()) throw new DeliveryReceiptError('identity');
        return result;
      });
      update({ receipt });
      return receipt;
    } catch (error) {
      update({ error });
      throw error;
    } finally {
      try {
        update({ receipt: await loadDeliveryReceipt(scoped) });
      } catch (error) {
        update({ error });
      }
      update({ isPending: false });
      await invalidate();
    }
  };
  const beginAnother = async () => {
    const scoped = verifiedScope();
    update({ isPending: true, error: null });
    try {
      // An authoritative SMS read refreshes terminal/failed states before the
      // user chooses a new intent; unknowns and missing records stay blocked.
      await reconcileQuoteDelivery(scoped, read);
      await beginAnotherQuoteDelivery(scoped);
      update({ receipt: null });
    } catch (error) {
      update({ error });
      throw error;
    } finally {
      update({ isPending: false });
    }
  };
  const visible =
    view.key === key
      ? view
      : { key, receipt: null, isLoading: !!scope, isPending: false, error: null };
  return {
    ...visible,
    approve: (input: ReviewedDelivery) =>
      action({ ...input, action: 'approve', channel: 'sms', initial: true }),
    send: ({ resend, ...input }: ReviewedSend) =>
      action({ ...input, action: 'send', initial: !resend }),
    requestBalance: ({ resend, ...input }: ReviewedDelivery & { resend: boolean }) =>
      action({ ...input, action: 'request-final-payment', channel: 'sms', initial: !resend }),
    refresh,
    retry,
    beginAnother,
  };
}
