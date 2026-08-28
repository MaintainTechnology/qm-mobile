/**
 * Recipes — the native editor mirroring the web RecipesTab in trade-hub mode
 * (quotemate-automation app/dashboard/page.tsx:12470-13439):
 *   • job picker over this trade's shared assemblies, narrowed by
 *     recipeTradesFor (an empty result means NO jobs, never "no filter"),
 *   • the step checklist (tasks) — ordered text steps with inline title/note
 *     edits, required/optional toggles, one-step reordering and delete. Steps
 *     carry no price and no hours BY DESIGN — nothing here feeds the estimator,
 *   • the parts list (BOM lines) — per-line quantity edits, required/optional
 *     toggles and delete, each line badged priced-from-catalogue vs generic
 *     (display only; a recipe line has no price of its own),
 *   • fork-from-baseline for both, with the client-side no-op guard mirroring
 *     the server's 409 and the R38 catalogue-gap report surfaced after a fork.
 *
 * Non-writable trades (the backend's TRADE_ENUM pins recipe writes to
 * electrical + plumbing) keep the read-only step counts plus gatedWriteCopy
 * and a web link-out — the server returns no assemblies for them anyway.
 *
 * Steps and parts keep separate error channels (web parity): a tasks outage
 * never blanks the parts list, and vice versa.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { RecipePricingAuthority } from './RecipePricingAuthority';
import { TRADE_LABELS, type HubTrade } from '../sections';
import { canWritePricingEngine, gatedWriteCopy, recipeTradesFor } from '../write-gate';
import {
  categoryLabelFor,
  DESCRIPTION_MAX,
  forkWouldNoOp,
  isDuplicate,
  isNoBaseline,
  mapForkGaps,
  materialCategoriesFor,
  nextSort,
  NOTES_MAX,
  normaliseCategory,
  parseQuantity,
  parseStepTitle,
  reorderPlan,
  resolveCatalogueBadge,
  sortedBaseline,
  sortedForAssembly,
  TITLE_MAX,
  useBom,
  useCreateBomLine,
  useCreateTaskStep,
  useDeleteBomLine,
  useDeleteTaskStep,
  useForkBomBaseline,
  useForkTaskBaseline,
  useTasks,
  useUpdateBomLine,
  useUpdateTaskStep,
  type BaselineLine,
  type BaselineTask,
  type BomLine,
  type ForkGapDisplay,
  type RecipeAssembly,
  type TaskLine,
} from './recipes-api';

/** Drop one draft entry, returning a fresh map (state must not be mutated). */
function withoutKey(map: Record<string, string>, key: string): Record<string, string> {
  const next = { ...map };
  delete next[key];
  return next;
}

