/**
 * Electrical plan estimator (native) — the web Estimator (Beta) at mobile
 * scope. Pick a plan PDF (≤32 MB) → optional sheet hint → one long extract
 * call (~1–2 min) → review the AI's take-off counts (editable, saved via
 * PATCH) → price against the tradie's own catalogue → the priced BOM rendered
 * VERBATIM, uncatalogued items flagged unmatched, never guessed. Past runs
 * list below and reopen from server state.
 *
 * The active run id persists to AsyncStorage, so an app kill after extraction
 * resumes the run instead of losing it. Refine-with-pins (the plan overlay)
 * stays on the web — the link-out below the review list points there.
 */
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import type { PickedFile } from '@/lib/media';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import {
  buildExtractForm,
  clearExtractId,
  countProblem,
  deviceTotal,
  effectiveItems,
  itemsToRows,
  persistExtractId,
  PIPELINE_IDLE,
  pipelineReduce,
  pipelineRunId,
  planPdfProblem,
  readExtractId,
  rowsToItems,
  rowsToPriceItems,
  useEstimatorHistory,
  useEstimatorRun,
  useExtractPlan,
  usePriceTakeoff,
  useSaveCounts,
  type Confidence,
  type EditableCount,
  type HistoryUpload,
  type PricedBom,
} from './estimator-api';
import { LinkOutButton } from '../hub/LinkOut';
import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';

/** API dollars → displayed AUD. Display conversion only — never arithmetic. */
function aud(dollars: number): string {
  return formatAud(centsFromApiDollars(dollars));
}

