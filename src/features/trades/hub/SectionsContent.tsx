/**
 * Shared hub link-out chrome + the web-only tool pointers. The five section
 * editors live in ./sections/ (PricingSection, ServicesSection,
 * CatalogueSection, RecipesSection, EstimatingSection); this module keeps what
 * spans them: the WebOnlyCard pattern (also used by Account and Pricing-book
 * screens) and the per-trade tool link-outs for trades whose tool has no
 * mobile port yet.
 */
import { View } from 'react-native';

import { spacing } from '@/lib/theme';

import { Notice } from '../ui';
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
  return (
    <View style={{ gap: spacing.md }}>
      <Notice tone="accent" label={label} body={body} />
      {path ? <LinkOutButton label={cta} path={path} tone="accent" /> : null}
    </View>
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