export function RecipesSection({ trade, onOpenCatalogue = () => {} }: { trade: HubTrade; onOpenCatalogue?: () => void }) {
  const { colors } = useTheme();
  const me = useTenantMe();
  // The gate is static per trade (TRADE_ENUM), so a non-writable hub never
  // spends the tradie's signal on a BOM fetch it can't use.
  const bom = useBom({ enabled: canWritePricingEngine(trade) });
  const tasks = useTasks();
  const [selectedId, setSelectedId] = useState('');

  const recipeTrades = recipeTradesFor(me.data ? tenantTrades(me.data) : []);
  const writable = recipeTrades.includes(trade);

  if (me.isPending || tasks.isPending || (writable && bom.isPending))
    return <Notice tone="accent" label="Loading recipes…" />;

  // ── Read-only trades: current step counts + the write gate ────────────────
  if (!writable) {
    if (tasks.isError && !tasks.data)
      return (
        <Notice
          tone="danger"
          label="Could not load recipes"
          body={apiErrorMessage(tasks.error)}
          onRetry={() => void tasks.refetch()}
        />
      );
    const assemblies = (tasks.data?.assemblies ?? []).filter(
      a => a.trade.toLowerCase() === trade,
    );
    const customCounts = new Map<string, number>();
    for (const line of tasks.data?.lines ?? []) {
      if (line.assembly_id)
        customCounts.set(line.assembly_id, (customCounts.get(line.assembly_id) ?? 0) + 1);
    }
    const baselines = tasks.data?.baselines ?? {};
    return (
      <View style={{ gap: spacing.md }}>
        {assemblies.length === 0 ? (
          <Notice
            tone="accent"
            label="No recipes for this trade yet"
            body="Recipes are the parts and step lists behind each job type."
          />
        ) : (
          <Card>
            <SectionLabel>{`Job recipes · ${assemblies.length}`}</SectionLabel>
            {assemblies.map(a => {
              const customCount = customCounts.get(a.id) ?? 0;
              const baseCount = baselines[a.id]?.length ?? 0;
              return (
                <View key={a.id} style={[styles.kvRow, { borderBottomColor: colors.inkLine }]}>
                  <Text style={[styles.kvLabel, { color: colors.textDim }]}>
                    {a.name.toUpperCase()}
                  </Text>
                  <Text style={[styles.kvValue, { color: colors.textPri }]}>
                    {customCount > 0
                      ? `${customCount} custom steps`
                      : `${baseCount} standard steps`}
                  </Text>
                </View>
              );
            })}
          </Card>
        )}
        <Notice
          tone="accent"
          label={`${TRADE_LABELS[trade]} recipes are read-only here`}
          body={gatedWriteCopy(TRADE_LABELS[trade])}
        />
        <LinkOutButton
          label="Manage recipes on the web"
          path={`/dashboard?tab=hub-${trade}`}
          tone="accent"
        />
      </View>
    );
  }

  // ── Writable trades: the full per-job editors ─────────────────────────────
  if (bom.isError && !bom.data)
    return (
      <Notice
        tone="danger"
        label="Could not load recipes"
        body={apiErrorMessage(bom.error)}
        onRetry={() => void bom.refetch()}
      />
    );
  const data = bom.data;
  if (!data) return null;

  // Double-narrow (web parity): the hub's one trade AND the recipe-writable
  // set. recipeTrades can be [] — that means no jobs, never every job.
  const pool = data.assemblies.filter(
    a => a.trade.toLowerCase() === trade && recipeTrades.includes(a.trade.toLowerCase()),
  );
  if (pool.length === 0)
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label={`No ${TRADE_LABELS[trade].toLowerCase()} jobs to build recipes for yet`}
          body="Job recipes hang off the shared job list for your trade. Once it's loaded, every job gets its parts and steps here."
        />
        <LinkOutButton
          label="Open recipes on the web"
          path={`/dashboard?tab=hub-${trade}`}
          tone="accent"
        />
      </View>
    );

  // Default (and heal) the selection within this trade's pool, so a stale id
  // never lands the picker on another trade's job.
  const selected = pool.find(a => a.id === selectedId) ?? pool[0];
  if (!selected) return null;

  const jobLines = sortedForAssembly(data.lines, selected.id);
  const jobBaseline = sortedBaseline(data.baselines[selected.id]);
  const jobTasks = sortedForAssembly(tasks.data?.lines ?? [], selected.id);
  const jobTaskBaseline = sortedBaseline((tasks.data?.baselines ?? {})[selected.id]);

  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionLabel>{`Job recipes · ${pool.length}`}</SectionLabel>
        <Text style={[styles.blurb, { color: colors.textSec }]}>
          {"Define the parts and steps a job always needs so it's quoted the same way every time. These are yours — editing them never affects another tradie."}
        </Text>
        <PillGroup
          options={pool.map((a): [string, string] => [a.id, a.name])}
          value={selected.id}
          onChange={setSelectedId}
        />
      </Card>

      {tasks.isError && !tasks.data ? (
        <Card>
          <SectionLabel>{`${selected.name} — steps`}</SectionLabel>
          <Notice
            tone="warn"
            label="Couldn't load the step checklist"
            body={apiErrorMessage(tasks.error)}
            onRetry={() => void tasks.refetch()}
          />
        </Card>
      ) : (
        <StepsPanel
          key={`steps-${selected.id}`}
          assembly={selected}
          steps={jobTasks}
          baseline={jobTaskBaseline}
        />
      )}

      <PartsPanel
        key={`parts-${selected.id}`}
        trade={trade}
        assembly={selected}
        lines={jobLines}
        baseline={jobBaseline}
        catalogueCategories={data.catalogue_categories}
        onOpenCatalogue={onOpenCatalogue}
      />
    </View>
  );
}

