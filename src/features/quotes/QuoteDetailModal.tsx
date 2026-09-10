/**
 * Quote detail (spec D2/D3) — a full-screen modal over the Quotes list. Renders exactly what's on
 * the wire: no client-side price maths, ever — totals are `formatAud(centsFromApiDollars(...))`
 * straight off the wire, and the selected tier's line items (description/quantity/unit price) are
 * rendered verbatim, same field names the web dashboard reads (page.tsx `tierLineItems`, ~line
 * 9029) — no computed per-line total, since that needs the tier's own GST ratio, which is math
 * this app never does. Approve/Send wire to `POST /api/quote/[id]/{approve,send}` and refresh the
 * canonical quote. A successful save or an unknown action result cannot invent a Sent status.
 *
 * One primary action per status (web `confirmSendCta` parity): a held-for-approval quote only
 * ever offers Approve, never a second Send button, since approving IS the send. A tap arms the
 * button; a second tap within a few seconds fires it — guards a fat-thumb tap on a live send.
 * The send action carries the web SendQuotePanel's channel choice (SMS default, email with the
 * PDF attached) and manual recipient entry, and doubles as Resend for already-delivered quotes —
 * the route sends from any pre-payment status, so resend is the same POST.
 *
 * Web detail-pane parity (page.tsx QuoteDetail, ~9384-9737): the Details grid
 * (Work/Service/Drafted/Routing), estimated timeframe, the per-quote layout toggle
 * (PATCH display-mode) and the Activity timeline — which the web synthesises from
 * status fields, not a history array, so mobile synthesises identically.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';
import { useReducedMotion } from 'react-native-reanimated';

import { relativeTime } from '@/features/chats/format';
import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiUrl } from '@/lib/env';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import type { QuoteRow } from '@/lib/tenant';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { TRADE_LABELS } from '../trades/hub/sections';
import { QuoteWorkspace } from './QuoteWorkspace';
import { quoteActivity } from './quote-activity';
import { useOwnedQuote } from './owned-quote';
import { Notice } from '@/features/trades/ui';
import {
  actionErrorMessage,
  deliveryReceiptNotice,
  sendQuoteVars,
  useQuoteDelivery,
  useSetDisplayMode,
  type DisplayMode,
  type SendChannel,
} from './api';
import {
  canApprove,
  canSend,
  customerLabel,
  formatJobType,
  isResend,
  quoteAge,
  quoteBadges,
  quoteDeliveryChannels,
  quotePaymentLink,
  inspectionExplanation,
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

/** "7/8/2026, 3:45 am" pieces for the Drafted cell — en-AU day-first, never US order. */
function draftedAt(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const time = `${String(hours12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${hours24 < 12 ? 'am' : 'pm'}`;
  return { date, time };
}

/** GET /api/tenant/historical-quotes/hint?job_type= — HintResult: count 0 marker
 *  or full stats. Dollars on the wire, like every quote money field. */
const HistoryHintSchema = z.looseObject({
  count: z.number().default(0),
  avg_price_inc_gst: z.number().nullish(),
  min_price_inc_gst: z.number().nullish(),
  max_price_inc_gst: z.number().nullish(),
  most_recent_quoted_at: z.string().nullish(),
});

/** "Aug 2026" for the hint's "last …" tail (web formats Mon YYYY). */
function monthYear(iso: string): string {
  const d = new Date(iso);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ] as const;
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Web HistoricalHint parity: the accent-tinted YOUR HISTORY strip — "Avg for
 * {job}: $X inc GST · N jobs · $min–$max · last Mon YYYY". Renders nothing when
 * there's no history, and a fetch failure stays silent (web: best-effort, a
 * hint must never block the quote view).
 */
