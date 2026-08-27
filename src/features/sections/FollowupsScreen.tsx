/**
 * Follow-ups — the web FollowupsTab (page.tsx:13898-14606) at mobile scope:
 * the same GET /api/tenant/followups list split "To chase" / "Contacted", the
 * same search fields, and the three actions a tradie on site actually uses —
 * Call (bridge call via POST followups/call), Text (POST followups/text) and
 * mark-contacted/reopen (POST followups). The web's paginated table, log-touch
 * outcome radios and inline thread expander stay web-side this round; Messages
 * history lives one tab away in Chats.
 *
 * Money on this wire is DOLLARS inc GST (web parity) → cents only at render.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

const FOLLOWUPS_KEY = ['tenant', 'followups'] as const;

const FollowupItemSchema = z.looseObject({
  kind: z.enum(['quote', 'lead']),
  quote_id: z.string().nullish(),
  conversation_id: z.string().nullish(),
  share_token: z.string().nullish(),
  followup_reason: z.string().nullish(),
  last_activity: z.string().nullish(),
  age_hours: z.number().nullish(),
  total_inc_gst: z.number().nullish(),
  selected_tier: z.string().nullish(),
  job_type: z.string().nullish(),
  needs_inspection: z.boolean().nullish(),
  followed_up_at: z.string().nullish(),
  followup_note: z.string().nullish(),
  customer: z
    .looseObject({
      first_name: z.string().nullish(),
      full_name: z.string().nullish(),
      phone: z.string().nullish(),
      suburb: z.string().nullish(),
    })
    .nullish(),
});
type FollowupItem = z.infer<typeof FollowupItemSchema>;

const FollowupsSchema = z.looseObject({
  followups: z.array(FollowupItemSchema).default([]),
});

const ActionOkSchema = z.looseObject({ ok: z.literal(true) });

function itemName(item: FollowupItem): string {
  return item.customer?.full_name ?? item.customer?.first_name ?? 'Customer';
}

/** ≥6 digits — the web's own enough-of-a-phone-number gate for Call/Text. */
function hasPhone(item: FollowupItem): boolean {
  return ((item.customer?.phone ?? '').replace(/\D/g, '').length ?? 0) >= 6;
}