// ── Steps panel (tasks) ─────────────────────────────────────────────────────

function StepsPanel({
  assembly,
  steps,
  baseline,
}: {
  assembly: RecipeAssembly;
  steps: TaskLine[];
  baseline: BaselineTask[];
}) {
  const { colors } = useTheme();
  const create = useCreateTaskStep();
  const update = useUpdateTaskStep();
  const del = useDeleteTaskStep();
  const fork = useForkTaskBaseline();
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [required, setRequired] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const busyId = update.isPending
    ? update.variables.id
    : del.isPending
      ? del.variables.id
      : null;
  const busy = busyId !== null || reordering;

  const onFork = () => {
    // Client mirror of the server's 409 guard — never fork over existing steps.
    if (forkWouldNoOp(steps) || fork.isPending) return;
    fork.mutate({ assembly_id: assembly.id });
  };

  const moveStep = (id: string, dir: -1 | 1) => {
    if (busy) return;
    const plan = reorderPlan(steps, id, dir);
    if (plan.length === 0) return;
    setReordering(true);
    // Sequential PATCHes, web parity — errors surface via update.isError below.
    void (async () => {
      try {
        for (const patch of plan) await update.mutateAsync(patch);
      } catch {
        // Shown through the row error line; the refetch restores server order.
      } finally {
        setReordering(false);
      }
    })();
  };

  const confirmDelete = (step: TaskLine) => {
    Alert.alert('Remove this step?', `"${step.title}" comes off this job's checklist.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => del.mutate({ id: step.id }) },
    ]);
  };

  const submit = () => {
    const parsedTitle = parseStepTitle(title);
    if (parsedTitle == null) {
      setFormError(`Step title must be 1–${TITLE_MAX} characters.`);
      return;
    }
    setFormError(null);
    create.mutate(
      {
        assembly_id: assembly.id,
        trade: assembly.trade,
        title: parsedTitle,
        notes: notes.trim() || undefined,
        required,
        sort: nextSort(steps),
      },
      {
        onSuccess: () => {
          setTitle('');
          setNotes('');
          setRequired(true);
        },
        onError: error =>
          setFormError(
            isDuplicate(error)
              ? 'This job already has a step with that name — reword it.'
              : apiErrorMessage(error),
          ),
      },
    );
  };

  const rowError =
    update.isError || del.isError ? apiErrorMessage(update.isError ? update.error : del.error) : null;
  const forkError = fork.isError
    ? isNoBaseline(fork.error)
      ? "There's no standard checklist for this job yet — add the steps manually below."
      : apiErrorMessage(fork.error)
    : null;

  return (
    <Card>
      <SectionLabel>{`${assembly.name} — steps`}</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        {"The steps this job always involves, in order. They describe the work — they don't change the price or the hours."}
      </Text>

      {steps.length === 0 ? (
        baseline.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[styles.blurb, { color: colors.textSec }]}>
              {"No saved steps for this job yet — here's the standard checklist. Customise it to reword, reorder or add your own."}
            </Text>
            {baseline.map((b, i) => (
              <View
                key={`${b.title}|${i}`}
                style={[styles.row, { borderBottomColor: colors.inkLine }]}
              >
                <Text style={[styles.stepNum, { color: colors.textDim }]}>{`${i + 1}.`}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowName, { color: colors.textPri }]}>{b.title}</Text>
                  {b.notes ? (
                    <Text style={[styles.rowMeta, { color: colors.textDim }]}>{b.notes}</Text>
                  ) : null}
                  <Text style={[styles.rowTag, { color: colors.textDim }]}>
                    {`SHARED BASELINE · ${b.required !== false ? 'REQUIRED' : 'OPTIONAL'}`}
                  </Text>
                </View>
              </View>
            ))}
            <ActionButton
              tone="accent"
              label={fork.isPending ? 'Copying steps…' : 'Customise these steps'}
              onPress={onFork}
              disabled={fork.isPending}
            />
            <Text style={[styles.hint, { color: colors.textDim }]}>
              {`Copies these ${baseline.length} step${baseline.length === 1 ? '' : 's'} into your checklist so you can reword, reorder, or add your own.`}
            </Text>
          </View>
        ) : (
          <Text style={[styles.blurb, { color: colors.textSec }]}>
            No steps yet for this job, and no standard checklist either. Add the steps it always
            involves below.
          </Text>
        )
      ) : (
        steps.map((step, idx) => {
          const titleValue = draftTitle[step.id] ?? step.title;
          const notesValue = draftNotes[step.id] ?? step.notes ?? '';
          const rowBusy = busyId === step.id;
          return (
            <View key={step.id} style={[styles.row, { borderBottomColor: colors.inkLine }]}>
              <Text style={[styles.stepNum, { color: colors.textDim }]}>{`${idx + 1}.`}</Text>
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <TextInput
                  value={titleValue}
                  accessibilityLabel={`Step ${idx + 1} title`}
                  onChangeText={next => setDraftTitle(d => ({ ...d, [step.id]: next }))}
                  onBlur={() => {
                    const draft = draftTitle[step.id];
                    if (draft === undefined) return;
                    setDraftTitle(d => withoutKey(d, step.id));
                    const trimmed = draft.trim();
                    // Empty is a delete, not a rename — the schema rejects it.
                    // Snap back rather than 400.
                    if (!trimmed) return;
                    if (trimmed !== step.title) update.mutate({ id: step.id, title: trimmed });
                  }}
                  maxLength={TITLE_MAX}
                  placeholderTextColor={colors.textDim}
                  style={[
                    styles.inlineInput,
                    { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textPri },
                  ]}
                />
                <TextInput
                  value={notesValue}
                  accessibilityLabel={`Step ${idx + 1} note`}
                  placeholder="Note (optional)"
                  onChangeText={next => setDraftNotes(d => ({ ...d, [step.id]: next }))}
                  onBlur={() => {
                    const draft = draftNotes[step.id];
                    if (draft === undefined) return;
                    setDraftNotes(d => withoutKey(d, step.id));
                    const trimmed = draft.trim();
                    if (trimmed !== (step.notes ?? ''))
                      update.mutate({ id: step.id, notes: trimmed });
                  }}
                  maxLength={NOTES_MAX}
                  placeholderTextColor={colors.textDim}
                  style={[
                    styles.inlineInput,
                    styles.inlineInputSmall,
                    { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textSec },
                  ]}
                />
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move step ${idx + 1} up`}
                    onPress={() => moveStep(step.id, -1)}
                    disabled={idx === 0 || busy}
                    style={[styles.iconBtn, (idx === 0 || busy) && styles.dimmed]}
                    hitSlop={8}
                  >
                    <Text style={[styles.iconBtnLabel, { color: colors.textDim }]}>▲</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move step ${idx + 1} down`}
                    onPress={() => moveStep(step.id, 1)}
                    disabled={idx === steps.length - 1 || busy}
                    style={[styles.iconBtn, (idx === steps.length - 1 || busy) && styles.dimmed]}
                    hitSlop={8}
                  >
                    <Text style={[styles.iconBtnLabel, { color: colors.textDim }]}>▼</Text>
                  </Pressable>
                  <RequiredPill
                    required={step.required !== false}
                    disabled={rowBusy}
                    onPress={() => update.mutate({ id: step.id, required: step.required === false })}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove step ${idx + 1}`}
                    onPress={() => confirmDelete(step)}
                    disabled={rowBusy}
                    style={[styles.iconBtn, rowBusy && styles.dimmed]}
                    hitSlop={8}
                  >
                    <Text style={[styles.textBtnLabel, { color: colors.dangerBright }]}>
                      REMOVE
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })
      )}

      {rowError ? (
        <Text style={[styles.errorLine, { color: colors.warningBright }]}>{rowError}</Text>
      ) : null}
      {forkError ? (
        <Text style={[styles.errorLine, { color: colors.warningBright }]}>{forkError}</Text>
      ) : null}

      <View style={styles.form}>
        <SectionLabel>Add a step</SectionLabel>
        <Field
          label="Step"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Isolate the circuit at the switchboard"
          maxLength={TITLE_MAX}
        />
        <Field
          label="Note (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. test and tag before touching anything"
          maxLength={NOTES_MAX}
        />
        <SwitchRow
          label="Required step (always done)"
          value={required}
          onValueChange={setRequired}
        />
        {formError ? <Notice tone="danger" label="Check the step" body={formError} /> : null}
        <View style={styles.formActions}>
          <ActionButton
            tone="accent"
            label={create.isPending ? 'Adding…' : '+ Add step to this job'}
            onPress={submit}
            disabled={create.isPending}
          />
        </View>
      </View>
    </Card>
  );
}

