/**
 * Chats tab (spec E1-E3) — SMS + voice conversation history, newest activity first.
 *
 * A single screen with two states swapped by local selection state rather than a route: this
 * feature only owns `src/app/(tabs)/chats.tsx` and this directory, so the thread view (E2) lives
 * here instead of a `chats/[id]` route.
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GhostButton } from '@/features/auth/ui';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { ChatThread } from './ChatThread';
import { useChats, type ChatRow } from './chats-api';
import { chatDisplayName, chatInitial, channelLabel, lastMessagePreview, relativeTime } from './format';

export function ChatsScreen({
  selectedId,
  onSelect,
  onBack,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, isFetching, refetch } = useChats();
  // Drafts keyed by conversation id, held here rather than in ChatThread, so backing out of a
  // thread and returning keeps a half-typed reply.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const chats = data?.chats ?? [];
  const selected = selectedId ? (chats.find(c => c.id === selectedId) ?? null) : null;

  if (selected) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
        <ChatThread
          chat={selected}
          draft={drafts[selected.id] ?? ''}
          onDraftChange={draft => setDrafts(prev => ({ ...prev, [selected.id]: draft }))}
          onBack={onBack}
        />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.inkDeep, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: colors.textPri }]}>CHATS</Text>

      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.centerLabel, { color: colors.textDim }]}>
            LOADING CONVERSATIONS…
          </Text>
        </View>
      ) : isError && chats.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={[styles.errorText, { color: colors.textSec }]}>
            Couldn&rsquo;t load your conversations.
          </Text>
          <GhostButton label="Retry" onPress={() => void refetch()} height={touch.minimum} />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={[styles.emptyTitle, { color: colors.textPri }]}>NO CONVERSATIONS YET</Text>
          <Text style={[styles.emptyBody, { color: colors.textSec }]}>
            Your AI line answers here. When a customer texts or calls your QuoteMax number, the
            conversation shows up in this list.
          </Text>
        </View>
      ) : (
        <>
          {isError ? (
            <View style={[styles.refreshBanner, { borderColor: colors.danger, backgroundColor: colors.ink }]}>
              <Text style={[styles.refreshBannerText, { color: colors.textPri }]}>
                Couldn&rsquo;t refresh — showing the last loaded list.
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void refetch()} hitSlop={8}>
                <Text style={[styles.refreshBannerAction, { color: colors.accentText }]}>RETRY</Text>
              </Pressable>
            </View>
          ) : null}
          <FlashList
            data={chats}
            keyExtractor={c => c.id}
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.inkLine }} />
            )}
            renderItem={({ item }) => (
              <ChatListRow chat={item} onPress={() => onSelect(item.id)} />
            )}
          />
        </>
      )}
    </View>
  );
}

function ChatListRow({ chat, onPress }: { chat: ChatRow; onPress: () => void }) {
  const { colors } = useTheme();
  const who = chatDisplayName(chat);
  const meta = [channelLabel(chat), chat.suburb, chat.job_type ? chat.job_type.replace(/_/g, ' ') : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.ink }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.inkLine }]}>
        <Text style={[styles.avatarText, { color: colors.textSec }]}>{chatInitial(who)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: colors.textPri }]} numberOfLines={1}>
            {who}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textDim }]}>
            {relativeTime(chat.last_message_at ?? chat.created_at)}
          </Text>
        </View>
        {meta ? (
          <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={1}>
            {meta.toUpperCase()}
          </Text>
        ) : null}
        <Text style={[styles.rowPreview, { color: colors.textSec }]} numberOfLines={1} ellipsizeMode="tail">
          {lastMessagePreview(chat)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    ...type.headline,
    fontSize: 22,
    lineHeight: 24,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  centerLabel: { ...type.label },
  errorText: { ...type.body, textAlign: 'center' },
  emptyTitle: { ...type.title, textAlign: 'center' },
  emptyBody: { ...type.body, textAlign: 'center' },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  refreshBannerText: { ...type.bodySm, flex: 1 },
  refreshBannerAction: { fontFamily: fonts.sans.bold, fontSize: 11, letterSpacing: 1 },
  listContent: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: touch.listRow,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sans.bold, fontSize: 13 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowName: { ...type.title, fontSize: 15, lineHeight: 18, flexShrink: 1 },
  rowTime: { fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.5 },
  rowMeta: { marginTop: 3, fontFamily: fonts.mono.medium, fontSize: 12, letterSpacing: 0.9 },
  rowPreview: { marginTop: 4, ...type.bodySm, lineHeight: 18 },
});
