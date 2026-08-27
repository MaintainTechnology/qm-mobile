/**
 * Hub Catalogue section — the native port of the web CatalogueTab's three-mode
 * editor (page.tsx:11314-12469) at mobile scope:
 *   MINE   — the tradie's stocked products: coverage report (GET gaps),
 *            stock-the-essentials, create/edit/delete + the active toggle.
 *   BROWSE — the supplier library (BrowseSupplierPanel): category/brand/search
 *            filters, multi-select, "+ Add N to my catalogue" via bulk-add.
 *   LADDER — the Good/Better/Best picker (TierLadderPanel): one product per
 *            category and tier, empty slots fall back to inference.
 *
 * Write gate: ONLY create is TRADE_ENUM-gated (MaterialCatalogueSchema pins
 * `trade` to electrical|plumbing) — non-writable trades get gatedWriteCopy + a
 * web link instead of the add form. Edits omit `trade` (the [id] PATCH only
 * validates it when sent), and delete / bulk-add / stock-essentials / ladder
 * writes carry no trade at all, so those stay live everywhere the server has
 * data to act on. Reads are live for all 8 hub trades.
 *
 * Nothing here computes a price: catalogue prices render exactly as the wire
 * sends them (dollars ex-GST → cents at the display boundary), and bulk-add
 * pricing (supplier RRP) happens server-side.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { appendFile, pickImage, sizeOk } from '@/lib/media';
import { apiDollarsFromCents, centsFromApiDollars, formatAud, parseAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import {
  BULK_ADD_MAX,
  filterCatalogueRows,
  filterSupplierRows,
  groupByCategory,
  ladderProductLabel,
  LADDER_TIERS,
  materialCategoryLabel,
  materialCategoryOptionsFor,
  sortGapCategories,
  summariseBulkAdd,
  supplierBrands,
  supplierCategories,
  toggleSelection,
  useBulkAddFromSupplier,
  useCatalogue,
  useCatalogueGaps,
  useClearLadderSlot,
  useCreateCatalogueItem,
  useDeleteCatalogueItem,
  useSetLadderSlot,
  useStockEssentials,
  useSupplierCatalogue,
  useTierLadder,
  useToggleCatalogueActive,
  useUpdateCatalogueItem,
  useUploadCatalogueImage,
  wireNumber,
  type CatalogueItemFields,
  type CatalogueRow,
  type LadderTier,
  type SupplierRow,
} from '../../catalogue-api';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { TRADE_LABELS, type HubTrade } from '../sections';
import { canWritePricingEngine, gatedWriteCopy } from '../write-gate';

type ViewMode = 'mine' | 'browse' | 'ladder';

/** Incremental render instead of FlashList: sections live inside the hub's
 *  ScrollView, where a nested virtualised list cannot virtualise anyway. */
const MINE_PAGE = 10; // web CAT_PAGE_SIZE
const BROWSE_PAGE = 20;

const IDEMPOTENT_RETRY_COPY =
  'Safe to retry — anything that already landed in your catalogue is skipped, never doubled.';

export function CatalogueSection({ trade }: { trade: HubTrade }) {
  const [mode, setMode] = useState<ViewMode>('mine');
  const query = useCatalogue();
  const mineCount = (query.data?.catalogue ?? []).filter(
    r => (r.trade ?? '').toLowerCase() === trade,
  ).length;

  // Web mode-toggle labels, verbatim (page.tsx:11814-11848).
  const modeOptions: readonly (readonly [string, string])[] = [
    ['mine', `My catalogue (${mineCount})`],
    ['browse', '+ Browse supplier catalogue'],
    ['ladder', 'G/B/B ladder'],
  ];

  return (
    <View style={{ gap: spacing.lg }}>
      <PillGroup
        options={modeOptions}
        value={mode}
        onChange={next => setMode(next === 'browse' ? 'browse' : next === 'ladder' ? 'ladder' : 'mine')}
      />
      {mode === 'mine' ? (
        <MinePanel trade={trade} />
      ) : mode === 'browse' ? (
        <BrowsePanel trade={trade} />
      ) : (
        <LadderPanel trade={trade} />
      )}
    </View>
  );
}

// ── MINE — stocked products ─────────────────────────────────────────────────

type FormState = { mode: 'create' } | { mode: 'edit'; row: CatalogueRow };

