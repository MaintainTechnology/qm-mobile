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
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton, ListState } from '@/components/ListState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GhostButton } from '@/features/auth/ui';
import { QuoteDetailModal } from '@/features/quotes/QuoteDetailModal';
import { QuoteRow } from '@/features/quotes/QuoteRow';
import { QUOTE_FILTERS, matchesFilter, type QuoteFilterKey } from '@/features/quotes/status';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
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
        .filter(q => matchesFilter(q, filter))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [quotes, filter],
  );
  const selected = useMemo(
    () => quotes.find(q => q.id === selectedId) ?? null,
    [quotes, selectedId],
  );

  // 404 = signed in but no tenant row — that's an onboarding-resume state (spec A2), not a
  // Quotes-tab error; the tabs shell/root redirect owns that. Render nothing while it fires.
  if (isTenantMissing(me.error)) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.inkDeep, paddingTop: insets.top }}>
      <ScreenHeader title="Quotes" subtitle="Review drafts and track customer decisions." />

      <View style={styles.filters}>
        <View
          accessibilityRole="tablist"
          accessibilityLabel="Filter quotes"
          style={[styles.filterRow, { backgroundColor: colors.ink, borderColor: colors.inkLine }]}
        >
          {QUOTE_FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="tab"
                accessibilityLabel={f.label.toUpperCase()}
                accessibilityState={{ selected: active }}
                aria-selected={active}
                onPress={() => setFilter(f.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    borderColor: active ? colors.ctlLine : 'transparent',
                    backgroundColor: active || pressed ? colors.inkCard : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[styles.filterLabel, { color: active ? colors.textPri : colors.textSec }]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {me.isLoading ? (
        <ListSkeleton label="Loading quotes" />
      ) : me.isError && quotes.length === 0 ? (
        <ListState
          title="Quotes couldn’t load"
          description={apiErrorMessage(me.error, 'Check your connection and try again.')}
          action={<GhostButton label="Retry" onPress={() => void me.refetch()} />}
        />
      ) : (
        <>
          {me.isError ? (
            <View
              style={[
                styles.refreshBanner,
                { borderColor: colors.inkLine, backgroundColor: colors.ink },
              ]}
            >
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.refreshText, { color: colors.textSec }]}
              >
                Couldn’t refresh. Showing your last loaded quotes.
              </Text>
              <GhostButton label="Retry" onPress={() => void me.refetch()} />
            </View>
          ) : null}
          {filtered.length > 0 ? (
            <View style={styles.listHeading}>
              <Text style={[styles.resultCount, { color: colors.textSec }]}>
                {filtered.length} {filtered.length === 1 ? 'quote' : 'quotes'}
              </Text>
              <Text style={[styles.sortLabel, { color: colors.textDim }]}>Newest first</Text>
            </View>
          ) : null}
          <FlashList
            data={filtered}
            keyExtractor={(q: QuoteRowData) => q.id}
            renderItem={({ item }) => (
              <QuoteRow quote={item} onPress={() => setSelectedId(item.id)} />
            )}
            refreshing={me.isRefetching}
            onRefresh={() => void me.refetch()}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
            ListEmptyComponent={
              <ListState
                inset={false}
                title={filter === 'all' ? 'Your quotes will appear here' : 'No quotes in this view'}
                description={
                  filter === 'all'
                    ? 'When a lead becomes a draft, you can review it here before it goes to your customer.'
                    : 'Try another status or return to your full quote list.'
                }
                action={
                  filter !== 'all' ? (
                    <GhostButton label="View all quotes" onPress={() => setFilter('all')} />
                  ) : undefined
                }
              />
            }
            contentContainerStyle={styles.listContent}
          />
        </>
      )}

      <QuoteDetailModal quote={selected} onClose={closeDetail} />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  filterChip: {
    flexGrow: 1,
    minHeight: touch.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  filterLabel: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  resultCount: { ...type.bodySm, fontFamily: fonts.sans.semiBold },
  sortLabel: { ...type.bodySm },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  refreshText: { ...type.bodySm, flex: 1 },
});
