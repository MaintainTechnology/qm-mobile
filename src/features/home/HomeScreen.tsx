/**
 * `home` — Today first (design kit screen 4).
 *
 * Business identity, the AI line, the overview stats, Recent quotes and Recent chats are wired to
 * live data (spec web-parity C1–C4, E1). The kit's calendar ("Today · site
 * visits") has no backing API this round and calendar is a listed non-goal,
 * so that section is cut rather than faked.
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { PrimaryCta } from '@/features/auth/ui';
import { useChats } from '@/features/chats/chats-api';
import {
  chatDisplayName,
  chatInitial,
  lastMessagePreview,
  relativeTime,
} from '@/features/chats/format';
import { ActivityAnalytics } from '@/features/home/ActivityAnalytics';
import { CopyIcon, SunIcon } from '@/features/home/icons';
import { apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { isAccepted, isInReview, overviewStats, useTenantMe, type QuoteRow } from '@/lib/tenant';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme, useThemeToggle } from '@/lib/useTheme';

type Tone = 'ok' | 'warn' | 'dim';

// ── Data-derived helpers (spec web-parity C2/C3) ────────────────────────────

/** Status-chip mapping — web parity with `overviewQuotePill` (dashboard/page.tsx). */
function quoteStatusChip(quote: QuoteRow): { label: string; tone: Tone } {
  if (isAccepted(quote)) return { label: 'Accepted', tone: 'ok' };
  const status = (quote.status ?? 'draft').toLowerCase();
  if (status === 'sent') return { label: 'Sent', tone: 'dim' };
  if (quote.needs_inspection) return { label: 'Site visit', tone: 'dim' };
  return { label: 'Awaiting you', tone: 'warn' };
}

/** "hot_water_replace" → "Hot Water Replace"; falls back to the scope text, then a generic label. */
function jobLabel(quote: QuoteRow): string {
  if (quote.job_type)
    return quote.job_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return quote.scope_of_works?.trim() || 'General enquiry';
}

function newestFirst(quotes: readonly QuoteRow[]): QuoteRow[] {
  return [...quotes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} MIN`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}H`;
  return `${Math.round(hours / 24)}D`;
}

function greetingWord(hour: number): string {
  if (hour < 12) return 'GOOD MORNING';
  if (hour < 18) return 'GOOD ARVO';
  return 'GOOD EVENING';
}

// ── Small shared pieces ────────────────────────────────────────────────────

/** A steady status marker avoids motion competing with the next action. */
function StatusDot({ color, size = 6 }: { color: string; size?: number }) {
  return (
    <View
      accessible={false}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }}
    />
  );
}

// ── The screen ─────────────────────────────────────────────────────────────