// ── Parts panel (BOM lines) ─────────────────────────────────────────────────

function PartsPanel({
  trade,
  assembly,
  lines,
  baseline,
  catalogueCategories,
  onOpenCatalogue,
}: {
  trade: HubTrade;
  assembly: RecipeAssembly;
  lines: BomLine[];
  baseline: BaselineLine[];
  catalogueCategories: string[];
  onOpenCatalogue: () => void;
}) {
  const { colors } = useTheme();
  const create = useCreateBomLine();
  const update = useUpdateBomLine();
  const del = useDeleteBomLine();
  const fork = useForkBomBaseline();
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  // The gap report belongs to THIS panel instance, which is keyed by assembly
  // id — switching jobs remounts the panel, so a stale report can't bleed
  // across jobs (the web needs an effect for the same guarantee).
  const [forkGaps, setForkGaps] = useState<ForkGapDisplay | null>(null);
  const [category, setCategory] = useState('');
  const [qtyStr, setQtyStr] = useState('1');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const missingPriceCount = lines.filter(
    line => resolveCatalogueBadge(line.material_category, catalogueCategories) !== 'catalogue',
  ).length;

  const busyId = update.isPending
    ? update.variables.id
    : del.isPending
      ? del.variables.id
      : null;

  const onFork = () => {
    // Client mirror of the server's 409 guard — never fork over an existing recipe.
    if (forkWouldNoOp(lines) || fork.isPending) return;
    setForkGaps(null);
    fork.mutate(
      { assembly_id: assembly.id },
      { onSuccess: result => setForkGaps(mapForkGaps(result)) },
    );
  };

  const confirmDelete = (line: BomLine) => {
    Alert.alert(
      'Remove this part?',
      `"${categoryLabelFor(trade, line.material_category)}" comes off this job's recipe.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => del.mutate({ id: line.id }) },
      ],
    );
  };

  const submit = () => {
    if (!category) {
      setFormError('Pick a material category.');
      return;
    }
    const quantity = parseQuantity(qtyStr);
    if (quantity == null) {
      setFormError('Quantity must be greater than 0 and at most 10,000.');
      return;
    }
    setFormError(null);
    create.mutate(
      {
        assembly_id: assembly.id,
        trade: assembly.trade,
        material_category: category,
        quantity,
        required,
        description: description.trim() || undefined,
        sort: nextSort(lines),
      },
      {
        onSuccess: () => {
          setCategory('');
          setQtyStr('1');
          setDescription('');
          setRequired(true);
        },
        onError: error =>
          setFormError(
            isDuplicate(error)
              ? 'This job already has a line for that category — edit its quantity instead.'
              : apiErrorMessage(error),
          ),
      },
    );
  };

  const rowError =
    update.isError || del.isError ? apiErrorMessage(update.isError ? update.error : del.error) : null;
  const forkError = fork.isError
    ? isNoBaseline(fork.error)
      ? "There's no standard baseline for this job yet — add the parts it always needs below."
      : apiErrorMessage(fork.error)
    : null;

  const categoryOptions = materialCategoriesFor(trade).map(
    (o): [string, string] => [o.value, o.label],
  );

  return (
    <Card>
      <SectionLabel>{`${assembly.name} — parts`}</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        The parts this job always needs. Each line prices from your catalogue product in that
        category. Missing tenant catalogue prices route the estimate to inspection.
      </Text>

      {(forkGaps?.detectionFailed || (forkGaps?.count ?? 0) > 0 || missingPriceCount > 0) ? (
        <View style={{ marginBottom: spacing.md }}>
          <RecipePricingAuthority
            count={Math.max(forkGaps?.count ?? 0, missingPriceCount)}
            detectionFailed={forkGaps?.detectionFailed ?? false}
            onOpenCatalogue={onOpenCatalogue}
          />
        </View>
      ) : null}

      {lines.length === 0 ? (
        baseline.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[styles.blurb, { color: colors.textSec }]}>
              {"No saved recipe for this job yet — here's the standard baseline we'd use. Customise it to make it yours and start editing."}
            </Text>
            {baseline.map((b, i) => (
              <View
                key={`${b.material_category}|${b.description ?? ''}|${i}`}
                style={[styles.row, { borderBottomColor: colors.inkLine }]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowName, { color: colors.textPri }]}>
                    {categoryLabelFor(trade, b.material_category)}
                  </Text>
                  {b.description ? (
                    <Text style={[styles.rowMeta, { color: colors.textDim }]}>{b.description}</Text>
                  ) : null}
                  <Text style={[styles.rowTag, { color: colors.textDim }]}>
                    {`SHARED BASELINE · QTY ${b.quantity} · ${b.required !== false ? 'REQUIRED' : 'OPTIONAL'}`}
                  </Text>
                </View>
              </View>
            ))}
            <ActionButton
              tone="accent"
              label={fork.isPending ? 'Copying baseline…' : 'Customise this recipe'}
              onPress={onFork}
              disabled={fork.isPending}
            />
            <Text style={[styles.hint, { color: colors.textDim }]}>
              {`Copies these ${baseline.length} line${baseline.length === 1 ? '' : 's'} into your recipe so you can edit quantities, switch required or optional, or add more parts.`}
            </Text>
          </View>
        ) : (
          <Text style={[styles.blurb, { color: colors.textSec }]}>
            No recipe yet for this job, and no standard baseline either. Add the parts it always
            needs below.
          </Text>
        )
      ) : (
        lines.map((line, idx) => {
          const qtyValue = draftQty[line.id] ?? String(line.quantity);
          const badge = resolveCatalogueBadge(line.material_category, catalogueCategories);
          // The fork route reports gaps by 1-based line (sort) position;
          // `lines` is already sorted by sort, so idx+1 matches. Category is
          // the defensive fallback against a reorder between fork and render.
          const gapHere =
            forkGaps != null &&
            (forkGaps.gapLines.has(idx + 1) ||
              forkGaps.gapCategories.has(normaliseCategory(line.material_category)));
          const rowBusy = busyId === line.id;
          return (
            <View key={line.id} style={[styles.row, { borderBottomColor: colors.inkLine }]}>
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <Text style={[styles.rowName, { color: colors.textPri }]}>
                  {categoryLabelFor(trade, line.material_category)}
                </Text>
                {line.description ? (
                  <Text style={[styles.rowMeta, { color: colors.textDim }]}>
                    {line.description}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.rowTag,
                    { color: badge === 'catalogue' ? colors.textDim : colors.warningBright },
                  ]}
                >
                  {badge === 'catalogue' ? '✓ YOUR CATALOGUE' : '⚠ PRICE NEEDED'}
                </Text>
                {gapHere ? (
                  <Text style={[styles.rowTag, { color: colors.warningBright }]}>
                    ⚠ ADD A PRODUCT FOR THIS LINE
                  </Text>
                ) : null}
                <View style={styles.actionRow}>
                  <Text style={[styles.qtyLabel, { color: colors.textDim }]}>QTY</Text>
                  <TextInput
                    value={qtyValue}
                    accessibilityLabel={`Quantity for ${categoryLabelFor(trade, line.material_category)}`}
                    keyboardType="decimal-pad"
                    onChangeText={next => setDraftQty(d => ({ ...d, [line.id]: next }))}
                    onBlur={() => {
                      const draft = draftQty[line.id];
                      if (draft === undefined) return;
                      setDraftQty(d => withoutKey(d, line.id));
                      const quantity = parseQuantity(draft);
                      // Invalid input snaps back to server truth rather than 400.
                      if (quantity == null || quantity === line.quantity) return;
                      update.mutate({ id: line.id, quantity });
                    }}
                    placeholderTextColor={colors.textDim}
                    style={[
                      styles.qtyInput,
                      { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textPri },
                    ]}
                  />
                  <RequiredPill
                    required={line.required !== false}
                    disabled={rowBusy}
                    onPress={() => update.mutate({ id: line.id, required: line.required === false })}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${categoryLabelFor(trade, line.material_category)}`}
                    onPress={() => confirmDelete(line)}
                    disabled={rowBusy}
                    style={[styles.iconBtn, rowBusy && styles.dimmed]}
                    hitSlop={8}
                  >
                    <Text style={[styles.textBtnLabel, { color: colors.dangerBright }]}>
                      REMOVE
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })
      )}

      {rowError ? (
        <Text style={[styles.errorLine, { color: colors.warningBright }]}>{rowError}</Text>
      ) : null}
      {forkError ? (
        <Text style={[styles.errorLine, { color: colors.warningBright }]}>{forkError}</Text>
      ) : null}

      <View style={styles.form}>
        <SectionLabel>Add a part</SectionLabel>
        <View>
          <Text style={[styles.fieldLabel, { color: colors.textPri }]}>MATERIAL CATEGORY</Text>
          <PillGroup options={categoryOptions} value={category} onChange={setCategory} />
          <Text style={[styles.hint, { color: colors.textDim, marginTop: spacing.sm }]}>
            What part the job needs. Add a product in this category under Catalogue and the AI
            uses your product and your price; otherwise the estimate routes to inspection.
          </Text>
        </View>
        <Field
          label="Quantity"
          value={qtyStr}
          onChangeText={setQtyStr}
          placeholder="1"
          keyboardType="decimal-pad"
        />
        <Field
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. clips + connectors"
          maxLength={DESCRIPTION_MAX}
        />
        <SwitchRow
          label="Required part (always quoted)"
          value={required}
          onValueChange={setRequired}
        />
        {formError ? <Notice tone="danger" label="Check the part" body={formError} /> : null}
        <View style={styles.formActions}>
          <ActionButton
            tone="accent"
            label={create.isPending ? 'Adding…' : '+ Add part to this recipe'}
            onPress={submit}
            disabled={create.isPending}
          />
        </View>
      </View>
    </Card>
  );
}

