/**
 * Hub Estimating section — the native port of the web EstimatingTab
 * (page.tsx:13488-13897) at mobile scope: this trade's estimation jobs with
 * their effective labour hours + markup ('your override' vs 'global default'
 * badges, web SourceBadge parity) and the inline override editor. Save PATCHes
 * both fields; "Reset to default" DELETEs the override row — both exactly the
 * web's semantics. No pricing-engine write gate applies: the PATCH route
 * checks the assembly's trade against the TENANT's trades (not TRADE_ENUM),
 * and every job listed here already belongs to this hub's trade.
 *
 * Nothing here computes a price — labour, markup and rates render exactly as
 * the backend resolved them.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { TRADE_LABELS, type HubTrade } from '../sections';
import {
  buildOverridePatch,
  parseLabourHours,
  parseMarkupPct,
  useClearEstimationOverride,
  useEstimation,
  useSaveEstimationOverride,
  type EstimationJob,
} from './estimating-api';

/** '' / junk → NaN (web parseFloat parity — Number('') is 0, which would trip
 *  the big-shift warning on an empty field). */
function numOf(input: string): number {
  const trimmed = input.trim();
  return trimmed === '' ? Number.NaN : Number(trimmed);
}

function fmt(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}

/** Web SourceBadge, verbatim labels: 'your override' / 'global default'. */
function SourceBadge({ source }: { source: 'local' | 'global' }) {
  const { colors } = useTheme();
  const local = source === 'local';
  return (
    <Text
      style={[
        styles.badge,
        {
          color: local ? colors.accentText : colors.textDim,
          borderColor: local ? colors.accent : colors.inkLine,
        },
      ]}
    >
      {local ? 'YOUR OVERRIDE' : 'GLOBAL DEFAULT'}
    </Text>
  );
}

function NumField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textDim }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        accessibilityLabel={label}
        placeholderTextColor={colors.textDim}
        style={[
          styles.input,
          { backgroundColor: colors.inkCard, borderColor: colors.ctlLine, color: colors.textPri },
        ]}
      />
    </View>
  );
}

