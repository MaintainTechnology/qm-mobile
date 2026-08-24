/**
 * Quote detail (spec D2/D3) — a full-screen modal over the Quotes list. Renders exactly what's on
 * the wire: no client-side price maths, ever — totals are `formatAud(centsFromApiDollars(...))`
 * straight off the wire, and the selected tier's line items (description/quantity/unit price) are
 * rendered verbatim, same field names the web dashboard reads (page.tsx `tierLineItems`, ~line
 * 9029) — no computed per-line total, since that needs the tier's own GST ratio, which is math
 * this app never does. Approve/Send wire to `POST /api/quote/[id]/{approve,send}` with an
 * optimistic status flip (see `./api`) so the action bar reflects the new status immediately
 * rather than waiting on the refetch.
 *
 * One primary action per status (web `confirmSendCta` parity): a held-for-approval quote only
 * ever offers Approve, never a second Send button, since approving IS the send. A tap arms the
 * button; a second tap within a few seconds fires it — guards a fat-thumb tap on a live send.
 *
 * Gap vs. the web detail pane (honest, not silent): no status-history array on the mobile
 * `QuoteRow` schema, so the sheet has no timeline section, just the tier chip and messages.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { relativeTime } from '@/features/chats/format';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import type { QuoteRow } from '@/lib/tenant';
import { fonts, radius, spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { actionErrorMessage, useApproveQuote, useSendQuote } from './api';
import {
  canApprove,
  canSend,
  customerLabel,
  formatJobType,
  quoteAge,
  quoteBadge,
  type QuoteTone,
} from './status';

function CloseIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6 6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Good/better/best, in the order the web previews them. */
const TIER_KEYS = ['good', 'better', 'best'] as const;
type TierKey = (typeof TIER_KEYS)[number];

/** One priced line item off a tier's `line_items` jsonb — field names match the web dashboard
 *  (page.tsx `tierLineItems`, ~line 9029): description/quantity/unit/unit_price_ex_gst. Loose and
 *  parsed defensively per-item; a malformed row is dropped, never invented. */
const TierLineItemSchema = z.looseObject({
  description: z.string().nullish(),
  quantity: z.number().nullish(),
  unit: z.string().nullish(),
  unit_price_ex_gst: z.number().nullish(),
});
type TierLineItem = z.infer<typeof TierLineItemSchema>;

function parseTierLineItems(raw: unknown): TierLineItem[] {
  if (!Array.isArray(raw)) return [];
  const items: TierLineItem[] = [];
  for (const entry of raw) {
    const parsed = TierLineItemSchema.safeParse(entry);
    if (parsed.success && parsed.data.description) items.push(parsed.data);
  }
  return items;
}

/** The tier whose line items the sheet previews — the tradie-selected tier first (web parity),
 *  else the first tier carrying any. `totalIncGstCents` is the tier's own `total_inc_gst`
 *  straight off the wire, never a sum of the line items below it. */
function selectedTierLineItems(
  quote: QuoteRow,
): { label: string; items: TierLineItem[]; totalIncGstCents: number | null } | null {
  const wanted = quote.selected_tier?.toLowerCase();
  const order: readonly TierKey[] = (TIER_KEYS as readonly string[]).includes(wanted ?? '')
    ? [wanted as TierKey, ...TIER_KEYS.filter(k => k !== wanted)]
    : TIER_KEYS;
  for (const key of order) {
    const tier = quote[key];
    const items = parseTierLineItems(tier?.line_items);
    if (items.length > 0) {
      return {
        label: tier?.label?.trim() || key.charAt(0).toUpperCase() + key.slice(1),
        items,
        totalIncGstCents:
          tier?.total_inc_gst == null ? null : centsFromApiDollars(tier.total_inc_gst),
      };
    }
  }
  return null;
}

