import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { z } from 'zod';

import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { Card, Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import type { OwnedQuote } from './owned-quote';
import {
  createFinalQuote,
  recoverFinalQuote,
  loadFinalQuoteAttempt,
  type FinalQuoteAttempt,
  type FinalQuoteScope,
  type FinalQuoteRecord,
  FinalQuoteResultSchema,
} from './final-quote-attempt';

type FinalSnapshot = Pick<OwnedQuote, 'edit_revision' | 'eligibility' | 'processing'>;
export function QuoteFinalActions(props: Parameters<typeof QuoteFinalActionsBody>[0]) {
  return (
    <QuoteFinalActionsBody
      key={JSON.stringify([props.scope.userId, props.scope.tenantId, props.scope.parentId])}
      {...props}
    />
  );
}
function QuoteFinalActionsBody({
  scope,
  snapshot,
  disabled,
  readQuote,
  dispatch,
  onBusyChange,
  onRefresh,
  onOpen,
}: {
  scope: FinalQuoteScope;
  snapshot: FinalSnapshot;
  disabled: boolean;
  readQuote: (id: string) => Promise<FinalQuoteRecord>;
  dispatch: (body: {
    expected_revision: string;
  }) => Promise<z.infer<typeof FinalQuoteResultSchema>>;
  onBusyChange: (busy: boolean) => void;
  onRefresh: () => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const { colors } = useTheme();
  const [attempt, setAttempt] = useState<FinalQuoteAttempt | null>(null);
  const [checking, setChecking] = useState(true);
  const [armed, setArmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const running = useRef(false);
  const key = JSON.stringify([scope.userId, scope.tenantId, scope.parentId]);
  const callbacks = useRef({ scope, readQuote });
  callbacks.current = { scope, readQuote };
  useEffect(() => {
    active.current = true;
    setChecking(true);
    setAttempt(null);
    setError(null);
    const values = callbacks.current;
    let cancelled = false;
    void (async () => {
      try {
        const stored = await loadFinalQuoteAttempt(values.scope);
        if (cancelled) return;
        setAttempt(stored);
        if (stored) {
          const recovered = await recoverFinalQuote(values.scope, values.readQuote);
          if (!cancelled) setAttempt(recovered);
        }
      } catch (failure) {
        if (!cancelled)
          setError(
            apiErrorMessage(failure, 'The previous final draft needs a saved-record check.'),
          );
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
      active.current = false;
    };
  }, [key]);
  useEffect(() => {
    setArmed(null);
  }, [snapshot.edit_revision, disabled]);
  const permission = snapshot.eligibility.issue_final;
  const childId = attempt?.state === 'available' ? attempt.quoteId : permission.existing_quote_id;
  const allowed =
    permission.allowed && snapshot.processing.ready && !disabled && !checking && !attempt && !error;
  async function run(recover: boolean) {
    if (running.current || disabled || checking) return;
    if (!recover && !allowed) return;
    if (!recover && armed !== snapshot.edit_revision) {
      setArmed(snapshot.edit_revision);
      return;
    }
    running.current = true;
    onBusyChange(true);
    setChecking(true);
    setArmed(null);
    setError(null);
    try {
      const next = recover
        ? await recoverFinalQuote(scope, readQuote)
        : await createFinalQuote(scope, snapshot.edit_revision, dispatch, readQuote);
      if (active.current) {
        setAttempt(next);
        await onRefresh();
      }
    } catch (failure) {
      if (active.current)
        setError(
          apiErrorMessage(
            failure,
            'Final draft creation is not confirmed. Check its status before another request.',
          ),
        );
    } finally {
      if (active.current) {
        try {
          const stored = await loadFinalQuoteAttempt(scope);
          if (active.current) setAttempt(stored);
        } catch (failure) {
          if (active.current)
            setError(apiErrorMessage(failure, 'Encrypted draft recovery needs attention.'));
        }
        if (active.current) {
          setChecking(false);
          onBusyChange(false);
        }
      }
      running.current = false;
    }
  }
  const textStyle = [type.body, { color: colors.textPri }];
  return (
    <Card>
      <Text accessibilityRole="header" style={textStyle}>
        Final quote after the site visit
      </Text>
      <Text style={textStyle}>
        Prepare a separate draft with the saved site-visit credit. Review its scope and prices
        before sending it to the customer.
      </Text>
      {!permission.allowed && !childId ? (
        <Notice
          tone="warn"
          label="Final quote unavailable"
          body={
            permission.reason === 'site_visit_not_paid'
              ? 'The site-visit payment must be confirmed before preparing a final quote.'
              : 'Review the saved site visit and payment setup before preparing a final quote.'
          }
        />
      ) : null}
      {error ? <Notice tone="warn" label="Final draft needs attention" body={error} /> : null}
      {attempt?.state === 'unknown' ? (
        <Text accessibilityLiveRegion="polite" style={textStyle}>
          The final draft outcome is unconfirmed. Status checks do not create or send another quote.
        </Text>
      ) : null}
      {childId ? (
        <GhostButton
          label="Open saved final quote"
          disabled={disabled || checking}
          onPress={() => onOpen(childId)}
        />
      ) : null}
      {attempt?.state === 'unknown' || error ? (
        <GhostButton
          label="Check final draft status"
          disabled={disabled || checking}
          onPress={() => void run(true)}
        />
      ) : null}
      {!childId && !attempt ? (
        <>
          {armed === snapshot.edit_revision ? (
            <Notice
              tone="accent"
              label="Confirm final draft"
              body="Create the final quote for this paid site visit. The saved draft must be reviewed and sent separately."
            />
          ) : null}
          <PrimaryCta
            label={
              armed === snapshot.edit_revision
                ? 'Confirm and create final draft'
                : 'Prepare final quote'
            }
            disabled={!allowed}
            loading={checking}
            onPress={() => void run(false)}
          />
          {armed ? <GhostButton label="Cancel final draft" onPress={() => setArmed(null)} /> : null}
        </>
      ) : null}
    </Card>
  );
}
