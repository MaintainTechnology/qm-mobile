/**
 * Roof tab entry (spec web-parity F3). Routes on the tenant's own trades
 * (`tenantTrades(useTenantMe().data)`, src/lib/tenant.ts) rather than a hard-coded
 * assumption — a tenant's trade mix is the only thing that decides what this tab shows:
 *   - roofing            → the roof measure tool (F1)
 *   - electrical/plumbing → the job quoter (F2)
 *   - both               → sectioned, one pill switcher between them
 *   - painting-only (or nothing else quotable) → pointer to the web dashboard.
 *     The painting *tool* is out of scope this round (non-goals); painting *rates*
 *     still show on Menu → Pricing book.
 */
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/lib/theme';
import { isTenantMissing, tenantTrades, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { JobQuoteScreen } from './jobquote/JobQuoteScreen';
import { RoofMeasureScreen } from './roofing/RoofMeasureScreen';
import { apiErrorMessage, Notice, PillGroup } from './ui';

export function TradeHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tenantMe = useTenantMe();
  const [section, setSection] = useState<'roof' | 'job'>('roof');

  const trades = tenantMe.data ? tenantTrades(tenantMe.data) : [];
  const hasRoofing = trades.includes('roofing');
  const hasElectrical = trades.includes('electrical');
  const hasPlumbing = trades.includes('plumbing');
  const hasJobQuoter = hasElectrical || hasPlumbing;
  const hasBoth = hasRoofing && hasJobQuoter;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Text style={[styles.title, { color: colors.textPri }]}>TRADE TOOLS</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={tenantMe.isFetching} onRefresh={() => void tenantMe.refetch()} tintColor={colors.accent} />}
        >
          {tenantMe.isPending ? (
            <Notice tone="accent" label="Loading your trades…" />
          ) : tenantMe.isError && !isTenantMissing(tenantMe.error) ? (
            <Notice
              tone="danger"
              label="Could not load your account"
              body={apiErrorMessage(tenantMe.error)}
              onRetry={() => void tenantMe.refetch()}
            />
          ) : !hasRoofing && !hasJobQuoter ? (
            <Notice
              tone="accent"
              label="Use the web dashboard"
              body={
                trades.includes('painting')
                  ? 'The painting estimator isn’t in the app yet — open quotemax.com.au on the web to run it.'
                  : 'No trade tools are enabled on this account yet. Open the web dashboard to set one up.'
              }
            />
          ) : (
            <>
              {hasBoth ? (
                <PillGroup
                  options={[
                    ['roof', 'Roof measure'],
                    ['job', 'Job quoter'],
                  ]}
                  value={section}
                  onChange={v => setSection(v as 'roof' | 'job')}
                />
              ) : null}

              {(!hasBoth || section === 'roof') && hasRoofing ? <RoofMeasureScreen /> : null}
              {(!hasBoth || section === 'job') && hasJobQuoter ? <JobQuoteScreen trades={trades} /> : null}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 15,
    letterSpacing: -0.3,
  },
  body: { padding: 16, gap: 16 },
});