// ── Local primitives ────────────────────────────────────────────────────────

/** Web parity: accent border/text when required, dim when optional. */
function RequiredPill({
  required,
  onPress,
  disabled,
}: {
  required: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        required ? 'Required — tap to make optional' : 'Optional — tap to make required'
      }
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={[
        styles.togglePill,
        { borderColor: required ? colors.accent : colors.inkLine },
        disabled && styles.dimmed,
      ]}
    >
      <Text
        style={[styles.togglePillLabel, { color: required ? colors.accentText : colors.textDim }]}
      >
        {required ? 'REQUIRED' : 'OPTIONAL'}
      </Text>
    </Pressable>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.switchLabel, { color: colors.textPri }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.inkLine, true: colors.accent }}
        thumbColor={colors.inkCard}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  maxLength?: number;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={[
          styles.input,
          { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textPri },
        ]}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'quiet',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'quiet';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const accent = tone === 'accent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          opacity: disabled ? 0.5 : 1,
          borderColor: accent ? colors.accent : colors.ctlLine,
          backgroundColor: accent
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
        style={[styles.actionLabel, { color: accent ? colors.accentInk : colors.textPri }]}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  blurb: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  kvLabel: {
    flex: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  kvValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowName: { fontFamily: fonts.sans.semiBold, fontSize: 13.5, lineHeight: 18 },
  rowMeta: { fontFamily: fonts.sans.regular, fontSize: 12, lineHeight: 17 },
  rowTag: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  stepNum: {
    paddingTop: spacing.sm + 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  inlineInput: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
  },
  inlineInputSmall: { fontSize: 12.5 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  iconBtn: { minHeight: touch.minimum, justifyContent: 'center' },
  iconBtnLabel: { fontFamily: fonts.mono.bold, fontSize: 13 },
  dimmed: { opacity: 0.4 },
  textBtnLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  qtyLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  qtyInput: {
    minHeight: touch.minimum,
    width: 72,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  togglePill: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
  },
  togglePillLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  hint: { fontFamily: fonts.sans.regular, fontSize: 11.5, lineHeight: 16 },
  errorLine: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    lineHeight: 15,
  },
  form: { marginTop: spacing.lg, gap: spacing.md },
  fieldLabel: {
    marginBottom: spacing.sm,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  actionBtn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  actionLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
});
