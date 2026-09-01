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
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

const CALENDAR_KEY = ['tenant', 'calendar'] as const;
const DEFAULT_TENANT_TZ = 'Australia/Sydney';

export function isSupportedTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

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

export const CalendarSchema = z.looseObject({
  events: z.array(CalendarEventSchema).default([]),
  toSchedule: z.array(CalendarEventSchema).default([]),
  awaitingBooking: z.array(CalendarEventSchema).default([]),
  reviewCount: z.number().nullish(),
  tenantTz: z.string().min(1).refine(isSupportedTimeZone, 'Unsupported tenant timezone'),
});

const ConfirmSchema = z.looseObject({ ok: z.literal(true) });

function eventTitle(ev: CalendarEvent): string {
  return ev.customerName ?? ev.address ?? 'Customer';
}

function eventMeta(ev: CalendarEvent): string {
  return [ev.jobType?.replace(/_/g, ' '), ev.suburb].filter(Boolean).join(' · ');
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find(item => item.type === type)?.value ?? '';
}

/** Tenant-local YYYY-MM-DD key. The instant remains UTC; only labels/grouping use the business zone. */
export function calendarDayKey(iso: string, tenantTz: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tenantTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  return `${part(parts, 'year')}-${part(parts, 'month')}-${part(parts, 'day')}`;
}

/** "MON 07/08" + "09:30 am" pieces in the server-returned tenant timezone. */
export function calendarSlotLabel(iso: string, tenantTz: string): { day: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tenantTz,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(iso));
  return {
    day: `${part(parts, 'weekday').toUpperCase()} ${part(parts, 'day')}/${part(parts, 'month')}`,
    time: `${part(parts, 'hour').padStart(2, '0')}:${part(parts, 'minute')} ${part(parts, 'dayPeriod').toLowerCase()}`,
  };
}

type CalendarDayGroup = { key: string; label: string; events: CalendarEvent[] };

function groupByTenantDay(
  events: CalendarEvent[],
  tenantTz: string,
  newestFirst = false,
): CalendarDayGroup[] {
  const groups = new Map<string, CalendarDayGroup>();
  for (const event of events) {
    const scheduledAt = event.scheduledAt as string;
    const key = calendarDayKey(scheduledAt, tenantTz);
    const group = groups.get(key) ?? {
      key,
      label: calendarSlotLabel(scheduledAt, tenantTz).day,
      events: [],
    };
    group.events.push(event);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    newestFirst ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key),
  );
}

function EventRow({ ev, timeLabel }: { ev: CalendarEvent; timeLabel: string }) {
  const { colors } = useTheme();
  const confirm = useApiMutation(
    (vars: { quoteId: string }) => `/api/tenant/calendar/${vars.quoteId}/confirm`,
    ConfirmSchema,
    { invalidates: [CALENDAR_KEY] },
  );
  // Web kindOf(): inspection → accent, requested/reserved → dim, else success.
  const statusColor =
    ev.needsInspection || ev.paidTier === 'inspection'
      ? colors.accent
      : ev.bookingState === 'requested' || ev.bookingState === 'reserved'
        ? colors.textDim
        : colors.successBright;
  const target = ev.href ?? (ev.shareToken ? `/q/${ev.shareToken}` : null);
  return (
    <View style={[styles.row, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${eventTitle(ev)}, ${timeLabel}`}
        disabled={!target}
        onPress={() => target && openWebPath(target)}
        style={({ pressed }) => [styles.rowMain, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.details}>
          <Text style={[styles.rowTitle, { color: colors.textPri }]} numberOfLines={2}>
            {eventTitle(ev)}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSec }]}>
            {eventMeta(ev) || 'Customer booking'}
          </Text>
        </View>
      </Pressable>
      <View style={[styles.rowFooter, { borderTopColor: colors.inkLine }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${timeLabel} for ${eventTitle(ev)}`}
          disabled={!target}
          onPress={() => target && openWebPath(target)}
          style={({ pressed }) => [styles.timeLink, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.time, { color: colors.textPri }]}>{timeLabel}</Text>
        </Pressable>
        {ev.bookingState === 'requested' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirm booking"
            disabled={confirm.isPending}
            onPress={() => confirm.mutate({ quoteId: ev.quoteId })}
            accessibilityState={{ disabled: confirm.isPending, busy: confirm.isPending }}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                borderColor: colors.ctlLine,
                backgroundColor: pressed ? colors.ink : 'transparent',
                opacity: confirm.isPending ? 0.6 : 1,
              },
            ]}
          >
            <Text style={[styles.confirmText, { color: colors.textPri }]}>
              {confirm.isPending ? 'CONFIRMING…' : 'CONFIRM'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {confirm.isError ? (
        <Text style={[styles.rowMeta, { color: colors.dangerBright }]}>
          {apiErrorMessage(confirm.error)}
        </Text>
      ) : null}
    </View>
  );
}