function MinePanel({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const query = useCatalogue();
  const toggle = useToggleCatalogueActive();
  const del = useDeleteCatalogueItem();
  const [form, setForm] = useState<FormState | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [visibleCount, setVisibleCount] = useState(MINE_PAGE);

  if (query.isPending) return <Notice tone="accent" label="Loading catalogue…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load the catalogue"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  const canWrite = canWritePricingEngine(trade);
  const rows = (query.data?.catalogue ?? []).filter(
    r => (r.trade ?? '').toLowerCase() === trade,
  );

  // Web hub-mode dead end for non-catalogue trades (page.tsx:11763-11773) —
  // shown only when there is nothing to list; stray rows still render below.
  if (!canWrite && rows.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label="No product catalogue for this trade yet"
          body="The supplier catalogue covers electrical and plumbing. This trade's materials are priced through its tool settings and rate cards."
        />
        <LinkOutButton label="Open on the web" path={`/dashboard?tab=hub-${trade}`} tone="accent" />
      </View>
    );
  }

  // Per-category counts off the trade-scoped (unfiltered) list so chip labels
  // stay stable while narrowing — web parity.
  const counts = new Map<string, number>();
  for (const r of rows) {
    const c = r.category ?? '';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const chipOptions: readonly (readonly [string, string])[] = [
    ['all', `All (${rows.length})`],
    ...[...counts.keys()]
      .sort()
      .map((c): readonly [string, string] => [c, `${materialCategoryLabel(c)} (${counts.get(c) ?? 0})`]),
  ];

  const filtered = filterCatalogueRows(rows, { category, search });
  const groups = groupByCategory(filtered.slice(0, visibleCount));
  const remaining = filtered.length - Math.min(visibleCount, filtered.length);

  const busyId = toggle.isPending ? toggle.variables.id : del.isPending ? del.variables.id : null;

  const confirmDelete = (row: CatalogueRow) => {
    Alert.alert('Delete this product?', `Delete "${row.name}" from your catalogue?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate({ id: row.id }) },
    ]);
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <CoverageCard trade={trade} />

      {toggle.isError || del.isError ? (
        <Notice
          tone="danger"
          label="That change didn't save"
          body={apiErrorMessage(toggle.isError ? toggle.error : del.error)}
        />
      ) : null}

      <Card>
        <SectionLabel>{`Product catalogue · ${rows.length}`}</SectionLabel>
        <Text style={[styles.blurb, { color: colors.textSec }]}>
          Your real branded products and prices. The AI quotes these ahead of generic items and
          maps brand + range to a tier (e.g. Clipsal Iconic → Better, Clipsal 2000 → Good). Off
          rows are never offered.
        </Text>

        {canWrite && rows.length < 10 ? <EssentialsBlock empty={rows.length === 0} /> : null}

        {form ? (
          <ProductForm
            key={form.mode === 'edit' ? form.row.id : 'create'}
            trade={trade}
            initial={form.mode === 'edit' ? form.row : null}
            onClose={() => setForm(null)}
          />
        ) : canWrite ? (
          <ActionButton label="+ Add product" onPress={() => setForm({ mode: 'create' })} />
        ) : (
          <View style={styles.gateBlock}>
            <Text style={[styles.blurb, { color: colors.textDim }]}>
              {gatedWriteCopy(TRADE_LABELS[trade])}
            </Text>
            <LinkOutButton label="Manage on the web" path={`/dashboard?tab=hub-${trade}`} />
          </View>
        )}

        {rows.length === 0 ? (
          <Text style={[styles.blurb, { color: colors.textSec }]}>
            No catalogue products yet. Add your first so the AI quotes your real products and
            prices.
          </Text>
        ) : (
          <>
            <Field
              label="Search"
              value={search}
              onChangeText={setSearch}
              placeholder="Search by product, brand, range or supplier…"
            />
            <View style={{ marginTop: spacing.sm }}>
              <PillGroup options={chipOptions} value={category} onChange={setCategory} />
            </View>

            {filtered.length === 0 ? (
              <Text style={[styles.blurb, { color: colors.textSec }]}>
                {search.trim()
                  ? `No products match “${search.trim()}”.`
                  : `No products in ${materialCategoryLabel(category)}.`}
              </Text>
            ) : (
              groups.map(g => (
                <View key={g.category}>
                  <Text style={[styles.groupHeader, { color: colors.accentText }]}>
                    {`${materialCategoryLabel(g.category)} · ${g.items.length}`.toUpperCase()}
                  </Text>
                  {g.items.map(r => (
                    <ProductRow
                      key={r.id}
                      row={r}
                      busy={busyId === r.id}
                      onToggle={() => toggle.mutate({ id: r.id, active: r.active === false })}
                      onEdit={() => setForm({ mode: 'edit', row: r })}
                      onDelete={() => confirmDelete(r)}
                    />
                  ))}
                </View>
              ))
            )}
            {remaining > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <ActionButton
                  label={`Show more (${remaining} left)`}
                  onPress={() => setVisibleCount(n => n + MINE_PAGE)}
                />
              </View>
            ) : null}
          </>
        )}
      </Card>
    </View>
  );
}

/** Web CoveragePanel at hub scope: this trade's shared-vs-stocked rollup. */
function CoverageCard({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const gaps = useCatalogueGaps();
  if (gaps.isPending) return null; // auxiliary panel — the list is the priority
  if (gaps.isError && !gaps.data)
    return (
      <Notice
        tone="warn"
        label="Couldn't load coverage"
        body={apiErrorMessage(gaps.error)}
        onRetry={() => void gaps.refetch()}
      />
    );
  const report = (gaps.data?.by_trade ?? []).find(t => t.trade.toLowerCase() === trade);
  if (!report || report.total_shared_categories === 0) return null;
  const cats = sortGapCategories(report.categories);
  return (
    <Card>
      <SectionLabel>Coverage</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        {"Shared catalogue rows you have vs you don't."}
      </Text>
      <View style={styles.coverageHeadRow}>
        <Text style={[styles.coverageHead, { color: colors.textPri }]}>
          {`${report.covered_categories} of ${report.total_shared_categories} categories`}
        </Text>
        <Text
          style={[
            styles.coveragePct,
            {
              color:
                report.coverage_pct >= 80
                  ? colors.accentText
                  : report.coverage_pct >= 40
                    ? colors.textPri
                    : colors.warningBright,
            },
          ]}
        >
          {`${report.coverage_pct}%`}
        </Text>
      </View>
      {report.missing_rows_total > 0 ? (
        <Text style={[styles.coverageMissing, { color: colors.warningBright }]}>
          {`${report.missing_rows_total} SHARED ROW${report.missing_rows_total === 1 ? '' : 'S'} MISSING`}
        </Text>
      ) : null}
      {cats.map(c => (
        <View key={c.category} style={[styles.coverageRow, { borderTopColor: colors.inkLine }]}>
          <Text
            style={[styles.coverageCat, { color: c.covered ? colors.textPri : colors.warningBright }]}
            numberOfLines={1}
          >
            {materialCategoryLabel(c.category)}
          </Text>
          <Text style={[styles.coverageCount, { color: colors.textDim }]}>
            {`${c.tenant_count} of ${c.shared_count}${c.missing_count > 0 ? ` · ${c.missing_count} missing` : ''}`.toUpperCase()}
          </Text>
        </View>
      ))}
    </Card>
  );
}

/** Web stock-the-essentials prompt (page.tsx:11875-11905), copy verbatim. */
function EssentialsBlock({ empty }: { empty: boolean }) {
  const { colors } = useTheme();
  const essentials = useStockEssentials();
  const [message, setMessage] = useState<string | null>(null);
  const run = () =>
    essentials.mutate(undefined, {
      onSuccess: data =>
        setMessage(
          data.added > 0
            ? `Stocked ${data.added} essential${data.added === 1 ? '' : 's'} (skipped ${data.skipped ?? 0} already on file).`
            : 'No new essentials to stock — your catalogue already has them.',
        ),
    });
  return (
    <View style={[styles.essentials, { borderLeftColor: colors.accent, backgroundColor: colors.ink }]}>
      <Text style={[styles.essentialsLabel, { color: colors.accentText }]}>
        {empty ? 'GET STARTED IN ONE CLICK' : 'QUICK START'}
      </Text>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        {empty
          ? 'Your catalogue is empty. Stock the essentials for your trade and the AI can auto-quote your wedge from the next call.'
          : 'Stock common products in one click — covers the most-quoted categories with one good-tier SKU each. Already-stocked items are skipped.'}
      </Text>
      {message ? (
        <Text style={[styles.essentialsMsg, { color: colors.textDim }]}>{message.toUpperCase()}</Text>
      ) : null}
      {essentials.isError ? (
        <Notice
          tone="danger"
          label="Couldn't stock essentials"
          body={`${apiErrorMessage(essentials.error)} ${IDEMPOTENT_RETRY_COPY}`}
          onRetry={run}
        />
      ) : null}
      <ActionButton
        label={essentials.isPending ? 'Stocking…' : 'Stock the essentials'}
        onPress={run}
        disabled={essentials.isPending}
      />
    </View>
  );
}

function ProductRow({
  row,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  row: CatalogueRow;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const active = row.active !== false;
  const price = wireNumber(row.unit_price_ex_gst);
  const meta = [
    price != null
      ? `${formatAud(centsFromApiDollars(price))}${row.unit && row.unit !== 'each' ? ` / ${row.unit}` : ''} ex-GST`
      : null,
    [row.brand, row.range_series].filter(Boolean).join(' ') || null,
    row.supplier ?? null,
    row.tier_hint ?? null,
    row.is_preferred === true ? '★ preferred' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.row, { borderBottomColor: colors.inkLine }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.rowName, { color: active ? colors.textPri : colors.textSec }]}
          numberOfLines={2}
        >
          {row.name}
        </Text>
        {meta ? (
          <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={2}>
            {meta.toUpperCase()}
          </Text>
        ) : null}
        {row.description ? (
          <Text style={[styles.rowDescription, { color: colors.textDim }]} numberOfLines={2}>
            {row.description}
          </Text>
        ) : null}
        <View style={styles.rowActions}>
          <ActionButton label="Edit" onPress={onEdit} disabled={busy} />
          <ActionButton label="Delete" tone="danger" onPress={onDelete} disabled={busy} />
        </View>
      </View>
      <Switch
        accessibilityLabel={`${row.name} — ${active ? 'active, tap to turn off' : 'off, tap to turn on'}`}
        value={active}
        disabled={busy}
        onValueChange={onToggle}
        trackColor={{ false: colors.inkLine, true: colors.accent }}
        thumbColor={colors.inkCard}
      />
    </View>
  );
}

// ── Create / edit form ──────────────────────────────────────────────────────
// The web form's field set, verbatim (page.tsx:11920-12187), minus the photo
// UPLOAD (URL paste only — native file upload needs an image picker; the web
// path stays one tap away). Trade is locked to the hub, exactly like the web's
// disabled trade select.

/** Unit + tier options, verbatim from the web selects. */
const UNIT_OPTIONS: readonly (readonly [string, string])[] = [
  ['each', 'each'],
  ['m', 'per metre (m)'],
  ['pack', 'per pack'],
  ['set', 'per set'],
  ['pair', 'per pair'],
  ['hr', 'per hour (hr)'],
];
const TIER_OPTIONS: readonly (readonly [string, string])[] = [
  ['', 'Auto (from brand/range)'],
  ['good', 'good'],
  ['better', 'better'],
  ['best', 'best'],
];

function ProductForm({
  trade,
  initial,
  onClose,
}: {
  trade: HubTrade;
  initial: CatalogueRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const create = useCreateCatalogueItem();
  const update = useUpdateCatalogueItem();
  const upload = useUploadCatalogueImage();
  const editingId = initial?.id ?? null;

  const str = (v: number | string | null | undefined) => (v == null ? '' : String(v));
  const [category, setCategory] = useState(initial?.category ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [rangeSeries, setRangeSeries] = useState(initial?.range_series ?? '');
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [unit, setUnit] = useState(initial?.unit ?? 'each');
  const [priceStr, setPriceStr] = useState(str(initial?.unit_price_ex_gst));
  const [custSupplyStr, setCustSupplyStr] = useState(str(initial?.customer_supply_price_ex_gst));
  const [costStr, setCostStr] = useState(str(initial?.cost_price_ex_gst));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [imagePath, setImagePath] = useState(initial?.image_path ?? '');
  const [tierHint, setTierHint] = useState(initial?.tier_hint ?? '');
  const [isPreferred, setIsPreferred] = useState(initial?.is_preferred === true);
  const [smart, setSmart] = useState(initial?.properties?.smart === true);
  const [dimmable, setDimmable] = useState(initial?.properties?.dimmable === true);
  const [integratedDriver, setIntegratedDriver] = useState(
    initial?.properties?.integrated_driver === true,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending;
  const categoryOptions = materialCategoryOptionsFor(trade);

  /** '' → null (PATCH clears) / undefined (create omits); junk → error. */
  const optionalMoney = (
    input: string,
    label: string,
  ): { ok: true; value: number | null } | { ok: false } => {
    if (input.trim() === '') return { ok: true, value: null };
    const cents = parseAud(input);
    if (cents == null || cents < 0) {
      setFormError(`${label} must be a positive number.`);
      return { ok: false };
    }
    return { ok: true, value: apiDollarsFromCents(cents) };
  };

  /** Snap or choose a product photo → POST catalogue/upload (multipart 'file',
   *  JPG/PNG/WebP) → the returned public URL fills the photo field. The 8MB
   *  guard mirrors the server's cap. */
  const attachPhoto = async (source: 'camera' | 'library') => {
    const picked = await pickImage(source);
    if (!picked) return;
    if (!sizeOk(picked, 8 * 1024 * 1024)) {
      setFormError('Photo must be under 8 MB.');
      return;
    }
    const form = new FormData();
    appendFile(form, 'file', picked);
    upload.mutate(form, {
      onSuccess: r => {
        setImagePath(r.url);
        setFormError(null);
      },
      onError: error => setFormError(apiErrorMessage(error)),
    });
  };

  const submit = () => {
    if (!category) {
      setFormError('Choose a category.');
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError('Product name must be at least 2 characters.');
      return;
    }
    const priceCents = parseAud(priceStr);
    if (priceCents == null || priceCents < 0) {
      setFormError('Price ex-GST must be a positive number.');
      return;
    }
    const custSupply = optionalMoney(custSupplyStr, 'Customer-supply price');
    if (!custSupply.ok) return;
    const cost = optionalMoney(costStr, 'Cost price');
    if (!cost.ok) return;
    setFormError(null);

    const properties = { smart, dimmable, integrated_driver: integratedDriver };
    const onError = (error: unknown) => setFormError(apiErrorMessage(error));

    if (editingId) {
      // PATCH: '' clears text fields (API maps '' → null); null clears the
      // optional money fields. `trade` is OMITTED so the trade gate never
      // trips (it's validated only when sent) and the row keeps its trade.
      const body: CatalogueItemFields & { id: string } = {
        id: editingId,
        category,
        name: trimmedName,
        brand: brand.trim(),
        range_series: rangeSeries.trim(),
        supplier: supplier.trim(),
        unit: unit || 'each',
        unit_price_ex_gst: apiDollarsFromCents(priceCents),
        customer_supply_price_ex_gst: custSupply.value,
        cost_price_ex_gst: cost.value,
        description: description.trim(),
        image_path: imagePath.trim(),
        tier_hint: tierHint,
        is_preferred: isPreferred,
        properties,
      };
      update.mutate(body, { onSuccess: onClose, onError });
    } else {
      // POST: empty optionals are omitted, exactly like the web create().
      const body: CatalogueItemFields & { trade: string } = {
        trade,
        category,
        name: trimmedName,
        brand: brand.trim() || undefined,
        range_series: rangeSeries.trim() || undefined,
        supplier: supplier.trim() || undefined,
        unit: unit || undefined,
        unit_price_ex_gst: apiDollarsFromCents(priceCents),
        customer_supply_price_ex_gst: custSupply.value ?? undefined,
        cost_price_ex_gst: cost.value ?? undefined,
        description: description.trim() || undefined,
        image_path: imagePath.trim() || undefined,
        tier_hint: tierHint || undefined,
        is_preferred: isPreferred,
        properties,
      };
      create.mutate(body, { onSuccess: onClose, onError });
    }
  };

  return (
    <View style={styles.form}>
      <SectionLabel>
        {editingId
          ? `Editing “${name || 'product'}” — change anything and save`
          : `New product · ${TRADE_LABELS[trade]}`}
      </SectionLabel>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.textPri }]}>CATEGORY</Text>
        <PillGroup options={categoryOptions} value={category} onChange={setCategory} />
        <Text style={[styles.hint, { color: colors.textDim }]}>
          What this product actually is. The AI matches it to the same category on your Recipes,
          so a job that needs this part prices from your product and your price.
        </Text>
      </View>
      <Field
        label="Product name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Clipsal Iconic GPO"
        maxLength={120}
      />
      <Field label="Brand" value={brand} onChangeText={setBrand} placeholder="Clipsal" maxLength={60} />
      <Field
        label="Range / series"
        value={rangeSeries}
        onChangeText={setRangeSeries}
        placeholder="Iconic / 2000"
        maxLength={60}
      />
      <Field
        label="Supplier"
        value={supplier}
        onChangeText={setSupplier}
        placeholder="Reece / Bunnings"
        maxLength={60}
      />
      <View>
        <Text style={[styles.fieldLabel, { color: colors.textPri }]}>UNIT</Text>
        <PillGroup options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
        <Text style={[styles.hint, { color: colors.textDim }]}>
          {'How the price below is measured — "each" for fittings, "per metre" for cable/pipe.'}
        </Text>
      </View>
      <Field
        label="Price ex-GST"
        value={priceStr}
        onChangeText={setPriceStr}
        placeholder="42"
        keyboardType="decimal-pad"
      />
      <Field
        label="Customer-supply price ex-GST (optional)"
        value={custSupplyStr}
        onChangeText={setCustSupplyStr}
        placeholder="Price if the customer buys this part themselves"
        keyboardType="decimal-pad"
      />
      <Field
        label="Cost price ex-GST (optional)"
        value={costStr}
        onChangeText={setCostStr}
        placeholder="What you pay for it — for your margin only, never quoted"
        keyboardType="decimal-pad"
      />
      <Field
        label="Product description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="e.g. Modern square matte-black finish"
        maxLength={500}
      />
      <Field
        label="Product photo URL (optional)"
        value={imagePath}
        onChangeText={setImagePath}
        placeholder="Paste an image URL (https://…)"
        maxLength={300}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
        <Pressable
          accessibilityRole="button"
          disabled={upload.isPending}
          onPress={() => void attachPhoto('camera')}
          style={{ minHeight: touch.minimum, justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: fonts.mono.bold,
              fontSize: 11,
              letterSpacing: 0.88,
              color: upload.isPending ? colors.textDim : colors.accent,
            }}
          >
            TAKE PHOTO
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={upload.isPending}
          onPress={() => void attachPhoto('library')}
          style={{ minHeight: touch.minimum, justifyContent: 'center' }}
        >
          <Text
            style={{
              fontFamily: fonts.mono.bold,
              fontSize: 11,
              letterSpacing: 0.88,
              color: upload.isPending ? colors.textDim : colors.accent,
            }}
          >
            CHOOSE PHOTO
          </Text>
        </Pressable>
        {upload.isPending ? (
          <Text style={{ fontFamily: fonts.sans.regular, fontSize: 12, color: colors.textDim }}>
            Uploading…
          </Text>
        ) : null}
      </View>
      <SwitchRow
        title="This is my go-to product for its category (preferred)"
        value={isPreferred}
        onValueChange={setIsPreferred}
      />
      <View>
        <Text style={[styles.fieldLabel, { color: colors.textPri }]}>WHAT THIS PRODUCT IS</Text>
        <SwitchRow title="Smart / app-controlled" value={smart} onValueChange={setSmart} />
        <SwitchRow title="Dimmable" value={dimmable} onValueChange={setDimmable} />
        <SwitchRow
          title="Driver built in (no separate driver needed)"
          value={integratedDriver}
          onValueChange={setIntegratedDriver}
        />
        <Text style={[styles.hint, { color: colors.textDim }]}>
          The AI uses these to pick the right product and to work out which other parts the job
          needs.
        </Text>
      </View>
      <View>
        <Text style={[styles.fieldLabel, { color: colors.textPri }]}>TIER (OPTIONAL)</Text>
        <PillGroup options={TIER_OPTIONS} value={tierHint} onChange={setTierHint} />
      </View>
      {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}
      <View style={styles.formActions}>
        <ActionButton label="Cancel" onPress={onClose} />
        <ActionButton
          tone="accent"
          label={busy ? 'Saving…' : editingId ? 'Save changes' : 'Add to catalogue'}
          onPress={submit}
          disabled={busy}
        />
      </View>
    </View>
  );
}

// ── BROWSE — supplier library ───────────────────────────────────────────────

function BrowsePanel({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const query = useSupplierCatalogue();
  const bulk = useBulkAddFromSupplier();
  const [selected, setSelected] = useState<string[]>([]);
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(BROWSE_PAGE);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  if (query.isPending) return <Notice tone="accent" label="Loading supplier catalogue…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Couldn't load supplier catalogue"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  // Hub mode narrows to this trade BEFORE anything else (web lockTrade).
  const rows = (query.data?.supplier_rows ?? []).filter(r => r.trade.toLowerCase() === trade);
  const stocked = new Set(query.data?.already_stocked ?? []);

  if (rows.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label="Supplier catalogue is empty for this trade"
          body="Nothing to browse yet — the supplier library has no rows for this trade. CSV import lives on the web dashboard."
        />
        <LinkOutButton label="Open on the web" path={`/dashboard?tab=hub-${trade}`} tone="accent" />
      </View>
    );
  }

  const categories = supplierCategories(rows);
  const brands = supplierBrands(rows, category);
  const filtered = filterSupplierRows(rows, { category, brand, search });
  const shown = filtered.slice(0, visibleCount);
  const remaining = filtered.length - shown.length;

  const addSelected = () => {
    if (selected.length === 0) return;
    setResultMsg(null);
    bulk.mutate(
      { supplier_catalogue_ids: selected },
      {
        onSuccess: data => {
          const { added, alreadyStocked, failures } = summariseBulkAdd(data.results);
          setResultMsg(
            failures.length === 0
              ? `Added ${data.added} of ${data.total} to your catalogue.`
              : `Added ${added}; skipped ${alreadyStocked} already stocked; ${failures.length} failed (${(failures[0]?.status ?? 'failed').replace(/_/g, ' ')}).`,
          );
          setSelected([]);
        },
      },
    );
  };

  const categoryChips: readonly (readonly [string, string])[] = [
    ['all', 'All categories'],
    ...categories.map((c): readonly [string, string] => [c, materialCategoryLabel(c)]),
  ];
  const brandChips: readonly (readonly [string, string])[] = [
    ['all', 'All brands'],
    ...brands.map((b): readonly [string, string] => [b, b]),
  ];

  return (
    <Card>
      <SectionLabel>Browse supplier catalogue</SectionLabel>
      <Text style={[styles.blurb, { color: colors.textSec }]}>
        Tick what you stock, then add it in one go. Prices default to the supplier RRP — edit
        them from My catalogue after.
      </Text>

      <PillGroup
        options={categoryChips}
        value={category}
        onChange={next => {
          setCategory(next);
          setBrand('all');
        }}
      />
      {brands.length > 1 ? (
        <View style={{ marginTop: spacing.sm }}>
          <PillGroup options={brandChips} value={brand} onChange={setBrand} />
        </View>
      ) : null}
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search materials…" />

      <Text style={[styles.matchLine, { color: colors.textSec }]}>
        {`${filtered.length} matching · ${selected.length} selected`}
      </Text>
      {selected.length >= BULK_ADD_MAX ? (
        <Text style={[styles.hint, { color: colors.warningBright }]}>
          {`Bulk add caps at ${BULK_ADD_MAX} items at a time — add these first, then keep going.`}
        </Text>
      ) : null}

      {resultMsg ? <Notice tone="accent" label="Added to your catalogue" body={resultMsg} /> : null}
      {bulk.isError ? (
        <Notice
          tone="danger"
          label="Add didn't go through"
          body={`${apiErrorMessage(bulk.error)} ${IDEMPOTENT_RETRY_COPY}`}
          onRetry={addSelected}
        />
      ) : null}

      {filtered.length === 0 ? (
        <Text style={[styles.blurb, { color: colors.textSec }]}>
          {search.trim() ? `No materials match “${search.trim()}”.` : 'No materials match these filters.'}
        </Text>
      ) : (
        shown.map(r => (
          <SupplierRowItem
            key={r.id}
            row={r}
            stocked={stocked.has(r.id)}
            selected={selected.includes(r.id)}
            onToggle={() => setSelected(prev => toggleSelection(prev, r.id))}
          />
        ))
      )}
      {remaining > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <ActionButton
            label={`Show more (${remaining} left)`}
            onPress={() => setVisibleCount(n => n + BROWSE_PAGE)}
          />
        </View>
      ) : null}

      <View style={styles.formActions}>
        <ActionButton
          tone="accent"
          label={bulk.isPending ? 'Adding…' : `+ Add ${selected.length || ''} to my catalogue`.replace('  ', ' ')}
          onPress={addSelected}
          disabled={selected.length === 0 || bulk.isPending}
        />
      </View>
    </Card>
  );
}

function SupplierRowItem({
  row,
  stocked,
  selected,
  onToggle,
}: {
  row: SupplierRow;
  stocked: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const rrp = wireNumber(row.default_unit_price_ex_gst);
  const meta = [
    [row.brand, row.range_series].filter(Boolean).join(' '),
    materialCategoryLabel(row.category),
    row.supplier_label,
    rrp != null ? `${formatAud(centsFromApiDollars(rrp))} ex-GST RRP` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: stocked }}
      accessibilityLabel={`Select ${row.name}`}
      disabled={stocked}
      onPress={onToggle}
      style={[
        styles.supplierRow,
        {
          borderColor: selected ? colors.accent : colors.inkLine,
          backgroundColor: selected ? 'rgba(255,196,0,0.06)' : 'transparent',
          opacity: stocked ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: selected ? colors.accent : colors.ctlLine,
            backgroundColor: selected ? colors.accent : 'transparent',
          },
        ]}
      >
        {selected ? <Text style={[styles.checkboxTick, { color: colors.accentInk }]}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.supplierNameRow}>
          <Text style={[styles.rowName, { color: colors.textPri, flexShrink: 1 }]} numberOfLines={2}>
            {row.name}
          </Text>
          {row.tier_hint ? (
            <Text style={[styles.badge, { color: colors.textDim, borderColor: colors.inkLine }]}>
              {row.tier_hint.toUpperCase()}
            </Text>
          ) : null}
          {stocked ? (
            <Text style={[styles.badge, { color: colors.accentText, borderColor: colors.accent }]}>
              ✓ IN YOUR CATALOGUE
            </Text>
          ) : null}
        </View>
        {meta ? (
          <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={2}>
            {meta.toUpperCase()}
          </Text>
        ) : null}
        {row.description ? (
          <Text style={[styles.rowDescription, { color: colors.textDim }]} numberOfLines={2}>
            {row.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

// ── LADDER — Good / Better / Best ───────────────────────────────────────────

function LadderPanel({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const query = useTierLadder();
  const set = useSetLadderSlot();
  const clear = useClearLadderSlot();
  const [openSlot, setOpenSlot] = useState<string | null>(null);

  if (query.isPending) return <Notice tone="accent" label="Loading tier ladder…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Couldn't load tier ladder"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  const byCategory = query.data?.catalogue_by_category ?? {};
  // A category belongs to this hub when its stocked products do (web parity —
  // ladder rows carry no trade; the two trades' category sets are disjoint).
  const categories = Object.keys(byCategory)
    .filter(c => (byCategory[c] ?? []).some(r => r.trade.toLowerCase() === trade))
    .sort();

  if (categories.length === 0) {
    return (
      <Notice
        tone="accent"
        label="Stock some products first"
        body="The G/B/B ladder picks from your own catalogue. Use Stock the essentials or Browse supplier catalogue on this tab first."
      />
    );
  }

  const slotByKey = new Map<string, string>();
  for (const l of query.data?.ladder ?? []) slotByKey.set(`${l.category}::${l.tier}`, l.catalogue_id);
  const allProducts = Object.values(byCategory).flat();
  const busyKey = set.isPending
    ? `${set.variables.category}::${set.variables.tier}`
    : clear.isPending
      ? `${clear.variables.category}::${clear.variables.tier}`
      : null;

  const pick = (category: string, tier: LadderTier, catalogueId: string) => {
    setOpenSlot(null);
    const current = slotByKey.get(`${category}::${tier}`) ?? '';
    if (catalogueId === current) return;
    if (catalogueId === '') clear.mutate({ category, tier });
    else set.mutate({ category, tier, catalogue_id: catalogueId });
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <Notice
        tone="accent"
        label="Good / Better / Best — your ladder"
        body="Pin a specific product per category and tier. When the AI quotes a job at a tier you've set, it uses THIS exact product — overriding brand+range inference. Empty slots fall back to the inference (no regression)."
      />
      {set.isError || clear.isError ? (
        <Notice
          tone="danger"
          label="That slot didn't save"
          body={apiErrorMessage(set.isError ? set.error : clear.error)}
        />
      ) : null}
      {categories.map(cat => {
        const products = byCategory[cat] ?? [];
        return (
          <Card key={cat}>
            <SectionLabel>{`${materialCategoryLabel(cat)} · ${products.length} stocked`}</SectionLabel>
            {LADDER_TIERS.map(tier => {
              const key = `${cat}::${tier}`;
              const currentId = slotByKey.get(key) ?? '';
              const currentProduct = allProducts.find(p => p.id === currentId);
              const busy = busyKey === key;
              const open = openSlot === key;
              return (
                <View key={tier} style={[styles.slotRow, { borderTopColor: colors.inkLine }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${materialCategoryLabel(cat)} ${tier} product`}
                    disabled={busy}
                    onPress={() => setOpenSlot(open ? null : key)}
                    style={[styles.slotHead, busy && styles.dimmed]}
                  >
                    <Text style={[styles.slotTier, { color: colors.textDim }]}>
                      {tier.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.slotValue,
                        { color: currentId ? colors.textPri : colors.textDim },
                      ]}
                      numberOfLines={2}
                    >
                      {busy
                        ? 'Saving…'
                        : currentProduct
                          ? ladderProductLabel(currentProduct)
                          : '— inference fallback —'}
                    </Text>
                    <Text style={[styles.slotChevron, { color: colors.textDim }]}>
                      {open ? '▲' : '▼'}
                    </Text>
                  </Pressable>
                  {open ? (
                    <View style={[styles.slotPicker, { borderColor: colors.ctlLine, backgroundColor: colors.ink }]}>
                      <PickerOption
                        label="— inference fallback —"
                        selected={currentId === ''}
                        onPress={() => pick(cat, tier, '')}
                      />
                      {products.map(p => (
                        <PickerOption
                          key={p.id}
                          label={ladderProductLabel(p)}
                          selected={currentId === p.id}
                          onPress={() => pick(cat, tier, p.id)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card>
        );
      })}
    </View>
  );
}

function PickerOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.pickerOption}
    >
      <Text
        style={[
          styles.pickerOptionLabel,
          { color: selected ? colors.accentText : colors.textPri },
        ]}
        numberOfLines={2}
      >
        {selected ? '● ' : '○ '}
        {label}
      </Text>
    </Pressable>
  );
}