function ageLabel(hours: number | null | undefined): string {
  if (hours == null) return '';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function FollowupRow({ item }: { item: FollowupItem }) {
  const { colors } = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [composing, setComposing] = useState(false);

  const idBody = item.quote_id
    ? { quoteId: item.quote_id }
    : { conversationId: item.conversation_id ?? '' };

  const call = useApiMutation('/api/tenant/followups/call', ActionOkSchema, {
    timeoutMs: 30000,
    onSuccess: () => setNote('Calling — answer your phone and we bridge the customer in.'),
    onError: err => setNote(apiErrorMessage(err)),
  });
  const send = useApiMutation('/api/tenant/followups/text', ActionOkSchema, {
    timeoutMs: 30000,
    invalidates: [FOLLOWUPS_KEY],
    onSuccess: () => {
      setNote('Text sent ✓');
      setComposing(false);
      setText('');
    },
    onError: err => setNote(apiErrorMessage(err)),
  });
  const mark = useApiMutation('/api/tenant/followups', ActionOkSchema, {
    invalidates: [FOLLOWUPS_KEY],
    onError: err => setNote(apiErrorMessage(err)),
  });

  const contacted = item.followed_up_at != null;
  const amount =
    item.total_inc_gst == null ? null : formatAud(centsFromApiDollars(item.total_inc_gst));
  const phoneOk = hasPhone(item);
  const busy = call.isPending || send.isPending || mark.isPending;

  return (
    <View style={[styles.row, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={styles.rowTop}>
        <Text style={[styles.name, { color: colors.textPri }]} numberOfLines={1}>
          {itemName(item)}
        </Text>
        <Text style={[styles.age, { color: colors.textDim }]}>{ageLabel(item.age_hours)}</Text>
      </View>
      <Text
        style={[styles.reason, { color: contacted ? colors.successBright : colors.warningBright }]}
      >
        {(item.followup_reason ?? 'Needs a follow-up').toUpperCase()}
      </Text>
      <Text style={[styles.meta, { color: colors.textSec }]} numberOfLines={2}>
        {item.kind === 'lead'
          ? 'SMS enquiry, no quote yet'
          : [
              item.job_type?.replace(/_/g, ' '),
              item.customer?.suburb,
              amount && `${amount} inc GST`,
            ]
              .filter(Boolean)
              .join(' · ')}
        {item.needs_inspection ? ' · Inspection' : ''}
      </Text>

      <View style={styles.actions}>
        <ActionBtn
          label={call.isPending ? 'Calling…' : 'Call'}
          disabled={!phoneOk || busy}
          primary
          onPress={() => {
            setNote(null);
            call.mutate(idBody);
          }}
        />
        <ActionBtn
          label="Text"
          disabled={!phoneOk || busy}
          onPress={() => {
            setNote(null);
            setComposing(v => !v);
          }}
        />
        {item.quote_id ? (
          <ActionBtn
            label={contacted ? 'Reopen' : 'Mark contacted'}
            disabled={busy}
            onPress={() => {
              setNote(null);
              mark.mutate({
                quoteId: item.quote_id,
                action: contacted ? 'reopen' : 'mark_contacted',
              });
            }}
          />
        ) : null}
      </View>

      {composing ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            value={text}
            onChangeText={v => setText(v.slice(0, 640))}
            placeholder="Message the customer…"
            placeholderTextColor={colors.textDim}
            multiline
            accessibilityLabel="Follow-up message"
            style={[
              styles.composer,
              { borderColor: colors.ctlLine, backgroundColor: colors.ink, color: colors.textPri },
            ]}
          />
          <ActionBtn
            label={send.isPending ? 'Sending…' : `Send (${text.length}/640)`}
            disabled={text.trim().length === 0 || send.isPending}
            primary
            onPress={() => send.mutate({ ...idBody, text: text.trim() })}
          />
        </View>
      ) : null}

      {note ? <Text style={[styles.note, { color: colors.textSec }]}>{note}</Text> : null}
    </View>
  );
}

function ActionBtn({
  label,
  onPress,
  disabled = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          opacity: disabled ? 0.45 : 1,
          borderColor: primary ? colors.accent : colors.ctlLine,
          backgroundColor: primary
            ? pressed
              ? colors.accentPress
              : colors.accent
            : pressed
              ? colors.ink
              : 'transparent',
        },
      ]}
    >
      <Text
        style={[styles.actionText, { color: primary ? colors.accentInk : colors.textPri }]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function FollowupsScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const query = useApiQuery(
    FOLLOWUPS_KEY,
    '/api/tenant/followups?includeActioned=1&minAgeHours=0',
    FollowupsSchema,
  );

  const items = useMemo(() => {
    const all = query.data?.followups ?? [];
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return all;
    return all.filter(item => {
      const hay = [
        item.customer?.full_name,
        item.customer?.first_name,
        item.customer?.suburb,
        item.customer?.phone,
        item.job_type,
        item.share_token,
      ]
        .filter((v): v is string => typeof v === 'string')
        .join(' ')
        .toLowerCase();
      return terms.every(t => hay.includes(t));
    });
  }, [query.data, search]);

  const toChase = items.filter(i => i.followed_up_at == null);
  const contacted = items.filter(i => i.followed_up_at != null);

  return (
    <SectionScreen
      title="Follow-ups"
      subtitle="Quotes and enquiries that went quiet, oldest first — chase them before they go cold."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <Notice tone="accent" label="Loading follow-ups…" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load follow-ups"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, suburb, phone, code…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search follow-ups"
            style={[
              styles.search,
              {
                borderColor: colors.ctlLine,
                backgroundColor: colors.inkCard,
                color: colors.textPri,
              },
            ]}
          />
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>
            TO CHASE · {toChase.length}
          </Text>
          {toChase.length === 0 ? (
            <Text style={[styles.empty, { color: colors.textDim }]}>
              Nothing to chase — every live quote has been followed up.
            </Text>
          ) : (
            toChase.map(item => (
              <FollowupRow
                key={item.quote_id ?? item.conversation_id ?? itemName(item)}
                item={item}
              />
            ))
          )}
          {contacted.length > 0 ? (
            <>
              <Text style={[styles.groupLabel, { color: colors.textDim }]}>
                CONTACTED · {contacted.length} — STILL NO PAYMENT
              </Text>
              {contacted.map(item => (
                <FollowupRow
                  key={item.quote_id ?? item.conversation_id ?? itemName(item)}
                  item={item}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.regular,
    fontSize: 12,
  },
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
    marginTop: spacing.sm,
  },
  empty: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 19 },
  row: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  name: { flex: 1, fontFamily: fonts.sans.bold, fontSize: 15 },
  age: { fontFamily: fonts.mono.medium, fontSize: 11 },
  reason: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  meta: { fontFamily: fonts.sans.regular, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  actionText: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
  composer: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  note: { fontFamily: fonts.sans.medium, fontSize: 12.5 },
});