export function EstimatingSection({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const query = useEstimation();
  const save = useSaveEstimationOverride();
  const clear = useClearEstimationOverride();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [labourInput, setLabourInput] = useState('');
  const [markupInput, setMarkupInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (query.isPending) return <Notice tone="accent" label="Loading estimation breakdown…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load the estimation breakdown"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  // No trade param on the GET — the web filters client-side (page.tsx:13635).
  const jobs = (query.data?.jobs ?? []).filter(j => (j.trade ?? '').toLowerCase() === trade);
  if (jobs.length === 0)
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label={`No ${TRADE_LABELS[trade].toLowerCase()} estimation jobs yet`}
          body="No jobs have a structured bill of materials yet. Once the validated job list is loaded, every standard job shows its effective labour and markup here."
        />
        <LinkOutButton
          label="Open estimating on the web"
          path={`/dashboard?tab=hub-${trade}`}
          tone="accent"
        />
      </View>
    );

  // Web savingId parity: one busy row at a time, across both mutations.
  const savingId = save.isPending
    ? save.variables.assembly_id
    : clear.isPending
      ? clear.variables.assembly_id
      : null;

  // Pre-fill with the CURRENT effective values — local or global, both
  // pre-fill the same way so tweaking from the global default is one tap.
  function startEdit(j: EstimationJob) {
    setEditingId(j.assembly_id);
    setLabourInput(j.effective.labour_hours.value == null ? '' : String(j.effective.labour_hours.value));
    setMarkupInput(j.effective.markup_pct.value == null ? '' : String(j.effective.markup_pct.value));
    setFormError(null);
    save.reset();
    clear.reset();
  }

  function cancelEdit() {
    setEditingId(null);
    setFormError(null);
  }

  function saveEdit(j: EstimationJob) {
    // Client mirror of the server's PatchSchema — same copy as the web.
    const labour = parseLabourHours(labourInput);
    if (labour == null) {
      setFormError('Labour hours must be > 0 and ≤ 40');
      return;
    }
    const markup = parseMarkupPct(markupInput);
    if (markup == null) {
      setFormError('Markup % must be between 0 and 200');
      return;
    }
    setFormError(null);
    // Both fields always sent (buildOverridePatch) so a partial edit can't
    // leave the other field stale. Inputs stay put on failure.
    save.mutate(
      { assembly_id: j.assembly_id, ...buildOverridePatch(labour, markup) },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function confirmReset(j: EstimationJob) {
    Alert.alert('Reset to default', `Reset “${j.name}” to the global defaults?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () =>
          clear.mutate(
            { assembly_id: j.assembly_id },
            { onSuccess: () => setEditingId(current => (current === j.assembly_id ? null : current)) },
          ),
      },
    ]);
  }

  return (
    <Card>
      <SectionLabel>{`How each job is estimated · ${jobs.length}`}</SectionLabel>
      <Text style={[styles.intro, { color: colors.textDim }]}>
        The exact labour hours and markup each job quotes with — your override or the global
        default. Edit a row to set your own.
      </Text>
      {jobs.map(j => {
        const busy = savingId === j.assembly_id;
        const editing = editingId === j.assembly_id;
        const hasLocal =
          j.effective.labour_hours.source === 'local' || j.effective.markup_pct.source === 'local';
        const gLab = j.effective.global_labour_hours;
        const gMu = j.effective.global_markup_pct;
        // Web parity: non-blocking heads-up when an override is ≥2× or ≤0.5×
        // the global value — extreme settings can push quotes out of the
        // validator's expected band.
        const labourNum = numOf(labourInput);
        const markupNum = numOf(markupInput);
        const wild =
          editing &&
          ((Number.isFinite(labourNum) &&
            gLab != null &&
            gLab > 0 &&
            (labourNum >= gLab * 2 || labourNum <= gLab * 0.5)) ||
            (Number.isFinite(markupNum) &&
              gMu != null &&
              gMu > 0 &&
              (markupNum >= gMu * 2 || markupNum <= gMu * 0.5)));
        const editorError =
          formError ?? (editing && save.isError ? apiErrorMessage(save.error) : null);
        const rowError =
          !editing && clear.isError && clear.variables.assembly_id === j.assembly_id
            ? apiErrorMessage(clear.error)
            : null;
        return (
          <View key={j.assembly_id} style={[styles.jobRow, { borderTopColor: colors.inkLine }]}>
            <Text style={[styles.jobName, { color: colors.textPri }]}>{j.name}</Text>
            <Text style={[styles.jobMeta, { color: colors.textDim }]}>
              {[
                j.bom.length > 0
                  ? `${j.bom.length} ${j.bom.length === 1 ? 'part' : 'parts'}`
                  : 'No parts list',
                j.enabled === false ? 'off for you' : null,
              ]
                .filter(Boolean)
                .join(' · ')
                .toUpperCase()}
            </Text>

            <View style={styles.effRow}>
              <Text style={[styles.effLabel, { color: colors.textDim }]}>LABOUR</Text>
              <Text style={[styles.effValue, { color: colors.textPri }]}>
                {j.effective.labour_hours.value == null
                  ? '—'
                  : `${j.effective.labour_hours.value} hr`}
              </Text>
              <SourceBadge source={j.effective.labour_hours.source} />
              {j.hourly_rate != null ? (
                <Text style={[styles.effLabel, { color: colors.textDim }]}>
                  {`@ ${formatAud(centsFromApiDollars(j.hourly_rate))}/hr`}
                </Text>
              ) : null}
            </View>
            <View style={styles.effRow}>
              <Text style={[styles.effLabel, { color: colors.textDim }]}>MARKUP</Text>
              <Text style={[styles.effValue, { color: colors.textPri }]}>
                {j.effective.markup_pct.value == null ? '—' : `${j.effective.markup_pct.value}%`}
              </Text>
              <SourceBadge source={j.effective.markup_pct.source} />
            </View>

            <View style={styles.actionRow}>
              {!editing ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => startEdit(j)}
                  disabled={busy}
                  style={styles.textBtn}
                  hitSlop={8}
                >
                  <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
                    EDIT OVERRIDES
                  </Text>
                </Pressable>
              ) : null}
              {hasLocal ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => confirmReset(j)}
                  disabled={busy}
                  style={[styles.textBtn, busy && styles.dimmed]}
                  hitSlop={8}
                >
                  <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>
                    {busy && clear.isPending ? 'RESETTING…' : 'RESET TO DEFAULT'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {rowError ? (
              <Text style={[styles.errorLine, { color: colors.warningBright }]}>{rowError}</Text>
            ) : null}

            {editing ? (
              <View style={[styles.editor, { borderColor: colors.accent, backgroundColor: colors.ink }]}>
                <View style={styles.fieldRow}>
                  <NumField
                    label={`Labour hours (global: ${fmt(gLab)})`}
                    value={labourInput}
                    onChangeText={setLabourInput}
                  />
                  <NumField
                    label={`Markup % (global: ${fmt(gMu)}%)`}
                    value={markupInput}
                    onChangeText={setMarkupInput}
                  />
                </View>
                {wild ? (
                  <Text style={[styles.errorLine, { color: colors.warningBright }]}>
                    Big shift from the global default — double-check before saving.
                  </Text>
                ) : null}
                {editorError ? (
                  <Text style={[styles.errorLine, { color: colors.warningBright }]}>
                    {editorError}
                  </Text>
                ) : null}
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => saveEdit(j)}
                    disabled={busy}
                    style={[
                      styles.saveBtn,
                      { borderColor: colors.accent },
                      busy && styles.dimmed,
                    ]}
                  >
                    <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
                      {busy && save.isPending ? 'SAVING…' : 'SAVE OVERRIDES'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={cancelEdit}
                    disabled={busy}
                    style={styles.textBtn}
                    hitSlop={8}
                  >
                    <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>CANCEL</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  jobRow: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xs,
  },
  jobName: { fontFamily: fonts.sans.semiBold, fontSize: 13.5, lineHeight: 18 },
  jobMeta: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  effRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  effLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  effValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  textBtn: { minHeight: touch.minimum, justifyContent: 'center' },
  textBtnLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  saveBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
  },
  dimmed: { opacity: 0.5 },
  editor: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  field: { flexGrow: 1, flexBasis: 140 },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.medium,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  errorLine: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    lineHeight: 15,
  },
});
