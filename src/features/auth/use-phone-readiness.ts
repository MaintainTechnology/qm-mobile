import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiRequest } from '@/lib/api';
import { ActivationResponseSchema, readPhoneReadiness } from './provisioning';

/** Provider attempts live on the server. Mount/restart only reads that receipt;
 * a user tap can start work only after a fresh authoritative no-attempt read. */
export function usePhoneReadiness({
  ownerKey,
  tenantId,
  getToken,
}: {
  ownerKey: string | null;
  tenantId?: string;
  getToken: () => Promise<string | null | undefined>;
}) {
  const scope = useMemo(
    () => ({ active: true, busy: false, ownerKey, tenantId }),
    [ownerKey, tenantId],
  );
  const [feedback, setFeedback] = useState<{
    scope: typeof scope;
    error: string | null;
    busy: boolean;
    needsCheck?: boolean;
  } | null>(null);
  useEffect(() => {
    scope.active = true;
    return () => {
      scope.active = false;
    };
  }, [scope]);
  const query = useQuery({
    queryKey: ['phone-readiness', ownerKey, tenantId ?? null],
    enabled: !!ownerKey,
    retry: false,
    queryFn: async () => {
      const token = await getToken();
      if (!scope.active || !token) throw new Error('Sign in again to check phone setup.');
      const result = await readPhoneReadiness(token, tenantId);
      if (!scope.active) throw new Error('Account changed while checking phone setup.');
      return result;
    },
  });
  async function start() {
    if (!scope.active || scope.busy || !ownerKey) return;
    scope.busy = true;
    setFeedback({ scope, busy: true, error: null });
    try {
      const fresh = await query.refetch();
      if (!scope.active) return;
      if (fresh.error || !fresh.data?.retryable)
        throw new Error(fresh.data?.message ?? 'Check phone setup status before retrying.');
      const token = await getToken();
      if (!scope.active || !token) return;
      const result = await apiRequest('/api/onboard/retry-provision', ActivationResponseSchema, {
        method: 'POST',
        token,
        timeoutMs: 120000,
      });
      if (!scope.active) return;
      // The readback, including an account-owned operation id, is authoritative.
      // HTTP 200 / ok:false and a lost POST never become setup success.
      await query.refetch();
      if (!scope.active) return;
      if (!result.ok)
        throw new Error(
          result.warning ??
            result.error ??
            'Phone setup is unconfirmed. Check status before retrying.',
        );
      setFeedback({ scope, busy: false, error: null });
    } catch (error) {
      if (scope.active)
        setFeedback({
          scope,
          busy: false,
          needsCheck: true,
          error: apiErrorMessage(
            error,
            'Phone setup is unconfirmed. Check status; do not repeat the purchase.',
          ),
        });
    } finally {
      scope.busy = false;
      if (scope.active)
        setFeedback(current => (current?.scope === scope ? { ...current, busy: false } : current));
    }
  }
  return {
    data:
      query.isError || (feedback?.scope === scope && feedback.needsCheck) ? undefined : query.data,
    busy: query.isFetching || (feedback?.scope === scope && feedback.busy),
    error:
      feedback?.scope === scope && feedback.error
        ? feedback.error
        : query.isError
          ? apiErrorMessage(query.error, 'Phone setup status is unavailable.')
          : null,
    refresh: async () => {
      const result = await query.refetch();
      if (scope.active && !result.error) setFeedback({ scope, busy: false, error: null });
      return result;
    },
    start,
  };
}
