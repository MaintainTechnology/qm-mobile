import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { GhostButton } from '@/features/auth/ui';
import { Card, Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { formatAud } from '@/lib/money';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import type { OwnedQuote } from './owned-quote';

type ChainLink = NonNullable<OwnedQuote['chain']['parent']>;
export type QuoteChainSnapshot = Pick<
  OwnedQuote,
  'edit_revision' | 'chain' | 'money' | 'credit_settlement'
> & {
  quote: Pick<OwnedQuote['quote'], 'id' | 'tenant_id'>;
};
const amounts: [keyof Omit<OwnedQuote['money'], 'currency' | 'unit' | 'source'>, string][] = [
  ['job_total_inc_gst_cents', 'Job total'],
  ['inspection_credit_cents', 'Site visit credit'],
  ['deposit_base_cents', 'Deposit after credit'],
  ['balance_base_cents', 'Remaining balance'],
  ['current_payment_base_cents', 'This payment before fee'],
  ['platform_fee_cents', 'Fee for this payment'],
  ['customer_charge_cents', 'Customer charge for this payment'],
];
function label(link: ChainLink) {
  const kind =
    link.quote_kind === 'final'
      ? 'Final quote'
      : link.quote_kind === 'balance'
        ? 'Balance'
        : link.quote_kind == null || link.quote_kind === 'initial'
          ? 'Initial quote'
          : 'Related quote';
  const status = link.status?.replaceAll('_', ' ');
  return `${kind}${status ? ` · ${status}` : ''}`;
}

/** Display stored server amounts verbatim; navigation always opens an authenticated owner read. */
export function QuoteChainSummary({
  snapshot,
  disabled,
  onOpen,
  loadPage,
}: {
  snapshot: QuoteChainSnapshot;
  disabled: boolean;
  onOpen: (id: string) => void;
  loadPage: (cursor: string) => Promise<QuoteChainSnapshot>;
}) {
  const { colors } = useTheme();
  const [children, setChildren] = useState(snapshot.chain.children);
  const [cursor, setCursor] = useState(snapshot.chain.next_cursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function more() {
    if (!cursor || disabled || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const page = await loadPage(cursor);
      if (!active.current) return;
      if (
        page.quote.id !== snapshot.quote.id ||
        page.quote.tenant_id !== snapshot.quote.tenant_id ||
        page.edit_revision !== snapshot.edit_revision
      )
        throw new Error(
          'The saved quote changed. Refresh the quote before loading more linked records.',
        );
      if (page.chain.next_cursor === cursor)
        throw new Error('The next linked-record page could not be confirmed. Refresh the quote.');
      setChildren(previous => [
        ...new Map([...previous, ...page.chain.children].map(row => [row.id, row])).values(),
      ]);
      setCursor(page.chain.next_cursor);
    } catch (cause) {
      if (active.current) setError(apiErrorMessage(cause, 'Linked records could not be loaded.'));
    } finally {
      inFlight.current = false;
      if (active.current) setLoading(false);
    }
  }
  const links = [
    ...new Map(
      [snapshot.chain.root, snapshot.chain.parent, ...children]
        .filter((row): row is ChainLink => !!row && row.id !== snapshot.quote.id)
        .map(row => [row.id, row]),
    ).values(),
  ];
  return (
    <Card>
      <Text accessibilityRole="header" style={[type.body, { color: colors.textPri }]}>
        Job payments and linked quotes
      </Text>
      <Text style={[type.bodySm, { color: colors.textSec }]}>
        Amounts come from the saved quote and its payment records. An unavailable amount needs
        review.
      </Text>
      {amounts.map(([key, title]) => (
        <View key={key} style={{ marginTop: spacing.xs }}>
          <Text style={[type.body, { color: colors.textPri }]}>
            {title}: {snapshot.money[key] === null ? 'Unavailable' : formatAud(snapshot.money[key])}
          </Text>
        </View>
      ))}
      {snapshot.credit_settlement?.status === 'settled' ? (
        <Text style={[type.bodySm, { color: colors.textSec }]}>
          Site visit credit has been applied to the deposit. The remaining balance is shown above.
        </Text>
      ) : snapshot.credit_settlement?.status === 'pending' ||
        snapshot.credit_settlement?.status === 'review_required' ? (
        <Notice
          tone="warn"
          label={
            snapshot.credit_settlement.status === 'pending'
              ? 'Deposit credit pending'
              : 'Deposit credit needs review'
          }
          body="Message acceptance does not confirm that the site visit credit has been applied. Refresh this quote to check its payment status before taking another payment action."
        />
      ) : null}
      {links.map(link => (
        <GhostButton
          key={link.id}
          label={`Open ${label(link)}`}
          disabled={disabled}
          onPress={() => onOpen(link.id)}
        />
      ))}
      {disabled && links.length ? (
        <Text style={[type.bodySm, { color: colors.textSec }]}>
          Save or discard working changes before opening a linked quote.
        </Text>
      ) : null}
      {error ? (
        <Notice
          tone="warn"
          label="Linked quotes need attention"
          body={error}
          onRetry={() => void more()}
        />
      ) : null}
      {cursor ? (
        <GhostButton
          label="Load more linked quotes"
          disabled={disabled || loading}
          loading={loading}
          onPress={() => void more()}
        />
      ) : null}
    </Card>
  );
}
