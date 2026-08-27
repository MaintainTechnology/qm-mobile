/**
 * The hub's non-queue sections, mirroring the web TradeHub's section renders
 * (page.tsx:17209-17322) at mobile scope:
 *   pricing   → the trade's pricing-book numbers (PricingTab's read surface)
 *   services  → tenant service offerings + preferred brands (ServicesTab)
 *   catalogue → GET /api/tenant/catalogue rows (CatalogueTab's list)
 *   recipes   → GET /api/tenant/tasks assemblies + step counts (RecipesTab)
 *   estimating→ pointer card — the web EstimatingTab is a full BOM editor and
 *               stays web-only this round; the section itself is web parity.
 * Editing stays where it already lives (Menu → Pricing book, web dashboard).
 */
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { formatJobType } from '@/features/quotes/status';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing } from '@/lib/theme';
import { tenantTrades, useTenantMe } from '@/lib/tenant';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';
import { useCatalogue } from '../catalogue-api';
import { LinkOutButton } from './LinkOut';
import { TRADE_LABELS, type HubTrade } from './sections';

// ── Shared bits ─────────────────────────────────────────────────────────────

function KeyValueRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kvRow, { borderBottomColor: colors.inkLine }]}>
      <Text style={[styles.kvLabel, { color: colors.textDim }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.kvValue, { color: colors.textPri }]}>{value}</Text>
    </View>
  );
}

/** Web link-out card: the explanation plus a button that opens the web page. */
export function WebOnlyCard({
  label,
  body,
  path,
  cta = 'Open on the web',
}: {
  label: string;
  body: string;
  /** Site-relative web path; no button when omitted. */
  path?: string;
  cta?: string;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      <Notice tone="accent" label={label} body={body} />
      {path ? <LinkOutButton label={cta} path={path} tone="accent" /> : null}
    </View>
  );
}

// ── Pricing ─────────────────────────────────────────────────────────────────

export function PricingSection({ trade }: { trade: HubTrade }) {
  const me = useTenantMe();
  const book = (me.data?.pricing_books ?? []).find(b => (b.trade ?? '').toLowerCase() === trade);
  if (!book) {
    return (
      <WebOnlyCard
        label={`No ${TRADE_LABELS[trade]} pricing book yet`}
        body="Run the pricing wizard on the web dashboard to set this trade's rates."
        path={`/dashboard/pricing-wizard?trade=${trade}`}
        cta="Open the pricing wizard"
      />
    );
  }
  const money = (dollars: number | null | undefined) =>
    dollars == null ? '—' : formatAud(centsFromApiDollars(dollars));
  return (
    <View style={{ gap: spacing.lg }}>
      <Card>
        <SectionLabel>{`${TRADE_LABELS[trade]} pricing book`}</SectionLabel>
        <KeyValueRow label="Hourly rate" value={money(book.hourly_rate)} />
        <KeyValueRow label="Call-out minimum" value={money(book.call_out_minimum)} />
        <KeyValueRow
          label="Default markup"
          value={book.default_markup_pct == null ? '—' : `${book.default_markup_pct}%`}
        />
        <FootNote text="Edit rates in Menu → Pricing book, or run the pricing wizard on the web." />
      </Card>
      {/* Web parity: the hub's pricing section carries a Pricing-wizard link card
          (page.tsx:17263-17290 → /dashboard/pricing-wizard?trade={trade}). */}
      <WebOnlyCard
        label="Pricing wizard"
        body="Rebuild this trade's rates from a guided walkthrough — call-outs, hourly rate and markup in a few minutes."
        path={`/dashboard/pricing-wizard?trade=${trade}`}
        cta="Open the pricing wizard"
      />
    </View>
  );
}

// ── Services & brands ───────────────────────────────────────────────────────