// ── Local form primitives (house pattern — same as ServicesSection's) ───────

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
    <View style={{ marginTop: spacing.sm }}>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={label}
        style={[
          styles.input,
          { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textPri },
        ]}
      />
    </View>
  );
}

function SwitchRow({
  title,
  value,
  onValueChange,
}: {
  title: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.switchRow}>
      <Text style={[styles.switchTitle, { color: colors.textPri }]}>{title}</Text>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.inkLine, true: colors.accent }}
        thumbColor={colors.inkCard}
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
  tone?: 'accent' | 'quiet' | 'danger';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const accent = tone === 'accent';
  const textColor =
    tone === 'accent' ? colors.accentInk : tone === 'danger' ? colors.dangerBright : colors.textPri;
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
          borderColor: accent
            ? colors.accent
            : tone === 'danger'
              ? colors.dangerBright
              : colors.ctlLine,
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
      <Text style={[styles.actionLabel, { color: textColor }]} numberOfLines={1}>
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
  hint: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans.regular,
    fontSize: 11.5,
    lineHeight: 16,
  },
  gateBlock: { marginTop: spacing.md, gap: spacing.md },
  groupHeader: {
    marginTop: spacing.md,
    fontFamily: fonts.mono.bold,
    fontSize: 10.5,
    letterSpacing: 0.84, // .08em @ 10.5
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  rowName: { fontFamily: fonts.sans.semiBold, fontSize: 13.5, lineHeight: 18 },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
    lineHeight: 14,
  },
  rowDescription: {
    marginTop: 2,
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  rowActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  form: { marginTop: spacing.md, marginBottom: spacing.sm, gap: spacing.md },
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
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  switchTitle: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 13, lineHeight: 17 },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
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
  // Coverage
  coverageHeadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  coverageHead: { fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  coveragePct: { fontFamily: fonts.mono.bold, fontSize: 15, fontVariant: ['tabular-nums'] },
  coverageMissing: {
    marginTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  coverageCat: { flexShrink: 1, fontFamily: fonts.sans.semiBold, fontSize: 12.5 },
  coverageCount: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  // Essentials
  essentials: {
    marginTop: spacing.md,
    borderLeftWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  essentialsLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  essentialsMsg: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    lineHeight: 14,
  },
  // Browse
  matchLine: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.semiBold,
    fontSize: 12.5,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
  },
  supplierNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: { fontFamily: fonts.sans.bold, fontSize: 14, lineHeight: 18 },
  badge: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  // Ladder
  slotRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  slotHead: {
    minHeight: touch.minimum,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  slotTier: {
    width: 56,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  slotValue: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 13, lineHeight: 17 },
  slotChevron: { fontFamily: fonts.mono.semiBold, fontSize: 10 },
  slotPicker: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pickerOption: { minHeight: touch.minimum, justifyContent: 'center' },
  pickerOptionLabel: { fontFamily: fonts.sans.semiBold, fontSize: 13, lineHeight: 17 },
  dimmed: { opacity: 0.5 },
});
