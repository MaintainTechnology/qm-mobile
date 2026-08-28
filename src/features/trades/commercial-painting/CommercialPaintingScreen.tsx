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
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import { sizeOk, type PickedFile } from '@/lib/media';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import {
  ACCEPTED_DOC_MIME,
  buildCompleteBody,
  buildSignBody,
  canSavePaintQuote,
  classifyPaintPricingBlock,
  DOC_TYPES,
  initialPipeline,
  loadPersistedRunId,
  MAX_DOC_BYTES,
  persistRunId,
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
  useSaveQuote,
  useSetDocType,
  useSignUploads,
  zipUploads,
  type PaintDocType,
  type PaintPricingBlock,
  type PricedBom,
  type RunListItem,
  type SavedQuote,
  type TakeoffItem,
  type UploadRow,
} from './api';
import { WebOnlyCard } from '../hub/SectionsContent';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';

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
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [runId, setRunId] = useState<string | null>(null);
  const [pipeline, dispatch] = useReducer(pipelineReducer, initialPipeline);
  const [picked, setPicked] = useState<PickedFile[]>([]);
  const [jobName, setJobName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [savedQuote, setSavedQuote] = useState<SavedQuote | null>(null);
  const [pricingBlock, setPricingBlock] = useState<PaintPricingBlock | null>(null);

  const sign = useSignUploads();
  const complete = useCompleteUploads();
  const setDocType = useSetDocType();
  const removeUpload = useRemoveUpload();
  const extract = useExtract();
  const price = usePrice();
  const saveQuote = useSaveQuote();
  const runQuery = useRun(runId);
  const runsQuery = useRuns();

  // Resume: the persisted run id survives an app kill; the run query then
  // brings back the server's state and RESUME lands the machine on it.
  useEffect(() => {
    void loadPersistedRunId().then(id => {
      if (id) setRunId(id);
    });
  }, []);

  const serverStatus = runQuery.data?.run.status ?? null;
  useEffect(() => {
    // While the extract POST is in flight the server row can lag the client —
    // don't let a stale 'draft' re-enable the button mid-call.
    if (!runId || !serverStatus || extract.isPending) return;
    dispatch({ type: 'RESUME', runId, status: serverStatus });
  }, [runId, serverStatus, extract.isPending]);

  const runRow = runQuery.data?.run ?? null;
  useEffect(() => {
    if (!runRow) return;
    setJobName(prev => prev || (runRow.job_name ?? ''));
    setSiteAddress(prev => prev || (runRow.site_address ?? ''));
  }, [runRow]);

  const uploads = runQuery.data?.uploads ?? [];
  const extraction = runQuery.data?.extraction ?? null;
  const corrected = extraction?.corrected_items ?? [];
  const items: TakeoffItem[] = corrected.length > 0 ? corrected : (extraction?.items ?? []);
  const flags = extraction?.sheets_used?.flags ?? [];
  const bom = extraction?.priced_bom ?? null;
  const hasPlanSet = uploads.some(u => u.doc_type === 'plan_set');

  const uploadBusy =
    pipeline.step === 'signing' || pipeline.step === 'uploading' || pipeline.step === 'completing';
  const extracting = pipeline.step === 'extracting' || serverStatus === 'extracting';
  const docBusy = setDocType.isPending || removeUpload.isPending;

  function refreshRun(id: string) {
    void queryClient.invalidateQueries({ queryKey: [...runKey(id)] });
    void queryClient.invalidateQueries({ queryKey: [...RUNS_KEY] });
  }

  async function pickDocs() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [...ACCEPTED_DOC_MIME],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const files: PickedFile[] = [];
    for (const asset of result.assets) {
      const file: PickedFile = {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/pdf',
        size: asset.size ?? undefined,
      };
      if (!sizeOk(file, MAX_DOC_BYTES)) {
        setNote(`${file.name} is over 32 MB — export a smaller file and try again.`);
        continue;
      }
      files.push(file);
    }
    if (files.length > 0) setPicked(prev => [...prev, ...files]);
  }

  async function uploadAll() {
    if (picked.length === 0 || uploadBusy) return;
    setNote(null);
    dispatch({ type: 'SIGN_START', fileCount: picked.length });
    try {
      const signed = await sign.mutateAsync(buildSignBody(picked, { jobName, siteAddress, runId }));
      setRunId(signed.paintRunId);
      void persistRunId(signed.paintRunId);
      dispatch({ type: 'SIGNED', runId: signed.paintRunId });

      const pairs = zipUploads(picked, signed.uploads);
      for (const pair of pairs) {
        await putSignedFile(pair.target.signedUrl, pair.file);
        dispatch({ type: 'FILE_PUT_OK' });
      }

      await complete.mutateAsync(buildCompleteBody(signed.paintRunId, pairs));
      dispatch({ type: 'COMPLETED' });
      setPicked([]);
      refreshRun(signed.paintRunId);
    } catch (error) {
      // Files and fields are kept; a retry re-signs against the same run.
      dispatch({ type: 'FAILED' });
      // putSignedFile throws plain Errors with tradie-ready copy (which file,
      // which HTTP status) — pass that through; ApiErrors map as usual.
      const fallback =
        error instanceof Error && error.message.startsWith('Uploading ')
          ? error.message
          : 'Upload failed. Your files are kept — try again.';
      setNote(apiErrorMessage(error, fallback));
    }
  }

  async function runTakeoff() {
    if (!runId || extracting || extract.isPending) return;
    setNote(null);
    setSavedQuote(null);
    dispatch({ type: 'EXTRACT_START', runId });
    try {
      await extract.mutateAsync({ paintRunId: runId });
      dispatch({ type: 'EXTRACTED' });
    } catch (error) {
      // The takeoff may still be running server-side (a dropped connection
      // doesn't stop it) — the run poll decides the real outcome.
      setNote(
        apiErrorMessage(
          error,
          'The connection dropped — if the takeoff is still running on the server, the result lands here shortly.',
        ),
      );
    } finally {
      refreshRun(runId);
    }
  }

  async function priceTakeoff() {
    const extractionId = extraction?.id;
    if (!runId || !extractionId || price.isPending) return;
    setNote(null);
    setPricingBlock(null);
    try {
      await price.mutateAsync({ paintRunId: runId, extractionId });
      dispatch({ type: 'PRICED' });
    } catch (error) {
      const block = classifyPaintPricingBlock(error);
      setPricingBlock(block);
      if (!block) setNote(apiErrorMessage(error, 'Pricing failed. The takeoff is safe — try again.'));
    } finally {
      refreshRun(runId);
    }
  }

  async function saveAsQuote() {
    const extractionId = extraction?.id;
    if (!runId || !extractionId || saveQuote.isPending || !canSavePaintQuote(bom, pricingBlock)) return;
    setNote(null);
    try {
      const saved = await saveQuote.mutateAsync({ paintRunId: runId, extractionId });
      setSavedQuote(saved);
      dispatch({ type: 'SAVED' });
      // A saved run no longer needs auto-resume on next launch.
      void persistRunId(null);
      refreshRun(runId);
    } catch (error) {
      setNote(apiErrorMessage(error, 'Saving the quote failed. The pricing is kept — try again.'));
    }
  }

  function changeDocType(id: string, docType: PaintDocType) {
    if (!runId) return;
    setDocType.mutate(
      { id, doc_type: docType },
      {
        onError: error =>
          setNote(apiErrorMessage(error, 'Could not update the document type. Try again.')),
        onSettled: () => refreshRun(runId),
      },
    );
  }

  function removeDoc(id: string) {
    if (!runId) return;
    removeUpload.mutate(
      { id },
      {
        onError: error =>
          setNote(apiErrorMessage(error, 'Could not remove that document. Try again.')),
        onSettled: () => refreshRun(runId),
      },
    );
  }

  function openRun(id: string) {
    if (id === runId) return;
    dispatch({ type: 'RESET' });
    setRunId(id);
    void persistRunId(id);
    setPicked([]);
    setJobName('');
    setSiteAddress('');
    setNote(null);
    setSavedQuote(null);
    setPricingBlock(null);
  }

  function startNewRun() {
    dispatch({ type: 'RESET' });
    setRunId(null);
    void persistRunId(null);
    setPicked([]);
    setJobName('');
    setSiteAddress('');
    setNote(null);
    setSavedQuote(null);
    setPricingBlock(null);
  }

  const uploadLabel =
    pipeline.step === 'signing'
      ? 'Preparing upload…'
      : pipeline.step === 'uploading'
        ? `Uploading file ${Math.min(pipeline.fileIdx + 1, pipeline.fileCount)} of ${pipeline.fileCount}…`
        : pipeline.step === 'completing'
          ? 'Classifying documents…'
          : 'Upload & classify';

  return (
    <View style={{ gap: spacing.lg }}>
      {note ? <Notice tone="danger" label="Something needs attention" body={note} /> : null}

      {runQuery.isError && runId ? (
        <Notice
          tone="danger"
          label="Could not load this run"
          body={apiErrorMessage(runQuery.error)}
          onRetry={() => void runQuery.refetch()}
        />
      ) : null}

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
        <Field label="Job name" value={jobName} onChangeText={setJobName} height={52} />
        <Field
          label="Site address"
          value={siteAddress}
          onChangeText={setSiteAddress}
          height={52}
        />

        {picked.map((file, i) => (
          <View key={`${file.uri}-${i}`} style={styles.fileRow}>
            <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={1}>
              {file.name}
            </Text>
            {fileMb(file.size) ? (
              <Text style={[styles.fileMeta, { color: colors.textDim }]}>{fileMb(file.size)}</Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${file.name}`}
              disabled={uploadBusy}
              onPress={() => setPicked(prev => prev.filter(f => f !== file))}
              style={styles.textBtn}
              hitSlop={8}
            >
              <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>REMOVE</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          disabled={uploadBusy}
          onPress={() => void pickDocs()}
          style={[styles.borderedBtn, { borderColor: colors.ctlLine }, uploadBusy && styles.dimmed]}
        >
          <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
            ADD PLANS &amp; PHOTOS
          </Text>
        </Pressable>
        <Text style={[styles.hintLine, { color: colors.textDim }]}>
          PDF · PNG · JPG · up to 32 MB each
        </Text>

        {picked.length > 0 ? (
          <PrimaryCta label={uploadLabel} onPress={() => void uploadAll()} loading={uploadBusy} />
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
              busy={docBusy || uploadBusy || extracting}
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
          <PrimaryCta
            label={extracting ? 'Extracting…' : items.length > 0 ? 'Run takeoff again' : 'Run AI takeoff'}
            onPress={() => void runTakeoff()}
            loading={extracting || extract.isPending}
            disabled={!hasPlanSet || uploadBusy}
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
          <PrimaryCta
            label={bom ? 'Re-price this takeoff' : 'Price this takeoff'}
            onPress={() => void priceTakeoff()}
            loading={price.isPending}
            disabled={uploadBusy || extracting}
          />
        </Card>
      ) : null}

      {/* ── 04 · Priced summary (verbatim) ─────────────────────────────── */}
      {bom ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>04 · Priced summary</SectionLabel>
          <PricedSummary bom={bom} />
          {pipeline.step === 'saved' && savedQuote ? (
            <Notice
              tone="accent"
              label={savedQuote.alreadySaved ? 'Already saved' : 'Quote saved'}
              body="It's in your quote queue — open the Quotes tab to send it or take a deposit."
            />
          ) : (
            <PaintPricingGate
              bom={bom}
              block={pricingBlock}
              busy={uploadBusy || extracting || price.isPending || saveQuote.isPending}
              onSave={() => void saveAsQuote()}
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={startNewRun}
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
              onPress={() => openRun(run.id)}
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
        <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={1}>
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
  onSave,
}: {
  bom: PricedBom | null;
  block: PaintPricingBlock | null;
  busy: boolean;
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
      {bom ? (
        <PrimaryCta
          label="Save as quote"
          onPress={onSave}
          loading={busy}
          disabled={busy || !canSavePaintQuote(bom, block)}
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
                label={eq.days != null && eq.dayRate != null
                  ? `${eq.label} · ${eq.days} days × ${aud(eq.dayRate)}`
                  : eq.label}
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
            <Text key={`${row.surface}-${i}`} style={[styles.flagLine, { color: colors.warningBright }]}>
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
        <SumRow
          label={bom.gstRegistered ? 'GST' : 'No GST charged'}
          value={aud(bom.gst)}
        />
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
        <Text style={[styles.fileName, { color: colors.textPri }]} numberOfLines={1}>
          {run.job_name ?? 'Untitled run'}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textDim }]} numberOfLines={1}>
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
  body: { fontFamily: fonts.sans.regular, fontSize: 13.5, lineHeight: 20 },
  hintLine: { fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileName: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  fileMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  textBtn: { minHeight: touch.minimum, alignSelf: 'flex-start', justifyContent: 'center' },
  textBtnLabel: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
  borderedBtn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
  },
  dimmed: { opacity: 0.5 },
  docRow: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  itemRow: { borderTopWidth: 1, paddingTop: spacing.sm, gap: 6 },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemSurface: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 14 },
  itemQty: {
    fontFamily: fonts.mono.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  itemMeta: { fontFamily: fonts.mono.medium, fontSize: 10, lineHeight: 15, letterSpacing: 0.5 },
  flagLine: { fontFamily: fonts.sans.medium, fontSize: 12.5, lineHeight: 18 },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sumLabel: {
    flexShrink: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  sumValue: {
    fontFamily: fonts.mono.medium,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  boldLabel: { fontFamily: fonts.mono.bold },
  boldValue: { fontFamily: fonts.mono.bold },
  totalValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  block: { borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.xs },
  blockLabel: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  lineHead: { flex: 1, minWidth: 0, gap: 2 },
  lineSurface: { fontFamily: fonts.sans.regular, fontSize: 13 },
  runRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: touch.minimum,
  },
  runStatus: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
});
