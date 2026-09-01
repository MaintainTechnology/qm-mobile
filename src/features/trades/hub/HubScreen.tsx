/**
 * The mobile trade hub keeps the web dashboard's trade and section routes
 * in a compact header, optional trade switcher, and scrollable section rail.
 * Home and Tools share this screen with different initial sections.
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
import { apiErrorMessage, Notice, PillOption } from '../ui';
import { QuoteQueueSection } from './QuoteQueueSection';
import {
  HUB_SECTION_LABELS,
  hubSections,
  hubSubtitle,
  hubTrades,
  quoteCountForTrade,
  TRADE_LABELS,
  type HubSectionId,
  type HubTrade,
} from './sections';
import { AirconToolScreen } from '../aircon/AirconToolScreen';
import { CommercialPaintingScreen } from '../commercial-painting/CommercialPaintingScreen';
import { EstimatorScreen } from '../estimator/EstimatorScreen';
import { PaintingSavedJobs } from '../tools/PaintingSavedJobs';
import { RoofingSavedJobs } from '../tools/RoofingSavedJobs';
import { SignageTools } from '../tools/SignageTools';
import { SolarTools } from '../tools/SolarTools';
import { ToolsWebOnly } from './SectionsContent';
import { CatalogueSection } from './sections/CatalogueSection';
import { EstimatingSection } from './sections/EstimatingSection';
import { PricingSection } from './sections/PricingSection';
import { RecipesSection } from './sections/RecipesSection';
import { ServicesSection } from './sections/ServicesSection';

function SectionBody({
  section,
  trade,
  onSelectSection,
}: {
  section: HubSectionId;
  trade: HubTrade;
  onSelectSection: (section: HubSectionId) => void;
}) {
  switch (section) {
    case 'quotes':
      return <QuoteQueueSection trade={trade} />;
    case 'tools':
      // Web parity (page.tsx:17209-17322): electrical = job quoter + the
      // plan-upload estimator beta; plumbing = job quoter; roofing = measure
      // tool + saved jobs; signage/painting/aircon/solar have native panels;
      // commercial paint links out until its upload pipeline ships.
      if (trade === 'electrical')
        return (
          <View style={{ gap: spacing.lg }}>
            <JobQuoteScreen trades={[trade]} />
            <EstimatorScreen />
          </View>
        );
      if (trade === 'plumbing') return <JobQuoteScreen trades={[trade]} />;
      if (trade === 'roofing')
        return (
          <View style={{ gap: spacing.lg }}>
            <RoofMeasureScreen />
            <RoofingSavedJobs />
          </View>
        );
      if (trade === 'commercial_painting') return <CommercialPaintingScreen />;
      if (trade === 'signage') return <SignageTools />;
      if (trade === 'painting') return <PaintingSavedJobs />;
      if (trade === 'aircon') return <AirconToolScreen />;
      if (trade === 'solar') return <SolarTools />;
      return <ToolsWebOnly trade={trade} />;
    case 'pricing':
      return <PricingSection trade={trade} />;
    case 'services':
      return <ServicesSection trade={trade} />;
    case 'catalogue':
      return <CatalogueSection trade={trade} />;
    case 'recipes':
      return <RecipesSection trade={trade} onOpenCatalogue={() => onSelectSection('catalogue')} />;
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
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.gap }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
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
              {/* Keep the trade context clear without repeating navigation counts. */}
              <View style={styles.header}>
                <Text style={[typeScale.headline, { color: colors.textPri }]}>
                  {TRADE_LABELS[trade]}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSec }]}>
                  {hubSubtitle(trade)}
                </Text>
              </View>

              {trades.length > 1 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tradeRail}
                  accessibilityLabel="Choose trade"
                >
                  {trades.map(t => (
                    <PillOption
                      key={t}
                      label={TRADE_LABELS[t]}
                      selected={trade === t}
                      onPress={() => setTradeChoice(t)}
                    />
                  ))}
                </ScrollView>
              ) : null}

              {/* Section chips — the web's horizontal rail; Quotes carries its count. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRail}
                accessibilityRole="tablist"
                accessibilityLabel="Workspace sections"
              >
                {sections.map(id => {
                  const active = id === section;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: active }}
                      aria-selected={active}
                      accessibilityLabel={HUB_SECTION_LABELS[id]}
                      onPress={() => setSection(id)}
                      style={({ pressed }) => [
                        styles.chip,
                        {
                          borderColor: active ? colors.accentSoft : colors.inkLine,
                          backgroundColor: active || pressed ? colors.inkCard : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? colors.textPri : colors.textSec },
                        ]}
                      >
                        {HUB_SECTION_LABELS[id].toUpperCase()}
                      </Text>
                      {id === 'quotes' && quoteCount > 0 ? (
                        <View style={[styles.chipBadge, { borderColor: colors.inkLine }]}>
                          <Text style={[styles.chipBadgeText, { color: colors.textPri }]}>
                            {quoteCount}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <SectionBody section={section} trade={trade} onSelectSection={setSection} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  header: { gap: spacing.sm },
  subtitle: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  tradeRail: { gap: spacing.sm, paddingRight: spacing.sm },
  chipRail: { gap: spacing.sm, paddingRight: spacing.sm, paddingBottom: spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chipText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  chipBadge: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  chipBadgeText: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
});
