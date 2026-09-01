/**
 * Shared hub link-out chrome + the web-only tool pointers. The five section
 * editors live in ./sections/ (PricingSection, ServicesSection,
 * CatalogueSection, RecipesSection, EstimatingSection); this module keeps what
 * spans them: the WebOnlyCard pattern (also used by Account and Pricing-book
 * screens) and the per-trade tool link-outs for trades whose tool has no
 * mobile port yet.
 */
import { Text } from 'react-native';

import { spacing, type as typeScale } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { Card } from '../ui';
import { LinkOutButton } from './LinkOut';
import { TRADE_LABELS, type HubTrade } from './sections';

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
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" style={[typeScale.title, { color: colors.textPri }]}>
        {label}
      </Text>
      <Text style={[typeScale.bodySm, { color: colors.textSec }]}>{body}</Text>
      {path ? <LinkOutButton label={cta} path={path} /> : null}
    </Card>
  );
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
