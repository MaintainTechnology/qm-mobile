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
 * The send action carries the web SendQuotePanel's channel choice (SMS default, email with the
 * PDF attached) and manual recipient entry, and doubles as Resend for already-delivered quotes —
 * the route sends from any pre-payment status, so resend is the same POST.
 *
 * Web detail-pane parity (page.tsx QuoteDetail, ~9384-9737): the Details grid
 * (Work/Service/Drafted/Routing), estimated timeframe, the per-quote layout toggle
 * (PATCH display-mode) and the Activity timeline — which the web synthesises from
 * status fields, not a history array, so mobile synthesises identically.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import { relativeTime } from '@/features/chats/format';
import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiUrl } from '@/lib/env';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import type { QuoteRow } from '@/lib/tenant';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { TRADE_LABELS } from '../trades/hub/sections';
import {
  actionErrorMessage,
  sendQuoteVars,
  useApproveQuote,
  useSendQuote,
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
    // Accent-tinted band (web: border accent/40 on accent/5) — literal alpha
    // suffixes because RN styles can't tint a token any other way.
    <View
      style={[
        styles.historyStrip,
        { borderColor: `${colors.accent}66`, backgroundColor: `${colors.accent}14` },
      ]}
    >
      <Text style={[styles.historyLead, { color: colors.accentText }]}>YOUR HISTORY</Text>
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
            <Text style={[styles.metaValue, { color: colors.textPri }]} numberOfLines={2}>
              {cell.value}
            </Text>
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
        <View style={styles.layoutRow}>
          {modes.map(mode => {
            const active = currentMode === mode.key;
            return (
              <Pressable
                key={mode.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                disabled={setMode.isPending}
                onPress={() => {
                  if (!active) setMode.mutate({ quoteId: quote.id, display_mode: mode.key });
                }}
                style={[
                  styles.layoutBtn,
                  {
                    borderColor: active ? colors.accent : colors.inkLine,
                    backgroundColor: active ? colors.ink : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.layoutBtnText,
                    { color: active ? colors.accentText : colors.textDim },
                  ]}
                >
                  {mode.label.toUpperCase()}
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

/** Web Activity timeline, synthesised from status fields exactly as the web does
 *  (page.tsx:9456-9464): drafted → sent → deposit paid / accepted. */
function ActivityBlock({ quote }: { quote: QuoteRow }) {
  const { colors } = useTheme();
  const drafted = draftedAt(quote.created_at);
  const status = (quote.status ?? 'draft').toLowerCase();
  const wasSent = quote.deposit_paid === true || ['sent', 'accepted', 'paid'].includes(status);
  const events: { label: string; when?: string }[] = [
    { label: 'Drafted by QuoteMax', when: `${drafted.date} · ${drafted.time}` },
  ];
  if (wasSent) events.push({ label: 'Sent to customer' });
  if (quote.deposit_paid) events.push({ label: 'Deposit paid' });
  else if (status === 'accepted') events.push({ label: 'Accepted' });

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>ACTIVITY</Text>
      <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
        {events.map(event => (
          <View key={event.label} style={styles.activityRow}>
            <View style={[styles.activityDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.activityLabel, { color: colors.textSec }]}>{event.label}</Text>
            {event.when ? (
              <Text style={[styles.activityWhen, { color: colors.textDim }]}>{event.when}</Text>
            ) : null}
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
function LinksBlock({ quote }: { quote: QuoteRow }) {
  const { colors } = useTheme();
  const token = quote.share_token;
  const inspection = quote.needs_inspection === true || quote.inspection_required === true;
  if (!token && !quote.measure_href) return null;
  const depositPath = token ? `/r/${token}/${quote.selected_tier ?? 'better'}` : null;
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textDim }]}>QUICK LINKS</Text>
      <View style={styles.linksWrap}>
        {token ? <LinkOutButton label="Customer page" path={`/q/${token}`} /> : null}
        {quote.measure_href ? (
          <LinkOutButton label="Measurement results" path={quote.measure_href} />
        ) : null}
        {token && !inspection ? (
          <LinkOutButton label="View PDF · Edit" path={`/dashboard/quote/${token}`} />
        ) : null}
        {token && !inspection ? (
          <LinkOutButton label="Download PDF" path={`/api/q/${token}/pdf`} />
        ) : null}
        {depositPath && !inspection ? (
          <LinkOutButton
            label="Share deposit link"
            onPress={() => void Share.share({ message: apiUrl(depositPath) })}
          />
        ) : null}
      </View>
    </View>
  );
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
  /** Web SendQuotePanel parity: SMS default; email attaches the PDF server-side. */
  const [channel, setChannel] = useState<SendChannel>('sms');
  /** Manual recipient overrides — only sent up when typed (see `sendQuoteVars`). */
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // A fresh mutation state per quote — reopening the sheet on a different row must not carry over
  // yesterday's error/success line, an armed confirm, or another customer's typed recipient.
  useEffect(() => {
    approve.reset();
    send.reset();
    setArmed(false);
    setChannel('sms');
    setPhone('');
    setEmail('');
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
  // flips the quote's status) and keeps it hidden through success. A sent quote stays sendable
  // (resend), so the row only comes back on the next open of the sheet — deliberate: it stops an
  // absent-minded second nudge seconds after the first.
  const showActionRow = primaryAction !== null && !pending && !justApproved && !justSent;

  const quoteId = quote.id;
  const resend = isResend(quote);
  const onFilePhone = quote.customer_phone?.trim() ? quote.customer_phone.trim() : null;
  // Web `smsReady` parity: SMS needs a number — on file or typed. Email may go up blank: the
  // server resolves the on-file address through its contact chain and 400s with its own
  // plain-language message when there is none.
  const sendBlocked =
    primaryAction === 'send' && channel === 'sms' && !onFilePhone && phone.trim().length === 0;

  function firePrimaryAction() {
    if (!primaryAction || pending || sendBlocked) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    if (primaryAction === 'approve') approve.mutate({ quoteId });
    else
      send.mutate(
        sendQuoteVars(
          quoteId,
          channel,
          channel === 'sms' ? onFilePhone : null,
          channel === 'sms' ? phone : email,
        ),
      );
  }

  const actionLabel = armed
    ? 'TAP AGAIN TO CONFIRM'
    : primaryAction === 'approve'
      ? 'APPROVE & SEND'
      : resend
        ? 'RESEND TO CUSTOMER'
        : 'SEND TO CUSTOMER';

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      {/* The recipient inputs live in the pinned bottom bar — without this the iOS keyboard
          covers exactly the field being typed into (Android resizes the window itself). */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

          <DetailsBlock quote={quote} />

          <ActivityBlock quote={quote} />

          <LinksBlock quote={quote} />

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
              <>
                {primaryAction === 'send' ? (
                  <View style={styles.channelBlock}>
                    {/* Web SendQuotePanel rows as pills: Text message / Email (PDF attached). */}
                    <View style={styles.channelRow}>
                      {(
                        [
                          { key: 'sms', label: 'TEXT MESSAGE' },
                          { key: 'email', label: 'EMAIL' },
                        ] as const
                      ).map(option => {
                        const active = channel === option.key;
                        return (
                          <Pressable
                            key={option.key}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => {
                              setChannel(option.key);
                              // A confirm armed for one channel must never fire the other.
                              setArmed(false);
                            }}
                            style={[
                              styles.channelBtn,
                              {
                                borderColor: active ? colors.accent : colors.inkLine,
                                backgroundColor: active ? colors.ink : 'transparent',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.channelBtnText,
                                { color: active ? colors.accentText : colors.textDim },
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
                        <TextInput
                          value={phone}
                          onChangeText={setPhone}
                          keyboardType="phone-pad"
                          placeholder="Customer mobile, e.g. 04xx xxx xxx"
                          placeholderTextColor={colors.textDim}
                          style={[
                            styles.recipientInput,
                            { borderColor: colors.inkLine, color: colors.textPri },
                          ]}
                        />
                      )
                    ) : (
                      <>
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="customer@example.com"
                          placeholderTextColor={colors.textDim}
                          style={[
                            styles.recipientInput,
                            { borderColor: colors.inkLine, color: colors.textPri },
                          ]}
                        />
                        <Text style={[styles.recipientHint, { color: colors.textDim }]}>
                          PDF attached. Leave blank to use the address on file.
                        </Text>
                      </>
                    )}
                  </View>
                ) : null}
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: sendBlocked }}
                    accessibilityLabel={
                      primaryAction === 'approve'
                        ? 'Approve and send'
                        : resend
                          ? 'Resend to customer'
                          : 'Send to customer'
                    }
                    disabled={sendBlocked}
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
                            sendBlocked ? styles.btnDisabled : null,
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
              </>
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
  metaGrid: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  metaCell: { width: '50%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  metaLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  metaValue: { marginTop: 4, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 19 },
  metaSub: {
    marginTop: 2,
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  layoutRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  layoutBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  layoutBtnText: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
  layoutNote: { marginTop: spacing.sm, fontFamily: fonts.sans.medium, fontSize: 12 },
  linksWrap: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyStrip: {
    marginTop: spacing.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 3,
  },
  historyLead: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 1.2, // .12em @ 10 — the web's tracking-wider lead badge
  },
  historyBody: { fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 18 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  activityDot: { width: 5, height: 5, borderRadius: radius.pill },
  activityLabel: { fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  activityWhen: {
    marginLeft: 'auto',
    fontFamily: fonts.mono.medium,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
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
  channelBlock: { gap: spacing.sm },
  channelRow: { flexDirection: 'row', gap: spacing.sm },
  channelBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  channelBtnText: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
  recipientOnFile: { fontFamily: fonts.sans.regular, fontSize: 13 },
  recipientInput: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
  },
  recipientHint: { fontFamily: fonts.sans.regular, fontSize: 12 },
  btnDisabled: { opacity: 0.4 },
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
