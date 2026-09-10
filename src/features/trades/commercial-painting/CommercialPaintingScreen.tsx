/**
 * Commercial painting estimator (native) — the web CommercialPaintingTab's
 * pipeline at mobile scope: pick plan/schedule files → sign → PUT each file
 * straight to storage → complete (auto-classify) → correct doc types → AI
 * takeoff (minutes; survives an app kill via the persisted run id + server
 * run status) → takeoff review rendered VERBATIM → price (server-side,
 * deterministic) → priced summary verbatim → save as quote into the hub
 * queue. Recent runs at the bottom reopen any past run.
 *
 * Nothing here computes a price or an area: every number on screen is the
 * API's, unchanged (dollars ex-GST → centsFromApiDollars + formatAud for
 * display only). The web's richer takeoff editor stays on the web — the
 * WebOnlyCard at the bottom links there.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { usePreventRemove } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, GhostButton, PrimaryCta } from '@/features/auth/ui';
import {
  pickDocumentForUpload,
  uploadFailureNotice,
  uploadSelectionNote,
  type PickedFile,
} from '@/lib/media';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useTenantMe } from '@/lib/tenant';

import {
  buildCompleteBody,
  buildSignBody,
  canSavePaintQuote,
  classifyPaintPricingBlock,
  COMMERCIAL_PAINT_DOCUMENT_POLICY,
  DOC_TYPES,
  initialPipeline,
  pipelineReducer,
  putSignedFile,
  runKey,
  RUNS_KEY,
  useCompleteUploads,
  useExtract,
  usePrice,
  useRemoveUpload,
  useRun,
  useRuns,
  useSetDocType,
  useSignUploads,
  zipUploads,
  type PaintDocType,
  type PaintPricingBlock,
  type PricedBom,
  type RunListItem,
  type TakeoffItem,
  type UploadRow,
} from './api';
import { WebOnlyCard } from '../hub/SectionsContent';
import { PaintScopeSchema, paintInputKey, type PaintPass, type PaintScope } from './pricing-contract';
import { createPaintRunResume } from './run-resume';
import { usePaintInputs } from './use-paint-inputs';
import { usePaintSave } from './use-paint-save';
import { PaintRetryInputError, preparePaintSaveRetryInput } from './save-receipt';
import { paintEditMatchesDisplay } from './edit-review';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';
import {
  canonicalPaintTimestamp,
  isCurrentPaintPricingAttempt,
  isPaintPricingProofUnavailable,
  PAINT_PRICING_PROOF_MESSAGE,
  repriceAndProveFreshBom,
  type PaintPricingAttempt,
} from './pricing-freshness';

export { repriceAndProveFreshBom } from './pricing-freshness';

/** API dollars → displayed AUD. Display conversion only — never arithmetic. */
function aud(dollars: number): string {
  return formatAud(centsFromApiDollars(dollars));
}

const DOC_TYPE_LABELS: Record<PaintDocType, string> = {
  plan_set: 'Plan set',
  measurement_takeoff: 'Measurements',
  services_layout: 'Services layout',
  site_photo: 'Site photo',
  other: 'Other',
};

const RUN_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  extracting: 'Extracting',
  ready: 'Ready',
  priced: 'Priced',
  failed: 'Failed',
};

function fileMb(bytes: number | null | undefined): string | null {
  return bytes != null ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : null;
}

export function CommercialPaintingScreen() {
  const { userId, sessionId } = useAuth();
  const tenant = useTenantMe();
  const parsed = PaintScopeSchema.safeParse({ userId, tenantId: tenant.data?.tenant.id });
  if (tenant.isError) return <Notice tone="danger" label="Could not load your painting account" body={apiErrorMessage(tenant.error)} onRetry={() => void tenant.refetch()} />;
  if (!parsed.success) return <Notice tone="accent" label="Loading your painting account…" />;
  return <CommercialPaintingWorkspace key={`${userId}:${sessionId}:${parsed.data.tenantId}`} scope={parsed.data} />;
}

