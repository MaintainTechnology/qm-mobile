/**
 * Quotes tab (spec web-parity D1–D3, C3 receiver). Lists `useTenantMe().quotes` (shared cache, no
 * separate fetch), filters with the web's own status vocabulary, and opens a detail sheet with
 * the Approve/Send actions. Also the landing side of C3's "row navigates to the Quotes tab
 * detail": a `?quoteId=` search param (e.g. from the Home tab's recent-quotes list) opens that
 * quote's detail on mount, and re-opens it if the param changes while already mounted. Cleared on
 * dismiss so a re-render — or the hardware back button — doesn't reopen a quote the tradie just
 * closed.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuoteDetailModal } from '@/features/quotes/QuoteDetailModal';
import { QuoteRow } from '@/features/quotes/QuoteRow';
import { QUOTE_FILTERS, matchesFilter, type QuoteFilterKey } from '@/features/quotes/status';
import { apiErrorMessage } from '@/lib/api';
import { fonts, spacing, touch } from '@/lib/theme';
import { isTenantMissing, useTenantMe, type QuoteRow as QuoteRowData } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

export default function QuotesRoute() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ quoteId?: string }>();
  const me = useTenantMe();
  const [filter, setFilter] = useState<QuoteFilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(params.quoteId ?? null);

  // C3 receiver: a quoteId param handed to this route (mount or update) opens that quote's detail.
  useEffect(() => {
    if (params.quoteId) setSelectedId(params.quoteId);
  }, [params.quoteId]);

  function closeDetail() {
    setSelectedId(null);
    if (params.quoteId) router.setParams({ quoteId: undefined });
  }

  const quotes = useMemo(() => me.data?.quotes ?? [], [me.data]);
  const filtered = useMemo(
    () =>
      [...quotes]
        .filter((q) => matchesFilter(q, filter))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quotes, filter],
  );
  const selected = useMemo(() => quotes.find((q) => q.id === selectedId) ?? null, [quotes, selectedId]);

  // 404 = signed in but no tenant row — that's an onboarding-resume state (spec A2), not a
  // Quotes-tab error; the tabs shell/root redirect owns that. Render nothing while it fires.
  if (isTenantMissing(me.error)) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <Text style={[styles.title, { color: colors.textPri }]}>QUOTES</Text>
      </View>

      <View style={styles.filterRow}>
        {QUOTE_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? colors.accent : colors.inkLine,
                  backgroundColor: active ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text
                style={[styles.filterLabel, { color: active ? colors.accentInk : colors.textSec }]}
              >
                {f.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {me.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : me.isError ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textSec }]}>
            {apiErrorMessage(me.error, 'Couldn’t load your quotes — check your connection.')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void me.refetch()}
            style={[styles.retryBtn, { borderColor: colors.inkLine }]}
          >
            <Text style={[styles.retryLabel, { color: colors.textPri }]}>RETRY</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(q: QuoteRowData) => q.id}
          renderItem={({ item }) => <QuoteRow quote={item} onPress={() => setSelectedId(item.id)} />}
          refreshing={me.isRefetching}
          onRefresh={() => void me.refetch()}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={[styles.emptyText, { color: colors.textSec }]}>
                {filter === 'all'
                  ? 'No quotes yet — they’ll show up here the moment a lead comes in.'
                  : 'No quotes match this filter.'}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        />
      )}

      <QuoteDetailModal quote={selected} onClose={closeDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.sm,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 22,
    letterSpacing: -0.88,
    textTransform: 'uppercase',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  filterChip: {
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  filterLabel: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  errorText: { fontFamily: fonts.sans.regular, fontSize: 14, textAlign: 'center' },
  emptyText: { fontFamily: fonts.sans.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryLabel: { fontFamily: fonts.sans.bold, fontSize: 12, letterSpacing: 0.6 },
});
