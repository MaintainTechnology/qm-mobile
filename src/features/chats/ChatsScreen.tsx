/**
 * Chats tab (spec E1-E3) — SMS + voice conversation history, newest activity first.
 *
 * A single screen with two states swapped by local selection state rather than a route: this
 * feature only owns `src/app/(tabs)/chats.tsx` and this directory, so the thread view (E2) lives
 * here instead of a `chats/[id]` route.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSkeleton, ListState } from '@/components/ListState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { GhostButton } from '@/features/auth/ui';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { ChatThread } from './ChatThread';
import { useChats, type ChatRow } from './chats-api';
import {
  chatDisplayName,
  chatInitial,
  channelLabel,
  lastMessagePreview,
  relativeTime,
} from './format';

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
      <ScreenHeader title="Chats" subtitle="Customer texts and calls, in one place." />

      {isLoading ? (
        <ListSkeleton label="Loading conversations" />
      ) : isError && chats.length === 0 ? (
        <ListState
          title="Conversations couldn’t load"
          description="Check your connection and try again."
          action={<GhostButton label="Retry" onPress={() => void refetch()} />}
        />
      ) : chats.length === 0 ? (
        <ListState
          title="No conversations yet"
          description="Texts and calls to your QuoteMax number will appear here. Open a conversation to read the history or reply by SMS."
        />
      ) : (
        <>
          {isError ? (
            <View
              style={[
                styles.refreshBanner,
                { borderColor: colors.inkLine, backgroundColor: colors.ink },
              ]}
            >
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.refreshBannerText, { color: colors.textSec }]}
              >
                Couldn’t refresh. Showing your last loaded conversations.
              </Text>
              <GhostButton label="Retry" onPress={() => void refetch()} />
            </View>
          ) : null}
          <FlashList
            data={chats}
            keyExtractor={c => c.id}
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, marginLeft: 52, backgroundColor: colors.inkLine }} />
            )}
            renderItem={({ item }) => <ChatListRow chat={item} onPress={() => onSelect(item.id)} />}
          />
        </>
      )}
    </View>
  );
}

function ChatListRow({ chat, onPress }: { chat: ChatRow; onPress: () => void }) {
  const { colors } = useTheme();
  const who = chatDisplayName(chat);
  const meta = [
    channelLabel(chat),
    chat.suburb,
    chat.job_type ? chat.job_type.replace(/_/g, ' ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const when = relativeTime(chat.last_message_at ?? chat.created_at);
  const preview = lastMessagePreview(chat);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${who}. ${meta}. ${preview}. ${when}`}
      accessibilityHint="Opens the conversation"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.ink }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.ink, borderColor: colors.inkLine }]}>
        <Text style={[styles.avatarText, { color: colors.textSec }]}>{chatInitial(who)}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.rowName, { color: colors.textPri }]} numberOfLines={1}>
            {who}
          </Text>
          <Text style={[styles.rowTime, { color: colors.textDim }]}>{when}</Text>
        </View>
        {meta ? (
          <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text
          style={[styles.rowPreview, { color: colors.textSec }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {preview}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  refreshBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.control,
  },
  refreshBannerText: { ...type.bodySm, flex: 1 },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    minHeight: touch.listRow,
  },
  avatar: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sans.bold, fontSize: 16 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowName: { ...type.title, fontSize: 16, flexShrink: 1 },
  rowTime: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 16 },
  rowMeta: { marginTop: spacing.xs, ...type.bodySm },
  rowPreview: { marginTop: spacing.xs, ...type.bodySm },
});