// Full correction/concurrency and device acceptance remain release dependencies.
const NATIVE_PAINT_SAVE_RELEASE_READY = false;
export function CommercialPaintingWorkspace({ scope }: { scope: PaintScope }) {
  const { colors } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [runId, setRunId] = useState<string | null>(null);
  const [pipeline, dispatch] = useReducer(pipelineReducer, initialPipeline);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [documentNote, setDocumentNote] = useState<string | null>(null);
  const saving = usePaintSave(scope);
  const inputs = usePaintInputs(scope, runId);
  const resume = useMemo(() => createPaintRunResume(scope), [scope.userId, scope.tenantId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [resumeError, setResumeError] = useState<unknown>(null);
  const [resumeRetry, setResumeRetry] = useState(0);
  const [switching, setSwitching] = useState(false);
  const [retryPreparing, setRetryPreparing] = useState(false);
  const active = useRef(0);
  const mutationLock = useRef(false);
  const [review, setReview] = useState<{ pass: PaintPass; revision: string; bom: PricedBom; labour: string; basis: 'tenant' | 'override' } | null>(null);
  const [pricingBlock, setPricingBlock] = useState<PaintPricingBlock | null>(null);
  // A stored BOM is a preview, not proof that today's tenant rates and this
  // takeoff revision produced it. Every mount/run starts fail-closed.
  const [pricingVerified, setPricingVerified] = useState(false);
  const pricingSequenceRef = useRef(0);
  const currentRunIdRef = useRef<string | null>(null);
  const currentExtractionIdRef = useRef<string | null>(null);
  const documentPickerOpenRef = useRef(false);

  const sign = useSignUploads(scope);
  const complete = useCompleteUploads(scope);
  const setDocType = useSetDocType(scope);
  const removeUpload = useRemoveUpload(scope);
  const extract = useExtract(scope);
  const price = usePrice(scope);
  const runQuery = useRun(runId, scope);
  const runsQuery = useRuns(scope);
  useEffect(() => { active.current += 1; return () => { active.current += 1; }; }, []);
  usePreventRemove(inputs.loaded && !inputs.stored, () => Alert.alert('Keep this working copy open', 'Your latest painting details have not been stored yet. Retry storage before leaving.'));

  // Resume: the persisted run id survives an app kill; the run query then
  // brings back the server's state and RESUME lands the machine on it.
  useEffect(() => {
    if (!saving.loaded || resumeLoaded) return;
    let alive = true;
    void resume.load().then(id => {
      if (!alive) return;
      setRunId(saving.receipt?.pass.paintRunId ?? id);
      setResumeLoaded(true); setResumeError(null);
    }).catch(error => { if (alive) setResumeError(error); });
    return () => { alive = false; };
  }, [saving.loaded, saving.receipt?.pass.paintRunId, resumeLoaded, resume, resumeRetry]);

  const serverStatus = runQuery.data?.run.status ?? null;
  useEffect(() => {
    // While the extract POST is in flight the server row can lag the client —
    // don't let a stale 'draft' re-enable the button mid-call.
    if (!runId || !serverStatus || extract.isPending) return;
    dispatch({ type: 'RESUME', runId, status: serverStatus });
  }, [runId, serverStatus, extract.isPending]);

  const runRow = runQuery.data?.run ?? null;
  const jobName = runId ? runRow?.job_name ?? '' : inputs.value.jobName;
  const siteAddress = runId ? runRow?.site_address ?? '' : inputs.value.siteAddress;

  const uploads = runQuery.data?.uploads ?? [];
  const extraction = runQuery.data?.extraction ?? null;
  const editSnapshot = runQuery.data?.edit_snapshot ?? null;
  const observedRevision = editSnapshot && !editSnapshot.released && runQuery.data?.edit_review_state === 'matched' &&
    paintEditMatchesDisplay(editSnapshot, runRow, extraction) ? editSnapshot.revision : null;
  currentRunIdRef.current = runId;
  currentExtractionIdRef.current = extraction?.id ?? null;
  const corrected = extraction?.corrected_items ?? [];
  const items: TakeoffItem[] = corrected.length > 0 ? corrected : (extraction?.items ?? []);
  const flags = extraction?.sheets_used?.flags ?? [];
  // Derive authority during render. Passive cleanup cannot prevent one render
  // from pairing a remote correction with the previous review's prices/badge.
  const currentReview = review && pricingVerified && review.revision === observedRevision && review.pass.paintRunId === runId &&
    review.pass.extractionId === extraction?.id && review.pass.pricingProof === extraction.pricing_review?.pricingProof &&
    review.pass.pricedAt === extraction.pricing_review?.pricedAt && typeof extraction.priced_at === 'string' &&
    canonicalPaintTimestamp(extraction.priced_at) === review.pass.pricedAt && review.labour === inputs.value.labour.trim() &&
    paintInputKey(review.bom) === paintInputKey(extraction.priced_bom) ? review : null;
  const bom = observedRevision ? currentReview?.bom ?? extraction?.priced_bom ?? null : null;
  const hasPlanSet = uploads.some(u => u.doc_type === 'plan_set');

  const uploadBusy =
    pipeline.step === 'signing' || pipeline.step === 'uploading' || pipeline.step === 'completing';
  const extracting = pipeline.step === 'extracting' || serverStatus === 'extracting';
  const docBusy = setDocType.isPending || removeUpload.isPending;
  const mutationBlocked = !saving.loaded || saving.busy || !!saving.error || !!saving.receipt || !resumeLoaded || !!resumeError || !inputs.stored || switching || runQuery.isError;
  const contextBusy = uploadBusy || extracting || docBusy || price.isPending;
  const canEditInputs = inputs.loaded && saving.loaded && !saving.busy && !saving.receipt && resumeLoaded && !contextBusy && !switching;
  const canRestoreSaveInputs = inputs.loaded && saving.loaded && !!saving.receipt && !saving.receipt.quoteId && !saving.saved &&
    saving.receipt.pass.paintRunId === runId && resumeLoaded && !resumeError && !saving.busy && !retryPreparing && !contextBusy && !switching;
  const labourText = inputs.value.labour.trim();
  const labourRate = labourText === '' ? undefined : Number(labourText);
  const labourValid = labourText === '' || (/^\d+(\.\d{1,2})?$/.test(labourText) && Number.isFinite(labourRate) && labourRate! > 0 && labourRate! <= 1000);

  function resetPricingProof() {
    pricingSequenceRef.current += 1;
    setPricingVerified(false);
    setReview(null);
    setPricingBlock(null);
  }

  useEffect(() => {
    // Covers persisted-run resume, remote extraction replacement and remount.
    pricingSequenceRef.current += 1;
    setPricingVerified(false);
    setReview(null);
    setPricingBlock(null);
  }, [runId, extraction?.id, inputs.value.labour, observedRevision]);

  useEffect(() => {
    if (review && !currentReview) {
      setPricingVerified(false); setReview(null);
    }
  }, [review, currentReview]);

  function refreshRun(id: string) {
    void queryClient.invalidateQueries({ queryKey: [...runKey(id)] });
    void queryClient.invalidateQueries({ queryKey: [...RUNS_KEY] });
  }

  async function pickDocs() {
    if (documentPickerOpenRef.current || mutationBlocked || contextBusy) return;
    const epoch = active.current;
    const remaining = COMMERCIAL_PAINT_DOCUMENT_POLICY.maxFiles - picked.length;
    if (remaining <= 0) {
      setDocumentNote(null);
      setNote(
        `You can add up to ${COMMERCIAL_PAINT_DOCUMENT_POLICY.maxFiles} documents to one upload. Remove one to choose another.`,
      );
      return;
    }
    documentPickerOpenRef.current = true;
    try {
      const result = await pickDocumentForUpload({
        ...COMMERCIAL_PAINT_DOCUMENT_POLICY,
        maxFiles: remaining,
      });
      if (epoch !== active.current) return;
      if (result.kind === 'cancelled') return;
      if (result.kind === 'denied' || result.kind === 'failed') {
        setDocumentNote(null);
        setNote(result.message);
        return;
      }
      if (result.kind === 'rejected') {
        setDocumentNote(null);
        setNote(result.problem.message);
        return;
      }
      const next = [...picked, ...result.files];
      if (next.length > COMMERCIAL_PAINT_DOCUMENT_POLICY.maxFiles) {
        setDocumentNote(null);
        setNote(
          `You can add up to ${COMMERCIAL_PAINT_DOCUMENT_POLICY.maxFiles} documents to one upload. Remove one to choose another.`,
        );
        return;
      }
      setPicked(next);
      setNote(null);
      setDocumentNote(uploadSelectionNote(result));
    } finally {
      documentPickerOpenRef.current = false;
    }
  }

  async function uploadAll() {
    if (picked.length === 0 || mutationBlocked || contextBusy || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    resetPricingProof();
    setNote(null);
    setDocumentNote(null);
    dispatch({ type: 'SIGN_START', fileCount: picked.length });
    let stage: 'sign' | 'transfer' | 'complete' = 'sign';
    let attemptRunId = runId;
    try {
      const signed = await sign.mutateAsync(buildSignBody(picked, { jobName, siteAddress, runId }));
      if (epoch !== active.current) return;
      if (runId && signed.paintRunId !== runId) throw new Error('Upload preparation returned a different painting run. Refresh before continuing.');
      attemptRunId = signed.paintRunId;
      await resume.save(signed.paintRunId);
      if (epoch !== active.current) return;
      setRunId(signed.paintRunId);
      dispatch({ type: 'SIGNED', runId: signed.paintRunId });

      stage = 'transfer';
      const pairs = zipUploads(picked, signed.uploads);
      for (const pair of pairs) {
        await putSignedFile(pair.target.signedUrl, pair.file);
        if (epoch !== active.current) return;
        dispatch({ type: 'FILE_PUT_OK' });
      }

      stage = 'complete';
      const completed = await complete.mutateAsync(buildCompleteBody(signed.paintRunId, pairs));
      if (epoch !== active.current) return;
      if (completed.paintRunId !== signed.paintRunId) throw new Error('Upload completion returned a different painting run. Refresh before continuing.');
      dispatch({ type: 'COMPLETED' });
      setPicked([]);
      refreshRun(signed.paintRunId);
    } catch (error) {
      if (epoch !== active.current) return;
      // Files and fields are kept. Retry requests fresh signed targets and
      // restarts the transfer; this pipeline never claims byte-level resume.
      dispatch({ type: 'FAILED' });
      const canReconcile = stage === 'complete' && attemptRunId !== null;
      if (canReconcile && attemptRunId) refreshRun(attemptRunId);
      setNote(uploadFailureNotice(error, 'painting document', { canReconcile }).message);
    } finally {
      mutationLock.current = false;
    }
  }

  async function runTakeoff() {
    if (!runId || mutationBlocked || contextBusy || extract.isPending || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    resetPricingProof();
    setNote(null);
    dispatch({ type: 'EXTRACT_START', runId });
    try {
      await extract.mutateAsync({ paintRunId: runId });
      if (epoch !== active.current) return;
      dispatch({ type: 'EXTRACTED' });
    } catch (error) {
      if (epoch !== active.current) return;
      // The takeoff may still be running server-side (a dropped connection
      // doesn't stop it) — the run poll decides the real outcome.
      setNote(
        apiErrorMessage(
          error,
          'The connection dropped — if the takeoff is still running on the server, the result lands here shortly.',
        ),
      );
    } finally {
      if (epoch === active.current) refreshRun(runId);
      mutationLock.current = false;
    }
  }

  async function priceTakeoff() {
    const extractionId = extraction?.id;
    if (!runId || !extractionId || !observedRevision || mutationBlocked || contextBusy || !labourValid || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    setNote(null);
    setPricingBlock(null);
    setPricingVerified(false);
    const attempt: PaintPricingAttempt = {
      sequence: ++pricingSequenceRef.current,
      runId,
      extractionId,
    };
    const verification = await repriceAndProveFreshBom(
      () => price.mutateAsync({ paintRunId: runId, extractionId, expectedRevision: observedRevision, ...(labourRate === undefined ? {} : { labourRatePerHr: labourRate }) }),
      () => runQuery.refetch(),
      extractionId,
      labourRate,
      observedRevision,
    );
    mutationLock.current = false;
    if (epoch !== active.current) return;
    void queryClient.invalidateQueries({ queryKey: [...RUNS_KEY] });
    if (
      !isCurrentPaintPricingAttempt(attempt, {
        sequence: pricingSequenceRef.current,
        runId: currentRunIdRef.current,
        extractionId: currentExtractionIdRef.current,
      })
    ) {
      return;
    }

    if (verification.previewRefreshed) dispatch({ type: 'PRICED' });
    if (verification.ok) {
      setReview({ pass: { paintRunId: runId, extractionId, ...verification.review }, revision: observedRevision, bom: verification.bom, labour: labourText, basis: verification.labourBasis.mode });
      setPricingVerified(true);
      return;
    }
    const block = classifyPaintPricingBlock(verification.error);
    setPricingBlock(block);
    if (isPaintPricingProofUnavailable(verification.error)) {
      setNote(PAINT_PRICING_PROOF_MESSAGE);
    } else if (!block) {
      setNote(
        apiErrorMessage(
          verification.error,
          'Pricing failed. Re-price successfully before saving this takeoff.',
        ),
      );
    }
  }

  async function saveAsQuote() {
    if (!NATIVE_PAINT_SAVE_RELEASE_READY || mutationBlocked || contextBusy || !currentReview || !canSavePaintQuote(bom, pricingBlock)) return;
    const epoch = active.current;
    setNote(null);
    try {
      await saving.save({ ...currentReview.pass, customerName: inputs.value.customerName, customerPhone: inputs.value.customerPhone });
      if (epoch !== active.current) return;
      dispatch({ type: 'SAVED' });
      refreshRun(currentReview.pass.paintRunId);
    } catch (error) {
      if (epoch === active.current) setNote(apiErrorMessage(error, 'The Save outcome is uncertain. Check its status before another calculation.'));
    }
  }

  async function retryEarlierSave() {
    const receipt = saving.receipt;
    if (!receipt || !canRestoreSaveInputs || !inputs.stored || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    setRetryPreparing(true); setNote(null);
    try {
      const original = await preparePaintSaveRetryInput(receipt, {
        customerName: inputs.value.customerName, customerPhone: inputs.value.customerPhone,
      });
      if (epoch !== active.current) return;
      // Explicit continuation of an existing receipt. It never creates a new
      // pricing pass or bypasses the separate new-Save release gate.
      await saving.save(original, 'retry');
      if (epoch !== active.current) return;
      dispatch({ type: 'SAVED' }); refreshRun(receipt.pass.paintRunId);
    } catch (error) {
      if (epoch === active.current) setNote(error instanceof PaintRetryInputError ? error.message :
        apiErrorMessage(error, 'The earlier Save is still unconfirmed. Check its status before continuing.'));
    } finally {
      mutationLock.current = false;
      if (epoch === active.current) setRetryPreparing(false);
    }
  }

  function changeDocType(id: string, docType: PaintDocType) {
    if (!runId || mutationBlocked || contextBusy || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    resetPricingProof();
    setDocType.mutate(
      { id, doc_type: docType },
      {
        onError: error =>
          epoch === active.current && setNote(apiErrorMessage(error, 'Could not update the document type. Try again.')),
        onSettled: () => { mutationLock.current = false; if (epoch === active.current) refreshRun(runId); },
      },
    );
  }

  function removeDoc(id: string) {
    if (!runId || mutationBlocked || contextBusy || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    resetPricingProof();
    removeUpload.mutate(
      { id },
      {
        onError: error =>
          epoch === active.current && setNote(apiErrorMessage(error, 'Could not remove that document. Try again.')),
        onSettled: () => { mutationLock.current = false; if (epoch === active.current) refreshRun(runId); },
      },
    );
  }

  async function openRun(id: string | null) {
    if (id === runId || mutationBlocked || contextBusy || mutationLock.current) return;
    mutationLock.current = true;
    const epoch = active.current;
    setSwitching(true);
    try {
      await resume.save(id);
      if (epoch !== active.current) return;
    resetPricingProof();
    dispatch({ type: 'RESET' });
    setRunId(id);
    setPicked([]);
    setNote(null);
    setPricingBlock(null);
    setPricingVerified(false);
    } catch (error) { if (epoch === active.current) setNote(apiErrorMessage(error, 'Could not store your run selection. Your current run is kept.')); }
    finally { mutationLock.current = false; if (epoch === active.current) setSwitching(false); }
  }

  const uploadLabel =
    pipeline.step === 'signing'
      ? 'Preparing upload…'
      : pipeline.step === 'uploading'
        ? `Uploading file ${Math.min(pipeline.fileIdx + 1, pipeline.fileCount)} of ${pipeline.fileCount}…`
        : pipeline.step === 'completing'
          ? 'Classifying documents…'
          : 'Upload & classify';
  const TakeoffAction = items.length > 0 ? GhostButton : PrimaryCta;
  const PricingAction = bom ? GhostButton : PrimaryCta;

  return (
    <View style={{ gap: spacing.xl }}>
      {note ? <Notice tone="danger" label="Something needs attention" body={note} /> : null}
      {!saving.loaded ? <Notice tone="accent" label="Checking earlier quote recovery…" /> : null}
      {saving.error ? <Notice tone="danger" label="Quote recovery needs attention" body={apiErrorMessage(saving.error)} onRetry={() => void saving.refresh()} /> : null}
      {resumeError ? <Notice tone="danger" label="Could not restore your run" body="Your saved run selection is kept. Retry before starting another run." onRetry={() => setResumeRetry(n => n + 1)} /> : null}
      {inputs.error ? <Notice tone="danger" label="Working copy needs attention" body="Your latest details are still on screen. Retry secure storage before leaving or continuing." onRetry={inputs.retry} /> : null}
      {inputs.loaded && !inputs.stored && !inputs.error ? <Notice tone="accent" label="Storing your working copy…" /> : null}
      {saving.receipt ? <Card style={{ gap: spacing.md }}>
        <Notice tone={saving.saved ? 'accent' : 'warn'} label={saving.saved ? 'Quote saved quietly' : 'Check an earlier Save'} body={saving.saved ? 'Your quote is in the owned quote queue. No customer message was sent.' : 'The earlier Save may have completed. Checking reads its status without submitting it again. New calculations stay locked until its outcome is verified.'} />
        <GhostButton label="Check Save status" loading={saving.busy} disabled={retryPreparing} onPress={() => { if (!mutationLock.current) void saving.refresh(); }} />
        {!saving.saved && !saving.receipt.quoteId ? <>
          <Text style={[styles.body, { color: colors.textSec }]}>To retry the earlier Save, restore its original customer details. A local working copy lasts seven days; you can re-enter the details here after it expires. The retry uses the original reviewed pricing and does not send a customer message.</Text>
          <Field label="Original customer name" value={inputs.value.customerName} maxLength={120} editable={canRestoreSaveInputs}
            onChangeText={customerName => { if (canRestoreSaveInputs && !mutationLock.current) inputs.update({ customerName }); }} />
          <Field label="Original customer phone" value={inputs.value.customerPhone} maxLength={40} keyboardType="phone-pad" editable={canRestoreSaveInputs}
            onChangeText={customerPhone => { if (canRestoreSaveInputs && !mutationLock.current) inputs.update({ customerPhone }); }} />
          <GhostButton label="Retry earlier Save" loading={saving.busy || retryPreparing} disabled={!canRestoreSaveInputs || !inputs.stored}
            onPress={() => void retryEarlierSave()} />
        </> : null}
        {saving.saved ? <>
          <GhostButton label="Open saved quote" onPress={() => router.push({ pathname: '/(tabs)/quotes', params: { quoteId: saving.saved!.quoteId } })} />
          <GhostButton label="Acknowledge saved quote" loading={saving.busy} onPress={() => { void saving.acknowledge(saving.saved!.quoteId).catch(() => {}); }} />
        </> : null}
      </Card> : null}

      {runQuery.isError && runId ? (
        <Notice
          tone="danger"
          label="Could not load this run"
          body={apiErrorMessage(runQuery.error)}
          onRetry={() => void runQuery.refetch()}
        />
      ) : null}
      {runId && runQuery.data && !observedRevision ? <Notice tone="warn" label={editSnapshot?.released ? 'This painting run is released' : 'Refresh the takeoff review'}
        body={editSnapshot?.released ? 'This released run is immutable. Open its saved quote to review it.' : 'The saved takeoff and its correction version could not be matched. Prices are hidden until a fresh read confirms the exact details shown here.'}
        onRetry={() => void runQuery.refetch()} /> : null}

      {serverStatus === 'failed' && !extracting ? (
        <Notice
          tone="warn"
          label="Last takeoff failed"
          body={
            runRow?.status_note ??
            'The model could not read the documents. Adjust them if needed, then run the takeoff again.'
          }
          onRetry={() => void runTakeoff()}
        />
      ) : null}

      {/* ── 01 · Documents ─────────────────────────────────────────────── */}
      <Card style={{ gap: spacing.md }}>
        <SectionLabel>01 · Job documents</SectionLabel>
        <Text style={[styles.body, { color: colors.textSec }]}>
          Add the architectural plan set (required) plus anything else you have — a painter’s
          measurement takeoff, services layouts, site photos. Each file is auto-classified; correct
          it below if we guessed wrong.
        </Text>
        <Field label="Job name" value={jobName} onChangeText={jobName => inputs.update({ jobName })} editable={!runId && canEditInputs} maxLength={200} height={52} />
        <Field label="Site address" value={siteAddress} onChangeText={siteAddress => inputs.update({ siteAddress })} editable={!runId && canEditInputs} maxLength={300} height={52} />
        {runId ? <Text style={[styles.hintLine, { color: colors.textDim }]}>Saved job details are read from the server. Use the web editor to change them.</Text> : null}

        {picked.map((file, i) => (
          <View key={`${file.uri}-${i}`} style={styles.fileRow}>
            <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={2}>
              {file.name}
            </Text>
            {fileMb(file.size) ? (
              <Text style={[styles.fileMeta, { color: colors.textDim }]}>{fileMb(file.size)}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${file.name}`}
              disabled={mutationBlocked || contextBusy}
              onPress={() => {
                setPicked(prev => prev.filter(f => f !== file));
                setDocumentNote(null);
              }}
              style={styles.textBtn}
              hitSlop={8}
            >
              <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>REMOVE</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={mutationBlocked || contextBusy}
          onPress={() => void pickDocs()}
          style={[styles.borderedBtn, { borderColor: colors.ctlLine }, uploadBusy && styles.dimmed]}
        >
          <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
            ADD PLANS &amp; PHOTOS
          </Text>
        </Pressable>
        <Text style={[styles.hintLine, { color: colors.textDim }]}>
          PDF · PNG · JPG · up to 32 MB each · {COMMERCIAL_PAINT_DOCUMENT_POLICY.maxFiles} files
        </Text>
        {documentNote ? (
          <Text style={[styles.hintLine, { color: colors.textDim }]}>{documentNote}</Text>
        ) : null}

        {picked.length > 0 ? (
          <PrimaryCta label={uploadLabel} onPress={() => void uploadAll()} loading={uploadBusy} disabled={mutationBlocked || contextBusy} />
        ) : null}
      </Card>

      {/* Classified documents (server truth) */}
      {runId && uploads.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>Classified documents</SectionLabel>
          {uploads.map(upload => (
            <DocRow
              key={upload.id}
              upload={upload}
              busy={mutationBlocked || contextBusy}
              onSetType={docType => changeDocType(upload.id, docType)}
              onRemove={() => removeDoc(upload.id)}
            />
          ))}
          {!hasPlanSet ? (
            <Text style={[styles.hintLine, { color: colors.warningBright }]}>
              Mark one document as the plan set to run the takeoff.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {/* ── 02 · AI takeoff ────────────────────────────────────────────── */}
      {runId && uploads.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>02 · AI takeoff</SectionLabel>
          {extracting ? (
            <Notice
              tone="accent"
              label="Takeoff running"
              body="A full drawing set takes 2–4 minutes. It keeps running on QuoteMax's servers even if you leave this screen or lose signal — the result lands here."
            />
          ) : (
            <Text style={[styles.body, { color: colors.textSec }]}>
              QuoteMax reads the plan set, finds the finishes schedule, measures the surfaces and
              reconciles against your measurements doc when you’ve added one.
            </Text>
          )}
          <TakeoffAction
            label={
              extracting ? 'Extracting…' : items.length > 0 ? 'Run takeoff again' : 'Run AI takeoff'
            }
            onPress={() => void runTakeoff()}
            loading={extracting || extract.isPending}
            disabled={!hasPlanSet || mutationBlocked || contextBusy}
          />
        </Card>
      ) : null}

      {/* ── 03 · Takeoff review (verbatim) ─────────────────────────────── */}
      {items.length > 0 ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>03 · Takeoff review</SectionLabel>
          {extraction?.overall_note ? (
            <Text style={[styles.body, { color: colors.textSec }]}>{extraction.overall_note}</Text>
          ) : null}
          {items.map((item, i) => (
            <ItemRow key={`${item.surface}-${i}`} item={item} />
          ))}
          {flags.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              {flags.map((flag, i) => (
                <Text
                  key={`${flag.kind}-${i}`}
                  style={[styles.flagLine, { color: colors.warningBright }]}
                >
                  {'⚑ '}
                  {flag.detail ?? `${flag.kind}: ${flag.surface ?? ''}`}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={[styles.hintLine, { color: colors.textDim }]}>
            Need to edit lines before pricing? Use the takeoff editor on the web — this screen
            prices the takeoff exactly as extracted.
          </Text>
          <Field label="Labour rate per hour (optional)" value={inputs.value.labour} onChangeText={labour => { resetPricingProof(); inputs.update({ labour }); }} editable={canEditInputs} maxLength={16} height={52} />
          <Text style={[styles.hintLine, { color: labourValid ? colors.textDim : colors.warningBright }]}>{labourValid ? 'Leave blank to use your current business rate. An override must be between $0.01 and $1,000.' : 'Enter a positive amount up to $1,000 with at most two decimal places.'}</Text>
          <PricingAction
            label={bom ? 'Re-price this takeoff' : 'Price this takeoff'}
            onPress={() => void priceTakeoff()}
            loading={price.isPending}
            disabled={mutationBlocked || contextBusy || !labourValid || !observedRevision}
          />
        </Card>
      ) : null}

      {/* ── 04 · Priced summary (verbatim) ─────────────────────────────── */}
      {bom ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>04 · Priced summary</SectionLabel>
          <PricedSummary bom={bom} />
          {currentReview ? <Notice tone="accent" label="Exact server pricing reviewed" body={`This review matches the saved takeoff and pricing generation ${currentReview.pass.pricedAt}. Labour uses ${currentReview.basis === 'override' ? 'your explicit override' : 'your business rate'}.`} /> : null}
          <Field label="Customer name (optional)" value={inputs.value.customerName} onChangeText={customerName => inputs.update({ customerName })} editable={canEditInputs} maxLength={120} height={52} />
          <Field label="Customer phone (optional)" value={inputs.value.customerPhone} onChangeText={customerPhone => inputs.update({ customerPhone })} editable={canEditInputs} maxLength={30} height={52} />
          <Text style={[styles.hintLine, { color: colors.textDim }]}>Customer details and labour choices are encrypted working copies on this device for up to seven days.</Text>
            <PaintPricingGate
              bom={bom}
              block={pricingBlock}
              busy={contextBusy || saving.busy}
              pricingVerified={!!currentReview}
              releaseReady={NATIVE_PAINT_SAVE_RELEASE_READY}
              onSave={() => void saveAsQuote()}
            />
          <Pressable
            accessibilityRole="button"
            disabled={mutationBlocked || contextBusy}
            onPress={() => void openRun(null)}
            style={styles.textBtn}
            hitSlop={8}
          >
            <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>START A NEW RUN</Text>
          </Pressable>
        </Card>
      ) : null}

      {!bom && pricingBlock ? (
        <Card>
          <PaintPricingGate bom={null} block={pricingBlock} busy onSave={() => {}} />
        </Card>
      ) : null}

      {/* ── Recent runs (resume rail) ──────────────────────────────────── */}
      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Recent runs</SectionLabel>
        {runsQuery.isPending ? (
          <Notice tone="accent" label="Loading your runs…" />
        ) : runsQuery.isError ? (
          <Notice
            tone="danger"
            label="Could not load recent runs"
            body={apiErrorMessage(runsQuery.error)}
            onRetry={() => void runsQuery.refetch()}
          />
        ) : (runsQuery.data?.runs.length ?? 0) === 0 ? (
          <Text style={[styles.body, { color: colors.textSec }]}>
            No runs yet — upload a plan set above to start your first takeoff.
          </Text>
        ) : (
          runsQuery.data?.runs.map(run => (
            <RunRow
              key={run.id}
              run={run}
              active={run.id === runId}
              onPress={() => void openRun(run.id)}
            />
          ))
        )}
      </Card>

      <WebOnlyCard
        label="The full takeoff editor is on the web"
        body="Edit line quantities, systems and exclusions, set a labour rate, preview a repaint and view the plans page by page on the web dashboard. Priced runs land in this queue either way."
        path="/dashboard?tab=commercial-painting"
        cta="Open the takeoff editor"
      />
    </View>
  );
}

// ── Rows (everything rendered verbatim from the API) ────────────────────────

function DocRow({
  upload,
  busy,
  onSetType,
  onRemove,
}: {
  upload: UploadRow;
  busy: boolean;
  onSetType: (docType: PaintDocType) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const mb = fileMb(upload.size_bytes);
  return (
    <View style={[styles.docRow, { borderColor: colors.inkLine }]}>
      <View style={styles.fileRow}>
        <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={2}>
          {upload.filename}
        </Text>
        {mb ? <Text style={[styles.fileMeta, { color: colors.textDim }]}>{mb}</Text> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${upload.filename}`}
          disabled={busy}
          onPress={onRemove}
          style={styles.textBtn}
          hitSlop={8}
        >
          <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>REMOVE</Text>
        </Pressable>
      </View>
      <PillGroup
        options={DOC_TYPES.map(t => [t, DOC_TYPE_LABELS[t]] as const)}
        value={upload.doc_type ?? 'other'}
        onChange={next => {
          if (!busy) onSetType(next as PaintDocType);
        }}
      />
    </View>
  );
}

function MetaChip({ label, warn }: { label: string; warn?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.chip,
        {
          color: warn ? colors.warningBright : colors.textSec,
          borderColor: warn ? colors.warningBright : colors.inkLine,
        },
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function ItemRow({ item }: { item: TakeoffItem }) {
  const { colors } = useTheme();
  const meta = [
    item.room,
    item.substrate,
    item.system ? item.system.replace(/_/g, ' ') : null,
    item.coats != null ? `${item.coats} coats` : null,
    item.height_m != null ? `${item.height_m} m high` : null,
  ]
    .filter((part): part is string => !!part)
    .join(' · ');
  // Quantity is the model's measurement, printed as-is — never recomputed.
  const qty = `${item.quantity} ${item.unit === 'item' ? (item.quantity === 1 ? 'item' : 'items') : 'm²'}`;
  return (
    <View style={[styles.itemRow, { borderColor: colors.inkLine }]}>
      <View style={styles.itemHead}>
        <Text style={[styles.itemSurface, { color: colors.textPri }]}>{item.surface}</Text>
        <Text style={[styles.itemQty, { color: colors.accentText }]}>{qty}</Text>
      </View>
      {meta ? <Text style={[styles.itemMeta, { color: colors.textDim }]}>{meta}</Text> : null}
      <View style={styles.chipRow}>
        {item.confidence ? (
          <MetaChip label={`${item.confidence} confidence`} warn={item.confidence === 'low'} />
        ) : null}
        {item.source ? <MetaChip label={item.source} /> : null}
        {item.delta_pct != null ? <MetaChip label={`Δ ${item.delta_pct}%`} warn /> : null}
        {item.separate_price ? <MetaChip label="Separate price" /> : null}
        {item.excluded ? <MetaChip label="Excluded" warn /> : null}
      </View>
      {item.note ? (
        <Text style={[styles.itemMeta, { color: colors.textSec }]}>{item.note}</Text>
      ) : null}
    </View>
  );
}

function SumRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sumRow}>
      <Text
        style={[
          styles.sumLabel,
          { color: bold ? colors.textPri : colors.textDim },
          bold && styles.boldLabel,
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <Text style={[styles.sumValue, { color: colors.textPri }, bold && styles.boldValue]}>
        {value}
      </Text>
    </View>
  );
}

export function PaintPricingGate({
  bom,
  block,
  busy,
  pricingVerified = false,
  releaseReady = false,
  onSave,
}: {
  bom: PricedBom | null;
  block: PaintPricingBlock | null;
  busy: boolean;
  pricingVerified?: boolean;
  releaseReady?: boolean;
  onSave: () => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {block === 'inspection_required' || (bom?.unmatched.length ?? 0) > 0 ? (
        <Notice
          tone="warn"
          label="On-site assessment required"
          body="One or more surfaces have no authoritative rate. No customer quote can be saved until an on-site assessment confirms the scope and rate."
        />
      ) : null}
      {block === 'tenant_pricing_required' ? (
        <WebOnlyCard
          label="Set your own commercial-paint rates"
          body="Price needed — adopt or enter your business's commercial-paint rates before saving a customer quote."
          path="/dashboard?tab=pricing"
          cta="Open pricing setup"
        />
      ) : null}
      {!pricingVerified ? (
        <Notice
          tone="warn"
          label="Versioned pricing check required"
          body="A successful re-price and server proof of the exact tenant rates and takeoff revision are required before Save can be enabled."
        />
      ) : null}
      {!releaseReady ? <Notice tone="warn" label="Mobile Save is awaiting release checks" body="Reviewed pricing is available here. Saving new painting quotes stays unavailable until correction recovery and release acceptance are complete." /> : null}
      {bom ? (
        <PrimaryCta
          label="Save as quote"
          onPress={onSave}
          loading={busy}
          disabled={busy || !releaseReady || !pricingVerified || !canSavePaintQuote(bom, block)}
        />
      ) : null}
    </View>
  );
}

export function PricedSummary({ bom }: { bom: PricedBom }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ gap: spacing.xs }}>
        {bom.lines.map((line, i) => (
          <View key={`${line.surface}-${i}`} style={styles.sumRow}>
            <View style={styles.lineHead}>
              <Text style={[styles.lineSurface, { color: colors.textPri }]} numberOfLines={2}>
                {line.surface}
              </Text>
              <Text style={[styles.itemMeta, { color: colors.textDim }]}>
                {[
                  line.room,
                  `${line.quantity} ${line.unit === 'item' ? 'items' : 'm²'}`,
                  line.product,
                ]
                  .filter((part): part is string => !!part)
                  .join(' · ')}
              </Text>
            </View>
            <Text style={[styles.sumValue, { color: colors.textPri }]}>{aud(line.lineExGst)}</Text>
          </View>
        ))}
      </View>

      {bom.separate && bom.separate.lines.length > 0 ? (
        <View style={[styles.block, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.blockLabel, { color: colors.textDim }]}>SEPARATE PRICES</Text>
          {bom.separate.lines.map((line, i) => (
            <SumRow key={`${line.surface}-${i}`} label={line.surface} value={aud(line.lineExGst)} />
          ))}
          <SumRow label="Separate total ex GST" value={aud(bom.separate.exGst)} />
        </View>
      ) : null}

      <View style={[styles.block, { borderTopColor: colors.inkLine }]}>
        <Text style={[styles.blockLabel, { color: colors.textDim }]}>LABOUR</Text>
        <SumRow
          label={`${bom.labour.hours} h × ${aud(bom.labour.ratePerHr)}/hr`}
          value={aud(bom.labour.costExGst)}
        />
        {bom.labour.crewSize != null && bom.labour.estimatedDays != null ? (
          <Text style={[styles.itemMeta, { color: colors.textDim }]}>
            {`Crew of ${bom.labour.crewSize} · about ${bom.labour.estimatedDays} days on site`}
          </Text>
        ) : null}
      </View>

      {bom.materials.length > 0 ? (
        <View style={[styles.block, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.blockLabel, { color: colors.textDim }]}>MATERIALS</Text>
          {bom.materials.map((mat, i) => (
            <SumRow
              key={`${mat.product}-${i}`}
              label={
                mat.litres != null && mat.pricePerL != null
                  ? `${mat.product} · ${mat.litres} L × ${aud(mat.pricePerL)}/L`
                  : mat.product
              }
              value={aud(mat.costExGst)}
            />
          ))}
          <SumRow label="Materials ex GST" value={aud(bom.materialsExGst)} />
        </View>
      ) : null}

      {bom.equipment.length > 0 ? (
        <View style={[styles.block, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.blockLabel, { color: colors.textDim }]}>EQUIPMENT</Text>
          {bom.equipment.map((eq, i) => (
            <View key={`${eq.label}-${i}`} style={{ gap: 2 }}>
              <SumRow
                label={
                  eq.days != null && eq.dayRate != null
                    ? `${eq.label} · ${eq.days} days × ${aud(eq.dayRate)}`
                    : eq.label
                }
                value={aud(eq.costExGst)}
              />
              {eq.reason ? (
                <Text style={[styles.itemMeta, { color: colors.textDim }]}>{eq.reason}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {bom.unmatched.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {bom.unmatched.map((row, i) => (
            <Text
              key={`${row.surface}-${i}`}
              style={[styles.flagLine, { color: colors.warningBright }]}
            >
              {`Not priced — no matching rate: ${row.surface}${row.room ? ` (${row.room})` : ''}`}
            </Text>
          ))}
        </View>
      ) : null}

      {bom.excluded.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          {bom.excluded.map((row, i) => (
            <Text key={`${row.surface}-${i}`} style={[styles.itemMeta, { color: colors.textDim }]}>
              {`Excluded: ${row.surface}${row.room ? ` (${row.room})` : ''}`}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={[styles.block, { borderTopColor: colors.inkLine }]}>
        <SumRow label="Subtotal ex GST" value={aud(bom.subtotalExGst)} />
        <SumRow label={bom.gstRegistered ? 'GST' : 'No GST charged'} value={aud(bom.gst)} />
        <View style={styles.sumRow}>
          <Text style={[styles.sumLabel, styles.boldLabel, { color: colors.textPri }]}>
            {bom.gstRegistered ? 'TOTAL INC GST' : 'TOTAL — NO GST CHARGED'}
          </Text>
          <Text style={[styles.totalValue, { color: colors.accentText }]}>
            {aud(bom.totalIncGst)}
          </Text>
        </View>
      </View>

      {bom.assumptions.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.blockLabel, { color: colors.textDim }]}>ASSUMPTIONS</Text>
          {bom.assumptions.map(line => (
            <Text key={line} style={[styles.itemMeta, { color: colors.textSec }]}>
              {'· '}
              {line}
            </Text>
          ))}
        </View>
      ) : null}
      {bom.exclusions.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[styles.blockLabel, { color: colors.textDim }]}>EXCLUSIONS</Text>
          {bom.exclusions.map(line => (
            <Text key={line} style={[styles.itemMeta, { color: colors.textSec }]}>
              {'· '}
              {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RunRow({
  run,
  active,
  onPress,
}: {
  run: RunListItem;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const statusColor =
    run.status === 'priced'
      ? colors.successBright
      : run.status === 'ready'
        ? colors.accentText
        : run.status === 'extracting'
          ? colors.warningBright
          : run.status === 'failed'
            ? colors.dangerBright
            : colors.textDim;
  const when = run.created_at
    ? new Date(run.created_at).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open run ${run.job_name ?? 'untitled'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.runRow,
        {
          borderColor: active ? colors.accent : colors.inkLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
        },
      ]}
    >
      <View style={styles.lineHead}>
        <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={2}>
          {run.job_name ?? 'Untitled run'}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textDim }]} numberOfLines={2}>
          {[run.site_address, when].filter((part): part is string => !!part).join(' · ')}
        </Text>
      </View>
      <Text style={[styles.runStatus, { color: statusColor }]}>
        {(RUN_STATUS_LABELS[run.status] ?? run.status).toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  hintLine: { fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.3, lineHeight: 18 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileName: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  fileMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  textBtn: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  textBtnLabel: { fontFamily: fonts.sans.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.4 },
  borderedBtn: {
    minHeight: touch.minimum,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dimmed: { opacity: 0.5 },
  docRow: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemRow: { borderTopWidth: 1, paddingTop: spacing.lg, gap: spacing.sm },
  itemHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemSurface: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 14 },
  itemQty: {
    fontFamily: fonts.mono.bold,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  itemMeta: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18, letterSpacing: 0.3 },
  flagLine: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  sumRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sumLabel: {
    flexShrink: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  sumValue: {
    fontFamily: fonts.mono.medium,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  boldLabel: { fontFamily: fonts.mono.bold },
  boldValue: { fontFamily: fonts.mono.bold },
  totalValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 24,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  block: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  blockLabel: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  lineHead: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0, gap: spacing.xs },
  lineSurface: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  runRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touch.listRow,
  },
  runStatus: { fontFamily: fonts.mono.bold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
});