export function CalendarScreen() {
  const { colors } = useTheme();
  const [showPast, setShowPast] = useState(false);
  const query = useApiQuery(CALENDAR_KEY, '/api/tenant/calendar', CalendarSchema);
  const tenantTz = query.data?.tenantTz ?? DEFAULT_TENANT_TZ;

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
  const upcomingGroups = useMemo(() => groupByTenantDay(upcoming, tenantTz), [tenantTz, upcoming]);
  const pastGroups = useMemo(() => groupByTenantDay(past, tenantTz, true), [past, tenantTz]);

  return (
    <SectionScreen
      title="Calendar"
      subtitle="Booked jobs, site visits and deposits still waiting on a time."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <SectionLoading label="Loading your calendar" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load the calendar"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <Text
            accessibilityLabel={`Times shown in business timezone ${tenantTz}`}
            style={[styles.timeZone, { color: colors.textDim }]}
          >
            TIMES · {tenantTz}
          </Text>
          {toSchedule.length > 0 ? (
            <SectionGroup title="Paid · needs a time" count={toSchedule.length}>
              {toSchedule.map(ev => (
                <EventRow key={`ts-${ev.quoteId}`} ev={ev} timeLabel="SET TIME" />
              ))}
            </SectionGroup>
          ) : null}

          {awaiting.length > 0 ? (
            <SectionGroup title="Awaiting customer booking" count={awaiting.length}>
              {awaiting.map(ev => (
                <EventRow key={`aw-${ev.quoteId}`} ev={ev} timeLabel="$99" />
              ))}
            </SectionGroup>
          ) : null}

          <SectionGroup title="Upcoming" count={upcoming.length}>
            {upcoming.length === 0 ? (
              <SectionEmpty
                title="No upcoming bookings"
                body="Confirmed jobs and site visits will appear here."
              />
            ) : (
              upcomingGroups.map(group => (
                <View key={group.key} style={styles.dayGroup}>
                  <Text style={[styles.dayHeading, { color: colors.textSec }]}>{group.label}</Text>
                  {group.events.map(ev => {
                    const slot = calendarSlotLabel(ev.scheduledAt as string, tenantTz);
                    return (
                      <EventRow key={ev.quoteId} ev={ev} timeLabel={`${slot.day} · ${slot.time}`} />
                    );
                  })}
                </View>
              ))
            )}
          </SectionGroup>

          {past.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: showPast }}
              onPress={() => setShowPast(v => !v)}
              style={({ pressed }) => [
                styles.pastToggle,
                {
                  borderColor: colors.ctlLine,
                  backgroundColor: pressed ? colors.inkCard : 'transparent',
                },
              ]}
            >
              <Text style={[styles.confirmText, { color: colors.textSec }]}>
                {showPast ? 'HIDE' : 'SHOW'} PAST BOOKINGS · {past.length}
              </Text>
            </Pressable>
          ) : null}
          {showPast ? (
            <View style={{ gap: spacing.md }}>
              {pastGroups.map(group => (
                <View key={`past-${group.key}`} style={styles.dayGroup}>
                  <Text style={[styles.dayHeading, { color: colors.textSec }]}>{group.label}</Text>
                  {group.events.map(ev => {
                    const slot = calendarSlotLabel(ev.scheduledAt as string, tenantTz);
                    return (
                      <EventRow
                        key={`past-${ev.quoteId}`}
                        ev={ev}
                        timeLabel={`${slot.day} · ${slot.time}`}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  timeZone: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  dayGroup: { gap: spacing.md },
  dayHeading: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.6,
  },
  row: {
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: touch.listRow,
  },
  details: { flex: 1, minWidth: 0, gap: spacing.xs },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill, marginTop: spacing.sm },
  rowTitle: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  rowMeta: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  rowFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  time: {
    fontFamily: fonts.mono.bold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  timeLink: { minHeight: touch.minimum, maxWidth: '100%', justifyContent: 'center' },
  confirmBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
  },
  confirmText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  pastToggle: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