function HistoryHintStrip({ jobType }: { jobType: string | null | undefined }) {
  const { colors } = useTheme();
  const hint = useApiQuery(
    ['tenant', 'history-hint', jobType ?? ''],
    `/api/tenant/historical-quotes/hint?job_type=${encodeURIComponent(jobType ?? '')}`,
    HistoryHintSchema,
    { enabled: !!jobType },
  );
  const data = hint.data;
  if (!jobType || !data || data.count === 0 || data.avg_price_inc_gst == null) return null;
  const money = (dollars: number) => formatAud(centsFromApiDollars(dollars));
  const range =
    data.min_price_inc_gst != null && data.max_price_inc_gst != null
      ? ` · ${money(data.min_price_inc_gst)}–${money(data.max_price_inc_gst)}`
      : '';
  const last = data.most_recent_quoted_at ? ` · last ${monthYear(data.most_recent_quoted_at)}` : '';
  return (
    <View
      style={[styles.historyStrip, { borderColor: colors.inkLine, backgroundColor: colors.ink }]}
    >
      <Text style={[styles.historyLead, { color: colors.textSec }]}>YOUR HISTORY</Text>
      <Text style={[styles.historyBody, { color: colors.textSec }]}>
        Avg for {formatJobType(jobType)}:{' '}
        <Text style={{ fontFamily: fonts.sans.bold, color: colors.textPri }}>
          {money(data.avg_price_inc_gst)} inc GST
        </Text>
        {` · ${data.count} ${data.count === 1 ? 'job' : 'jobs'}`}
        {range}
        {last}
      </Text>
    </View>
  );
}

