/**
 * `home` — Today first (design kit screen 4).
 *
 * Every size, colour and string below is the kit's. Business identity, the AI
 * line, the overview stats, Recent quotes and Recent chats are all wired to
 * live data (spec web-parity C1–C4, E1). The kit's calendar ("Today · site
 * visits") has no backing API this round and calendar is a listed non-goal,
 * so that section is cut rather than faked.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
import { CopyIcon, SunIcon } from '@/features/home/icons';
import { apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { isAccepted, isInReview, overviewStats, useTenantMe, type QuoteRow } from '@/lib/tenant';
import { fonts, touch } from '@/lib/theme';
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

/** qmPulse: opacity 1 → .4 → 1, 2.4s, ease-in-out, infinite. Runs only while the tab is focused. */
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const pulse = useSharedValue(1);
  useFocusEffect(
    useCallback(() => {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );
      return () => cancelAnimation(pulse);
    }, [pulse]),
  );
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

// ── The screen ─────────────────────────────────────────────────────────────

export function HomeScreen() {
  const { colors, isDark } = useTheme();
  const toggleTheme = useThemeToggle();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: me, isPending, isError, error, refetch, isRefetching } = useTenantMe();
  const {
    data: chatsData,
    isLoading: chatsLoading,
    isError: chatsError,
    refetch: refetchChats,
  } = useChats();

  const lift = isDark ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : '0 1px 2px rgba(43,36,34,0.06)';
  const card = {
    borderWidth: 1,
    borderColor: colors.inkLine,
    borderRadius: 14,
    backgroundColor: colors.inkCard,
    boxShadow: lift,
  } as const;
  const tone: Record<Tone, string> = {
    ok: colors.successBright,
    warn: colors.warningBright,
    dim: colors.textDim,
  };

  // qmUp: greeting entrance, translateY 8 → 0 with fade, 0.32s.
  const up = useSharedValue(0);
  useEffect(() => {
    up.value = withTiming(1, { duration: 320, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [up]);
  const upStyle = useAnimatedStyle(() => ({
    opacity: up.value,
    transform: [{ translateY: (1 - up.value) * 8 }],
  }));

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
        <BrandMark height={24} body={colors.logoBody} notch={colors.logoNotch} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.brandName, { color: colors.logoBody }]}>QUOTEMAX</Text>
          <Text style={[styles.businessName, { color: colors.textDim }]}>
            {businessName.toUpperCase()}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          onPress={toggleTheme}
          hitSlop={3}
          style={[styles.iconBtn, { borderColor: colors.inkLine }]}
        >
          <SunIcon color={colors.textSec} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.accentInk }]}>
            {ownerFirstName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* C4: loading skeleton, error + retry, pull-to-refresh — assume poor signal. */}
      {isPending ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.accent} style={{ alignSelf: 'center' }} />
          <Text style={[styles.centerText, { color: colors.textDim }]}>
            LOADING YOUR DASHBOARD…
          </Text>
        </View>
      ) : isError ? (
        <View style={styles.centerFill}>
          <Text style={[styles.errorTitle, { color: colors.textPri }]}>
            COULDN’T LOAD YOUR DASHBOARD
          </Text>
          <Text style={[styles.centerText, { color: colors.textDim }]}>
            {apiErrorMessage(error)}
          </Text>
          <View style={styles.retryBtn}>
            <PrimaryCta label="Retry" onPress={() => void refetch()} />
          </View>
        </View>
      ) : me && stats ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 24 }}
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
          {/* Live strip */}
          <View
            style={[
              styles.liveStrip,
              { borderBottomColor: colors.inkLine, backgroundColor: colors.ink },
            ]}
          >
            <PulseDot color={aiLineLive ? colors.successBright : colors.warningBright} />
            <Text
              style={[
                styles.liveText,
                { color: aiLineLive ? colors.successBright : colors.warningBright },
              ]}
            >
              {aiLineLive ? 'AI LINE LIVE · ANSWERING' : 'AI LINE · SETTING UP'}
            </Text>
            <Text style={[styles.liveNumber, { color: colors.textDim }]}>
              {smsOrVoiceNumber ?? 'NOT PROVISIONED'}
            </Text>
          </View>

          {/* Greeting */}
          <Animated.View style={[styles.greeting, upStyle]}>
            <Text style={[styles.h1, { color: colors.textPri }]}>
              {greetingWord(new Date().getHours())},{' '}
              <Text
                style={{
                  color: colors.accentText,
                  textDecorationLine: 'underline',
                  textDecorationColor: colors.accentUnder,
                }}
              >
                {ownerFirstName.toUpperCase()}
              </Text>
            </Text>
            <Text style={[styles.greetingSub, { color: colors.textSec }]}>
              {stats.inReviewCount === 0
                ? "You're all caught up. No quotes waiting on you."
                : stats.inReviewCount === 1
                  ? 'One quote needs your review. The rest are drafted and waiting.'
                  : `${stats.inReviewCount} quotes need your review. The rest are drafted and waiting.`}
            </Text>
          </Animated.View>

          {/* Needs your attention — the newest in-review quote, or nothing at all. */}
          {attentionQuote ? (
            <View
              style={[
                styles.attentionCard,
                card,
                { borderColor: 'rgba(245,158,11,0.42)', marginTop: 20 },
              ]}
            >
              <View style={styles.attentionHeader}>
                <PulseDot color={colors.warningBright} />
                <Text style={[styles.attentionLabel, { color: colors.warningBright }]}>
                  NEEDS YOUR ATTENTION
                </Text>
              </View>
              <View style={styles.attentionRow}>
                <Text
                  style={[styles.attentionName, { color: colors.textPri, flexShrink: 1 }]}
                  numberOfLines={1}
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
              <Pressable
                accessibilityRole="button"
                onPress={() => goToQuote(attentionQuote.id)}
                style={[styles.reviewBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.reviewBtnText, { color: colors.accentInk }]}>
                  REVIEW QUOTE →
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Quoted */}
          <View style={[styles.quotedCard, card]}>
            <Text style={[styles.quotedLabel, { color: colors.textDim }]}>QUOTED · INC GST</Text>
            <Text style={[styles.quotedValue, { color: colors.textPri }]}>
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
              { borderColor: colors.inkLine, backgroundColor: colors.inkLine, boxShadow: lift },
            ]}
          >
            <View style={[styles.kpiCell, { backgroundColor: colors.inkCard }]}>
              <Text style={[styles.kpiLabel, { color: colors.textDim }]}>AVG QUOTE</Text>
              <Text style={[styles.kpiValue, { color: colors.accentText }]}>
                {formatAud(stats.avgQuoteCents)}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.textSec }]}>Per draft · inc GST</Text>
            </View>
            <View style={[styles.kpiCell, { backgroundColor: colors.inkCard }]}>
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
            <View style={styles.numberRow}>
              <Text style={[styles.numberValue, { color: colors.textPri }]}>
                {smsOrVoiceNumber ?? 'Pending'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share number"
                disabled={!smsOrVoiceNumber}
                onPress={() => {
                  if (smsOrVoiceNumber) void Share.share({ message: smsOrVoiceNumber });
                }}
                style={[
                  styles.copyBtn,
                  { borderColor: colors.inkLine, opacity: smsOrVoiceNumber ? 1 : 0.4 },
                ]}
              >
                <CopyIcon color={colors.textSec} />
              </Pressable>
            </View>
            <View style={styles.channelChips}>
              {channelChips.map(c => (
                <View
                  key={c.label}
                  style={[
                    styles.channelChip,
                    { borderColor: c.live ? 'rgba(52,210,123,0.45)' : colors.inkLine },
                  ]}
                >
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
                    {c.label.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 01 Recent quotes */}
          <View style={[styles.listCard, card]}>
            <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
              <View style={styles.sectionTitleGroup}>
                <Text style={[styles.listNum, { color: colors.accentText }]}>01</Text>
                <Text style={[styles.listTitle, { color: colors.textPri }]}>RECENT QUOTES</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={goToQuotes}
                hitSlop={8}
                style={styles.sectionActionBtn}
              >
                <Text style={[styles.sectionAction, { color: colors.accentText }]}>
                  ALL {stats.quoteCount} →
                </Text>
              </Pressable>
            </View>
            {recentQuotes.length === 0 ? (
              <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                NO QUOTES YET · SMS OR CALLS WILL LAND HERE
              </Text>
            ) : (
              recentQuotes.map(q => {
                const chip = quoteStatusChip(q);
                return (
                  <Pressable
                    key={q.id}
                    accessibilityRole="button"
                    onPress={() => goToQuote(q.id)}
                    style={[styles.quoteRow, { borderBottomColor: colors.inkLine }]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.quoteName, { color: colors.textPri }]} numberOfLines={1}>
                        {q.customer_full_name || q.customer_first_name || 'Customer'}
                      </Text>
                      <Text
                        style={[styles.quoteJob, { color: colors.textSec }]}
                        numberOfLines={1}
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

          {/* Recent chats (no section number in the kit) — spec E1, live /api/tenant/chats. */}
          <View style={[styles.listCard, card, { marginBottom: 0 }]}>
            <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
              <Text style={[styles.listTitle, { color: colors.textPri }]}>RECENT CHATS</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/chats')}
                hitSlop={8}
                style={styles.sectionActionBtn}
              >
                <Text style={[styles.sectionAction, { color: colors.accentText }]}>OPEN →</Text>
              </Pressable>
            </View>
            {chatsLoading ? (
              <View style={styles.chatsStateRow}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : chatsError && recentChats.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void refetchChats()}
                style={styles.chatsErrorRow}
              >
                <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                  COULDN’T LOAD CHATS · TAP TO RETRY
                </Text>
              </Pressable>
            ) : recentChats.length === 0 ? (
              <Text style={[styles.emptyRow, { color: colors.textDim }]}>
                NO CHATS YET · SMS OR CALLS WILL LAND HERE
              </Text>
            ) : (
              recentChats.map(c => {
                const who = chatDisplayName(c);
                return (
                  <Pressable
                    key={c.id}
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/chats', params: { chatId: c.id } })}
                    style={[styles.chatRow, { borderBottomColor: colors.inkLine }]}
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
                        numberOfLines={1}
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
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  brandName: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 12.5,
    letterSpacing: -0.125, // -.01em @ 12.5
  },
  businessName: {
    marginTop: 3,
    fontFamily: fonts.mono.medium,
    fontSize: 8.5,
    letterSpacing: 1.02, // .12em @ 8.5
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sans.extraBold, fontSize: 13.5 },
  centerFill: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  centerText: {
    fontFamily: fonts.sans.regular,
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: fonts.sans.bold,
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryBtn: { marginTop: 8 },
  emptyRow: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    letterSpacing: 1,
  },
  chatsStateRow: { paddingVertical: 24, alignItems: 'center' },
  chatsErrorRow: { minHeight: touch.minimum, justifyContent: 'center' },
  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  liveText: {
    flex: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    letterSpacing: 1.68, // .14em @ 12
  },
  liveNumber: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    letterSpacing: 1.44, // .12em @ 12
  },
  greeting: { paddingTop: 20, paddingHorizontal: 16 },
  h1: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 28,
    lineHeight: 30, // kit .95 clips in RN; DESIGN.md floors display leading at 1.05
    letterSpacing: -1.12, // -.04em @ 28
  },
  greetingSub: {
    marginTop: 9,
    fontFamily: fonts.sans.regular,
    fontSize: 13.5,
    lineHeight: 20, // 1.5
  },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  sectionAction: {
    fontFamily: fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1, // .1em @ 10
  },
  sectionActionBtn: { minHeight: touch.minimum, justifyContent: 'center' },
  attentionCard: { marginHorizontal: 16, padding: 18 },
  attentionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attentionLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  attentionRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  attentionName: { fontFamily: fonts.sans.bold, fontSize: 15, lineHeight: 18 },
  attentionMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 1.2, // .1em @ 12
  },
  attentionBody: {
    marginTop: 7,
    fontFamily: fonts.sans.regular,
    fontSize: 12.5,
    lineHeight: 18, // 1.45
  },
  reviewBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontFamily: fonts.sans.bold,
    fontSize: 12.5,
    letterSpacing: 0.75, // .06em @ 12.5
  },
  quotedCard: { marginTop: 16, marginHorizontal: 16, padding: 18 },
  quotedLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.05, // .1em @ 10.5
  },
  quotedValue: {
    marginTop: 9,
    fontFamily: fonts.mono.bold,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.14, // -.03em @ 38
    fontVariant: ['tabular-nums'],
  },
  quotedStats: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 18,
    rowGap: 5,
  },
  quotedStat: { fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 17.5 },
  quotedStatNum: {
    fontFamily: fonts.mono.bold,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  kpiStrip: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 1,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  kpiCell: { flex: 1, paddingVertical: 14, paddingHorizontal: 12 },
  kpiLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.76, // .08em @ 9.5
  },
  kpiValue: {
    marginTop: 7,
    fontFamily: fonts.mono.bold,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
  },
  kpiSub: { marginTop: 6, fontFamily: fonts.sans.medium, fontSize: 9.5, lineHeight: 12 },
  numberCard: { marginTop: 16, marginHorizontal: 16, padding: 18 },
  numberLabel: {
    fontFamily: fonts.sans.semiBold,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  numberRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  numberValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 20,
    letterSpacing: -0.2, // -.01em @ 20
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelChips: { marginTop: 13, flexDirection: 'row', gap: 8 },
  channelChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  channelChipText: {
    fontFamily: fonts.mono.bold,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  listCard: { marginTop: 16, marginHorizontal: 16, overflow: 'hidden' },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  listNum: { fontFamily: fonts.mono.bold, fontSize: 11.5 },
  listTitle: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 1.1, // .1em @ 11
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  quoteName: { fontFamily: fonts.sans.bold, fontSize: 13.5, lineHeight: 16 },
  quoteJob: { marginTop: 4, fontFamily: fonts.sans.regular, fontSize: 12, lineHeight: 16 },
  quoteMeta: {
    marginTop: 5,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 1.44, // .12em @ 12
  },
  quoteRight: { alignItems: 'flex-end', gap: 7 },
  quoteValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  quoteAmountMeta: { fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.6 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusChipText: {
    fontFamily: fonts.mono.bold,
    fontSize: 12,
    letterSpacing: 1.2, // .1em @ 12
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatInitial: { fontFamily: fonts.sans.bold, fontSize: 12 },
  chatNameRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  chatName: { fontFamily: fonts.sans.bold, fontSize: 13 },
  chatTime: { fontFamily: fonts.mono.medium, fontSize: 9.5 },
  chatMsg: { marginTop: 5, fontFamily: fonts.sans.regular, fontSize: 12, lineHeight: 17 },
});