export function ServicesSection({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const me = useTenantMe();
  const services = (me.data?.services ?? []).filter(s => (s.trade ?? '').toLowerCase() === trade);
  const brandRows = (me.data?.material_categories ?? []).filter(
    c => (c.trade ?? '').toLowerCase() === trade,
  );
  const preferences = me.data?.material_preferences ?? {};

  if (services.length === 0 && brandRows.length === 0) {
    return (
      <WebOnlyCard
        label="No services listed yet"
        body="Turn services on or off from the web dashboard's Services & brands section."
        path={`/dashboard?tab=hub-${trade}`}
        cta="Open services on the web"
      />
    );
  }
  return (
    <View style={{ gap: spacing.lg }}>
      {services.length > 0 ? (
        <Card>
          <SectionLabel>{`Services · ${services.length}`}</SectionLabel>
          {services.map((s, i) => (
            <View
              key={s.id ?? s.assembly_id ?? `svc-${i}`}
              style={[styles.kvRow, { borderBottomColor: colors.inkLine }]}
            >
              <Text style={[styles.serviceName, { color: colors.textPri }]} numberOfLines={2}>
                {s.name ?? '—'}
              </Text>
              <Text
                style={[
                  styles.serviceState,
                  { color: s.enabled === false ? colors.textDim : colors.successBright },
                ]}
              >
                {s.enabled === false ? 'OFF' : 'ON'}
              </Text>
            </View>
          ))}
          <FootNote text="Toggle services on the web dashboard — changes show here." />
        </Card>
      ) : null}
      {brandRows.length > 0 ? (
        <Card>
          <SectionLabel>Preferred brands</SectionLabel>
          {brandRows.map((c, i) => (
            <KeyValueRow
              key={c.category ?? `cat-${i}`}
              label={formatJobType(c.category)}
              value={(c.category && preferences[c.category]) || 'No preference'}
            />
          ))}
        </Card>
      ) : null}
    </View>
  );
}

// ── Catalogue ───────────────────────────────────────────────────────────────
// Shape + query key live in ../catalogue-api — the job quoter reads the same
// endpoint, and two schemas under one react-query key poisoned the cache.

export function CatalogueSection({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const query = useCatalogue();
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
  const rows = (query.data?.catalogue ?? []).filter(
    r => !r.trade || r.trade.toLowerCase() === trade,
  );
  if (rows.length === 0)
    return (
      <WebOnlyCard
        label="Catalogue is empty"
        body="Add materials from the web dashboard's Catalogue section — they price your quotes."
        path={`/dashboard?tab=hub-${trade}`}
        cta="Open the catalogue on the web"
      />
    );
  return (
    <Card>
      <SectionLabel>{`Materials · ${rows.length}`}</SectionLabel>
      {rows.map((r, i) => (
        <View
          key={r.id ?? `mat-${i}`}
          style={[styles.kvRow, { borderBottomColor: colors.inkLine }]}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.serviceName, { color: colors.textPri }]} numberOfLines={1}>
              {r.name ?? '—'}
            </Text>
            <Text style={[styles.kvLabel, { color: colors.textDim }]} numberOfLines={1}>
              {[r.brand, formatJobType(r.category)].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          </View>
        </View>
      ))}
      <FootNote text="Add or edit materials on the web dashboard." />
    </Card>
  );
}

// ── Recipes ─────────────────────────────────────────────────────────────────

const RecipesSchema = z.looseObject({
  assemblies: z
    .array(z.looseObject({ id: z.string(), name: z.string(), trade: z.string() }))
    .default([]),
  lines: z.array(z.looseObject({ assembly_id: z.string().nullish() })).default([]),
  baselines: z.record(z.string(), z.array(z.looseObject({}))).default({}),
});

export function RecipesSection({ trade }: { trade: HubTrade }) {
  const query = useApiQuery(['tenant', 'tasks'], '/api/tenant/tasks', RecipesSchema);
  if (query.isPending) return <Notice tone="accent" label="Loading recipes…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load recipes"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  const assemblies = (query.data?.assemblies ?? []).filter(a => a.trade.toLowerCase() === trade);
  if (assemblies.length === 0)
    return (
      <WebOnlyCard
        label="No recipes for this trade yet"
        body="Recipes are the step lists behind each job type. Build them on the web dashboard."
        path={`/dashboard?tab=hub-${trade}`}
        cta="Open recipes on the web"
      />
    );
  const custom = new Map<string, number>();
  for (const line of query.data?.lines ?? []) {
    if (line.assembly_id) custom.set(line.assembly_id, (custom.get(line.assembly_id) ?? 0) + 1);
  }
  const baselines = query.data?.baselines ?? {};
  return (
    <Card>
      <SectionLabel>{`Job recipes · ${assemblies.length}`}</SectionLabel>
      {assemblies.map(a => {
        const customCount = custom.get(a.id) ?? 0;
        const baseCount = baselines[a.id]?.length ?? 0;
        const steps =
          customCount > 0 ? `${customCount} custom steps` : `${baseCount} standard steps`;
        return <KeyValueRow key={a.id} label={a.name} value={steps} />;
      })}
      <FootNote text="Customise a recipe's steps on the web dashboard." />
    </Card>
  );
}

// ── Footnote ────────────────────────────────────────────────────────────────

function FootNote({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.foot, { color: colors.textDim }]}>{text}</Text>;
}

