/**
 * Recipes — the native editor mirroring the web RecipesTab in trade-hub mode
 * (quotemate-automation app/dashboard/page.tsx:12470-13439):
 *   • job picker over this trade's shared assemblies, narrowed by
 *     recipeTradesFor (an empty result means NO jobs, never "no filter"),
 *   • the step checklist (tasks) — ordered text steps with inline title/note
 *     edits, required/optional toggles, one-step reordering and delete. Steps
 *     carry no price and no hours, while their conditions shape the estimator checklist,
 *   • the parts list (BOM lines) — per-line quantity edits, required/optional
 *     toggles and delete, each line badged priced-from-catalogue vs generic
 *     (display only; a recipe line has no price of its own),
 *   • shared baselines shown read-only while the server's lossy condition/
 *     ratio fork is blocked.
 *
 * Non-writable trades (the backend's TRADE_ENUM pins recipe writes to
 * electrical + plumbing) keep the read-only step counts plus gatedWriteCopy
 * and a web link-out — the server returns no assemblies for them anyway.
 *
 * Steps and parts keep separate error channels (web parity): a tasks outage
 * never blanks the parts list, and vice versa.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { RecipePricingAuthority } from './RecipePricingAuthority';
import { TRADE_LABELS, type HubTrade } from '../sections';
import { canWritePricingEngine, gatedWriteCopy, recipeTradesFor } from '../write-gate';
import {
  assessRecipePriceReadiness,
  categoryLabelFor,
  DESCRIPTION_MAX,
  isDuplicate,
  materialCategoriesFor,
  nextSort,
  NOTES_MAX,
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
  useTasks,
  useUpdateBomLine,
  useUpdateTaskStep,
  type BaselineLine,
  type BaselineTask,
  type BomLine,
  type RecipeAssembly,
  type TaskLine,
} from './recipes-api';

/** Drop one draft entry, returning a fresh map (state must not be mutated). */
function withoutKey(map: Record<string, string>, key: string): Record<string, string> {
  const next = { ...map };
  delete next[key];
  return next;
}