export function HomeScreen({ onBack }: { onBack?: () => void } = {}) {
  const { colors } = useTheme();
  const toggleTheme = useThemeToggle();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const stackMetrics = width < 360 || fontScale > 1.15;
  const router = useRouter();
  const { data: me, isPending, isError, error, refetch, isRefetching } = useTenantMe();
  const {
    data: chatsData,
    isLoading: chatsLoading,
    isError: chatsError,
    refetch: refetchChats,
  } = useChats();

  const card = {
    borderWidth: 1,
    borderColor: colors.inkLine,
    borderRadius: 14,
    backgroundColor: colors.inkCard,
  } as const;
  const tone: Record<Tone, string> = {
    ok: colors.successBright,
    warn: colors.warningBright,
    dim: colors.textDim,
  };

  const stats = useMemo(() => (me ? overviewStats(me.quotes) : null), [me]);
  const orderedQuotes = useMemo(() => (me ? newestFirst(me.quotes) : []), [me]);
  const recentQuotes = orderedQuotes.slice(0, 3);
  const recentChats = (chatsData?.chats ?? []).slice(0, 3);
  const attentionQuote = useMemo(() => orderedQuotes.find(isInReview) ?? null, [orderedQuotes]);

  const ownerFirstName = me?.tenant.owner_first_name?.trim() || 'Tradie';
  const businessName = me?.tenant.business_name?.trim() ?? '';
  const smsOrVoiceNumber = me?.tenant.twilio_sms_number || me?.tenant.twilio_voice_number || null;
  const aiLineLive = me?.tenant.status === 'active';
  const channelChips: { label: string; live: boolean }[] = [
    { label: 'SMS', live: !!me?.tenant.twilio_sms_number },
    { label: 'Voice', live: !!me?.tenant.twilio_voice_number },
    { label: 'AI', live: aiLineLive },
  ];

  // C3: "all quotes" hands off to the Quotes tab without a detail id — the shared TENANT_ME_KEY
  // cache is enough to land there. The attention card and recent-quote rows deep-link to the
  // specific quote via the `quoteId` param, which the Quotes tab reads to open that quote's detail.
  const goToQuotes = () => router.push('/quotes');
  const goToQuote = (quoteId: string) => router.push({ pathname: '/quotes', params: { quoteId } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                borderColor: colors.ctlLine,
                backgroundColor: pressed ? colors.ink : 'transparent',
              },
            ]}
          >
            <Text style={[styles.backGlyph, { color: colors.textSec }]}>‹</Text>
          </Pressable>
        ) : null}
        <BrandMark height={24} body={colors.logoBody} notch={colors.logoNotch} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.brandName, { color: colors.logoBody }]}>QUOTEMAX</Text>
          <Text style={[styles.businessName, { color: colors.textDim }]} numberOfLines={1}>
            {businessName.toUpperCase()}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          onPress={toggleTheme}
          hitSlop={3}
          style={({ pressed }) => [
            styles.iconBtn,
            { borderColor: colors.ctlLine, backgroundColor: pressed ? colors.ink : 'transparent' },
          ]}
        >
          <SunIcon color={colors.textSec} />
        </Pressable>
      </View>

      {/* C4: loading skeleton, error + retry, pull-to-refresh — assume poor signal. */}
      {isPending ? (
        <View accessible accessibilityLabel="Loading your dashboard" style={styles.loadingContent}>
          <View style={[styles.skeletonHeading, { backgroundColor: colors.ink }]} />
          <View style={[styles.skeletonText, { backgroundColor: colors.ink }]} />
          <View style={[styles.skeletonCard, { backgroundColor: colors.ink }]} />
          <View style={[styles.skeletonCard, { backgroundColor: colors.ink }]} />
        </View>
      ) : isError && !me ? (
        // Only when there is nothing cached to show — a failed refresh must never blank a
        // dashboard the tradie is part-way through reading.
        <View style={styles.centerFill}>
          <Text style={[styles.errorTitle, { color: colors.textPri }]}>
            COULDN’T LOAD YOUR DASHBOARD
          </Text>
          <Text style={[styles.centerText, { color: colors.textDim }]}>
            {apiErrorMessage(error)}
          </Text>
          <View style={styles.retryBtn}>
            <PrimaryCta label="Retry" loading={isRefetching} onPress={() => void refetch()} />
          </View>
        </View>
      ) : me && stats ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing.gap }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => {
                void refetch();
                void refetchChats();
              }}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          {/* Greeting */}
          <View style={styles.greeting}>
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={1.4}
              style={[styles.h1, { color: colors.textPri }]}
            >
              {greetingWord(new Date().getHours())}, {ownerFirstName.toUpperCase()}
            </Text>
            <Text style={[styles.greetingSub, { color: colors.textSec }]}>
              {stats.inReviewCount === 0
                ? "You're all caught up. No quotes waiting on you."
                : stats.inReviewCount === 1
                  ? 'One quote needs your review. The rest are drafted and waiting.'
                  : `${stats.inReviewCount} quotes need your review. The rest are drafted and waiting.`}
            </Text>
          </View>

          {/* Needs your attention — the newest in-review quote, or nothing at all. */}
          {attentionQuote ? (
            <View style={[styles.attentionCard, card, { borderColor: colors.warningBright }]}>
              <View style={styles.attentionHeader}>
                <StatusDot color={colors.warningBright} />
                <Text style={[styles.attentionLabel, { color: colors.warningBright }]}>
                  NEEDS YOUR ATTENTION
                </Text>
              </View>
              <View style={styles.attentionRow}>
                <Text
                  style={[styles.attentionName, { color: colors.textPri, flexShrink: 1 }]}
                  numberOfLines={2}
                >
                  {attentionQuote.customer_full_name ||
                    attentionQuote.customer_first_name ||
                    'Customer'}
                  {attentionQuote.suburb ? ` · ${attentionQuote.suburb}` : ''}
                </Text>
                <Text style={[styles.attentionMeta, { color: colors.textDim }]}>
                  {attentionQuote.channel === 'voice' ? 'VOICE' : 'SMS'} ·{' '}
                  {timeAgo(attentionQuote.created_at)}
                </Text>
              </View>
              <Text style={[styles.attentionBody, { color: colors.textDim }]}>
                QuoteMax drafted this one. It needs a couple of details before you can send.
              </Text>
              <View style={styles.reviewBtn}>
                <PrimaryCta label="Review quote" onPress={() => goToQuote(attentionQuote.id)} />
              </View>
            </View>
          ) : null}

          {/* Quoted */}
          <View style={[styles.quotedCard, card]}>
            <Text style={[styles.quotedLabel, { color: colors.textDim }]}>QUOTED · INC GST</Text>
            <Text selectable style={[styles.quotedValue, { color: colors.textPri }]}>
              {formatAud(stats.quotedCents)}
            </Text>
            <View style={styles.quotedStats}>
              <Text style={[styles.quotedStat, { color: colors.textSec }]}>
                <Text style={[styles.quotedStatNum, { color: colors.textPri }]}>
                  {stats.quoteCount}
                </Text>{' '}
                {stats.quoteCount === 1 ? 'draft' : 'drafts'}
              </Text>
              <Text style={[styles.quotedStat, { color: colors.textSec }]}>
                <Text style={[styles.quotedStatNum, { color: colors.successBright }]}>
                  {formatAud(stats.acceptedCents)}
                </Text>{' '}
                converted inc GST
              </Text>
              <Text style={[styles.quotedStat, { color: colors.textSec }]}>
                <Text style={[styles.quotedStatNum, { color: colors.textPri }]}>
                  {stats.conversionPct}%
                </Text>{' '}
                rate
              </Text>
            </View>
          </View>

          {/* KPI strip — 1px gaps over the hairline colour draw the dividers */}
          <View
            style={[
              styles.kpiStrip,
              stackMetrics && styles.kpiStripStacked,
              { borderColor: colors.inkLine, backgroundColor: colors.inkLine },
            ]}
          >
            <View
              style={[
                styles.kpiCell,
                stackMetrics && styles.kpiCellStacked,
                { backgroundColor: colors.inkCard },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textDim }]}>AVG QUOTE</Text>
              <Text style={[styles.kpiValue, { color: colors.textPri }]}>
                {formatAud(stats.avgQuoteCents)}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.textSec }]}>Per draft · inc GST</Text>
            </View>
            <View
              style={[
                styles.kpiCell,
                stackMetrics && styles.kpiCellStacked,
                { backgroundColor: colors.inkCard },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textDim }]}>IN REVIEW</Text>
              <Text style={[styles.kpiValue, { color: colors.textPri }]}>
                {stats.inReviewCount}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.textSec }]}>Awaiting send</Text>
            </View>
          </View>

          {/* Your QuoteMax number */}
          <View style={[styles.numberCard, card]}>
            <Text style={[styles.numberLabel, { color: colors.textDim }]}>
              YOUR QUOTEMAX NUMBER
            </Text>
            <View style={styles.numberStatus}>
              <StatusDot color={aiLineLive ? colors.successBright : colors.warningBright} />
              <Text
                style={[
                  styles.liveText,
                  { color: aiLineLive ? colors.successBright : colors.warningBright },
                ]}
              >
                {aiLineLive ? 'AI LINE LIVE' : 'AI LINE SETTING UP'}
              </Text>
            </View>
            <View style={styles.numberRow}>
              <Text selectable style={[styles.numberValue, { color: colors.textPri }]}>
                {smsOrVoiceNumber ?? 'Pending'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share number"
                disabled={!smsOrVoiceNumber}
                onPress={() => {
                  if (smsOrVoiceNumber) void Share.share({ message: smsOrVoiceNumber });
                }}
                style={({ pressed }) => [
                  styles.copyBtn,
                  {
                    borderColor: colors.ctlLine,
                    backgroundColor: pressed ? colors.ink : 'transparent',
                    opacity: smsOrVoiceNumber ? 1 : 0.4,
                  },
                ]}
              >
                <CopyIcon color={colors.textSec} />
              </Pressable>
            </View>
            <View style={styles.channelChips}>
              {channelChips.map(c => (
                <View key={c.label} style={[styles.channelChip, { borderColor: colors.inkLine }]}>
                  <View
                    style={[
                      styles.chipDot,
                      { backgroundColor: c.live ? colors.successBright : colors.textDim },
                    ]}
                  />
                  <Text
                    style={[
                      styles.channelChipText,
                      { color: c.live ? colors.successBright : colors.textDim },
                    ]}
                  >
                    {c.label.toUpperCase()} {c.live ? 'ON' : 'OFF'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent quotes */}
          <View style={[styles.listCard, card]}>
            <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
              <Text
                accessibilityRole="header"
                style={[styles.listTitle, { color: colors.textPri }]}
              >
                Recent quotes
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={goToQuotes}
                hitSlop={8}
                style={({ pressed }) => [styles.sectionActionBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.sectionAction, { color: colors.textSec }]}>
                  ALL {stats.quoteCount} →
                </Text>
              </Pressable>
            </View>
            {recentQuotes.length === 0 ? (
              <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                No quotes yet. New requests will appear here.
              </Text>
            ) : (
              recentQuotes.map((q, index) => {
                const chip = quoteStatusChip(q);
                return (
                  <Pressable
                    key={q.id}
                    accessibilityRole="button"
                    onPress={() => goToQuote(q.id)}
                    style={({ pressed }) => [
                      styles.quoteRow,
                      {
                        borderBottomColor: colors.inkLine,
                        borderBottomWidth: index === recentQuotes.length - 1 ? 0 : 1,
                        backgroundColor: pressed ? colors.ink : 'transparent',
                      },
                    ]}
                  >
                    <View style={styles.quoteDetails}>
                      <Text style={[styles.quoteName, { color: colors.textPri }]} numberOfLines={2}>
                        {q.customer_full_name || q.customer_first_name || 'Customer'}
                      </Text>
                      <Text
                        style={[styles.quoteJob, { color: colors.textSec }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {jobLabel(q)}
                      </Text>
                      <Text style={[styles.quoteMeta, { color: colors.textDim }]}>
                        {(q.suburb ?? '—').toUpperCase()} ·{' '}
                        {q.channel === 'voice' ? 'VOICE' : 'SMS'}
                      </Text>
                    </View>
                    <View style={styles.quoteRight}>
                      <View style={styles.quoteAmount}>
                        <Text style={[styles.quoteValue, { color: colors.textPri }]}>
                          {q.total_inc_gst != null
                            ? formatAud(centsFromApiDollars(q.total_inc_gst))
                            : '—'}
                        </Text>
                        {q.total_inc_gst != null ? (
                          <Text style={[styles.quoteAmountMeta, { color: colors.textDim }]}>
                            inc GST
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.statusChip, { borderColor: tone[chip.tone] }]}>
                        <View style={[styles.statusDot, { backgroundColor: tone[chip.tone] }]} />
                        <Text style={[styles.statusChipText, { color: tone[chip.tone] }]}>
                          {chip.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Recent chats — spec E1, live /api/tenant/chats. */}
          <View style={[styles.listCard, card, { marginBottom: 0 }]}>
            <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
              <Text
                accessibilityRole="header"
                style={[styles.listTitle, { color: colors.textPri }]}
              >
                Recent chats
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/chats')}
                hitSlop={8}
                style={({ pressed }) => [styles.sectionActionBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.sectionAction, { color: colors.textSec }]}>OPEN →</Text>
              </Pressable>
            </View>
            {chatsLoading ? (
              <View
                accessible
                accessibilityLabel="Loading recent chats"
                style={styles.chatsStateRow}
              >
                <View style={[styles.skeletonText, { backgroundColor: colors.ink }]} />
                <View style={[styles.skeletonText, { backgroundColor: colors.ink }]} />
              </View>
            ) : chatsError && recentChats.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refetchChats()}
                style={styles.chatsErrorRow}
              >
                <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                  Couldn’t load chats. Tap to retry.
                </Text>
              </Pressable>
            ) : recentChats.length === 0 ? (
              <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                No chats yet. Customer conversations will appear here.
              </Text>
            ) : (
              recentChats.map((c, index) => {
                const who = chatDisplayName(c);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/chats', params: { chatId: c.id } })}
                    style={({ pressed }) => [
                      styles.chatRow,
                      {
                        borderBottomColor: colors.inkLine,
                        borderBottomWidth: index === recentChats.length - 1 ? 0 : 1,
                        backgroundColor: pressed ? colors.ink : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.chatAvatar, { backgroundColor: colors.inkLine }]}>
                      <Text style={[styles.chatInitial, { color: colors.textSec }]}>
                        {chatInitial(who)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.chatNameRow}>
                        <Text
                          style={[styles.chatName, { color: colors.textPri }]}
                          numberOfLines={1}
                        >
                          {who}
                        </Text>
                        <Text style={[styles.chatTime, { color: colors.textDim }]}>
                          {relativeTime(c.last_message_at ?? c.created_at)}
                        </Text>
                      </View>
                      <Text
                        style={[styles.chatMsg, { color: colors.textDim }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {lastMessagePreview(c)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Your activity — the web Overview's analytics block, ported natively. */}
          <ActivityAnalytics />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  brandName: { ...type.body, fontFamily: fonts.sans.extraBold, letterSpacing: -0.3 },
  businessName: { ...type.label, marginTop: spacing.xs, letterSpacing: 0.6 },
  iconBtn: {
    width: touch.minimum,
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontFamily: fonts.sans.extraBold, fontSize: 26, lineHeight: 28 },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.gap,
    gap: spacing.md,
  },
  centerText: { ...type.bodySm, textAlign: 'center' },
  errorTitle: { ...type.title, textAlign: 'center' },
  retryBtn: { marginTop: spacing.sm },
  loadingContent: { padding: spacing.xl, paddingTop: spacing.gap, gap: spacing.lg },
  skeletonHeading: { width: '72%', height: 32, borderRadius: radius.chip },
  skeletonText: { width: '88%', height: 20, borderRadius: radius.chip },
  skeletonCard: { marginTop: spacing.sm, height: 144, borderRadius: radius.card },
  emptyRow: { ...type.bodySm, paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  chatsStateRow: { padding: spacing.xl, gap: spacing.md },
  chatsErrorRow: { minHeight: touch.minimum, justifyContent: 'center' },
  liveText: { ...type.label, flex: 1, letterSpacing: 0.6 },
  greeting: { paddingTop: spacing.gap, paddingHorizontal: spacing.xl },
  h1: { ...type.headline },
  greetingSub: { ...type.body, marginTop: spacing.md },
  sectionAction: { ...type.label, letterSpacing: 0.6 },
  sectionActionBtn: { minHeight: touch.minimum, justifyContent: 'center', paddingLeft: spacing.sm },
  attentionCard: { marginTop: spacing.xxl, marginHorizontal: spacing.xl, padding: spacing.xl },
  attentionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attentionLabel: { ...type.label, flex: 1, letterSpacing: 0.8 },
  attentionRow: { marginTop: spacing.lg, gap: spacing.sm },
  attentionName: { ...type.title },
  attentionMeta: { ...type.label, letterSpacing: 0.6 },
  attentionBody: { ...type.bodySm, marginTop: spacing.md },
  reviewBtn: { marginTop: spacing.xl },
  quotedCard: { marginTop: spacing.xxl, marginHorizontal: spacing.xl, padding: spacing.xl },
  quotedLabel: { ...type.label, letterSpacing: 1.2 },
  quotedValue: { ...type.price, marginTop: spacing.md },
  quotedStats: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  quotedStat: { ...type.bodySm },
  quotedStatNum: { ...type.bodySm, fontFamily: fonts.mono.semiBold, fontVariant: ['tabular-nums'] },
  kpiStrip: {
    marginTop: spacing.md,
    marginHorizontal: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    borderWidth: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  kpiStripStacked: { flexDirection: 'column' },
  kpiCell: { flex: 1, minWidth: 132, paddingVertical: spacing.lg, paddingHorizontal: spacing.md },
  kpiCellStacked: { flex: 0 },
  kpiLabel: { ...type.label, letterSpacing: 0.6 },
  kpiValue: {
    marginTop: spacing.md,
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  kpiSub: { ...type.bodySm, marginTop: spacing.sm },
  numberCard: { marginTop: spacing.xxl, marginHorizontal: spacing.xl, padding: spacing.xl },
  numberLabel: { ...type.label, letterSpacing: 1.2 },
  numberStatus: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  numberRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  numberValue: {
    flexShrink: 1,
    fontFamily: fonts.mono.bold,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    width: touch.minimum,
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelChips: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm },
  channelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.chip,
    padding: spacing.sm,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  channelChipText: { ...type.label, flexShrink: 1, letterSpacing: 0, textAlign: 'center' },
  listCard: { marginTop: spacing.xxl, marginHorizontal: spacing.xl, overflow: 'hidden' },
  listHeader: {
    minHeight: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
  },
  listTitle: { ...type.title },
  quoteRow: { minHeight: touch.listRow, padding: spacing.xl, gap: spacing.md },
  quoteDetails: { minWidth: 0 },
  quoteName: { ...type.body, fontFamily: fonts.sans.bold },
  quoteJob: { ...type.bodySm, marginTop: spacing.xs },
  quoteMeta: { ...type.label, marginTop: spacing.sm, letterSpacing: 0.4 },
  quoteRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  quoteAmount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  quoteValue: { ...type.body, fontFamily: fonts.mono.bold, fontVariant: ['tabular-nums'] },
  quoteAmountMeta: { ...type.label, letterSpacing: 0 },
  statusChip: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusChipText: { ...type.label, letterSpacing: 0.3 },
  chatRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.xl,
  },
  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInitial: { ...type.bodySm, fontFamily: fonts.sans.bold },
  chatNameRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  chatName: { ...type.body, fontFamily: fonts.sans.bold, flexShrink: 1 },
  chatTime: { ...type.label, letterSpacing: 0 },
  chatMsg: { ...type.bodySm, marginTop: spacing.sm },
});
