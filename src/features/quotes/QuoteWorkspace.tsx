import { useAuth } from '@clerk/expo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { Card, Notice, PillOption } from '@/features/trades/ui';
import { ApiError, apiErrorMessage, apiRequest } from '@/lib/api';
import { requireClerkToken } from '@/lib/auth-token';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { TENANT_ME_KEY } from '@/lib/tenant';
import { radius, spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { QuoteDocumentPreview } from './QuoteDocumentPreview';
import { QuoteChainSummary } from './QuoteChainSummary';
import { QuoteBalanceActions } from './QuoteBalanceActions';
import { QuoteFinalActions } from './QuoteFinalActions';
import { FinalQuoteResultSchema } from './final-quote-attempt';
import { QuoteNarrativeEditor } from './QuoteNarrativeEditor';
import {
  ReportDocSchema,
  ReportStyleSchema,
  type ReportDoc,
  type ReportStyle,
} from './report-editor';
import type { QuoteDraftInput } from './quote-draft-storage';
import { useQuoteDraft } from './use-quote-draft';
import {
  ownedQuoteKey,
  OwnedQuoteSchema,
  QuoteEditResultSchema,
  QuoteProposalSchema,
  QuoteRevisionSchema,
  quotePermissionReason,
  useOwnedQuote,
  type OwnedQuote,
} from './owned-quote';
import {
  applyProposedTiers,
  editableTiers,
  EDITOR_TIER_KEYS,
  editorInputIdentity,
  newManualLine,
  quoteEditPayload,
  type EditorTiers,
  type EditorTierKey,
} from './quote-editor';

type Proposal = { value: z.infer<typeof QuoteProposalSchema>; input: string };
const TierResultSchema = z.looseObject({
  ok: z.literal(true),
  persisted: z.literal(true),
  edit_revision: QuoteRevisionSchema,
});

function Input({
  label,
  value,
  onChange,
  numeric = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  numeric?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[type.bodySm, { color: colors.textSec }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        multiline={!numeric}
        style={[
          type.body,
          {
            minHeight: 48,
            padding: spacing.md,
            borderWidth: 1,
            borderColor: colors.ctlLine,
            borderRadius: radius.control,
            color: colors.textPri,
          },
        ]}
      />
    </View>
  );
}

/** One owner-scoped surface; query refreshes never overwrite the working copy. */
export function QuoteWorkspace({
  quoteId,
  onClose,
  onDeleted,
}: {
  quoteId: string;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const { userId, sessionId } = useAuth();
  const navigationKey = `${userId}:${sessionId}:${quoteId}`;
  const [navigation, setNavigation] = useState({ key: navigationKey, trail: [] as string[] });
  const trail = navigation.key === navigationKey ? navigation.trail : [];
  const currentQuoteId = trail.at(-1) ?? quoteId;
  const detail = useOwnedQuote(currentQuoteId);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const back = () =>
    trail.length ? setNavigation({ key: navigationKey, trail: trail.slice(0, -1) }) : onClose();
  const closeRequest = useRef(back);
  closeRequest.current = back;
  return (
    <Modal visible onRequestClose={() => closeRequest.current()} animationType="slide">
      <View
        style={{
          flex: 1,
          backgroundColor: colors.inkDeep,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        {detail.data ? (
          <QuoteWorkspaceBody
            key={`${userId}:${sessionId}:${detail.data.quote.tenant_id}:${currentQuoteId}`}
            initial={detail.data}
            latest={detail.data}
            refresh={async () => {
              const result = await detail.refetch();
              if (result.error) throw result.error;
              if (!result.data) throw new Error('The saved quote could not be read back.');
              return result.data;
            }}
            onClose={back}
            onDeleted={trail.length ? back : onDeleted}
            onOpenLinked={id => setNavigation({ key: navigationKey, trail: [...trail, id] })}
            closeRequest={closeRequest}
          />
        ) : (
          <View style={{ padding: spacing.xl, gap: spacing.md }}>
            <GhostButton label="Back to quote" onPress={back} />
            {detail.isPending ? (
              <ActivityIndicator accessibilityLabel="Loading owned quote" />
            ) : (
              <Notice
                tone="warn"
                label="Quote unavailable"
                body={apiErrorMessage(detail.error, 'The owner record could not be loaded.')}
                onRetry={() => void detail.refetch()}
              />
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

export function QuoteWorkspaceBody({
  initial,
  latest,
  refresh,
  onClose,
  closeRequest,
  onDeleted,
  onOpenLinked,
}: {
  initial: OwnedQuote;
  latest: OwnedQuote;
  refresh: () => Promise<OwnedQuote>;
  onClose: () => void;
  closeRequest?: { current: () => void };
  onDeleted?: () => void;
  onOpenLinked?: (id: string) => void;
}) {
  const { colors } = useTheme();
  const { getToken, userId, sessionId } = useAuth();
  const client = useQueryClient();
  const [baseline, setBaseline] = useState(initial);
  const [tiers, setTiers] = useState<EditorTiers>(() => editableTiers(initial.quote));
  const [originalTiers, setOriginalTiers] = useState<EditorTiers>(() =>
    editableTiers(initial.quote),
  );
  const initialStyle = ReportStyleSchema.safeParse(initial.quote.report_style);
  const [doc, setDoc] = useState<ReportDoc | null>(initial.report_editor_doc);
  const [originalDoc, setOriginalDoc] = useState<ReportDoc | null>(initial.report_editor_doc);
  const [reportStyle, setReportStyle] = useState<ReportStyle | null>(
    initialStyle.success ? initialStyle.data : null,
  );
  const [originalStyle, setOriginalStyle] = useState<ReportStyle | null>(
    initialStyle.success ? initialStyle.data : null,
  );
  const [tab, setTab] = useState<'review' | 'edit' | 'narrative' | 'document'>('review');
  const [pending, setPending] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [grounding, setGrounding] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [unknownAction, setUnknownAction] = useState<
    'save' | 'document' | 'tier' | 'delete' | null
  >(null);
  const requestRef = useRef<AbortController | null>(null);
  const navigating = useRef(false);
  const localSequence = useRef(0);
  const identity = `${userId}:${sessionId}:${initial.quote.tenant_id}:${initial.quote.id}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const active = useRef(true);
  const working = useRef(tiers);
  working.current = tiers;
  const inputIdentity = editorInputIdentity(tiers, baseline.edit_revision);
  const priceDirty = inputIdentity !== editorInputIdentity(originalTiers, baseline.edit_revision);
  const narrativeDirty =
    JSON.stringify([doc, reportStyle]) !== JSON.stringify([originalDoc, originalStyle]);
  const dirty = priceDirty || narrativeDirty;
  const localDraft = useQuoteDraft(
    userId ? { userId, tenantId: initial.quote.tenant_id, quoteId: initial.quote.id } : null,
    {
      revision: baseline.edit_revision,
      originalTiers,
      workingTiers: tiers,
      narrative: { originalDoc, workingDoc: doc, originalStyle, workingStyle: reportStyle },
    },
    dirty,
    restored => {
      setOriginalTiers(restored.originalTiers);
      setBaseline(value => ({ ...value, edit_revision: restored.revision }));
      replaceWorking(restored.workingTiers);
      if (restored.narrative) {
        setOriginalDoc(restored.narrative.originalDoc);
        setDoc(restored.narrative.workingDoc);
        setOriginalStyle(restored.narrative.originalStyle);
        setReportStyle(restored.narrative.workingStyle);
      }
      setUncertain(true);
      setNotice(
        'Your encrypted working copy was recovered. Refresh the saved quote before continuing.',
      );
    },
  );
  const conflict = latest.edit_revision !== baseline.edit_revision;
  const canEdit =
    localDraft.loaded &&
    latest.processing.ready &&
    latest.capabilities.price_edit.allowed &&
    !conflict &&
    !uncertain;
  const canEditDocument =
    localDraft.loaded &&
    latest.processing.ready &&
    latest.capabilities.document_edit.allowed &&
    !conflict &&
    !uncertain &&
    (latest.quote.report_style == null ||
      ReportStyleSchema.safeParse(latest.quote.report_style).success);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      requestRef.current?.abort();
    };
  }, [identity]);
  function replaceWorking(next: EditorTiers) {
    working.current = next;
    setTiers(next);
    setProposal(null);
    setGrounding(null);
    setNotice(null);
  }
  function nextSavedCopy(
    snapshot: OwnedQuote,
    kind: 'all' | 'prices' | 'document',
  ): QuoteDraftInput {
    const parsedStyle = ReportStyleSchema.safeParse(snapshot.quote.report_style);
    const savedStyle = parsedStyle.success ? parsedStyle.data : null;
    const savedTiers = editableTiers(snapshot.quote);
    return {
      revision: snapshot.edit_revision,
      originalTiers: kind === 'document' ? originalTiers : savedTiers,
      workingTiers: kind === 'document' ? tiers : savedTiers,
      narrative:
        kind === 'prices'
          ? { originalDoc, workingDoc: doc, originalStyle, workingStyle: reportStyle }
          : {
              originalDoc: snapshot.report_editor_doc,
              workingDoc: snapshot.report_editor_doc,
              originalStyle: savedStyle,
              workingStyle: savedStyle,
            },
    };
  }
  function accepted(snapshot: OwnedQuote, kind: 'all' | 'prices' | 'document' = 'all') {
    if (!active.current || identityRef.current !== identity) return;
    const copy = nextSavedCopy(snapshot, kind);
    setBaseline(snapshot);
    setOriginalTiers(copy.originalTiers);
    replaceWorking(copy.workingTiers);
    setOriginalDoc(copy.narrative!.originalDoc);
    setDoc(copy.narrative!.workingDoc);
    setOriginalStyle(copy.narrative!.originalStyle);
    setReportStyle(copy.narrative!.workingStyle);
    setUncertain(false);
    setUnknownAction(null);
    void client.invalidateQueries({ queryKey: TENANT_ME_KEY });
  }
  async function acceptSaved(snapshot: OwnedQuote, kind: 'prices' | 'document') {
    const retained = kind === 'prices' ? narrativeDirty : priceDirty;
    if (retained) await localDraft.replace(nextSavedCopy(snapshot, kind));
    else await localDraft.remove();
    accepted(snapshot, kind);
  }
  function manualKey() {
    const keys = new Set(
      Object.values(working.current).flatMap(tier => tier?.lines.map(line => line.key) ?? []),
    );
    let key: string;
    do {
      key = `manual:${++localSequence.current}`;
    } while (keys.has(key));
    return key;
  }
  async function finishClose(keepDraft: boolean) {
    setPending(true);
    setFailure(null);
    try {
      if (keepDraft) await localDraft.flush();
      else await localDraft.remove();
      if (active.current && identityRef.current === identity) onClose();
    } catch (error) {
      if (active.current)
        setFailure(
          apiErrorMessage(error, 'The local draft could not be updated. Keep this editor open.'),
        );
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function openLinked(id: string) {
    if (
      !onOpenLinked ||
      pending ||
      dirty ||
      uncertain ||
      !localDraft.loaded ||
      conflict ||
      navigating.current
    )
      return;
    navigating.current = true;
    setPending(true);
    try {
      await localDraft.remove();
      if (active.current && identityRef.current === identity) onOpenLinked(id);
    } catch (error) {
      if (active.current)
        setFailure(apiErrorMessage(error, 'The local draft could not be cleared.'));
    } finally {
      navigating.current = false;
      if (active.current) setPending(false);
    }
  }
  function close() {
    if (pending || uncertain) {
      Alert.alert(
        'Keep this quote open',
        'The last operation needs a saved-record check before leaving. Your working copy is still here.',
      );
      return;
    }
    if (dirty) {
      Alert.alert(
        'Unsaved quote changes',
        'Keep a private draft on this device for seven days, or discard the unsaved changes.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Keep draft and close',
            onPress: () => void finishClose(true),
          },
          {
            text: 'Discard changes',
            style: 'destructive',
            onPress: () => void finishClose(false),
          },
        ],
      );
      return;
    }
    void finishClose(false);
  }
  if (closeRequest) closeRequest.current = close;
  async function request<T>(
    suffix: string,
    body: unknown,
    schema: z.ZodType<T>,
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'POST',
    ownedId = initial.quote.id,
  ): Promise<T> {
    const controller = new AbortController();
    requestRef.current = controller;
    const started = identity;
    let tokenTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      const token = requireClerkToken(
        await Promise.race([
          getToken(),
          new Promise<null>(resolve => {
            tokenTimer = setTimeout(() => resolve(null), 5000);
          }),
        ]),
      );
      clearTimeout(tokenTimer);
      tokenTimer = undefined;
      if (!active.current || identityRef.current !== started || controller.signal.aborted)
        throw new Error('The account changed before this action.');
      const result = await apiRequest(
        `/api/quote/${encodeURIComponent(ownedId)}${suffix ? (suffix.startsWith('?') ? suffix : `/${suffix}`) : ''}`,
        schema,
        {
          body,
          method,
          token,
          signal: controller.signal,
          timeoutMs: suffix === 'chat-edit' ? 300000 : 90000,
        },
      );
      if (!active.current || identityRef.current !== started)
        throw new Error('The account changed during this action.');
      return result;
    } finally {
      clearTimeout(tokenTimer);
      if (requestRef.current === controller) requestRef.current = null;
    }
  }
  async function save(force = false) {
    if (pending || !canEdit || !priceDirty) return;
    setPending(true);
    setFailure(null);
    setNotice(null);
    setGrounding(null);
    let dispatched = false;
    try {
      const body = quoteEditPayload(working.current, baseline.edit_revision, force);
      await localDraft.flush();
      dispatched = true;
      const result = await request('edit', body, QuoteEditResultSchema);
      setUncertain(true);
      setUnknownAction('save');
      const saved = await refresh();
      if (!active.current || identityRef.current !== identity) return;
      if (saved.edit_revision !== result.edit_revision)
        throw new Error(
          'The quote changed again after this save. Compare the latest saved record before continuing.',
        );
      await acceptSaved(saved, 'prices');
      setNotice(
        result.checkout_sync === 'pending'
          ? 'Changes saved without sending. Payment links still need server reconciliation.'
          : 'Changes saved without sending.',
      );
    } catch (error) {
      if (!active.current) return;
      const body =
        error instanceof ApiError
          ? (error.body as { error?: string; failures?: unknown } | undefined)
          : undefined;
      if (body?.error === 'grounding_failed') {
        setGrounding(JSON.stringify(body.failures ?? [], null, 2));
        setFailure(
          'Some prices could not be verified against your catalogue. Your edits are retained.',
        );
      } else {
        setFailure(
          apiErrorMessage(
            error,
            'Save was not confirmed. Your working copy is retained. Refresh the saved record before another save.',
          ),
        );
        if (
          dispatched &&
          !(error instanceof ApiError && error.status >= 400 && error.status < 500)
        ) {
          setUncertain(true);
          setUnknownAction('save');
        }
      }
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function saveDocument() {
    if (pending || !canEditDocument || !doc || !narrativeDirty) return;
    setPending(true);
    setFailure(null);
    setNotice(null);
    let dispatched = false;
    try {
      const report_doc = ReportDocSchema.parse(doc);
      const report_style = reportStyle === null ? null : ReportStyleSchema.parse(reportStyle);
      await localDraft.flush();
      dispatched = true;
      const result = await request(
        'document',
        {
          expected_revision: baseline.edit_revision,
          report_doc,
          report_style,
        },
        TierResultSchema,
      );
      setUncertain(true);
      setUnknownAction('document');
      const saved = await refresh();
      if (!active.current || identityRef.current !== identity) return;
      if (saved.edit_revision !== result.edit_revision)
        throw new Error('The quote changed again. Compare the saved document before continuing.');
      await acceptSaved(saved, 'document');
      setNotice('Document saved without sending.');
    } catch (error) {
      if (!active.current) return;
      setFailure(
        apiErrorMessage(
          error,
          'Document save was not confirmed. Your text and appearance are retained.',
        ),
      );
      if (dispatched && !(error instanceof ApiError && error.status >= 400 && error.status < 500)) {
        setUncertain(true);
        setUnknownAction('document');
      }
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function propose() {
    if (pending || !canEdit || !instruction.trim() || instruction.trim().length > 1000) return;
    setPending(true);
    setFailure(null);
    setProposal(null);
    const captured = editorInputIdentity(working.current, baseline.edit_revision);
    try {
      const payload = quoteEditPayload(working.current, baseline.edit_revision);
      const currentTiers = Object.fromEntries(
        EDITOR_TIER_KEYS.filter(key => payload[key]).map(key => [key, payload[key]]),
      );
      const value = await request(
        'chat-edit',
        {
          expected_revision: baseline.edit_revision,
          currentTiers,
          instruction: instruction.trim(),
        },
        QuoteProposalSchema,
      );
      if (editorInputIdentity(working.current, baseline.edit_revision) !== captured) {
        setFailure('Your inputs changed. Request a new proposal.');
        return;
      }
      setProposal({ value, input: captured });
    } catch (error) {
      if (active.current)
        setFailure(
          apiErrorMessage(error, 'A proposal could not be prepared. Your edits are unchanged.'),
        );
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function selectTier(tier: EditorTierKey) {
    if (pending || dirty || !canEdit || baseline.quote.selected_tier === tier) return;
    setPending(true);
    setFailure(null);
    try {
      const result = await request(
        'tier',
        { tier, expected_revision: baseline.edit_revision },
        TierResultSchema,
        'PATCH',
      );
      setUncertain(true);
      setUnknownAction('tier');
      const saved = await refresh();
      if (!active.current || identityRef.current !== identity) return;
      if (saved.edit_revision !== result.edit_revision)
        throw new Error('The saved quote changed. Review the latest record.');
      accepted(saved);
      setNotice('Selected tier saved without sending.');
    } catch (error) {
      if (active.current) {
        setFailure(
          apiErrorMessage(error, 'The tier change was not confirmed. Refresh before trying again.'),
        );
        setUncertain(true);
        setUnknownAction('tier');
      }
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function reload() {
    setPending(true);
    setFailure(null);
    try {
      const saved = await refresh();
      if (!active.current || identityRef.current !== identity) return;
      if (dirty) {
        setUncertain(false);
        setUnknownAction(null);
        setNotice(
          saved.edit_revision === baseline.edit_revision
            ? 'The server still has the original revision. Your working copy is retained.'
            : 'A different revision is saved. Review it before discarding or rebuilding your changes.',
        );
      } else accepted(saved);
    } catch (error) {
      if (
        active.current &&
        unknownAction === 'delete' &&
        error instanceof ApiError &&
        error.status === 404
      ) {
        try {
          await completeDeletion(false);
        } catch (cleanupError) {
          setFailure(
            apiErrorMessage(
              cleanupError,
              'The record is no longer available, but local cleanup needs to finish.',
            ),
          );
        }
        return;
      }
      if (active.current)
        setFailure(apiErrorMessage(error, 'The saved record could not be refreshed.'));
    } finally {
      if (active.current) setPending(false);
    }
  }
  async function completeDeletion(confirmed = true) {
    await localDraft.remove();
    client.removeQueries({ queryKey: ownedQuoteKey(initial.quote.id) });
    await client.invalidateQueries({ queryKey: TENANT_ME_KEY });
    if (active.current) {
      if (!confirmed)
        Alert.alert(
          'Quote no longer available',
          'The owner record is no longer available after the deletion request. The list has been refreshed.',
        );
      (onDeleted ?? onClose)();
    }
  }
  async function deleteDraft() {
    if (
      pending ||
      dirty ||
      uncertain ||
      conflict ||
      !localDraft.loaded ||
      !latest.capabilities.delete.allowed
    )
      return;
    setPending(true);
    setFailure(null);
    try {
      const result = await request(
        '',
        { expected_revision: baseline.edit_revision },
        z.object({
          ok: z.literal(true),
          deleted: z.literal(true),
          quote_id: z.literal(initial.quote.id),
        }),
        'DELETE',
      );
      if (!active.current || result.quote_id !== initial.quote.id) return;
      await completeDeletion();
    } catch (error) {
      if (active.current) {
        setFailure(
          apiErrorMessage(
            error,
            'Deletion was not confirmed. The record is retained here; refresh its status.',
          ),
        );
        if (!(error instanceof ApiError && error.status >= 400 && error.status < 500)) {
          setUncertain(true);
          setUnknownAction('delete');
        }
      }
    } finally {
      if (active.current) setPending(false);
    }
  }
  const saved = baseline.quote;
  const textStyle = [type.body, { color: colors.textPri }];
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: spacing.md, gap: spacing.sm }}>
        <GhostButton label="Back to quote" onPress={close} />
        <Text accessibilityRole="header" style={[type.title, { color: colors.textPri }]}>
          {saved.estimate_number || 'Quote workspace'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {(['review', 'edit', 'narrative', 'document'] as const).map(value => (
            <PillOption
              key={value}
              label={
                value === 'document'
                  ? 'Customer document'
                  : value === 'narrative'
                    ? 'Edit document'
                    : value === 'edit'
                      ? 'Edit prices'
                      : 'Owner review'
              }
              selected={tab === value}
              disabled={pending}
              onPress={() => setTab(value)}
            />
          ))}
        </View>
      </View>
      {tab === 'document' ? (
        saved.share_token ? (
          <QuoteDocumentPreview
            key={`${identity}:${baseline.edit_revision}`}
            quoteId={saved.id}
            token={saved.share_token}
            revision={baseline.edit_revision}
          />
        ) : (
          <Notice
            tone="warn"
            label="Document unavailable"
            body="This quote does not have a saved customer document link."
          />
        )
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        >
          {failure ? <Notice tone="warn" label="Action needs attention" body={failure} /> : null}
          {notice ? <Notice tone="accent" label="Quote status" body={notice} /> : null}
          {localDraft.error ? (
            <Notice
              tone="warn"
              label="Local draft needs attention"
              body={localDraft.error}
              onRetry={localDraft.retry}
            />
          ) : !localDraft.loaded ? (
            <ActivityIndicator accessibilityLabel="Checking encrypted draft recovery" />
          ) : dirty ? (
            <Text style={[type.bodySm, { color: colors.textDim }]}>
              {localDraft.saving
                ? 'Saving encrypted working copy…'
                : localDraft.savedAt
                  ? 'Working copy saved on this device for seven days. Signing out removes it.'
                  : 'Working copy has not been stored yet.'}
            </Text>
          ) : null}
          {conflict || uncertain ? (
            <Notice
              tone="warn"
              label={conflict ? 'Saved quote changed' : 'Save outcome needs checking'}
              body="Your working copy has been kept. Check the saved record before another write."
              onRetry={() => void reload()}
            />
          ) : null}
          {conflict ? (
            <GhostButton
              label="Discard working copy and use latest saved quote"
              disabled={pending}
              onPress={() =>
                Alert.alert(
                  'Discard unsaved changes?',
                  'Replace your working copy with the latest saved quote.',
                  [
                    { text: 'Keep editing', style: 'cancel' },
                    {
                      text: 'Use saved quote',
                      style: 'destructive',
                      onPress: () => {
                        void localDraft
                          .remove()
                          .then(() => accepted(latest))
                          .catch(error =>
                            setFailure(
                              apiErrorMessage(
                                error,
                                'The local working copy could not be discarded.',
                              ),
                            ),
                          );
                      },
                    },
                  ],
                )
              }
            />
          ) : null}
          {tab === 'review' ? (
            <>
              <Text style={textStyle}>
                {saved.customer_full_name || saved.customer_first_name || 'Customer'}
                {saved.suburb ? ` · ${saved.suburb}` : ''}
              </Text>
              <Text style={textStyle}>{saved.scope_of_works || 'No saved scope.'}</Text>
              <Card>
                <Text accessibilityRole="header" style={textStyle}>
                  Owner review
                </Text>
                <Text style={[type.bodySm, { color: colors.textSec }]}>
                  Review risks and assumptions before approving. These controls are separate from
                  the customer document.
                </Text>
                {(saved.risk_flags ?? []).map((flag, i) => (
                  <Text key={`risk${i}`} style={textStyle}>
                    Risk: {flag}
                  </Text>
                ))}
                {(saved.assumptions ?? []).map((item, i) => (
                  <Text key={`assumption${i}`} style={textStyle}>
                    Assumption: {item}
                  </Text>
                ))}
                {!saved.risk_flags?.length && !saved.assumptions?.length ? (
                  <Text style={textStyle}>No saved risk flags or assumptions.</Text>
                ) : null}
              </Card>
              {onOpenLinked ? (
                <QuoteChainSummary
                  key={`${identity}:${baseline.edit_revision}:${baseline.chain.next_cursor}:${baseline.chain.children.map(row => `${row.id}:${row.status}:${row.paid_at}`).join(',')}`}
                  snapshot={baseline}
                  disabled={pending || dirty || uncertain || !localDraft.loaded || conflict}
                  onOpen={id => void openLinked(id)}
                  loadPage={cursor =>
                    request(
                      `?cursor=${encodeURIComponent(cursor)}`,
                      undefined,
                      OwnedQuoteSchema,
                      'GET',
                    )
                  }
                />
              ) : null}
              {saved.quote_kind === 'final' && onOpenLinked ? (
                <QuoteBalanceActions
                  snapshot={latest}
                  disabled={pending || dirty || uncertain || !localDraft.loaded || conflict}
                  onBusyChange={setPending}
                  onRefresh={reload}
                  onOpen={id => void openLinked(id)}
                />
              ) : null}
              {(saved.quote_kind == null || saved.quote_kind === 'initial') &&
              saved.paid_tier === 'inspection' &&
              userId &&
              onOpenLinked ? (
                <QuoteFinalActions
                  scope={{ userId, tenantId: saved.tenant_id, parentId: saved.id }}
                  snapshot={latest}
                  disabled={pending || dirty || uncertain || !localDraft.loaded || conflict}
                  dispatch={body => request('issue-final', body, FinalQuoteResultSchema)}
                  readQuote={id => request('', undefined, OwnedQuoteSchema, 'GET', id)}
                  onBusyChange={setPending}
                  onRefresh={reload}
                  onOpen={id => void openLinked(id)}
                />
              ) : null}
              {EDITOR_TIER_KEYS.map(key => {
                const tier = saved[key];
                if (!tier) return null;
                return (
                  <Card key={key}>
                    <Text accessibilityRole="header" style={textStyle}>
                      {tier.label || key}
                      {saved.selected_tier === key ? ' · selected' : ''}
                    </Text>
                    <Text style={textStyle}>
                      {typeof tier.total_inc_gst === 'number'
                        ? formatAud(centsFromApiDollars(tier.total_inc_gst))
                        : 'Total unavailable'}{' '}
                      ·{' '}
                      {baseline.gst_registered === true
                        ? 'including GST'
                        : baseline.gst_registered === false
                          ? 'GST not charged'
                          : 'tax basis requires review'}
                    </Text>
                    {(tier.line_items ?? []).map((line, index) => (
                      <Text key={index} style={textStyle}>
                        {typeof line.description === 'string'
                          ? line.description
                          : 'Line description unavailable'}{' '}
                        ·{' '}
                        {typeof line.quantity === 'number' ? line.quantity : 'quantity unavailable'}{' '}
                        ×{' '}
                        {typeof line.unit_price_ex_gst === 'number'
                          ? formatAud(centsFromApiDollars(line.unit_price_ex_gst))
                          : 'price unavailable'}
                      </Text>
                    ))}
                    <GhostButton
                      label={`Select ${tier.label || key}`}
                      disabled={!canEdit || pending || dirty || saved.selected_tier === key}
                      onPress={() => void selectTier(key)}
                    />
                  </Card>
                );
              })}
              <GhostButton
                label="Refresh saved quote"
                disabled={pending}
                onPress={() => void reload()}
              />
              {latest.capabilities.delete.allowed ? (
                <GhostButton
                  label="Delete this draft"
                  disabled={pending || dirty || uncertain || conflict}
                  onPress={() =>
                    Alert.alert(
                      'Permanently delete this draft?',
                      `Delete ${saved.estimate_number || 'this quote'} for ${saved.customer_full_name || saved.customer_first_name || 'this customer'}? This cannot be undone.`,
                      [
                        { text: 'Keep draft', style: 'cancel' },
                        {
                          text: 'Delete draft',
                          style: 'destructive',
                          onPress: () => void deleteDraft(),
                        },
                      ],
                    )
                  }
                />
              ) : (
                <Text style={[type.bodySm, { color: colors.textDim }]}>
                  This record is protected from deletion while payment, shared-link or workflow
                  history needs to be retained.
                </Text>
              )}
            </>
          ) : tab === 'narrative' ? (
            <>
              {!canEditDocument ? (
                <Notice
                  tone="warn"
                  label="Document editing unavailable"
                  body={quotePermissionReason(latest.capabilities.document_edit.reason)}
                />
              ) : null}
              {doc ? (
                <QuoteNarrativeEditor
                  doc={doc}
                  style={reportStyle}
                  onDoc={setDoc}
                  onStyle={setReportStyle}
                  disabled={pending || !canEditDocument}
                />
              ) : (
                <Notice
                  tone="warn"
                  label="Document needs review"
                  body="The saved document could not be safely loaded for editing."
                />
              )}
              <PrimaryCta
                label="Save document without sending"
                disabled={pending || !canEditDocument || !narrativeDirty || !doc}
                loading={pending}
                onPress={() => void saveDocument()}
              />
            </>
          ) : (
            <>
              {!latest.capabilities.price_edit.allowed ? (
                <Notice
                  tone="warn"
                  label="Prices are locked"
                  body={quotePermissionReason(latest.capabilities.price_edit.reason)}
                />
              ) : null}
              <Text style={[type.bodySm, { color: colors.textSec }]}>
                Amounts are ex GST. Save recalculates totals on the server. Unit and timeframe stay
                with each tier.
              </Text>
              {EDITOR_TIER_KEYS.map(key => {
                const tier = tiers[key];
                if (!tier) return null;
                return (
                  <Card key={key}>
                    <Input
                      label={`${key} label`}
                      value={tier.label}
                      disabled={!canEdit || pending}
                      onChange={label => replaceWorking({ ...tiers, [key]: { ...tier, label } })}
                    />
                    {tier.lines.map((line, index) => (
                      <View key={line.key} style={{ marginTop: spacing.md, gap: spacing.sm }}>
                        <Input
                          label={`${key} line ${index + 1} description`}
                          value={line.description}
                          disabled={!canEdit || pending}
                          onChange={description =>
                            replaceWorking({
                              ...tiers,
                              [key]: {
                                ...tier,
                                lines: tier.lines.map(row =>
                                  row.key === line.key ? { ...row, description } : row,
                                ),
                              },
                            })
                          }
                        />
                        <Input
                          label={`${key} line ${index + 1} quantity`}
                          value={line.quantity}
                          numeric
                          disabled={!canEdit || pending}
                          onChange={quantity =>
                            replaceWorking({
                              ...tiers,
                              [key]: {
                                ...tier,
                                lines: tier.lines.map(row =>
                                  row.key === line.key ? { ...row, quantity } : row,
                                ),
                              },
                            })
                          }
                        />
                        <Input
                          label={`${key} line ${index + 1} price ex GST`}
                          value={line.price}
                          numeric
                          disabled={!canEdit || pending}
                          onChange={price =>
                            replaceWorking({
                              ...tiers,
                              [key]: {
                                ...tier,
                                lines: tier.lines.map(row =>
                                  row.key === line.key ? { ...row, price } : row,
                                ),
                              },
                            })
                          }
                        />
                        {line.supplied_by ? (
                          <Text style={textStyle}>Supplied by {line.supplied_by}</Text>
                        ) : null}
                        {line.safety_note ? (
                          <Text style={textStyle}>{line.safety_note}</Text>
                        ) : null}
                        <GhostButton
                          label={`Remove ${key} line ${index + 1}`}
                          disabled={!canEdit || pending || tier.lines.length <= 1}
                          onPress={() =>
                            replaceWorking({
                              ...tiers,
                              [key]: {
                                ...tier,
                                lines: tier.lines.filter(row => row.key !== line.key),
                              },
                            })
                          }
                        />
                      </View>
                    ))}
                    <GhostButton
                      label={`Add ${key} line`}
                      disabled={!canEdit || pending}
                      onPress={() =>
                        replaceWorking({
                          ...tiers,
                          [key]: {
                            ...tier,
                            lines: [...tier.lines, newManualLine(manualKey())],
                          },
                        })
                      }
                    />
                  </Card>
                );
              })}
              <Input
                label="Describe a quote change"
                value={instruction}
                disabled={!canEdit || pending}
                onChange={setInstruction}
              />
              <Text style={[type.bodySm, { color: colors.textDim }]}>
                {instruction.trim().length}/1,000
              </Text>
              <GhostButton
                label="Prepare change proposal"
                disabled={
                  !canEdit || pending || !instruction.trim() || instruction.trim().length > 1000
                }
                onPress={() => void propose()}
              />
              {proposal ? (
                <Card>
                  <Text style={textStyle}>{proposal.value.assistantMessage}</Text>
                  {proposal.value.anyUngrounded ? (
                    <Notice
                      tone="warn"
                      label="Unverified prices"
                      body="Review the grounding evidence. Applying this proposal only changes your working copy."
                    />
                  ) : null}
                  {proposal.value.diff.map((change, index) => (
                    <View key={index} style={{ gap: spacing.xs }}>
                      <Text style={textStyle}>
                        {change.tier}: {change.op} · {change.description}
                      </Text>
                      <Text style={textStyle}>
                        Before: {String(change.oldQuantity ?? '—')} ×{' '}
                        {String(change.oldUnitPriceExGst ?? '—')}
                        {'\n'}After: {String(change.newQuantity ?? '—')} ×{' '}
                        {String(change.newUnitPriceExGst ?? '—')}
                      </Text>
                      {change.reason ? <Text style={textStyle}>{change.reason}</Text> : null}
                    </View>
                  ))}
                  <GhostButton
                    label="Apply proposal to working copy"
                    disabled={pending || proposal.input !== inputIdentity || !canEdit}
                    onPress={() => {
                      try {
                        replaceWorking(applyProposedTiers(tiers, proposal.value.proposedTiers));
                        setNotice(
                          'Proposal applied locally. Review the edits and Save when ready.',
                        );
                      } catch (error) {
                        setFailure(apiErrorMessage(error, 'The proposal could not be applied.'));
                      }
                    }}
                  />
                </Card>
              ) : null}
              {grounding ? (
                <Card>
                  <Text selectable style={textStyle}>
                    {grounding}
                  </Text>
                  {latest.capabilities.force_grounding.allowed ? (
                    <GhostButton
                      label="Review owner price override"
                      disabled={pending || !canEdit}
                      onPress={() =>
                        Alert.alert(
                          'Save unverified owner prices?',
                          'These prices have not been verified against your catalogue. This explicit override records an audit flag. It saves without sending to the customer.',
                          [
                            { text: 'Keep reviewing', style: 'cancel' },
                            { text: 'Save owner override', onPress: () => void save(true) },
                          ],
                        )
                      }
                    />
                  ) : null}
                </Card>
              ) : null}
              <PrimaryCta
                label="Save without sending"
                loading={pending}
                disabled={!canEdit || !priceDirty}
                onPress={() => void save()}
              />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
