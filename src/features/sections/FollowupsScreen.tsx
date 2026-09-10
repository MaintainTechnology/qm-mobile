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
 * Amounts arrive in dollars. Tax wording requires proven quote-specific authority.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/expo';
import { usePreventRemove } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';
import { useTenantMe } from '@/lib/tenant';

import { Notice, PillGroup } from '../trades/ui';
import { FollowupThread } from './FollowupThread';
import { FollowupHistory } from './FollowupHistory';
import { CalendarSchema } from './CalendarScreen';
import { QuoteWorkspace } from '../quotes/QuoteWorkspace';
import {
  FOLLOWUPS_KEY,
  NOTE_OUTCOMES,
  FollowupsSchema,
  chaseableFollowups,
  filterFollowups,
  followupCategories,
  followupEventsKey,
  followupKey,
  followupTarget,
  suggestedFollowupText,
  type FollowupDraft,
  type FollowupItem,
} from './followups';
import { useFollowupDrafts } from './use-followup-drafts';
import { useFollowupActions } from './use-followup-actions';
import { followupOperationFinished, followupOperationMatches, type FollowupOperationInput } from './followup-operation';
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

/** Web parity: lib/dashboard/pagination PAGE_SIZE — pages of 10, sliced client-side. */
const PAGE_SIZE = 10;

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

