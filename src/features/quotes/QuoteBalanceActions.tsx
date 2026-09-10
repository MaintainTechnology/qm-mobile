import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { Card, Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { deliveryReceiptNotice } from './delivery-receipt';
import type { OwnedQuote } from './owned-quote';
import { useQuoteDelivery } from './use-quote-delivery';

export type BalanceSnapshot = Pick<
  OwnedQuote,
  'customer_release_revision' | 'eligibility' | 'money' | 'processing'
> & {
  quote: Pick<OwnedQuote['quote'], 'id' | 'tenant_id' | 'customer_phone'>;
};
const reasons: Record<string, string> = {
  final_not_sent: 'Send the final quote before requesting its balance.',
  deposit_not_paid: 'The final quote’s deposit must be confirmed before requesting its balance.',
  connect_required: 'Payment setup must be complete before requesting this balance.',
  quote_pricing_review_required:
    'The saved quote amounts need review before a balance can be requested.',
  nothing_to_charge: 'This quote has no remaining balance eligible for payment.',
  balance_already_paid: 'The balance is already recorded as paid.',
};

/** Render only for an owned final quote. Its child balance is created and priced
 * by the server; a local receipt protects unknown dispatch outcomes on relaunch. */
export function QuoteBalanceActions({
  snapshot,
  disabled,
  onBusyChange,
  onRefresh,
  onOpen,
}: {
  snapshot: BalanceSnapshot;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onRefresh: () => Promise<void>;
  onOpen: (id: string) => void;
}) {
  const { colors } = useTheme();
  const delivery = useQuoteDelivery({
    quoteId: snapshot.quote.id,
    tenantId: snapshot.quote.tenant_id,
    purpose: 'balance',
  });
  const [armed, setArmed] = useState<string | null>(null);
  const [resend, setResend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const permission = snapshot.eligibility.request_balance;
  const recipient = snapshot.quote.customer_phone?.trim() || null;
  const balance = snapshot.money.balance_base_cents;
  const settled = delivery.receipt?.state === 'balance_paid';
  const allowed =
    !disabled &&
    snapshot.processing.ready &&
    permission.allowed &&
    !!recipient &&
    balance !== null &&
    !settled;
  const busy = delivery.isPending || delivery.isLoading;
  const reviewKey = JSON.stringify([
    snapshot.customer_release_revision,
    recipient,
    balance,
    resend,
  ]);
  const confirmed = armed === reviewKey;
  useEffect(() => {
    setArmed(null);
  }, [reviewKey, disabled]);
  const run = async (operation: () => Promise<unknown>, refresh = true) => {
    if (inFlight.current || disabled || busy) return;
    inFlight.current = true;
    onBusyChange(true);
    setError(null);
    try {
      await operation();
      if (active.current && refresh) await onRefresh();
    } catch (failure) {
      if (active.current)
        setError(
          apiErrorMessage(
            failure,
            'The balance request outcome needs checking. Refresh its saved status.',
          ),
        );
    } finally {
      inFlight.current = false;
      if (active.current) onBusyChange(false);
    }
  };
  const request = () => {
    if (!allowed || busy || delivery.receipt || inFlight.current) return;
    if (!confirmed) {
      setArmed(reviewKey);
      return;
    }
    setArmed(null);
    void run(() =>
      delivery.requestBalance({
        expected_revision: snapshot.customer_release_revision,
        reviewedDestination: recipient!,
        resend,
      }),
    );
  };
  const receipt = delivery.receipt;
  const canBegin =
    receipt &&
    ['provider_accepted', 'delivered', 'failed', 'noop', 'no_commit'].includes(receipt.state);
  const textStyle = [type.body, { color: colors.textPri }];
  return (
    <Card>
      <Text accessibilityRole="header" style={textStyle}>
        Balance payment
      </Text>
      <Text style={textStyle}>
        Remaining balance: {balance === null ? 'Unavailable' : formatAud(balance)}
      </Text>
      <Text style={[type.bodySm, { color: colors.textSec }]}>
        The customer payment link shows the server’s charge and any applicable fee.
      </Text>
      {!permission.allowed || !snapshot.processing.ready ? (
        <Notice
          tone="warn"
          label="Balance request unavailable"
          body={
            reasons[permission.reason ?? ''] ??
            'Review the saved quote and its payment state before requesting a balance.'
          }
        />
      ) : !recipient ? (
        <Notice
          tone="warn"
          label="Customer number unavailable"
          body="A saved customer mobile number is required before a balance request can be reviewed."
        />
      ) : null}
      {error || delivery.error ? (
        <Notice
          tone="warn"
          label="Balance request needs attention"
          body={error ?? apiErrorMessage(delivery.error, 'Delivery status could not be confirmed.')}
        />
      ) : null}
      {!receipt && delivery.error ? (
        <GhostButton
          label="Check balance recovery"
          disabled={disabled || busy}
          onPress={() => void run(delivery.refresh)}
        />
      ) : null}
      {receipt ? (
        <View style={{ gap: spacing.sm }}>
          <Text accessibilityLiveRegion="polite" style={textStyle}>
            {deliveryReceiptNotice(receipt)}
          </Text>
          <GhostButton
            label="Refresh balance delivery status"
            disabled={disabled || busy}
            onPress={() => void run(delivery.refresh)}
          />
          {receipt.state === 'failed' && allowed ? (
            <GhostButton
              label="Retry original balance message"
              disabled={busy}
              onPress={() => void run(delivery.retry)}
            />
          ) : null}
          {canBegin && allowed ? (
            <GhostButton
              label={
                receipt.state === 'no_commit'
                  ? 'Review balance request again'
                  : 'Review another balance message'
              }
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await delivery.beginAnother();
                  if (active.current) {
                    setResend(receipt.state === 'no_commit' ? !receipt.initial : true);
                    setArmed(null);
                  }
                }, false)
              }
            />
          ) : null}
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {confirmed ? (
            <Notice
              tone="accent"
              label="Confirm balance message"
              body={`Text ${recipient} a payment request for the saved remaining balance of ${formatAud(balance!)}. ${resend ? 'This sends another message to the customer.' : 'This prepares or resumes the balance payment request.'}`}
            />
          ) : null}
          <PrimaryCta
            label={
              confirmed
                ? 'Confirm and text balance request'
                : resend
                  ? 'Review balance resend'
                  : 'Request balance payment'
            }
            disabled={!allowed || busy || !!delivery.error}
            loading={delivery.isPending}
            onPress={request}
          />
          {confirmed ? (
            <GhostButton label="Cancel balance request" onPress={() => setArmed(null)} />
          ) : null}
        </View>
      )}
      {permission.existing_quote_id ? (
        <GhostButton
          label="Open saved balance quote"
          disabled={disabled || busy}
          onPress={() => onOpen(permission.existing_quote_id!)}
        />
      ) : null}
    </Card>
  );
}