/** Where each web-only tool lives: aircon has its own page; the rest are
 *  dashboard tabs, deep-linkable via ?tab= (note commercial-painting's tab id
 *  is hyphenated while the trade slug is underscored — web quote-queue.ts
 *  jobTradeSlug normalises the same pair). */
const TOOL_PATHS: Partial<Record<HubTrade, string>> = {
  signage: '/dashboard?tab=signage',
  painting: '/dashboard?tab=painting',
  commercial_painting: '/dashboard?tab=commercial-painting',
  aircon: '/dashboard/aircon',
  solar: '/dashboard?tab=solar',
};

/** Tools section for hub trades whose tool has no mobile port yet. */
export function ToolsWebOnly({ trade }: { trade: HubTrade }) {
  return (
    <WebOnlyCard
      label={`${TRADE_LABELS[trade]} tool is on the web`}
      body={`Run the ${TRADE_LABELS[trade].toLowerCase()} tool on the web dashboard — quotes it saves land straight in this queue.`}
      path={TOOL_PATHS[trade] ?? '/dashboard'}
      cta={`Open the ${TRADE_LABELS[trade].toLowerCase()} tool`}
    />
  );
}

/** Web parity: electrical's tools section also carries the plan-upload
 *  estimator (EstimatorBetaTab), which stays a web tool this round. */
export function EstimatorBetaCard() {
  return (
    <WebOnlyCard
      label="Estimator (beta)"
      body="Upload plans and let QuoteMax extract and price the bill of materials. A web dashboard tool — priced runs land in this queue."
      path="/dashboard?tab=estimator"
      cta="Open the estimator"
    />
  );
}

/** Estimating stays a pointer: the web tab is a full BOM editor. */
export function EstimatingSection({ trade }: { trade: HubTrade }) {
  const me = useTenantMe();
  const trades = me.data ? tenantTrades(me.data) : [];
  void trades;
  return (
    <WebOnlyCard
      label="Estimating lives on the web"
      body={`Assembly estimating for ${TRADE_LABELS[trade].toLowerCase()} — labour hours, unit prices and bills of materials — is a web dashboard tool. Everything it prices flows into the quotes here.`}
      path="/dashboard?tab=estimating"
      cta="Open estimating"
    />
  );
}

const styles = StyleSheet.create({
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  kvLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  kvValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  serviceName: { flex: 1, fontFamily: fonts.sans.semiBold, fontSize: 13.5, lineHeight: 18 },
  serviceState: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 1 },
  foot: {
    marginTop: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 17,
    borderRadius: radius.chip,
  },
});
