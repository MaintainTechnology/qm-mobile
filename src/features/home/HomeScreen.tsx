/**
 * `home` — Today first (design kit screen 4).
 *
 * Every size, colour and string below is the kit's. The data constants are the
 * kit's sample content, in place until the dashboard API wiring
 * (/api/tenant/me, /api/tenant/analytics, /api/tenant/chats) replaces them —
 * they are design fixtures, not invented product data.
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import {
  BellIcon,
  ClockIcon,
  CopyIcon,
  PhoneIcon,
  SendIcon,
  SunIcon,
} from '@/features/home/icons';
import { PushBanner } from '@/features/home/PushBanner';
import { fonts } from '@/lib/theme';
import { useTheme, useThemeToggle } from '@/lib/useTheme';

type Tone = 'ok' | 'warn' | 'dim';

// ── Kit sample data (design fixtures — see file header) ────────────────────
const TODAY_VISITS: {
  time: string;
  dur: string;
  name: string;
  addr: string;
  kind: string;
  tone: Tone;
  drive: string;
}[] = [
  {
    time: '10:30',
    dur: '90 MIN',
    name: 'Priya Naidu',
    addr: '14 Wynnum Rd, Norman Park',
    kind: 'PAID SITE VISIT · $99 PAID',
    tone: 'ok',
    drive: '12 MIN · 6.4 KM',
  },
  {
    time: '14:00',
    dur: '60 MIN',
    name: 'Dean Whitlam',
    addr: '3/22 Kianawah Rd, Wynnum',
    kind: 'REROOF INSPECTION',
    tone: 'warn',
    drive: '19 MIN · 11.2 KM',
  },
];

const MINI_KPIS: { label: string; value: string; sub: string; accent: boolean }[] = [
  { label: 'Avg quote', value: '$8,921', sub: 'Per draft', accent: true },
  { label: 'In review', value: '1', sub: 'Awaiting send', accent: false },
  { label: 'Services', value: '49/65', sub: 'Auto-quote', accent: true },
];

const CHANNEL_CHIPS = ['SMS', 'Voice', 'AI'];

const RECENT_QUOTES: {
  name: string;
  suburb: string;
  job: string;
  value: string;
  status: string;
  tone: Tone;
  ch: string;
}[] = [
  { name: 'Jon', suburb: 'Chandler', job: 'Other — general enquiry', value: '—', status: 'Awaiting you', tone: 'warn', ch: 'SMS' },
  { name: 'New lead', suburb: 'Chandler 4155', job: 'Full reroof — Colorbond', value: '$73,522', status: 'Viewed', tone: 'dim', ch: 'Voice' },
  { name: 'Sam', suburb: 'Coogee', job: 'Hot water — replace 250L', value: '$3,180', status: 'Accepted', tone: 'ok', ch: 'SMS' },
];

const RECENT_CHATS = [
  { initial: 'J', name: 'Jon', time: '2:54 pm', msg: 'QuoteMax: No worries, ask away whenever you’re ready.' },
  { initial: 'S', name: 'Sam', time: '3:02 pm', msg: 'QuoteMax: A 250L will suit. Drafting it now.' },
];

// ── Small shared pieces ────────────────────────────────────────────────────

/** qmPulse: opacity 1 → .4 → 1, 2.4s, ease-in-out, infinite. */
function PulseDot({ color, size = 6 }: { color: string; size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

function SectionHeader({
  num,
  title,
  action,
  onAction,
}: {
  num?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleGroup}>
        {num ? <Text style={[styles.sectionNum, { color: colors.accentText }]}>{num}</Text> : null}
        <Text style={[styles.sectionTitle, { color: colors.textPri }]}>{title.toUpperCase()}</Text>
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.accentText }]}>
            {action.toUpperCase()} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ── The screen ─────────────────────────────────────────────────────────────