function FollowupRow({
  item,
  draft,
  updateDraft,
  prepareDraft,
  draftReady,
  actionsReady,
  tenantId,
  onOpenQuote,
}: {
  item: FollowupItem;
  draft: FollowupDraft;
  updateDraft: (patch: Partial<FollowupDraft>) => void;
  prepareDraft: () => void;
  draftReady: boolean;
  actionsReady: boolean;
  tenantId: string;
  onOpenQuote: (id: string) => void;
}) {
  useEffect(() => { prepareDraft(); }, [prepareDraft]);
  const { colors } = useTheme();
  const [note, setNote] = useState<string | null>(null);
  const text = draft.text ?? '';
  const [composing, setComposing] = useState(false);
  // Log-touch form (the web's mark-contacted path): outcome radio + optional note.
  const [logging, setLogging] = useState(false);
  const { outcome, logNote } = draft;
  const [threadOpen, setThreadOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [completionSeen, setCompletionSeen] = useState<Partial<Record<'text' | 'call' | 'note', string>>>({});

  const idBody = followupTarget(item);
  const quoteId = item.kind === 'quote' ? item.quote_id : null;
  const invalidates = [FOLLOWUPS_KEY, ...(quoteId ? [followupEventsKey(quoteId)] : [])];
  const operations = useFollowupActions(tenantId, {
    kind: item.kind === 'quote' ? 'quote' : 'conversation',
    id: (item.kind === 'quote' ? item.quote_id : item.conversation_id)!,
  });
  const reopen = useApiMutation('/api/tenant/followups', ActionOkSchema, {
    invalidates,
    onError: err => setNote(apiErrorMessage(err)),
  });
  const contacted = item.followed_up_at != null;
  const inputFor = (action: 'text' | 'call' | 'note'): FollowupOperationInput =>
    action === 'note'
      ? { action, kind: 'note', outcome, note: logNote.trim() || undefined, preserveChase: contacted }
      : action === 'text'
        ? { action, text: text.trim(), expectedRecipient: item.customer?.phone ?? '' }
        : { action, expectedRecipient: item.customer?.phone ?? '' };
  const latestInput = useRef(inputFor);
  latestInput.current = inputFor;
  const completionContext = useRef({ updateDraft, item, quoteId });
  completionContext.current = { updateDraft, item, quoteId };
  const receipts = useMemo(() => ({ text: operations.text.receipt, call: operations.call.receipt, note: operations.note.receipt }),
    [operations.text.receipt, operations.call.receipt, operations.note.receipt]);
  const completionPending = (action: 'text' | 'call' | 'note') => {
    const receipt = receipts[action];
    return !!receipt && followupOperationFinished(receipt) && completionSeen[action] !== receipt.requestId;
  };
  useEffect(() => {
    if (!draftReady) return;
    let cancelled = false;
    for (const action of ['text', 'call', 'note'] as const) {
      const receipt = receipts[action];
      if (!receipt || !followupOperationFinished(receipt) || completionSeen[action] === receipt.requestId) continue;
      void (async () => {
        const captured = latestInput.current(action);
        const context = completionContext.current;
        const target = { kind: context.item.kind === 'quote' ? 'quote' as const : 'conversation' as const,
          id: (context.quoteId ?? context.item.conversation_id)! };
        let matches = false;
        // No recoverable working copy is also a valid state. Never invent its
        // original text, or discard a newer draft because an older send completed.
        try { matches = await followupOperationMatches(target, captured, receipt); } catch { /* Empty or newer input stays intact. */ }
        if (cancelled) return;
        if (receipt.status !== 'failed' && matches && JSON.stringify(latestInput.current(action)) === JSON.stringify(captured)) {
          if (action === 'text' && receipt.accepted) { completionContext.current.updateDraft({ text: null }); setComposing(false); }
          if (action === 'note' && receipt.status === 'complete') { completionContext.current.updateDraft({ logNote: '' }); setLogging(false); setHistoryOpen(true); }
        }
        setNote(receipt.status === 'failed' ? `The previous ${action} request failed. Its working copy has been kept.`
          : action === 'note' ? 'The previous touch is already logged.' : `The provider accepted the previous ${action} request.`);
        setCompletionSeen(previous => ({ ...previous, [action]: receipt.requestId }));
      })();
    }
    return () => { cancelled = true; };
  }, [draftReady, receipts, completionSeen]);
  const unresolved = (action: 'text' | 'call' | 'note') => {
    const receipt = operations[action].receipt;
    return !!receipt && !followupOperationFinished(receipt);
  };
  const perform = async (action: 'text' | 'call' | 'note', retry = false) => {
    setNote(null);
    try {
      const receipt = await operations.run(inputFor(action), retry ? 'retry' : 'start');
      if (!followupOperationFinished(receipt)) {
        setNote(receipt.accepted ? 'The provider accepted this request. Contact history still needs confirmation.' : 'The outcome is not confirmed. Check status before another request.');
        return;
      }
      if (receipt.status === 'failed') { setNote('This request failed. Review the details before trying again.'); return; }
      if (action === 'text' && receipt.accepted) {
        setNote('Text accepted by the provider.'); setComposing(false); updateDraft({ text: null });
      } else if (action === 'call' && receipt.accepted) {
        setNote('Call requested — answer your phone to connect with the customer.');
      } else if (action === 'note' && receipt.status === 'complete') {
        setNote('Touch logged.'); setLogging(false); updateDraft({ logNote: '' }); setHistoryOpen(true);
      }
    } catch (error) { setNote(apiErrorMessage(error)); }
  };
  const checkStatus = async (action: 'text' | 'call' | 'note') => {
    const captured = inputFor(action);
    const receipt = await operations.refresh(action);
    if (!receipt || !followupOperationFinished(receipt)) return;
    if (receipt.status === 'failed') { setNote('The previous request failed. Its draft has been kept.'); return; }
    setNote(action === 'note' ? 'The previous touch is already logged.' : `The provider accepted the previous ${action} request.`);
    const target = { kind: item.kind === 'quote' ? 'quote' as const : 'conversation' as const, id: (quoteId ?? item.conversation_id)! };
    // A successful readback clears only the exact working input used by that
    // operation. Newer text or notes stay intact.
    if (await followupOperationMatches(target, captured, receipt) && JSON.stringify(latestInput.current(action)) === JSON.stringify(captured)) {
      if (action === 'text' && receipt.accepted) { updateDraft({ text: null }); setComposing(false); }
      if (action === 'note' && receipt.status === 'complete') { updateDraft({ logNote: '' }); setLogging(false); setHistoryOpen(true); }
    }
  };
  const amount =
    item.total_inc_gst == null ? null : formatAud(centsFromApiDollars(item.total_inc_gst));
  const phoneOk = hasPhone(item) && !!idBody;
  const busy = operations.busy || reopen.isPending;
  const mutationBlocked = busy || !actionsReady;

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
        <Text style={[styles.amount, { color: colors.textPri }]}>Quote total: {amount}</Text>
      ) : null}
      {item.kind === 'quote' && item.share_token ? (
        <Text style={[styles.meta, { color: colors.textSec }]}>Quote code: {item.share_token}</Text>
      ) : null}

      <View style={[styles.actions, { borderTopColor: colors.inkLine }]}>
        <View style={styles.actionPair}>
          <ActionBtn
            label={operations.call.busy ? 'Calling…' : 'Call'}
            disabled={!phoneOk || mutationBlocked || operations.call.loading || !!operations.call.error || unresolved('call') || completionPending('call')}
            inline
            onPress={() => {
              setNote(null);
              if (idBody) void perform('call');
            }}
          />
          <ActionBtn
            label="Text"
            inline
            disabled={!phoneOk || busy || !draftReady}
            onPress={() => {
              setNote(null);
              if (!composing && draft.text === null)
                updateDraft({ text: suggestedFollowupText(item) });
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
          {quoteId && contacted ? (
            <ActionBtn
              label={reopen.isPending ? 'Saving…' : 'Reopen'}
              inline
              disabled={mutationBlocked}
              onPress={() => {
                setNote(null);
                reopen.mutate({ quoteId, action: 'reopen' });
              }}
            />
          ) : null}
          {quoteId ? (
            <ActionBtn
              label={logging ? 'Cancel log' : contacted ? 'Log another touch' : 'Log touch'}
              inline
              disabled={busy || !draftReady}
              onPress={() => {
                setNote(null);
                setLogging(v => !v);
              }}
            />
          ) : null}
        </View>
        {quoteId ? (
          <View style={styles.actionPair}>
            <ActionBtn
              label="Open quote"
              inline
              disabled={mutationBlocked}
              onPress={() => onOpenQuote(quoteId)}
            />
            <ActionBtn
              label={historyOpen ? 'Hide history' : 'Contact history'}
              inline
              onPress={() => setHistoryOpen(v => !v)}
            />
          </View>
        ) : null}
      </View>

      {logging && quoteId ? (
        <View style={[styles.inlineForm, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.formLabel, { color: colors.textDim }]}>
            LOG TOUCH · WHAT HAPPENED?
          </Text>
          <PillGroup
            options={NOTE_OUTCOMES}
            value={outcome}
            onChange={outcome => {
              const selected = NOTE_OUTCOMES.find(([key]) => key === outcome);
              if (selected && !busy) updateDraft({ outcome: selected[0] });
            }}
          />
          <TextInput
            value={logNote}
            onChangeText={v => updateDraft({ logNote: v.slice(0, 500) })}
            editable={!busy}
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
            label={operations.note.busy ? 'Saving…' : 'Save touch'}
            disabled={mutationBlocked || operations.note.loading || !!operations.note.error || unresolved('note') || completionPending('note')}
            primary
            onPress={() => void perform('note')}
          />
        </View>
      ) : null}

      {threadOpen ? (
        <FollowupThread
          quoteId={quoteId}
          conversationId={item.kind === 'lead' ? item.conversation_id : null}
        />
      ) : null}
      {historyOpen && quoteId ? <FollowupHistory quoteId={quoteId} /> : null}

      {composing ? (
        <View style={[styles.inlineForm, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.formLabel, { color: colors.textDim }]}>MESSAGE</Text>
          <TextInput
            value={text}
            onChangeText={v => updateDraft({ text: v.slice(0, 640) })}
            editable={!busy}
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
            label={operations.text.busy ? 'Sending…' : `Send (${text.length}/640)`}
            disabled={text.trim().length === 0 || mutationBlocked || !idBody || operations.text.loading || !!operations.text.error || unresolved('text') || completionPending('text')}
            primary
            onPress={() => { if (idBody) void perform('text'); }}
          />
        </View>
      ) : null}

      {(['text', 'call', ...(quoteId ? ['note'] : [])] as ('text' | 'call' | 'note')[]).map(action => {
        const state = operations[action];
        if (!state.error && !unresolved(action)) return null;
        return <View key={action} style={styles.inlineForm}>
          <Text style={[styles.note, { color: colors.textSec }]}>{state.error ? apiErrorMessage(state.error) : `The previous ${action} outcome needs confirmation. Restore the original text or note to retry the same request; a new request remains blocked.`}</Text>
          <ActionBtn label={`Check ${action} status`} disabled={busy || state.loading} onPress={() => void checkStatus(action).catch(error => setNote(apiErrorMessage(error)))} />
          {state.receipt && unresolved(action) ? <ActionBtn label={`Retry same ${action} request`} disabled={mutationBlocked || !draftReady || state.loading} onPress={() => void perform(action, true)} /> : null}
        </View>;
      })}
      {draftReady && (draft.text !== null || draft.logNote || draft.outcome !== 'spoke') ? (
        <ActionBtn label="Discard local follow-up edits" disabled={busy || unresolved('text') || unresolved('note')}
          onPress={() => Alert.alert('Discard local edits?', 'This removes the unsent message, touch note and selected outcome from this device. It does not remove sent messages or logged history.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Discard local edits', style: 'destructive', onPress: () => updateDraft({ text: null, logNote: '', outcome: 'spoke' }) },
          ])} />
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
  const { userId, sessionId } = useAuth();
  const tenant = useTenantMe();
  if (!userId || !tenant.data?.tenant.id || tenant.isError) return (
    <SectionScreen title="Follow-ups">
      {tenant.isError ? <Notice tone="danger" label="Account unavailable" body={apiErrorMessage(tenant.error)} onRetry={() => void tenant.refetch()} />
        : <SectionLoading label="Loading account" />}
    </SectionScreen>
  );
  return <FollowupsBody key={`${userId}:${sessionId}:${tenant.data.tenant.id}`} userId={userId} tenantId={tenant.data.tenant.id} />;
}

function FollowupsBody({ userId, tenantId }: { userId: string; tenantId: string }) {
  const { colors } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const drafts = useFollowupDrafts({ userId, tenantId });
  usePreventRemove(drafts.unsaved, () => {
    Alert.alert('Keep your follow-up edits', 'Your latest edits are not yet saved on this device. Stay here until saving finishes, or retry if storage failed.', [
      { text: 'Stay here', style: 'cancel' },
      { text: 'Retry saving', onPress: drafts.retry },
    ]);
  });
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  // Load-more window over the ordered list (the GET has no paging params —
  // web slices the same fetched array into pages of 10).
  const [visible, setVisible] = useState(PAGE_SIZE);
  const query = useApiQuery(
    FOLLOWUPS_KEY,
    '/api/tenant/followups?includeActioned=1&minAgeHours=0',
    FollowupsSchema,
  );

  const calendar = useApiQuery(['tenant', 'calendar'], '/api/tenant/calendar', CalendarSchema);
  const all = useMemo(() => chaseableFollowups(query.data?.followups ?? []), [query.data]);
  const categories = useMemo(() => followupCategories(all), [all]);
  const effectiveCategory = categories.some(([key]) => key === category) ? category : 'all';
  const items = useMemo(
    () => filterFollowups(all, effectiveCategory, search),
    [all, effectiveCategory, search],
  );
  const row = (item: FollowupItem) => {
    const key = followupKey(item);
    return (
      <FollowupRow
        key={key}
        item={item}
        draft={drafts.state(item).value}
        draftReady={drafts.state(item).ready}
        prepareDraft={() => drafts.ensure(item)}
        updateDraft={patch => drafts.update(item, patch)}
        actionsReady={!query.isError && !drafts.unsaved && !drafts.error}
        tenantId={tenantId}
        onOpenQuote={setOpenQuote}
      />
    );
  };

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
        void calendar.refetch();
      }}
    >
      {drafts.error ? <Notice tone="danger" label="Working copy needs attention" body={drafts.error} onRetry={drafts.retry} /> : null}
      {drafts.pending ? <Text style={{ color: colors.textSec }}>Saving working copy on this device…</Text> : null}
      <Text style={{ color: colors.textDim }}>Unsent messages and notes stay encrypted on this device for seven days after your last edit. They are cleared when you sign out.</Text>
      {calendar.data && !calendar.isError && calendar.data.toSchedule.length ? (
        <ActionBtn
          disabled={drafts.unsaved}
          label={`${calendar.data.toSchedule.length} paid ${calendar.data.toSchedule.length === 1 ? 'quote needs' : 'quotes need'} a time · Open Calendar`}
          onPress={() => router.push('/sections/calendar')}
        />
      ) : null}
      {calendar.isError ? (
        <Notice
          tone="warn"
          label="Calendar status unavailable"
          body="Paid quotes leave the follow-up queue. Open Calendar to review bookings."
          onRetry={() => void calendar.refetch()}
        />
      ) : null}
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
          {query.isError ? (
            <Notice
              tone="warn"
              label="Showing saved follow-ups"
              body="The latest queue could not be loaded. Refresh before contacting a customer."
              onRetry={() => void query.refetch()}
            />
          ) : null}
          <PillGroup
            options={categories}
            value={effectiveCategory}
            onChange={value => {
              setCategory(value);
              setVisible(PAGE_SIZE);
            }}
          />
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
          {search.trim() || effectiveCategory !== 'all' ? (
            <ActionBtn
              label={`Clear filters (${items.length} of ${all.length})`}
              onPress={() => {
                setSearch('');
                setCategory('all');
                setVisible(PAGE_SIZE);
              }}
            />
          ) : null}
          <SectionGroup title="To chase" count={toChase.length}>
            {toChase.length === 0 ? (
              <SectionEmpty
                title={
                  search.trim() || effectiveCategory !== 'all'
                    ? 'No matching follow-ups'
                    : 'You’re up to date'
                }
                body={
                  search.trim() || effectiveCategory !== 'all'
                    ? 'Try a different name, suburb or phone number.'
                    : 'Every live quote has been followed up.'
                }
              />
            ) : (
              shownChase.map(row)
            )}
          </SectionGroup>
          {shownDone.length > 0 ? (
            <SectionGroup title="Contacted · awaiting payment" count={contacted.length}>
              {shownDone.map(row)}
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
      {openQuote ? (
        <QuoteWorkspace
          quoteId={openQuote}
          onClose={() => {
            setOpenQuote(null);
            void query.refetch();
          }}
          onDeleted={() => {
            setOpenQuote(null);
            void query.refetch();
          }}
        />
      ) : null}
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
