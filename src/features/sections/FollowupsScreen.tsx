/**
 * Follow-ups — the web FollowupsTab (page.tsx:13898-14606) at mobile scope:
 * the same GET /api/tenant/followups list split "To chase" / "Contacted", the
 * same search fields, and the same actions — Call (bridge call via POST
 * followups/call), Text (POST followups/text), reopen (POST followups) and
 * mark-contacted, which is the web's "Log touch": the same outcome radios
 * POSTed to followups/events (the server sets followed_up_at in the same
 * write). The web paginates the fetched list client-side in pages of 10
 * (lib/dashboard/pagination PAGE_SIZE — the GET takes no paging params);
 * mobile idiom is a Load-more window over the same ordered to-chase-then-
 * contacted list. Each row expands into the same lazy messages thread
 * (FollowupThread, GET followups/messages).
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

import { Notice, PillGroup } from '../trades/ui';
import { FollowupThread } from './FollowupThread';
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

const FOLLOWUPS_KEY = ['tenant', 'followups'] as const;

/** Web parity: lib/dashboard/pagination PAGE_SIZE — pages of 10, sliced client-side. */
const PAGE_SIZE = 10;

/** The web's log-touch outcome radios (page.tsx NOTE_OUTCOMES), values verbatim. */
const NOTE_OUTCOMES = [
  ['spoke', 'Spoke with customer'],
  ['left_voicemail', 'Left voicemail'],
  ['no_answer', 'No answer'],
  ['wants_callback', 'Wants callback'],
  ['not_interested', 'Not interested'],
  ['other', 'Other'],
] as const;

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
  // Log-touch form (the web's mark-contacted path): outcome radio + optional note.
  const [logging, setLogging] = useState(false);
  const [outcome, setOutcome] = useState('spoke');
  const [logNote, setLogNote] = useState('');
  const [threadOpen, setThreadOpen] = useState(false);

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
  const reopen = useApiMutation('/api/tenant/followups', ActionOkSchema, {
    invalidates: [FOLLOWUPS_KEY],
    onError: err => setNote(apiErrorMessage(err)),
  });
  // POST followups/events {quoteId, kind:'note', outcome, note?} — the server
  // also sets followed_up_at, so the row moves to Contacted on the refetch.
  const logTouch = useApiMutation('/api/tenant/followups/events', ActionOkSchema, {
    invalidates: [FOLLOWUPS_KEY],
    onSuccess: () => {
      setNote('Touch logged ✓');
      setLogging(false);
      setLogNote('');
    },
    onError: err => setNote(apiErrorMessage(err)),
  });

  const contacted = item.followed_up_at != null;
  const amount =
    item.total_inc_gst == null ? null : formatAud(centsFromApiDollars(item.total_inc_gst));
  const phoneOk = hasPhone(item);
  const busy = call.isPending || send.isPending || reopen.isPending || logTouch.isPending;

  return (
    <View style={[styles.row, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={styles.rowTop}>
        <Text style={[styles.name, { color: colors.textPri }]} numberOfLines={2}>
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
          : [item.job_type?.replace(/_/g, ' '), item.customer?.suburb].filter(Boolean).join(' · ')}
        {item.needs_inspection ? ' · Inspection' : ''}
      </Text>
      {item.kind === 'quote' && amount ? (
        <Text style={[styles.amount, { color: colors.textPri }]}>{amount} inc GST</Text>
      ) : null}

      <View style={[styles.actions, { borderTopColor: colors.inkLine }]}>
        <View style={styles.actionPair}>
          <ActionBtn
            label={call.isPending ? 'Calling…' : 'Call'}
            disabled={!phoneOk || busy}
            inline
            onPress={() => {
              setNote(null);
              call.mutate(idBody);
            }}
          />
          <ActionBtn
            label="Text"
            inline
            disabled={!phoneOk || busy}
            onPress={() => {
              setNote(null);
              setComposing(v => !v);
            }}
          />
        </View>
        <View style={styles.actionPair}>
          <ActionBtn
            label={threadOpen ? 'Hide messages' : 'Messages'}
            inline
            onPress={() => setThreadOpen(v => !v)}
          />
          {item.quote_id ? (
            contacted ? (
              <ActionBtn
                label={reopen.isPending ? 'Saving…' : 'Reopen'}
                inline
                disabled={busy}
                onPress={() => {
                  setNote(null);
                  reopen.mutate({ quoteId: item.quote_id, action: 'reopen' });
                }}
              />
            ) : (
              <ActionBtn
                label={logging ? 'Cancel' : 'Mark contacted'}
                inline
                disabled={busy}
                onPress={() => {
                  setNote(null);
                  setLogging(v => !v);
                }}
              />
            )
          ) : null}
        </View>
      </View>

      {logging && item.quote_id ? (
        <View style={[styles.inlineForm, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.formLabel, { color: colors.textDim }]}>
            LOG TOUCH · WHAT HAPPENED?
          </Text>
          <PillGroup options={NOTE_OUTCOMES} value={outcome} onChange={setOutcome} />
          <TextInput
            value={logNote}
            onChangeText={v => setLogNote(v.slice(0, 500))}
            placeholder="Optional note, e.g. call back after 3pm"
            placeholderTextColor={colors.textDim}
            multiline
            accessibilityLabel="Touch note"
            style={[
              styles.logNote,
              { borderColor: colors.ctlLine, backgroundColor: colors.ink, color: colors.textPri },
            ]}
          />
          <ActionBtn
            label={logTouch.isPending ? 'Saving…' : 'Save touch'}
            disabled={logTouch.isPending}
            primary
            onPress={() =>
              logTouch.mutate({
                quoteId: item.quote_id,
                kind: 'note',
                outcome,
                note: logNote.trim() || undefined,
              })
            }
          />
        </View>
      ) : null}

      {threadOpen ? (
        <FollowupThread quoteId={item.quote_id} conversationId={item.conversation_id} />
      ) : null}

      {composing ? (
        <View style={[styles.inlineForm, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.formLabel, { color: colors.textDim }]}>MESSAGE</Text>
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
  inline = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  inline?: boolean;
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
        inline && styles.inlineAction,
        primary && styles.primaryAction,
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
      <Text style={[styles.actionText, { color: primary ? colors.accentInk : colors.textPri }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function FollowupsScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  // Load-more window over the ordered list (the GET has no paging params —
  // web slices the same fetched array into pages of 10).
  const [visible, setVisible] = useState(PAGE_SIZE);
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
  // Web parity ordering: the whole to-chase queue first, then contacted.
  // The window slices that combined list, so Contacted only paints once
  // Load more has walked past the chase queue (same as web page order).
  const ordered = [...toChase, ...contacted];
  const shown = ordered.slice(0, visible);
  const shownChase = shown.filter(i => i.followed_up_at == null);
  const shownDone = shown.filter(i => i.followed_up_at != null);

  return (
    <SectionScreen
      title="Follow-ups"
      subtitle="Pick up quiet quotes and enquiries, with the oldest first."
      refreshing={query.isFetching}
      onRefresh={() => {
        setVisible(PAGE_SIZE);
        void query.refetch();
      }}
    >
      {query.isPending ? (
        <SectionLoading label="Loading follow-ups" />
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
            onChangeText={v => {
              setSearch(v);
              setVisible(PAGE_SIZE); // narrowing the list restarts the window (web resets to page 1)
            }}
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
          <SectionGroup title="To chase" count={toChase.length}>
            {toChase.length === 0 ? (
              <SectionEmpty
                title={search.trim() ? 'No matching follow-ups' : 'You’re up to date'}
                body={
                  search.trim()
                    ? 'Try a different name, suburb or phone number.'
                    : 'Every live quote has been followed up.'
                }
              />
            ) : (
              shownChase.map(item => (
                <FollowupRow
                  key={item.quote_id ?? item.conversation_id ?? itemName(item)}
                  item={item}
                />
              ))
            )}
          </SectionGroup>
          {shownDone.length > 0 ? (
            <SectionGroup title="Contacted · awaiting payment" count={contacted.length}>
              {shownDone.map(item => (
                <FollowupRow
                  key={item.quote_id ?? item.conversation_id ?? itemName(item)}
                  item={item}
                />
              ))}
            </SectionGroup>
          ) : null}
          {ordered.length > shown.length ? (
            <ActionBtn
              label={`Load more (${shown.length} of ${ordered.length})`}
              onPress={() => setVisible(v => v + PAGE_SIZE)}
            />
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
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  name: { flex: 1, minWidth: 0, fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  age: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  reason: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.5 },
  meta: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  amount: {
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  actions: { gap: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1 },
  actionPair: { flexDirection: 'row', gap: spacing.sm },
  inlineAction: { flex: 1, minWidth: 0 },
  primaryAction: { minHeight: touch.primaryCta },
  inlineForm: { gap: spacing.md, borderTopWidth: 1, paddingTop: spacing.lg },
  actionBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  actionText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  composer: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  note: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  formLabel: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
  logNote: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
});