export function EstimatorScreen() {
  const { colors } = useTheme();

  const [state, dispatch] = useReducer(pipelineReduce, PIPELINE_IDLE);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [sheetHint, setSheetHint] = useState('ELECTRICAL / POWER & DATA');
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [rows, setRows] = useState<EditableCount[]>([]);
  const [planName, setPlanName] = useState<string | null>(null);
  const [modelNote, setModelNote] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [priced, setPriced] = useState<PricedBom | null>(null);
  const [priceMeta, setPriceMeta] = useState<{ catalogueSize: number; source: string } | null>(
    null,
  );

  const runId = pipelineRunId(state);
  const extract = useExtractPlan();
  const price = usePriceTakeoff();
  const save = useSaveCounts(runId);
  const run = useEstimatorRun(runId);
  const history = useEstimatorHistory();

  // Resume: a run id persisted before an app kill reopens that run from the
  // server's saved state on next launch.
  const resumed = useRef(false);
  useEffect(() => {
    if (resumed.current) return;
    resumed.current = true;
    void readExtractId().then(id => {
      if (id) dispatch({ type: 'resume', id });
    });
  }, []);

  // Seed the editor when a resumed/reopened run lands.
  const detail = run.data?.run;
  useEffect(() => {
    if (state.stage !== 'extracting' || !detail) return;
    setRows(itemsToRows(effectiveItems(detail)));
    setPlanName(detail.plan_uploads?.filename ?? null);
    setModelNote(detail.overall_note ?? null);
    setPriced(detail.priced_bom ?? null);
    setPriceMeta(null);
    setDirty(false);
    // An already-priced run is finished business — nothing left to resume.
    if (detail.priced_bom) void clearExtractId();
    dispatch({ type: 'loaded', priced: detail.priced_bom != null });
  }, [state.stage, detail]);

  const busy = extract.isPending || price.isPending || save.isPending;
  const badCount = rows.some(r => countProblem(r.count) !== null);
  const lowCount = rows.filter(r => r.confidence === 'low').length;
  const inRun = runId !== null;
  const showReview =
    state.stage === 'review' ||
    state.stage === 'pricing' ||
    state.stage === 'priced' ||
    (state.stage === 'failed' && state.at === 'pricing');

  async function pickPdf() {
    if (extract.isPending) return;
    dispatch({ type: 'pick' });
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf'],
      copyToCacheDirectory: true,
    });
    dispatch({ type: 'picked' });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const next: PickedFile = {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? '',
      size: asset.size ?? undefined,
    };
    const problem = planPdfProblem(next);
    if (problem) {
      setFileNote(problem);
      return;
    }
    setFileNote(null);
    setFile(next);
  }

  function analyse() {
    if (!file || extract.isPending) return;
    dispatch({ type: 'upload' });
    extract.mutate(buildExtractForm(file, sheetHint), {
      onSuccess: res => {
        // The finished take-off came back with the POST — persist the id so an
        // app kill from here on resumes this run, then land in review.
        void persistExtractId(res.extractionId);
        setRows(itemsToRows(res.items));
        setPlanName(res.filename);
        setModelNote(res.overallNote ?? null);
        setPriced(null);
        setPriceMeta(null);
        setDirty(false);
        dispatch({ type: 'extracted', id: res.extractionId });
      },
      onError: () => dispatch({ type: 'fail' }),
    });
  }

  function priceIt() {
    if (!runId || price.isPending || save.isPending) return;
    const items = rowsToPriceItems(rows);
    if (items.length === 0) return;
    dispatch({ type: 'price' });
    price.mutate(
      { items, extractionId: runId },
      {
        onSuccess: res => {
          setPriced(res.bom);
          setPriceMeta({ catalogueSize: res.catalogueSize, source: res.pricingBookSource });
          void clearExtractId();
          dispatch({ type: 'priced' });
        },
        onError: () => dispatch({ type: 'fail' }),
      },
    );
  }

  function saveCounts() {
    if (!runId || save.isPending || price.isPending) return;
    save.mutate(
      { corrected_items: rowsToItems(rows) },
      {
        onSuccess: () => {
          setDirty(false);
          // The server cleared its persisted BOM — the old counts priced it.
          setPriced(null);
          setPriceMeta(null);
        },
      },
    );
  }

  function editCount(index: number, value: string) {
    setRows(rs => rs.map((r, i) => (i === index ? { ...r, count: value } : r)));
    setDirty(true);
    if (state.stage === 'priced') {
      // Edits invalidate the price until re-priced (web parity).
      setPriced(null);
      setPriceMeta(null);
      dispatch({ type: 'edit' });
    }
  }

  function openRun(id: string) {
    // An unpriced reopen counts as in-flight again — persist so a kill resumes
    // it; the seed effect clears the id if the run turns out already priced.
    void persistExtractId(id);
    setRows([]);
    setPlanName(null);
    setModelNote(null);
    setPriced(null);
    setPriceMeta(null);
    setDirty(false);
    dispatch({ type: 'resume', id });
  }

  function startAgain() {
    void clearExtractId();
    setFile(null);
    setFileNote(null);
    setRows([]);
    setPlanName(null);
    setModelNote(null);
    setPriced(null);
    setPriceMeta(null);
    setDirty(false);
    extract.reset();
    price.reset();
    save.reset();
    dispatch({ type: 'dismiss' });
  }

  return (
    <View style={{ gap: spacing.xl }}>
      {!inRun ? (
        <Card style={{ gap: spacing.md }}>
          <SectionLabel>Plan take-off</SectionLabel>
          <Text style={[styles.body, { color: colors.textSec }]}>
            Upload an electrical plan PDF (max 32 MB). The AI reads the legend and counts every
            symbol — then you check the counts and price them from your own catalogue. Nothing is
            priced that isn’t in your pricing book.
          </Text>
          {file ? (
            <View style={styles.attachRow}>
              <Text style={[styles.attachName, { color: colors.textPri }]} numberOfLines={2}>
                {file.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setFile(null)}
                disabled={extract.isPending}
                style={styles.textBtn}
                hitSlop={8}
              >
                <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>REMOVE</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => void pickPdf()}
              disabled={extract.isPending}
              style={[styles.borderedBtn, { borderColor: colors.ctlLine }]}
            >
              <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
                CHOOSE THE PLAN PDF
              </Text>
            </Pressable>
          )}
          {fileNote ? (
            <Text style={[styles.warnLine, { color: colors.warningBright }]}>{fileNote}</Text>
          ) : null}
          <Field label="Sheet hint" value={sheetHint} onChangeText={setSheetHint} height={52} />
          <Text style={[styles.dimLine, { color: colors.textDim }]}>
            Which sheet matters — the title-block name, e.g. “LIGHTING” or “POWER & DATA”.
          </Text>
          <PrimaryCta
            label="Analyse plan"
            onPress={analyse}
            loading={extract.isPending}
            disabled={!file}
          />
          {extract.isPending ? (
            <Text style={[styles.body, { color: colors.textSec }]}>
              Reading the drawing — legend first, then symbol counts. Takes a minute or two; keep
              QuoteMax open until the take-off lands.
            </Text>
          ) : null}
          {extract.isError ? (
            <Notice
              tone="danger"
              label="Could not analyse the plan"
              body={apiErrorMessage(extract.error)}
              onRetry={analyse}
            />
          ) : null}
        </Card>
      ) : (
        <>
          {state.stage === 'extracting' ? (
            run.isError && !run.isFetching ? (
              <Notice
                tone="danger"
                label="Could not load the run"
                body={apiErrorMessage(run.error)}
                onRetry={() => void run.refetch()}
              />
            ) : (
              <Notice
                tone="accent"
                label="Loading the run…"
                body="Fetching the saved take-off from QuoteMax."
              />
            )
          ) : null}

          {showReview ? (
            <Card style={{ gap: spacing.md }}>
              <SectionLabel>Take-off</SectionLabel>
              {planName ? (
                <Text style={[styles.planName, { color: colors.textPri }]} numberOfLines={2}>
                  {planName}
                </Text>
              ) : null}
              <Text style={[styles.dimLine, { color: colors.textDim }]}>
                {rows.length} lines · {deviceTotal(rowsToItems(rows))} devices
                {dirty ? ' · unsaved edits' : ''}
              </Text>
              {lowCount > 0 ? (
                <Text style={[styles.warnLine, { color: colors.warningBright }]}>
                  {lowCount} low-confidence {lowCount === 1 ? 'count' : 'counts'} (amber dot) —
                  check them against the drawing before quoting.
                </Text>
              ) : null}
              <View style={[styles.rowsWrap, { borderTopColor: colors.inkLine }]}>
                {rows.map((row, i) => (
                  <View key={`${row.type}-${i}`} style={styles.itemRow}>
                    <ConfidenceDot level={row.confidence} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.itemType, { color: colors.textPri }]}>{row.type}</Text>
                      {row.symbol ? (
                        <Text style={[styles.itemMeta, { color: colors.textDim }]}>
                          {row.symbol.toUpperCase()}
                        </Text>
                      ) : null}
                    </View>
                    <TextInput
                      value={row.count}
                      onChangeText={v => editCount(i, v)}
                      editable={!busy}
                      keyboardType="number-pad"
                      accessibilityLabel={`${row.type} count`}
                      style={[
                        styles.countInput,
                        {
                          backgroundColor: colors.ink,
                          color: colors.textPri,
                          borderColor: countProblem(row.count)
                            ? colors.dangerBright
                            : colors.ctlLine,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              {badCount ? (
                <Text style={[styles.warnLine, { color: colors.dangerBright }]}>
                  Counts must be whole numbers — 0 or more.
                </Text>
              ) : null}
              {modelNote ? (
                <Text style={[styles.dimLine, { color: colors.textDim }]}>
                  MODEL NOTE · {modelNote}
                </Text>
              ) : null}

              {dirty ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={saveCounts}
                  disabled={busy || badCount}
                  style={[
                    styles.borderedBtn,
                    { borderColor: colors.ctlLine },
                    (busy || badCount) && styles.dimmed,
                  ]}
                >
                  <Text style={[styles.textBtnLabel, { color: colors.textPri }]}>
                    {save.isPending ? 'SAVING…' : 'SAVE CORRECTED COUNTS'}
                  </Text>
                </Pressable>
              ) : null}
              {save.isError ? (
                <Notice
                  tone="danger"
                  label="Could not save the counts"
                  body={apiErrorMessage(save.error)}
                  onRetry={saveCounts}
                />
              ) : null}

              <PrimaryCta
                label={priced ? 'Re-price this take-off' : 'Price this take-off'}
                onPress={priceIt}
                loading={price.isPending}
                disabled={busy || badCount || rows.length === 0}
              />
              {price.isError ? (
                <Notice
                  tone="danger"
                  label="Could not price the take-off"
                  body={apiErrorMessage(price.error)}
                  onRetry={priceIt}
                />
              ) : null}

              <LinkOutButton
                label="Adjust counts on the plan overlay on the web"
                path="/dashboard?tab=estimator"
              />
            </Card>
          ) : null}

          {priced ? <PricedSummaryCard bom={priced} meta={priceMeta} /> : null}

          <Pressable
            accessibilityRole="button"
            onPress={startAgain}
            style={styles.textBtn}
            hitSlop={8}
          >
            <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>
              START A NEW TAKE-OFF
            </Text>
          </Pressable>
        </>
      )}

      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Past analyses</SectionLabel>
        {history.isPending ? (
          <Notice tone="accent" label="Loading history…" />
        ) : history.isError && !history.data ? (
          <Notice
            tone="danger"
            label="Could not load past runs"
            body={apiErrorMessage(history.error)}
            onRetry={() => void history.refetch()}
          />
        ) : history.data && history.data.uploads.length === 0 ? (
          <Text style={[styles.body, { color: colors.textSec }]}>
            No saved runs yet. Every successful analysis is saved here automatically — counts,
            corrections and pricing — so you can reopen it any time, on any device.
          </Text>
        ) : history.data ? (
          <View style={[styles.rowsWrap, { borderTopColor: colors.inkLine }]}>
            {history.data.uploads.map(u => (
              <HistoryRow key={u.id} upload={u} onOpen={openRun} />
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────────────

function ConfidenceDot({ level }: { level: Confidence | null }) {
  const { colors } = useTheme();
  const color =
    level === 'high'
      ? colors.successBright
      : level === 'low'
        ? colors.warningBright
        : colors.textDim;
  return (
    <View
      accessibilityLabel={`${level ?? 'unknown'} confidence`}
      style={[styles.dot, { backgroundColor: color }]}
    />
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: bold ? colors.textPri : colors.textDim }]}>
        {label.toUpperCase()}
      </Text>
      <Text
        style={[
          styles.priceCell,
          bold && styles.priceCellBold,
          { color: bold ? colors.accentText : colors.textPri },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** The priced BOM rendered verbatim — every number is the server's, unchanged. */
function PricedSummaryCard({
  bom,
  meta,
}: {
  bom: PricedBom;
  meta: { catalogueSize: number; source: string } | null;
}) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>Priced take-off</SectionLabel>
      <Text style={[styles.totalBig, { color: colors.textPri }]}>{aud(bom.totalIncGst)}</Text>
      <Text style={[styles.dimLine, { color: colors.textDim }]}>
        INC GST · INDICATIVE — VERIFY BEFORE SENDING
      </Text>

      <View style={[styles.rowsWrap, { borderTopColor: colors.inkLine }]}>
        {bom.lines.map((line, i) => (
          <View key={`${line.type}-${i}`} style={styles.priceRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.itemType, { color: colors.textPri }]}>{line.type}</Text>
              <Text style={[styles.itemMeta, { color: colors.textDim }]}>
                {line.count} × {aud(line.unitPriceExGst)}
                {line.matched !== line.type ? ` · matched ${line.matched}` : ''}
                {line.labourHours > 0 ? ` · ${line.labourHours}h labour` : ''}
              </Text>
            </View>
            <Text style={[styles.priceCell, { color: colors.textPri }]}>{aud(line.lineExGst)}</Text>
          </View>
        ))}
        {bom.unmatched.map((u, i) => (
          <View key={`${u.type}-${i}`} style={styles.priceRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.itemType, { color: colors.textPri }]}>{u.type}</Text>
              <Text style={[styles.itemMeta, { color: colors.warningBright }]}>
                {u.count} × NOT IN YOUR CATALOGUE — UNPRICED, NEVER GUESSED
              </Text>
            </View>
            <Text style={[styles.priceCell, { color: colors.warningBright }]}>—</Text>
          </View>
        ))}
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: colors.inkLine }]}>
        <TotalRow label="Materials ex GST" value={aud(bom.materialExGst)} />
        <TotalRow label="Labour ex GST" value={aud(bom.labourExGst)} />
        {bom.labourFloorAddedExGst > 0 ? (
          <TotalRow label="Labour minimum top-up ex GST" value={aud(bom.labourFloorAddedExGst)} />
        ) : null}
        <TotalRow label="Subtotal ex GST" value={aud(bom.subtotalExGst)} />
        {bom.gstRegistered ? <TotalRow label="GST" value={aud(bom.gstExGst)} /> : null}
        <TotalRow label="Total inc GST" value={aud(bom.totalIncGst)} bold />
      </View>

      {!bom.gstRegistered ? (
        <Text style={[styles.dimLine, { color: colors.textDim }]}>
          NOT REGISTERED FOR GST — NO GST ADDED.
        </Text>
      ) : null}
      <Text style={[styles.dimLine, { color: colors.textDim }]}>
        ASSUMES {aud(bom.assumptions.hourlyRate)}/H LABOUR · {bom.assumptions.markupPct}% MARKUP ·{' '}
        {bom.assumptions.minLabourHours}H MINIMUM
      </Text>
      {meta ? (
        <Text style={[styles.dimLine, { color: colors.textDim }]}>
          PRICED FROM {meta.catalogueSize} CATALOGUE ITEM{meta.catalogueSize === 1 ? '' : 'S'} ·{' '}
          {meta.source.replace(/_/g, ' ').toUpperCase()}
        </Text>
      ) : null}
      {bom.unmatched.length > 0 ? (
        <Text style={[styles.warnLine, { color: colors.warningBright }]}>
          Unmatched items aren’t in your catalogue — add them on the web dashboard, then re-price to
          include them.
        </Text>
      ) : null}
    </Card>
  );
}

function HistoryRow({ upload, onOpen }: { upload: HistoryUpload; onOpen: (id: string) => void }) {
  const { colors } = useTheme();
  const ex = upload.plan_extractions[0];
  const when = new Date(upload.created_at).toLocaleString('en-AU');
  if (!ex) {
    return (
      <View style={[styles.historyRow, styles.dimmed]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.itemType, { color: colors.textSec }]} numberOfLines={2}>
            {upload.filename}
          </Text>
          <Text style={[styles.itemMeta, { color: colors.textDim }]}>
            {when}
            {upload.sheet_hint ? ` · ${upload.sheet_hint}` : ''}
          </Text>
        </View>
        <Text style={[styles.itemMeta, { color: colors.warningBright }]}>EXTRACTION FAILED</Text>
      </View>
    );
  }
  const items = effectiveItems(ex);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${upload.filename}`}
      onPress={() => onOpen(ex.id)}
      style={({ pressed }) => [styles.historyRow, pressed && { backgroundColor: colors.ink }]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.itemType, { color: colors.textPri }]} numberOfLines={2}>
          {upload.filename}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textDim }]}>
          {when}
          {upload.sheet_hint ? ` · ${upload.sheet_hint}` : ''}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.textSec }]}>
          {items.length} LINES · {deviceTotal(items)} DEVICES
        </Text>
      </View>
      <View style={styles.historyRight}>
        {typeof ex.priced_total === 'number' ? (
          <Text style={[styles.priceCell, { color: colors.accentText }]}>
            {aud(ex.priced_total)}
          </Text>
        ) : null}
        <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>OPEN →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  dimLine: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18, letterSpacing: 0.3 },
  warnLine: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  planName: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attachName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  textBtn: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  textBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
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
  rowsWrap: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.minimum,
  },
  itemType: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  itemMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  countInput: {
    width: 72,
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    textAlign: 'right',
    fontFamily: fonts.mono.medium,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  priceCell: {
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  priceCellBold: { fontFamily: fonts.mono.bold },
  totalBig: {
    fontFamily: fonts.mono.bold,
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  totalLabel: {
    flexShrink: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  historyRow: {
    alignItems: 'stretch',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touch.listRow,
  },
  historyRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
