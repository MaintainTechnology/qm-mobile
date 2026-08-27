/**
 * The trade hub — mobile mirror of the web dashboard's TradeHub
 * (quotemate-automation/app/dashboard/page.tsx:17050-17326): trade heading,
 * the web's subtitle sentence, zero-padded SECTIONS/QUOTES counters, the
 * seven section chips (Quotes active-by-default like the web), and each
 * section's content. Both the Home tab (initialSection="quotes") and the
 * Tools tab (initialSection="tools") render this one screen — same structure,
 * different landing section, exactly how the web hub treats its sections.
 *
 * The web sidebar lists one hub per trade; on a phone that collapses to a
 * pill switcher above the header for multi-trade tenants.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts, radius, spacing, touch, type as typeScale } from '@/lib/theme';
import { isTenantMissing, tenantTrades, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { JobQuoteScreen } from '../jobquote/JobQuoteScreen';
import { RoofMeasureScreen } from '../roofing/RoofMeasureScreen';
import { apiErrorMessage, Notice, PillGroup } from '../ui';
import { QuoteQueueSection } from './QuoteQueueSection';
import {
  HUB_SECTION_LABELS,
  hubSections,
  hubSubtitle,
  hubTrades,
  padCount,
  quoteCountForTrade,
  TRADE_LABELS,
  type HubSectionId,
  type HubTrade,
} from './sections';
import {
  CatalogueSection,
  EstimatorBetaCard,
  RecipesSection,
  ToolsWebOnly,
} from './SectionsContent';
import { EstimatingSection } from './sections/EstimatingSection';
import { PricingSection } from './sections/PricingSection';
import { ServicesSection } from './sections/ServicesSection';

function SectionBody({ section, trade }: { section: HubSectionId; trade: HubTrade }) {
  switch (section) {
    case 'quotes':
      return <QuoteQueueSection trade={trade} />;
    case 'tools':
      // Web parity (page.tsx:17209-17322): electrical = job quoter + the
      // plan-upload estimator beta; plumbing = job quoter; roofing = measure
      // tool; every other hub trade links out to its web tool.
      if (trade === 'electrical')
        return (
          <View style={{ gap: spacing.lg }}>
            <JobQuoteScreen trades={[trade]} />
            <EstimatorBetaCard />
          </View>
        );
      if (trade === 'plumbing') return <JobQuoteScreen trades={[trade]} />;
      if (trade === 'roofing') return <RoofMeasureScreen />;
      return <ToolsWebOnly trade={trade} />;
    case 'pricing':
      return <PricingSection trade={trade} />;
    case 'services':
      return <ServicesSection trade={trade} />;
    case 'catalogue':
      return <CatalogueSection trade={trade} />;
    case 'recipes':
      return <RecipesSection trade={trade} />;
    case 'estimating':
      return <EstimatingSection trade={trade} />;
  }
}

export function HubScreen({ initialSection = 'quotes' }: { initialSection?: HubSectionId }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tenantMe = useTenantMe();
  const [section, setSection] = useState<HubSectionId>(initialSection);
  const [tradeChoice, setTradeChoice] = useState<HubTrade | null>(null);

  const trades = tenantMe.data ? hubTrades(tenantTrades(tenantMe.data)) : [];
  const trade = tradeChoice && trades.includes(tradeChoice) ? tradeChoice : (trades[0] ?? null);
  const sections = trade ? hubSections() : [];
  const quoteCount = trade ? quoteCountForTrade(tenantMe.data?.quotes ?? [], trade) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={tenantMe.isFetching}
              onRefresh={() => void tenantMe.refetch()}
              tintColor={colors.accent}
            />
          }
        >
          {tenantMe.isPending ? (
            <Notice tone="accent" label="Loading your workspace…" />
          ) : tenantMe.isError && !tenantMe.data && !isTenantMissing(tenantMe.error) ? (
            <Notice
              tone="danger"
              label="Could not load your account"
              body={apiErrorMessage(tenantMe.error)}
              onRetry={() => void tenantMe.refetch()}
            />
          ) : !trade ? (
            <Notice
              tone="accent"
              label="No trade workspace yet"
              body="No hub-capable trade is enabled on this account. Set one up on the web dashboard and it appears here."
            />
          ) : (
            <>
              {trades.length > 1 ? (
                <PillGroup
                  options={trades.map(t => [t, TRADE_LABELS[t]] as [string, string])}
                  value={trade}
                  onChange={v => setTradeChoice(v as HubTrade)}
                />
              ) : null}

              {/* Header — web hub h1 + subtitle + zero-padded counter strip. */}
              <View style={styles.header}>
                <Text style={[typeScale.headline, { color: colors.textPri }]}>
                  {TRADE_LABELS[trade]}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  {hubSubtitle(trade)}
                </Text>
                <View style={[styles.counters, { borderColor: colors.inkLine }]}>
                  <View style={styles.counter}>
                    <Text style={[styles.counterLabel, { color: colors.textDim }]}>SECTIONS</Text>
                    <Text style={[styles.counterValue, { color: colors.textPri }]}>
                      {padCount(sections.length)}
                    </Text>
                  </View>
                  <View style={styles.counter}>
                    <Text style={[styles.counterLabel, { color: colors.textDim }]}>QUOTES</Text>
                    <Text style={[styles.counterValue, { color: colors.textPri }]}>
                      {padCount(quoteCount)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Section chips — the web's horizontal rail; Quotes carries its count. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRail}
              >
                {sections.map(id => {
                  const active = id === section;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={HUB_SECTION_LABELS[id]}
                      onPress={() => setSection(id)}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.accent : colors.inkLine,
                          backgroundColor: active ? colors.accent : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? colors.accentInk : colors.textSec },
                        ]}
                      >
                        {HUB_SECTION_LABELS[id].toUpperCase()}
                      </Text>
                      {id === 'quotes' && quoteCount > 0 ? (
                        <View
                          style={[
                            styles.chipBadge,
                            { borderColor: active ? colors.accentInk : colors.inkLine },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipBadgeText,
                              { color: active ? colors.accentInk : colors.textPri },
                            ]}
                          >
                            {quoteCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <SectionBody section={section} trade={trade} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  counters: {
    flexDirection: 'row',
    gap: spacing.gap,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  counter: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  counterLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  counterValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  chipRail: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontFamily: fonts.sans.bold,
    fontSize: 12,
    letterSpacing: 0.96, // .08em @ 12
  },
  chipBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chipBadgeText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
});
