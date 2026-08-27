/**
 * The hub's remaining read-only sections + shared link-out chrome, mirroring
 * the web TradeHub's section renders (page.tsx:17209-17322) at mobile scope:
 *   catalogue → GET /api/tenant/catalogue rows (CatalogueTab's list)
 *   recipes   → GET /api/tenant/tasks assemblies + step counts (RecipesTab)
 * The editable sections live in ./sections/ (PricingSection, ServicesSection,
 * EstimatingSection); catalogue/recipes editors follow in the same directory.
 */
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { formatJobType } from '@/features/quotes/status';
import { fonts, radius, spacing } from '@/lib/theme';
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
  foot: {
    marginTop: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 12,
    lineHeight: 17,
    borderRadius: radius.chip,
  },
});
