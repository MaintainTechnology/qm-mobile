/**
 * Calendar — the web CalendarTab's agenda (not a month grid, web parity):
 * "Paid · needs a time" first, then site visits awaiting customer booking,
 * then the day-grouped agenda with Confirm on customer-requested slots.
 * GET /api/tenant/calendar; POST calendar/[quoteId]/confirm flips
 * booking_state requested → confirmed, optimistically here like the web.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { openWebPath } from '@/features/trades/hub/LinkOut';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

const CALENDAR_KEY = ['tenant', 'calendar'] as const;

const CalendarEventSchema = z.looseObject({
  quoteId: z.string(),
  shareToken: z.string().nullish(),
  scheduledAt: z.string().nullish(),
  bookingState: z.string().nullish(),
  paid: z.boolean().nullish(),
  paidTier: z.string().nullish(),
  needsInspection: z.boolean().nullish(),
  customerName: z.string().nullish(),
  jobType: z.string().nullish(),
  suburb: z.string().nullish(),
  address: z.string().nullish(),
  href: z.string().nullish(),
});
type CalendarEvent = z.infer<typeof CalendarEventSchema>;

const CalendarSchema = z.looseObject({
  events: z.array(CalendarEventSchema).default([]),
  toSchedule: z.array(CalendarEventSchema).default([]),
  awaitingBooking: z.array(CalendarEventSchema).default([]),
  reviewCount: z.number().nullish(),
});

const ConfirmSchema = z.looseObject({ ok: z.literal(true) });

function eventTitle(ev: CalendarEvent): string {
  return ev.customerName ?? ev.address ?? 'Customer';
}

function eventMeta(ev: CalendarEvent): string {
  return [ev.jobType?.replace(/_/g, ' '), ev.suburb].filter(Boolean).join(' · ');
}

/** "MON 07/08" + "09:30 am" pieces, device-local (au-conventions: day-first). */
function slotLabel(iso: string): { day: string; time: string } {
  const d = new Date(iso);
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;
  const day = `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const h24 = d.getHours();
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = `${String(h12).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
  return { day, time };
}

function EventRow({ ev, timeLabel }: { ev: CalendarEvent; timeLabel: string }) {
  const { colors } = useTheme();
  const confirm = useApiMutation(
    (vars: { quoteId: string }) => `/api/tenant/calendar/${vars.quoteId}/confirm`,
    ConfirmSchema,
    { invalidates: [CALENDAR_KEY] },
  );
  // Web kindOf(): inspection → accent, requested/reserved → dim, else success.
  const bar =
    ev.needsInspection || ev.paidTier === 'inspection'
      ? colors.accent
      : ev.bookingState === 'requested' || ev.bookingState === 'reserved'
        ? colors.textDim
        : colors.successBright;
  const target = ev.href ?? (ev.shareToken ? `/q/${ev.shareToken}` : null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eventTitle(ev)}, ${timeLabel}`}
      disabled={!target}
      onPress={() => target && openWebPath(target)}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: colors.inkLine,
          backgroundColor: pressed ? colors.ink : colors.inkCard,
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: bar }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]} numberOfLines={1}>
          {eventTitle(ev)}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textSec }]} numberOfLines={1}>
          {eventMeta(ev) || '—'}
        </Text>
        {confirm.isError ? (
          <Text style={[styles.rowMeta, { color: colors.dangerBright }]}>
            {apiErrorMessage(confirm.error)}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
        <Text style={[styles.time, { color: colors.textPri }]}>{timeLabel}</Text>
        {ev.bookingState === 'requested' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm booking"
            disabled={confirm.isPending}
            onPress={() => confirm.mutate({ quoteId: ev.quoteId })}
            style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
          >
            <Text style={[styles.confirmText, { color: colors.accentInk }]}>
              {confirm.isPending ? 'CONFIRMING…' : 'CONFIRM'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CalendarScreen() {
  const { colors } = useTheme();
  const [showPast, setShowPast] = useState(false);
  const query = useApiQuery(CALENDAR_KEY, '/api/tenant/calendar', CalendarSchema);

  const { upcoming, past } = useMemo(() => {
    const events = (query.data?.events ?? []).filter(e => e.scheduledAt);
    const now = Date.now();
    const up: CalendarEvent[] = [];
    const gone: CalendarEvent[] = [];
    for (const e of events)
      (new Date(e.scheduledAt as string).getTime() >= now ? up : gone).push(e);
    gone.reverse();
    return { upcoming: up, past: gone };
  }, [query.data]);

  const toSchedule = query.data?.toSchedule ?? [];
  const awaiting = query.data?.awaitingBooking ?? [];

  return (
    <SectionScreen
      title="Calendar"
      subtitle="Booked jobs, site visits and deposits still waiting on a time."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <Notice tone="accent" label="Loading your calendar…" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load the calendar"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {toSchedule.length > 0 ? (
            <>
              <Text style={[styles.groupLabel, { color: colors.warningBright }]}>
                PAID · NEEDS A TIME · {toSchedule.length}
              </Text>
              {toSchedule.map(ev => (
                <EventRow key={`ts-${ev.quoteId}`} ev={ev} timeLabel="SET TIME" />
              ))}
            </>
          ) : null}

          {awaiting.length > 0 ? (
            <>
              <Text style={[styles.groupLabel, { color: colors.textDim }]}>
                SITE VISITS · AWAITING CUSTOMER BOOKING · {awaiting.length}
              </Text>
              {awaiting.map(ev => (
                <EventRow key={`aw-${ev.quoteId}`} ev={ev} timeLabel="$99" />
              ))}
            </>
          ) : null}

          <Text style={[styles.groupLabel, { color: colors.textDim }]}>
            UPCOMING · {upcoming.length}
          </Text>
          {upcoming.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textDim }]}>
              Nothing booked yet — confirmed jobs and site visits land here.
            </Text>
          ) : (
            upcoming.map(ev => {
              const slot = slotLabel(ev.scheduledAt as string);
              return <EventRow key={ev.quoteId} ev={ev} timeLabel={`${slot.day} · ${slot.time}`} />;
            })
          )}

          {past.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowPast(v => !v)}
              style={styles.pastToggle}
            >
              <Text style={[styles.groupLabel, { color: colors.textDim }]}>
                PAST · {past.length} {showPast ? '▾' : '▸'}
              </Text>
            </Pressable>
          ) : null}
          {showPast
            ? past.map(ev => {
                const slot = slotLabel(ev.scheduledAt as string);
                return (
                  <View key={`past-${ev.quoteId}`} style={{ opacity: 0.6 }}>
                    <EventRow ev={ev} timeLabel={`${slot.day} · ${slot.time}`} />
                  </View>
                );
              })
            : null}
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
    marginTop: spacing.sm,
  },
  empty: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    overflow: 'hidden',
  },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2 },
  rowTitle: { fontFamily: fonts.sans.bold, fontSize: 14.5 },
  rowMeta: { marginTop: 2, fontFamily: fonts.sans.regular, fontSize: 12.5 },
  time: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  confirmBtn: {
    minHeight: touch.minimum - 16,
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  confirmText: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
  pastToggle: { minHeight: touch.minimum, justifyContent: 'center' },
});