export function QuoteDetailModal({
  quote,
  onClose,
}: {
  quote: QuoteRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const approve = useApproveQuote();
  const send = useSendQuote();
  /** The primary action needs an explicit second tap to fire (web `confirmSendCta` parity). */
  const [armed, setArmed] = useState(false);

  // A fresh mutation state per quote — reopening the sheet on a different row must not carry over
  // yesterday's error/success line or an armed confirm.
  useEffect(() => {
    approve.reset();
    send.reset();
    setArmed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote?.id]);

  // Auto-disarm the confirm step — a stray tap minutes later must not fire a stale action.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const tierLineItems = useMemo(() => (quote ? selectedTierLineItems(quote) : null), [quote]);

  if (!quote) return null;

  const badge = quoteBadge(quote);
  const toneColor: Record<QuoteTone, string> = {
    ok: colors.successBright,
    warn: colors.warningBright,
    dim: colors.textDim,
  };
  const tone = toneColor[badge.tone];
  const amount =
    quote.total_inc_gst == null ? null : formatAud(centsFromApiDollars(quote.total_inc_gst));

  // One primary action per status, never both — approving a held quote IS the tradie's send.
  const primaryAction: 'approve' | 'send' | null = canApprove(quote)
    ? 'approve'
    : canSend(quote)
      ? 'send'
      : null;
  const pending = approve.isPending || send.isPending;
  const justApproved = approve.isSuccess && !approve.isPending;
  const justSent = send.isSuccess && !send.isPending;
  const error = approve.error ?? send.error;
  // Hides the action row the instant a tap fires (the optimistic cache update in ./api already
  // flips the quote's status) and keeps it hidden through success, until refetched data — or a
  // fresh `quote` prop — actually clears `primaryAction` on its own.
  const showActionRow = primaryAction !== null && !pending && !justApproved && !justSent;

  const quoteId = quote.id;
  function firePrimaryAction() {
    if (!primaryAction || pending) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    if (primaryAction === 'approve') approve.mutate({ quoteId });
    else send.mutate({ quoteId, channel: 'sms' });
  }

  const actionLabel =
    primaryAction === 'approve'
      ? armed
        ? 'TAP AGAIN TO CONFIRM'
        : 'APPROVE & SEND'
      : armed
        ? 'TAP AGAIN TO CONFIRM'
        : 'SEND TO CUSTOMER';

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
          <Text style={[styles.headerTitle, { color: colors.textPri }]}>QUOTE DETAIL</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={10}
            style={[styles.closeBtn, { borderColor: colors.inkLine }]}
          >
            <CloseIcon color={colors.textSec} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <Text style={[styles.name, { color: colors.textPri }]}>{customerLabel(quote)}</Text>
          <Text style={[styles.job, { color: colors.textSec }]}>
            {formatJobType(quote.job_type)}
            {quote.suburb ? ` · ${quote.suburb}` : ''}
          </Text>
          <Text style={[styles.meta, { color: colors.textDim }]}>
            Drafted {quoteAge(quote.created_at)}
            {quote.channel ? ` · ${quote.channel === 'voice' ? 'Voice' : 'SMS'}` : ''}
          </Text>

          <View style={[styles.chip, { borderColor: tone, alignSelf: 'flex-start' }]}>
            <View style={[styles.chipDot, { backgroundColor: tone }]} />
            <Text style={[styles.chipText, { color: tone }]}>{badge.label.toUpperCase()}</Text>
          </View>

          <View
            style={[
              styles.amountCard,
              { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
            ]}
          >
            <Text style={[styles.amountLabel, { color: colors.textDim }]}>TOTAL INC GST</Text>
            <Text style={[styles.amountValue, { color: colors.accentText }]}>{amount ?? '—'}</Text>
            {quote.selected_tier ? (
              <Text style={[styles.tierNote, { color: colors.textSec }]}>
                {quote.selected_tier.charAt(0).toUpperCase() + quote.selected_tier.slice(1)} tier
                selected
              </Text>
            ) : null}
          </View>

          {tierLineItems ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                {tierLineItems.label.toUpperCase()} — LINE ITEMS
              </Text>
              <View style={[styles.itemsCard, { borderColor: colors.inkLine }]}>
                {tierLineItems.items.map((item, i) => (
                  <View key={i} style={[styles.itemRow, { borderBottomColor: colors.inkLine }]}>
                    <Text style={[styles.itemDesc, { color: colors.textSec }]}>
                      {item.description}
                    </Text>
                    <Text style={[styles.itemQty, { color: colors.textDim }]}>
                      {item.quantity ?? 1}
                      {item.unit_price_ex_gst != null
                        ? ` × ${formatAud(centsFromApiDollars(item.unit_price_ex_gst))}`
                        : ''}
                      {item.unit ? ` ${item.unit}` : ''}
                    </Text>
                  </View>
                ))}
                {tierLineItems.totalIncGstCents != null ? (
                  <View style={[styles.itemsTotalRow, { backgroundColor: colors.ink }]}>
                    <Text style={[styles.itemsTotalLabel, { color: colors.textDim }]}>
                      TOTAL INC GST
                    </Text>
                    <Text style={[styles.itemsTotalValue, { color: colors.accentText }]}>
                      {formatAud(tierLineItems.totalIncGstCents)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.itemsCaption, { color: colors.textDim }]}>
                Unit prices shown ex GST.
              </Text>
            </View>
          ) : null}

          {quote.scope_of_works ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>SCOPE OF WORKS</Text>
              <Text style={[styles.sectionBody, { color: colors.textSec }]}>
                {quote.scope_of_works}
              </Text>
            </View>
          ) : null}

          {quote.messages && quote.messages.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textDim }]}>
                {quote.channel === 'voice' ? 'VOICE CALL TRANSCRIPT' : 'SMS CONVERSATION'}
              </Text>
              <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
                {quote.messages.map((m, i) => {
                  // ChatThread parity: inbound (customer) reads on the left, outbound (AI) on the
                  // right — this sheet had them swapped.
                  const inbound = m.direction === 'inbound';
                  return (
                    <View
                      key={i}
                      style={[
                        styles.bubble,
                        {
                          alignSelf: inbound ? 'flex-start' : 'flex-end',
                          borderColor: inbound ? colors.inkLine : colors.accent,
                          backgroundColor: inbound ? colors.inkCard : colors.ink,
                        },
                      ]}
                    >
                      <Text style={[styles.bubbleBody, { color: colors.textPri }]}>{m.body}</Text>
                      <Text style={[styles.bubbleMeta, { color: colors.textDim }]}>
                        {inbound ? 'Customer' : 'AI'} · {relativeTime(m.created_at)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {(primaryAction || pending || justApproved || justSent || error != null) && (
          <View
            style={[
              styles.actionBar,
              {
                borderTopColor: colors.inkLine,
                paddingBottom: Math.max(insets.bottom, spacing.lg),
              },
            ]}
          >
            {error ? (
              <Text style={[styles.errorText, { color: colors.dangerBright }]}>
                {actionErrorMessage(error)}
              </Text>
            ) : justApproved ? (
              <Text style={[styles.okText, { color: colors.successBright }]}>
                Approved and sent.
              </Text>
            ) : justSent ? (
              <Text style={[styles.okText, { color: colors.successBright }]}>
                Sent to the customer.
              </Text>
            ) : armed ? (
              <Text style={[styles.hintText, { color: colors.warningBright }]}>
                Tap again to confirm.
              </Text>
            ) : null}

            {pending ? (
              <View style={styles.pendingRow}>
                <ActivityIndicator color={colors.textPri} />
                <Text style={[styles.pendingLabel, { color: colors.textSec }]}>
                  {approve.isPending ? 'Approving…' : 'Sending…'}
                </Text>
              </View>
            ) : showActionRow ? (
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    primaryAction === 'approve' ? 'Approve and send' : 'Send to customer'
                  }
                  onPress={firePrimaryAction}
                  style={({ pressed }) =>
                    primaryAction === 'approve'
                      ? [
                          styles.ghostBtn,
                          {
                            borderColor: armed
                              ? colors.warningBright
                              : pressed
                                ? colors.accent
                                : colors.inkLine,
                          },
                        ]
                      : [
                          styles.primaryBtn,
                          {
                            backgroundColor: armed
                              ? colors.warningBright
                              : pressed
                                ? colors.accentPress
                                : colors.accent,
                          },
                        ]
                  }
                >
                  <Text
                    style={
                      primaryAction === 'approve'
                        ? [styles.ghostBtnLabel, { color: colors.textPri }]
                        : [styles.primaryBtnLabel, { color: colors.accentInk }]
                    }
                  >
                    {actionLabel}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.mono.semiBold, fontSize: 11, letterSpacing: 1.5 },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  name: { ...type.title, fontSize: 20 },
  job: { marginTop: 4, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  meta: { marginTop: 6, fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 1 },
  chip: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  chipText: { fontFamily: fonts.mono.bold, fontSize: 12, letterSpacing: 0.9 },
  amountCard: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  amountLabel: { fontFamily: fonts.sans.semiBold, fontSize: 10.5, letterSpacing: 1.05 },
  amountValue: { ...type.price, marginTop: 8 },
  tierNote: { marginTop: 8, fontFamily: fonts.sans.regular, fontSize: 13 },
  section: { marginTop: spacing.xl },
  sectionLabel: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 1.2 },
  sectionBody: { marginTop: 8, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 21 },
  itemsCard: { marginTop: 8, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  itemDesc: { flex: 1, fontFamily: fonts.sans.regular, fontSize: 13 },
  itemQty: {
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  itemsTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  itemsTotalLabel: { fontFamily: fonts.sans.semiBold, fontSize: 11, letterSpacing: 0.6 },
  itemsTotalValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  itemsCaption: { marginTop: 6, fontFamily: fonts.sans.regular, fontSize: 12 },
  bubble: { maxWidth: '82%', borderWidth: 1, borderRadius: 10, padding: 10 },
  bubbleBody: { fontFamily: fonts.sans.regular, fontSize: 13.5, lineHeight: 19 },
  bubbleMeta: { marginTop: 5, fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.9 },
  actionBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  errorText: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18 },
  okText: { fontFamily: fonts.sans.semiBold, fontSize: 13 },
  hintText: { fontFamily: fonts.sans.semiBold, fontSize: 13 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 52 },
  pendingLabel: { fontFamily: fonts.sans.semiBold, fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  ghostBtn: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnLabel: { fontFamily: fonts.sans.bold, fontSize: 12.5, letterSpacing: 0.75 },
  primaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: { fontFamily: fonts.sans.bold, fontSize: 12.5, letterSpacing: 0.75 },
});