export function RecipesSection({
  trade,
  onOpenCatalogue = () => {},
}: {
  trade: HubTrade;
  onOpenCatalogue?: () => void;
}) {
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
    const assemblies = (tasks.data?.assemblies ?? []).filter(a => a.trade.toLowerCase() === trade);
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
          {
            "Define the parts and steps a job always needs so it's quoted the same way every time. These are yours — editing them never affects another tradie."
          }
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
        catalogueCategoriesByTrade={data.catalogue_categories_by_trade}
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
  const [draftTitle, setDraftTitle] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [required, setRequired] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const busyId = update.isPending ? update.variables.id : del.isPending ? del.variables.id : null;
  const busy = busyId !== null || reordering;

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
    update.isError || del.isError
      ? apiErrorMessage(update.isError ? update.error : del.error)
      : null;
  return (
    <Card>
      <SectionLabel>{`${assembly.name} — steps`}</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        {
          "The steps this job always involves, in order. They describe the work — they don't change the price or the hours."
        }
      </Text>

      {steps.length === 0 ? (
        baseline.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[styles.blurb, { color: colors.textSec }]}>
              {
                "No saved steps for this job yet — here's the standard checklist. It stays read-only until the shared fork API can preserve conditional step rules."
              }
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
                    {`SHARED BASELINE · ${b.required !== false ? 'REQUIRED' : 'OPTIONAL'}${b.include_when && Object.keys(b.include_when).length > 0 ? ' · CONDITIONAL' : ''}`}
                  </Text>
                </View>
              </View>
            ))}
            <Notice
              tone="warn"
              label="Lossless copy is not available"
              body="The current shared fork API omits task conditions in every client. QuoteMax will not turn conditional standard steps into unconditional custom steps."
            />
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
                {step.include_when && Object.keys(step.include_when).length > 0 ? (
                  <Text style={[styles.rowTag, { color: colors.textDim }]}>CONDITIONAL STEP</Text>
                ) : null}
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
                    {
                      backgroundColor: colors.ink,
                      borderColor: colors.ctlLine,
                      color: colors.textPri,
                    },
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
                    {
                      backgroundColor: colors.ink,
                      borderColor: colors.ctlLine,
                      color: colors.textSec,
                    },
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
                    onPress={() =>
                      update.mutate({ id: step.id, required: step.required === false })
                    }
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
  catalogueCategoriesByTrade,
  onOpenCatalogue,
}: {
  trade: HubTrade;
  assembly: RecipeAssembly;
  lines: BomLine[];
  baseline: BaselineLine[];
  catalogueCategoriesByTrade: Readonly<Record<string, readonly string[]>>;
  onOpenCatalogue: () => void;
}) {
  const { colors } = useTheme();
  const create = useCreateBomLine();
  const update = useUpdateBomLine();
  const del = useDeleteBomLine();
  const [draftQty, setDraftQty] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('');
  const [qtyStr, setQtyStr] = useState('1');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const catalogueCategories = catalogueCategoriesByTrade[trade] ?? [];
  const effectiveLines = lines.length > 0 ? lines : baseline;
  const readiness = assessRecipePriceReadiness(effectiveLines, catalogueCategoriesByTrade, trade);
  const missingPriceCount = readiness.missingRequiredCategories.length;
  const conditionalContextCount = readiness.conditionalContextCategories.length;

  const busyId = update.isPending ? update.variables.id : del.isPending ? del.variables.id : null;

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
    update.isError || del.isError
      ? apiErrorMessage(update.isError ? update.error : del.error)
      : null;
  const categoryOptions = materialCategoriesFor(trade).map((o): [string, string] => [
    o.value,
    o.label,
  ]);

  return (
    <Card>
      <SectionLabel>{`${assembly.name} — parts`}</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        The parts this job always needs. Each line prices from your catalogue product in that
        category. Missing tenant catalogue prices route the estimate to inspection.
      </Text>

      {missingPriceCount > 0 || conditionalContextCount > 0 ? (
        <View style={{ marginBottom: spacing.md }}>
          <RecipePricingAuthority
            count={missingPriceCount}
            conditionalCount={conditionalContextCount}
            detectionFailed={false}
            onOpenCatalogue={onOpenCatalogue}
          />
        </View>
      ) : null}

      {lines.length === 0 ? (
        baseline.length > 0 ? (
          <View style={{ gap: spacing.md }}>
            <Text style={[styles.blurb, { color: colors.textSec }]}>
              {
                "No saved recipe for this job yet — here's the standard baseline we'd use. It stays read-only until the shared fork API can preserve conditions and quantity ratios."
              }
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
                    {`SHARED BASELINE · QTY ${b.quantity} · ${b.required !== false ? 'REQUIRED' : 'OPTIONAL'}${b.quantity_per != null ? ` · RATIO ÷${b.quantity_per}` : ''}${b.include_when && Object.keys(b.include_when).length > 0 ? ' · CONDITIONAL' : ''}`}
                  </Text>
                </View>
              </View>
            ))}
            <Notice
              tone="warn"
              label="Lossless copy is not available"
              body="The current shared fork API omits part conditions and quantity ratios in every client. QuoteMax will not copy the baseline until those quoting rules can be preserved."
            />
          </View>
        ) : (
          <Text style={[styles.blurb, { color: colors.textSec }]}>
            No recipe yet for this job, and no standard baseline either. Add the parts it always
            needs below.
          </Text>
        )
      ) : (
        lines.map(line => {
          const qtyValue = draftQty[line.id] ?? String(line.quantity);
          const badge = resolveCatalogueBadge(line.material_category, catalogueCategories);
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
                {line.include_when && Object.keys(line.include_when).length > 0 ? (
                  <Text style={[styles.rowTag, { color: colors.textDim }]}>CONDITIONAL PART</Text>
                ) : null}
                {line.quantity_per != null ? (
                  <Text style={[styles.rowTag, { color: colors.textDim }]}>
                    {`RATIO QUANTITY · CEIL(ITEM COUNT ÷ ${line.quantity_per})`}
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
                      {
                        backgroundColor: colors.ink,
                        borderColor: colors.ctlLine,
                        color: colors.textPri,
                      },
                    ]}
                  />
                  <RequiredPill
                    required={line.required !== false}
                    disabled={rowBusy}
                    onPress={() =>
                      update.mutate({ id: line.id, required: line.required === false })
                    }
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
      <View style={styles.form}>
        <SectionLabel>Add a part</SectionLabel>
        <View>
          <Text style={[styles.fieldLabel, { color: colors.textPri }]}>MATERIAL CATEGORY</Text>
          <PillGroup options={categoryOptions} value={category} onChange={setCategory} />
          <Text style={[styles.hint, { color: colors.textDim, marginTop: spacing.sm }]}>
            What part the job needs. Add a product in this category under Catalogue and the AI uses
            your product and your price; otherwise the estimate routes to inspection.
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
      <ThemedSwitch
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
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        maxLength={maxLength}
        selectionColor={colors.accentSoft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: colors.ink,
            borderColor: focused ? colors.accentSoft : colors.ctlLine,
            color: colors.textPri,
          },
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
          minHeight: accent ? touch.primaryCta : touch.minimum,
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
      <Text style={[styles.actionLabel, { color: accent ? colors.accentInk : colors.textPri }]}>
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
    fontSize: 14,
    lineHeight: 20,
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
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  kvValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowName: { fontFamily: fonts.sans.semiBold, fontSize: 16, lineHeight: 22 },
  rowMeta: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  rowTag: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  stepNum: {
    paddingTop: spacing.sm + 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
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
  inlineInputSmall: { fontSize: 14 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  iconBtn: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnLabel: { fontFamily: fonts.mono.bold, fontSize: 13 },
  dimmed: { opacity: 0.4 },
  textBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  qtyLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
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
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  togglePillLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  hint: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  errorLine: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  form: { marginTop: spacing.xl, gap: spacing.xl },
  fieldLabel: {
    marginBottom: spacing.sm,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: touch.listRow,
  },
  switchLabel: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionBtn: {
    minHeight: touch.minimum,
    maxWidth: '100%',
    flexShrink: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