/** Web MetaCell grid + timeframe + layout toggle (QuoteDetail "Details" block). */
function DetailsBlock({ quote }: { quote: QuoteRow }) {
  const { colors } = useTheme();
  const setMode = useSetDisplayMode();
  const drafted = draftedAt(quote.created_at);
  const tradeLabel = quote.trade
    ? (TRADE_LABELS[quote.trade.toLowerCase() as keyof typeof TRADE_LABELS] ??
      formatJobType(quote.trade))
    : '—';
  const cells: { label: string; value: string; sub?: string }[] = [
    { label: 'WORK', value: formatJobType(quote.job_type) },
    { label: 'SERVICE', value: tradeLabel },
    { label: 'DRAFTED', value: drafted.date, sub: drafted.time },
    { label: 'ROUTING', value: formatJobType(quote.routing_decision) },
  ];
  const modes: { key: DisplayMode; label: string }[] = [
    { key: null, label: 'Inherit default' },
    { key: 'itemised', label: 'Itemised' },
    { key: 'summary', label: 'Summary' },
  ];
  const currentMode = quote.display_mode ?? null;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>DETAILS</Text>
      <View style={[styles.metaGrid, { borderColor: colors.inkLine }]}>
        {cells.map((cell, i) => (
          <View
            key={cell.label}
            style={[
              styles.metaCell,
              {
                backgroundColor: colors.inkCard,
                borderColor: colors.inkLine,
                borderRightWidth: i % 2 === 0 ? 1 : 0,
                borderTopWidth: i > 1 ? 1 : 0,
              },
            ]}
          >
            <Text style={[styles.metaLabel, { color: colors.textDim }]}>{cell.label}</Text>
            <Text style={[styles.metaValue, { color: colors.textPri }]}>{cell.value}</Text>
            {cell.sub ? (
              <Text style={[styles.metaSub, { color: colors.textDim }]}>{cell.sub}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <HistoryHintStrip jobType={quote.job_type} />

      {quote.estimated_timeframe ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={[styles.sectionLabel, { color: colors.textDim }]}>ESTIMATED TIMEFRAME</Text>
          <Text style={[styles.sectionBody, { color: colors.textSec }]}>
            {quote.estimated_timeframe}
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <Text style={[styles.sectionLabel, { color: colors.textDim }]}>LAYOUT FOR THIS QUOTE</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Quote layout"
          style={styles.layoutRow}
        >
          {modes.map(mode => {
            const active = currentMode === mode.key;
            return (
              <Pressable
                key={mode.label}
                accessibilityRole="radio"
                aria-checked={active}
                accessibilityState={{
                  checked: active,
                  disabled: setMode.isPending,
                  busy: setMode.isPending,
                }}
                disabled={setMode.isPending}
                onPress={() => {
                  if (!active) setMode.mutate({ quoteId: quote.id, display_mode: mode.key });
                }}
                style={[
                  styles.layoutBtn,
                  {
                    borderColor: active ? colors.ctlLine : colors.inkLine,
                    backgroundColor: active ? colors.ink : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.layoutBtnText,
                    { color: active ? colors.textPri : colors.textDim },
                  ]}
                >
                  {mode.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {setMode.isSuccess ? (
          <Text style={[styles.layoutNote, { color: colors.accentText }]}>✓ Saved</Text>
        ) : setMode.isError ? (
          <Text style={[styles.layoutNote, { color: colors.dangerBright }]}>
            {actionErrorMessage(setMode.error)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Persisted observations keep delivery and payment states separate. */
function ActivityBlock({ quote }: { quote: QuoteRow }) {
  const { colors } = useTheme();
  const events = quoteActivity(quote).map(event => {
    const when = event.at ? draftedAt(event.at) : null;
    return { label: event.label, when: when ? `${when.date} · ${when.time}` : undefined };
  });

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>ACTIVITY</Text>
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        {events.map(event => (
          <View key={event.label} style={styles.activityRow}>
            <View style={[styles.activityDot, { backgroundColor: colors.textDim }]} />
            <View style={styles.activityContent}>
              <Text style={[styles.activityLabel, { color: colors.textSec }]}>{event.label}</Text>
              {event.when ? (
                <Text style={[styles.activityWhen, { color: colors.textDim }]}>{event.when}</Text>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Web pinned action bar parity (page.tsx:9660-9733): Customer page,
 * Measurement results (roofing), View PDF · Edit, Download PDF and the deposit
 * link — each opening the web page mobile doesn't render. Deposit/PDF links
 * hide for inspection-routed quotes, exactly as the web hides them; the web's
 * copy-to-clipboard deposit link becomes the native share sheet.
 */
function LinksBlock({ quote, onOpenWorkspace }: { quote: QuoteRow; onOpenWorkspace: () => void }) {
  const { colors } = useTheme();
  const token = quote.share_token;
  if (!token && !quote.measure_href) return null;
  const paymentLink = quotePaymentLink(quote);
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>QUICK LINKS</Text>
      <View style={styles.linksWrap}>
        {token ? <LinkOutButton label="Customer page" path={`/q/${token}`} /> : null}
        {quote.measure_href ? (
          <LinkOutButton label="Measurement results" path={quote.measure_href} />
        ) : null}
        <LinkOutButton label="Review, edit and PDF" onPress={onOpenWorkspace} />
        {paymentLink ? (
          <LinkOutButton
            label={paymentLink.label}
            onPress={() => void Share.share({ message: apiUrl(paymentLink.path) })}
          />
        ) : null}
      </View>
    </View>
  );
}

export function QuoteDetailModal({
  quote: listedQuote,
  onClose,
}: {
  quote: QuoteRow | null;
  onClose: () => void;
}) {
  const owned = useOwnedQuote(listedQuote?.id ?? '');
  const quote = useMemo(
    () =>
      listedQuote && owned.data?.quote.id === listedQuote.id
        ? { ...listedQuote, ...owned.data.quote }
        : listedQuote,
    [listedQuote, owned.data],
  );
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<ScrollView>(null);
  const [workspace, setWorkspace] = useState(false);
  const [deliveryOffset, setDeliveryOffset] = useState(0);
  const delivery = useQuoteDelivery(
    listedQuote && owned.data?.quote.id === listedQuote.id
      ? { quoteId: listedQuote.id, tenantId: owned.data.quote.tenant_id }
      : null,
  );
  /** The primary action needs an explicit second tap to fire (web `confirmSendCta` parity). */
  const [armed, setArmed] = useState(false);
  /** Web SendQuotePanel parity: SMS default; email attaches the PDF server-side. */
  const [channel, setChannel] = useState<SendChannel>('sms');
  /** Manual recipient overrides — only sent up when typed (see `sendQuoteVars`). */
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // A fresh mutation state per quote — reopening the sheet on a different row must not carry over
  // yesterday's error/success line, an armed confirm, or another customer's typed recipient.
  useEffect(() => {
    setArmed(false);
    setChannel('sms');
    setPhone('');
    setEmail('');
    setWorkspace(false);
  }, [quote?.id, delivery.key]);
  // A reviewed price, recipient or delivery change invalidates the armed tap.
  useEffect(() => {
    setArmed(false);
  }, [
    owned.data?.customer_release_revision,
    quote?.customer_phone,
    owned.data?.quote.customer_email,
    phone,
    email,
    channel,
  ]);

  // Auto-disarm the confirm step — a stray tap minutes later must not fire a stale action.
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const tierLineItems = useMemo(() => (quote ? selectedTierLineItems(quote) : null), [quote]);

  if (!quote) return null;
  if (workspace)
    return (
      <QuoteWorkspace quoteId={quote.id} onClose={() => setWorkspace(false)} onDeleted={onClose} />
    );

  const toneColor: Record<QuoteTone, string> = {
    ok: colors.successBright,
    warn: colors.warningBright,
    dim: colors.textDim,
  };
  const amount =
    quote.total_inc_gst == null ? null : formatAud(centsFromApiDollars(quote.total_inc_gst));

  // One primary action per status, never both — approving a held quote IS the tradie's send.
  const primaryAction: 'approve' | 'send' | null = canApprove(quote)
    ? 'approve'
    : canSend(quote)
      ? 'send'
      : null;
  const pending = delivery.isPending || delivery.isLoading;
  const receipt = delivery.receipt;
  const actionNotice = receipt ? deliveryReceiptNotice(receipt) : null;
  const error = delivery.error;
  // Keep the row unavailable while the mutation refetches the canonical quote. A sent quote stays
  // sendable (resend), so success remains acknowledged until this sheet is reopened; this stops an
  // absent-minded second nudge without inventing a local Sent state.
  const showActionRow =
    primaryAction !== null &&
    !pending &&
    actionNotice == null &&
    error == null &&
    !owned.isError &&
    owned.data?.processing.ready === true;

  const quoteId = quote.id;
  const resend =
    isResend(quote) ||
    !!quote.sent_at ||
    (typeof quote.customer_released_at === 'string' && !!quote.customer_released_at);
  const onFilePhone = quote.customer_phone?.trim() ? quote.customer_phone.trim() : null;
  const onFileEmail = owned.data?.quote.customer_email?.trim() || null;
  const deliverySummary =
    channel === 'sms'
      ? onFilePhone || phone.trim()
        ? `Text to ${onFilePhone ?? phone.trim()}`
        : 'Add a customer mobile'
      : email.trim()
        ? `Email to ${email.trim()}`
        : onFileEmail
          ? `Email to ${onFileEmail}`
          : 'Add a customer email';
  // Every send needs a displayed recipient that the server can compare before
  // release. Approval uses the saved mobile; Send also supports typed overrides.
  const sendBlocked =
    (primaryAction === 'approve' && !onFilePhone) || (primaryAction === 'send' &&
    (!quoteDeliveryChannels(quote).includes(channel) ||
      (channel === 'sms' && !onFilePhone && phone.trim().length === 0) ||
      (channel === 'email' && !onFileEmail && email.trim().length === 0)));

  function firePrimaryAction() {
    if (
      !showActionRow ||
      !primaryAction ||
      pending ||
      sendBlocked ||
      owned.isError ||
      !owned.data?.processing.ready ||
      !owned.data.customer_release_revision
    )
      return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    const expected_revision = owned.data.customer_release_revision;
    if (primaryAction === 'approve')
      void delivery
        .approve({ expected_revision, reviewedDestination: onFilePhone! })
        .catch(() => undefined);
    else {
      const vars = sendQuoteVars(
        quoteId,
        channel,
        channel === 'sms' ? onFilePhone : onFileEmail,
        channel === 'sms' ? phone : email,
      );
      void delivery
        .send({
          channel,
          to: vars.to,
          expected_revision,
          resend,
          reviewedDestination:
            channel === 'sms' ? onFilePhone || phone.trim() : email.trim() || onFileEmail!,
        })
        .catch(() => undefined);
    }
  }

  const actionLabel = armed
    ? 'TAP AGAIN TO CONFIRM'
    : primaryAction === 'approve'
      ? 'APPROVE & SEND'
      : resend
        ? 'RESEND TO CUSTOMER'
        : 'SEND TO CUSTOMER';

  return (
    <Modal visible animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={onClose}>
      {/* Delivery fields scroll above the keyboard; only the final action stays pinned. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          accessibilityViewIsModal
          style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
            <Text
              accessibilityRole="header"
              style={[styles.headerTitle, { color: colors.textPri }]}
            >
              Quote detail
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  borderColor: colors.inkLine,
                  backgroundColor: pressed ? colors.ink : 'transparent',
                },
              ]}
            >
              <CloseIcon color={colors.textSec} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
          >
            <Text style={[styles.name, { color: colors.textPri }]}>{customerLabel(quote)}</Text>
            <Text style={[styles.job, { color: colors.textSec }]}>
              {formatJobType(quote.job_type)}
              {quote.suburb ? ` · ${quote.suburb}` : ''}
            </Text>
            <Text style={[styles.meta, { color: colors.textDim }]}>
              Drafted {quoteAge(quote.created_at)}
              {quote.channel ? ` · ${quote.channel === 'voice' ? 'Voice' : 'SMS'}` : ''}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {quoteBadges(quote).map(item => (
                <View
                  key={item.label}
                  style={[
                    styles.chip,
                    { borderColor: toneColor[item.tone], alignSelf: 'flex-start' },
                  ]}
                >
                  <Text style={[styles.chipText, { color: toneColor[item.tone] }]}>
                    {item.label.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            {quote.estimate_number ? (
              <Text selectable style={[styles.sectionBody, { color: colors.textSec }]}>
                Estimate {quote.estimate_number}
              </Text>
            ) : null}
            {inspectionExplanation(quote) ? (
              <Text style={[styles.sectionBody, { color: colors.textSec }]}>
                {inspectionExplanation(quote)}
              </Text>
            ) : null}

            <View
              style={[
                styles.amountCard,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <Text style={[styles.amountLabel, { color: colors.textDim }]}>TOTAL INC GST</Text>
              <Text style={[styles.amountValue, { color: colors.textPri }]}>
                {amount ?? 'Not priced'}
              </Text>
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
                  {tierLineItems.label.toUpperCase()} · LINE ITEMS
                </Text>
                <View style={[styles.itemsCard, { borderColor: colors.inkLine }]}>
                  {tierLineItems.items.map((item, i) => (
                    <View key={i} style={[styles.itemRow, { borderBottomColor: colors.inkLine }]}>
                      <Text style={[styles.itemDesc, { color: colors.textSec }]}>
                        {item.description}
                      </Text>
                      <Text style={[styles.itemQty, { color: colors.textDim }]}>
                        {item.quantity ?? 'Quantity unavailable'}
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
                        SAVED TOTAL
                      </Text>
                      <Text style={[styles.itemsTotalValue, { color: colors.textPri }]}>
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

            <DetailsBlock quote={quote} />

            {owned.isError ? (
              <Notice
                tone="warn"
                label="Owner review unavailable"
                body="Refresh the owner record before approving or sending this quote."
                onRetry={() => void owned.refetch()}
              />
            ) : owned.isPending ? (
              <ActivityIndicator accessibilityLabel="Loading owner review" />
            ) : owned.data ? (
              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: colors.textDim }]}>OWNER REVIEW</Text>
                {(owned.data.quote.risk_flags ?? []).map((flag, index) => (
                  <Text
                    key={`risk-${index}`}
                    style={[styles.sectionBody, { color: colors.textSec }]}
                  >
                    Risk: {flag}
                  </Text>
                ))}
                {(owned.data.quote.assumptions ?? []).map((item, index) => (
                  <Text
                    key={`assumption-${index}`}
                    style={[styles.sectionBody, { color: colors.textSec }]}
                  >
                    Assumption: {item}
                  </Text>
                ))}
              </View>
            ) : null}

            <ActivityBlock quote={quote} />

            <LinksBlock quote={quote} onOpenWorkspace={() => setWorkspace(true)} />

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
                            borderColor: inbound ? colors.inkLine : colors.ctlLine,
                            backgroundColor: inbound ? colors.inkCard : colors.ink,
                          },
                        ]}
                      >
                        <Text style={[styles.bubbleBody, { color: colors.textPri }]}>{m.body}</Text>
                        <Text style={[styles.bubbleMeta, { color: colors.textDim }]}>
                          {inbound ? 'Customer' : 'Outbound'} · {relativeTime(m.created_at)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {showActionRow && primaryAction === 'approve' && !onFilePhone ? (
              <Text accessibilityRole="alert" style={[styles.section, { color: colors.warningBright }]}>
                No customer mobile is on file. Update the customer contact and refresh before approving.
              </Text>
            ) : null}
            {showActionRow && primaryAction === 'send' ? (
              <View
                style={[styles.section, styles.channelBlock]}
                onLayout={event => setDeliveryOffset(event.nativeEvent.layout.y)}
              >
                <Text
                  accessibilityRole="header"
                  style={[styles.sectionLabel, { color: colors.textSec }]}
                >
                  DELIVERY
                </Text>
                {/* Same delivery choices as the web SendQuotePanel. */}
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="Delivery channel"
                  style={styles.channelRow}
                >
                  {(
                    [
                      { key: 'sms', label: 'Text message' },
                      { key: 'email', label: 'Email' },
                    ] as const
                  )
                    .filter(option => quoteDeliveryChannels(quote).includes(option.key))
                    .map(option => {
                      const active = channel === option.key;
                      return (
                        <Pressable
                          key={option.key}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: active }}
                          aria-checked={active}
                          onPress={() => {
                            setChannel(option.key);
                            // A confirm armed for one channel must never fire the other.
                            setArmed(false);
                          }}
                          style={[
                            styles.channelBtn,
                            {
                              borderColor: active ? colors.ctlLine : colors.inkLine,
                              backgroundColor: active ? colors.ink : 'transparent',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.channelBtnText,
                              { color: active ? colors.textPri : colors.textDim },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
                {channel === 'sms' ? (
                  onFilePhone ? (
                    <Text style={[styles.recipientOnFile, { color: colors.textSec }]}>
                      To {onFilePhone}
                    </Text>
                  ) : (
                    <View style={{ gap: spacing.sm }}>
                      <Text style={[styles.recipientLabel, { color: colors.textSec }]}>
                        Customer mobile
                      </Text>
                      <TextInput
                        accessibilityLabel="Customer mobile"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        placeholder="Customer mobile, e.g. 04xx xxx xxx"
                        placeholderTextColor={colors.textDim}
                        style={[
                          styles.recipientInput,
                          {
                            borderColor: colors.ctlLine,
                            backgroundColor: colors.ink,
                            color: colors.textPri,
                          },
                        ]}
                      />
                    </View>
                  )
                ) : (
                  <>
                    <Text style={[styles.recipientLabel, { color: colors.textSec }]}>
                      Customer email
                    </Text>
                    <TextInput
                      accessibilityLabel="Customer email"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="customer@example.com"
                      placeholderTextColor={colors.textDim}
                      style={[
                        styles.recipientInput,
                        {
                          borderColor: colors.ctlLine,
                          backgroundColor: colors.ink,
                          color: colors.textPri,
                        },
                      ]}
                    />
                    <Text style={[styles.recipientHint, { color: colors.textDim }]}>
                      PDF attached. Leave blank to use the address on file.
                    </Text>
                  </>
                )}
              </View>
            ) : null}
          </ScrollView>

          {(primaryAction || pending || actionNotice || error != null) && (
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
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.errorText, { color: colors.dangerBright }]}
                >
                  {actionErrorMessage(error)}
                </Text>
              ) : null}
              {actionNotice ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[
                    styles.okText,
                    {
                      color:
                        receipt?.state === 'delivered'
                          ? colors.successBright
                          : colors.warningBright,
                    },
                  ]}
                >
                  {actionNotice}
                </Text>
              ) : armed ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[styles.hintText, { color: colors.warningBright }]}
                >
                  Tap again to confirm.
                </Text>
              ) : null}

              {pending ? (
                <View style={styles.pendingRow}>
                  <ActivityIndicator color={colors.textPri} />
                  <Text style={[styles.pendingLabel, { color: colors.textSec }]}>
                    {delivery.isLoading ? 'Checking delivery…' : 'Confirming delivery request…'}
                  </Text>
                </View>
              ) : showActionRow ? (
                <>
                  {primaryAction === 'send' ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Change delivery. ${deliverySummary}`}
                      accessibilityHint="Choose text message or email and check the customer’s contact details"
                      onPress={() =>
                        scrollRef.current?.scrollTo({ y: deliveryOffset, animated: !reduceMotion })
                      }
                      style={styles.deliveryShortcut}
                    >
                      <Text
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        style={[styles.deliverySummary, { color: colors.textSec }]}
                      >
                        {deliverySummary}
                      </Text>
                      <Text style={[styles.deliveryChange, { color: colors.accentText }]}>
                        Change
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.actionRow}>
                    <View style={styles.footerTotal}>
                      <Text style={[styles.amountLabel, { color: colors.textDim }]}>INC GST</Text>
                      <Text style={[styles.footerAmount, { color: colors.textPri }]}>
                        {amount ?? 'Not priced'}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: sendBlocked }}
                      accessibilityLabel={
                        armed
                          ? 'Tap again to confirm'
                          : primaryAction === 'approve'
                            ? 'Approve and send'
                            : resend
                              ? 'Resend to customer'
                              : 'Send to customer'
                      }
                      disabled={sendBlocked}
                      onPress={firePrimaryAction}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        sendBlocked ? styles.btnDisabled : null,
                        { backgroundColor: pressed ? colors.accentPress : colors.accent },
                      ]}
                    >
                      <Text style={[styles.primaryBtnLabel, { color: colors.accentInk }]}>
                        {actionLabel}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
              {!pending && (receipt || error) ? (
                <View style={styles.linksWrap}>
                  <LinkOutButton
                    label="Refresh delivery status"
                    onPress={() => void delivery.refresh().catch(() => undefined)}
                  />
                  {receipt?.channel === 'sms' && receipt.state === 'failed' ? (
                    <LinkOutButton
                      label="Retry original message"
                      onPress={() =>
                        Alert.alert(
                          'Retry original message?',
                          'This retries the saved message to its original recipient. It does not use any changed delivery fields.',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Retry message',
                              onPress: () => void delivery.retry().catch(() => undefined),
                            },
                          ],
                        )
                      }
                    />
                  ) : null}
                  {receipt &&
                  ['provider_accepted', 'delivered', 'noop', 'no_commit'].includes(receipt.state) &&
                  primaryAction ? (
                    <LinkOutButton
                      label="Prepare another send"
                      onPress={() => {
                        setArmed(false);
                        void delivery.beginAnother().catch(() => undefined);
                      }}
                    />
                  ) : null}
                  {receipt?.channel === 'email' &&
                  ['pending', 'unknown'].includes(receipt.state) ? (
                    <Text style={[styles.hintText, { color: colors.warningBright }]}>
                      Email recovery is not yet available. Another send stays blocked until its
                      outcome can be verified.
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24, flexShrink: 1 },
  closeBtn: {
    width: touch.minimum,
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.xl, paddingBottom: spacing.xxl },
  name: { ...type.title, fontSize: 22, lineHeight: 30 },
  job: { marginTop: 4, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  meta: { marginTop: spacing.sm, fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18 },
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
  chipText: { fontFamily: fonts.mono.bold, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  amountCard: {
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
  },
  amountLabel: { ...type.label, letterSpacing: 0.6 },
  amountValue: { ...type.price, marginTop: 8 },
  tierNote: { marginTop: spacing.sm, ...type.bodySm },
  section: { marginTop: spacing.xxl },
  sectionLabel: { ...type.label, letterSpacing: 0.8 },
  sectionBody: { marginTop: spacing.sm, ...type.body },
  metaGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  metaCell: { width: '50%', padding: spacing.md },
  metaLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  metaValue: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  metaSub: {
    marginTop: 2,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  layoutRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  layoutBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  layoutBtnText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  layoutNote: { marginTop: spacing.sm, ...type.bodySm },
  linksWrap: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyStrip: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 3,
  },
  historyLead: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
  },
  historyBody: { ...type.bodySm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  activityDot: { width: 5, height: 5, borderRadius: radius.pill, marginTop: 8 },
  activityContent: { flex: 1, gap: spacing.xs },
  activityLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  activityWhen: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  itemsCard: { marginTop: 8, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  itemRow: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  itemDesc: { ...type.bodySm },
  itemQty: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  itemsTotalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  itemsTotalLabel: { ...type.label, letterSpacing: 0.6 },
  itemsTotalValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  itemsCaption: { marginTop: spacing.sm, ...type.bodySm },
  bubble: { maxWidth: '90%', borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  bubbleBody: { ...type.body },
  bubbleMeta: {
    marginTop: spacing.sm,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
  },
  actionBar: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  channelBlock: { gap: spacing.sm },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  channelBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  channelBtnText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  recipientOnFile: { ...type.bodySm },
  recipientLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  recipientInput: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  recipientHint: { ...type.bodySm },
  btnDisabled: { opacity: 0.4 },
  errorText: { ...type.bodySm },
  okText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  hintText: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.primaryCta,
  },
  pendingLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  deliveryShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.minimum,
  },
  deliverySummary: { ...type.bodySm, flex: 1 },
  deliveryChange: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  footerTotal: { flexGrow: 1, gap: spacing.xs },
  footerAmount: {
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  primaryBtn: {
    flexGrow: 1,
    flexBasis: 168,
    minHeight: touch.primaryCta,
    padding: spacing.md,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.4,
  },
});