export function HomeScreen() {
  const { colors, isDark } = useTheme();
  const toggleTheme = useThemeToggle();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [pushOpen, setPushOpen] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <BrandMark height={24} body={colors.logoBody} notch={colors.logoNotch} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.brandName, { color: colors.logoBody }]}>QUOTEMAX</Text>
          <Text style={[styles.businessName, { color: colors.textDim }]}>HARTLEY ELECTRICAL</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => setPushOpen(true)}
          style={[styles.iconBtn, { borderColor: colors.inkLine }]}
        >
          <BellIcon color={colors.textSec} />
          <View style={[styles.bellBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.bellBadgeText, { color: colors.accentInk }]}>3</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Toggle theme"
          onPress={toggleTheme}
          style={[styles.iconBtn, { borderColor: colors.inkLine }]}
        >
          <SunIcon color={colors.textSec} />
        </Pressable>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={[styles.avatarText, { color: colors.accentInk }]}>J</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Live strip */}
        <View
          style={[
            styles.liveStrip,
            { borderBottomColor: colors.inkLine, backgroundColor: colors.ink },
          ]}
        >
          <PulseDot color={colors.successBright} />
          <Text style={[styles.liveText, { color: colors.successBright }]}>
            AI LINE LIVE · ANSWERING
          </Text>
          <Text style={[styles.liveNumber, { color: colors.textDim }]}>+61 468 048 422</Text>
        </View>

        {/* Greeting */}
        <Animated.View style={[styles.greeting, upStyle]}>
          <Text style={[styles.h1, { color: colors.textPri }]}>
            GOOD MORNING,{' '}
            <Text
              style={{
                color: colors.accentText,
                textDecorationLine: 'underline',
                textDecorationColor: colors.accentUnder,
              }}
            >
              JEPH
            </Text>
          </Text>
          <Text style={[styles.greetingSub, { color: colors.textSec }]}>
            Two visits booked today. One quote needs your review.
          </Text>
        </Animated.View>

        {/* 01 Today */}
        <View style={{ marginTop: 20 }}>
          {/* ponytail: Calendar → is inert until the calendar screen is built. */}
          <SectionHeader num="01" title="Today · 2 site visits" action="Calendar" onAction={() => {}} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.visitRow}
          >
            {TODAY_VISITS.map(v => (
              <View key={v.name} style={[styles.visitCard, card]}>
                <View style={styles.visitTopRow}>
                  <Text style={[styles.visitTime, { color: colors.textPri }]}>{v.time}</Text>
                  <Text style={[styles.visitDur, { color: colors.textDim }]}>{v.dur}</Text>
                </View>
                <Text style={[styles.visitName, { color: colors.textPri }]}>{v.name}</Text>
                <Text style={[styles.visitAddr, { color: colors.textSec }]}>{v.addr}</Text>
                <View style={[styles.kindChip, { borderColor: tone[v.tone] }]}>
                  <View style={[styles.chipDot, { backgroundColor: tone[v.tone] }]} />
                  <Text style={[styles.kindChipText, { color: tone[v.tone] }]}>{v.kind}</Text>
                </View>
                <View style={styles.visitButtons}>
                  {/* Call / Drive dial out and open maps once tel/geo wiring lands. */}
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.callBtn, { backgroundColor: colors.accent }]}
                  >
                    <PhoneIcon color={colors.accentInk} />
                    <Text style={[styles.visitBtnText, { color: colors.accentInk }]}>CALL</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.driveBtn, { borderColor: colors.inkLine }]}
                  >
                    <SendIcon color={colors.textPri} />
                    <Text style={[styles.visitBtnText, { color: colors.textPri }]}>DRIVE</Text>
                  </Pressable>
                </View>
                <Text style={[styles.visitDrive, { color: colors.textDim }]}>
                  {v.drive} FROM HERE
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Needs your attention */}
        <View style={[styles.attentionCard, card, { borderColor: 'rgba(245,158,11,0.42)' }]}>
          <View style={styles.attentionHeader}>
            <PulseDot color={colors.warningBright} />
            <Text style={[styles.attentionLabel, { color: colors.warningBright }]}>
              NEEDS YOUR ATTENTION
            </Text>
          </View>
          <View style={styles.attentionRow}>
            <Text style={[styles.attentionName, { color: colors.textPri }]}>Jon · Chandler</Text>
            <Text style={[styles.attentionMeta, { color: colors.textDim }]}>SMS · 4 MIN</Text>
          </View>
          <Text style={[styles.attentionBody, { color: colors.textDim }]}>
            QuoteMax drafted this one. It needs a couple of details before you can send.
          </Text>
          {/* Opens the quote-review screen once that screen is built. */}
          <Pressable
            accessibilityRole="button"
            style={[styles.reviewBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.reviewBtnText, { color: colors.accentInk }]}>REVIEW QUOTE →</Text>
          </Pressable>
        </View>

        {/* Quoted · This month */}
        <View style={[styles.quotedCard, card]}>
          <Text style={[styles.quotedLabel, { color: colors.textDim }]}>QUOTED · THIS MONTH</Text>
          <Text style={[styles.quotedValue, { color: colors.textPri }]}>$178,411</Text>
          <View style={styles.quotedStats}>
            <Text style={[styles.quotedStat, { color: colors.textSec }]}>
              <Text style={[styles.quotedStatNum, { color: colors.textPri }]}>20</Text> drafts
            </Text>
            <Text style={[styles.quotedStat, { color: colors.textSec }]}>
              <Text style={[styles.quotedStatNum, { color: colors.successBright }]}>$0</Text>{' '}
              converted
            </Text>
            <Text style={[styles.quotedStat, { color: colors.textSec }]}>
              <Text style={[styles.quotedStatNum, { color: colors.textPri }]}>0%</Text> rate
            </Text>
          </View>
        </View>

        {/* KPI strip — 1px gaps over the hairline colour draw the dividers */}
        <View style={[styles.kpiStrip, { borderColor: colors.inkLine, backgroundColor: colors.inkLine, boxShadow: lift }]}>
          {MINI_KPIS.map(k => (
            <View key={k.label} style={[styles.kpiCell, { backgroundColor: colors.inkCard }]}>
              <Text style={[styles.kpiLabel, { color: colors.textDim }]}>
                {k.label.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: k.accent ? colors.accentText : colors.textPri },
                ]}
              >
                {k.value}
              </Text>
              <Text style={[styles.kpiSub, { color: colors.textSec }]}>{k.sub}</Text>
            </View>
          ))}
        </View>

        {/* Your QuoteMax number */}
        <View style={[styles.numberCard, card]}>
          <Text style={[styles.numberLabel, { color: colors.textDim }]}>YOUR QUOTEMAX NUMBER</Text>
          <View style={styles.numberRow}>
            <Text style={[styles.numberValue, { color: colors.textPri }]}>+61 468 048 422</Text>
            {/* Copies the number once clipboard wiring lands (inert in the kit too). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copy number"
              style={[styles.copyBtn, { borderColor: colors.inkLine }]}
            >
              <CopyIcon color={colors.textSec} />
            </Pressable>
          </View>
          <View style={styles.channelChips}>
            {CHANNEL_CHIPS.map(c => (
              <View key={c} style={[styles.channelChip, { borderColor: 'rgba(52,210,123,0.45)' }]}>
                <View style={[styles.chipDot, { backgroundColor: colors.successBright }]} />
                <Text style={[styles.channelChipText, { color: colors.successBright }]}>
                  {c.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 02 Recent quotes */}
        <View style={[styles.listCard, card]}>
          <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
            <View style={styles.sectionTitleGroup}>
              <Text style={[styles.listNum, { color: colors.accentText }]}>02</Text>
              <Text style={[styles.listTitle, { color: colors.textPri }]}>RECENT QUOTES</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/quotes')} hitSlop={8}>
              <Text style={[styles.sectionAction, { color: colors.accentText }]}>ALL 20 →</Text>
            </Pressable>
          </View>
          {RECENT_QUOTES.map(q => (
            // Row opens the quote-review screen once that screen is built.
            <Pressable
              key={`${q.name}-${q.job}`}
              accessibilityRole="button"
              style={[styles.quoteRow, { borderBottomColor: colors.inkLine }]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.quoteName, { color: colors.textPri }]}>{q.name}</Text>
                <Text
                  style={[styles.quoteJob, { color: colors.textSec }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {q.job}
                </Text>
                <Text style={[styles.quoteMeta, { color: colors.textDim }]}>
                  {q.suburb.toUpperCase()} · {q.ch.toUpperCase()}
                </Text>
              </View>
              <View style={styles.quoteRight}>
                <Text style={[styles.quoteValue, { color: colors.textPri }]}>{q.value}</Text>
                <View style={[styles.statusChip, { borderColor: tone[q.tone] }]}>
                  <View style={[styles.statusDot, { backgroundColor: tone[q.tone] }]} />
                  <Text style={[styles.statusChipText, { color: tone[q.tone] }]}>
                    {q.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
          <View style={styles.offlineFooter}>
            <ClockIcon color={colors.textDim} />
            <Text style={[styles.offlineText, { color: colors.textDim }]}>
              2 DRAFTS SAVED OFFLINE · SYNC ON SIGNAL
            </Text>
          </View>
        </View>

        {/* Recent chats (no section number in the kit) */}
        <View style={[styles.listCard, card, { marginBottom: 0 }]}>
          <View style={[styles.listHeader, { borderBottomColor: colors.inkLine }]}>
            <Text style={[styles.listTitle, { color: colors.textPri }]}>RECENT CHATS</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/chats')} hitSlop={8}>
              <Text style={[styles.sectionAction, { color: colors.accentText }]}>OPEN →</Text>
            </Pressable>
          </View>
          {RECENT_CHATS.map(c => (
            <Pressable
              key={c.name}
              accessibilityRole="button"
              onPress={() => router.push('/chats')}
              style={[styles.chatRow, { borderBottomColor: colors.inkLine }]}
            >
              <View style={[styles.chatAvatar, { backgroundColor: colors.inkLine }]}>
                <Text style={[styles.chatInitial, { color: colors.textSec }]}>{c.initial}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.chatNameRow}>
                  <Text style={[styles.chatName, { color: colors.textPri }]}>{c.name}</Text>
                  <Text style={[styles.chatTime, { color: colors.textDim }]}>{c.time}</Text>
                </View>
                <Text
                  style={[styles.chatMsg, { color: colors.textDim }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {c.msg}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {pushOpen ? <PushBanner onDismiss={() => setPushOpen(false)} /> : null}
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
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: { fontFamily: fonts.mono.bold, fontSize: 9.5, lineHeight: 16 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sans.extraBold, fontSize: 13.5 },
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
    fontSize: 9.5,
    letterSpacing: 1.33, // .14em @ 9.5
  },
  liveNumber: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 9.5,
    letterSpacing: 1.14, // .12em @ 9.5
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitleGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  sectionNum: { fontFamily: fonts.mono.bold, fontSize: 12 },
  sectionTitle: {
    fontFamily: fonts.sans.bold,
    fontSize: 11.5,
    letterSpacing: 1.15, // .1em @ 11.5
  },
  sectionAction: {
    fontFamily: fonts.sans.bold,
    fontSize: 10,
    letterSpacing: 1, // .1em @ 10
  },
  visitRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 2 },
  visitCard: { width: 274, padding: 16 },
  visitTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  visitTime: {
    fontFamily: fonts.mono.bold,
    fontSize: 26,
    letterSpacing: -0.52, // -.02em @ 26
    fontVariant: ['tabular-nums'],
  },
  visitDur: {
    fontFamily: fonts.mono.medium,
    fontSize: 9.5,
    letterSpacing: 1.14, // .12em @ 9.5
  },
  visitName: { marginTop: 12, fontFamily: fonts.sans.bold, fontSize: 15, lineHeight: 18 },
  visitAddr: { marginTop: 5, fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 17.5 },
  kindChip: {
    marginTop: 11,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  kindChipText: {
    fontFamily: fonts.mono.bold,
    fontSize: 9,
    letterSpacing: 0.9, // .1em @ 9
  },
  visitButtons: { marginTop: 13, flexDirection: 'row', gap: 8 },
  callBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  driveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  visitBtnText: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.66, // .06em @ 11
  },
  visitDrive: {
    marginTop: 9,
    fontFamily: fonts.mono.medium,
    fontSize: 9.5,
    letterSpacing: 0.95, // .1em @ 9.5
  },
  attentionCard: { marginTop: 20, marginHorizontal: 16, padding: 18 },
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
    fontSize: 9,
    letterSpacing: 0.9, // .1em @ 9
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
    fontSize: 9,
    letterSpacing: 1.08, // .12em @ 9
  },
  quoteRight: { alignItems: 'flex-end', gap: 7 },
  quoteValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusChipText: {
    fontFamily: fonts.mono.bold,
    fontSize: 8.5,
    letterSpacing: 0.85, // .1em @ 8.5
  },
  offlineFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  offlineText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 9.5,
    letterSpacing: 1.14, // .12em @ 9.5
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
