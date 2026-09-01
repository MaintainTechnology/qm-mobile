/**
 * Chat detail (spec E2) — message thread + reply composer for one conversation.
 *
 * Owned by ChatsScreen, which swaps this in for the list once a row is tapped (there is no
 * dedicated route: this feature only owns `src/app/(tabs)/chats.tsx` and this directory).
 */
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/features/auth/ui';
import { SendIcon } from '@/features/home/icons';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import {
  canReply,
  replyErrorMessage,
  useSendChatReply,
  type ChatMessage,
  type ChatRow,
} from './chats-api';
import { chatDisplayName, channelLabel, relativeTime } from './format';

export function ChatThread({
  chat,
  draft,
  onDraftChange,
  onBack,
}: {
  chat: ChatRow;
  /** Held by the parent, keyed by conversation id, so backing out of a thread and returning keeps
   * a half-typed reply. */
  draft: string;
  onDraftChange: (draft: string) => void;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mutation = useSendChatReply(chat.id);
  const allowReply = canReply(chat);
  // The reply mutation splices its response straight into the cached chats list (see
  // useSendChatReply), so `chat.messages` already carries a just-sent reply — no local echo needed.
  const messages = chat.messages;

  async function handleSend() {
    const body = draft.trim();
    if (!body || mutation.isPending) return;
    try {
      await mutation.mutateAsync({ body });
      onDraftChange('');
    } catch {
      // surfaced below via mutation.isError
    }
  }

  const who = chatDisplayName(chat);
  const meta = [
    channelLabel(chat),
    chat.first_name && chat.from_number ? chat.from_number : null,
    relativeTime(chat.last_message_at ?? chat.created_at),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.header, { borderBottomColor: colors.inkLine }]}>
        <BackButton onPress={onBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.who, { color: colors.textPri }]} numberOfLines={1}>
            {who}
          </Text>
          <Text style={[styles.meta, { color: colors.textDim }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>

      <FlashList
        data={messages}
        keyExtractor={(item, index) => `${item.created_at}-${index}`}
        contentContainerStyle={styles.threadContent}
        maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
        renderItem={({ item }) => <MessageBubble message={item} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textDim }]}>
            No messages recorded on this conversation.
          </Text>
        }
      />

      <View
        style={[
          styles.composerWrap,
          { borderTopColor: colors.inkLine, backgroundColor: colors.inkDeep },
        ]}
      >
        {allowReply ? (
          <>
            <Text style={[styles.composerLabel, { color: colors.textDim }]}>MESSAGE</Text>
            <View style={styles.composerRow}>
              <TextInput
                accessibilityLabel="Reply by SMS"
                value={draft}
                onChangeText={onDraftChange}
                placeholder="Reply by SMS"
                placeholderTextColor={colors.textDim}
                editable={!mutation.isPending}
                multiline
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.ink,
                    borderColor: colors.ctlLine,
                    color: colors.textPri,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send reply"
                accessibilityState={{
                  disabled: !draft.trim() || mutation.isPending,
                  busy: mutation.isPending,
                }}
                onPress={handleSend}
                disabled={!draft.trim() || mutation.isPending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: pressed ? colors.accentPress : colors.accent },
                  (!draft.trim() || mutation.isPending) && styles.disabled,
                ]}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color={colors.accentInk} size="small" />
                ) : (
                  <SendIcon color={colors.accentInk} size={16} />
                )}
              </Pressable>
            </View>
            {mutation.isError ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[styles.sendError, { color: colors.dangerBright }]}
              >
                {replyErrorMessage(mutation.error)}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.noReply, { color: colors.textDim }]}>
            Voice call · no SMS thread
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const inbound = message.direction === 'inbound';
  return (
    <View style={[styles.bubbleRow, { justifyContent: inbound ? 'flex-start' : 'flex-end' }]}>
      <View
        style={[
          styles.bubble,
          inbound
            ? { backgroundColor: colors.inkCard, borderColor: colors.inkLine }
            : { backgroundColor: colors.ink, borderColor: colors.ctlLine },
        ]}
      >
        <Text style={[styles.bubbleText, { color: colors.textPri }]}>{message.body}</Text>
        <Text style={[styles.bubbleMeta, { color: colors.textDim }]}>
          {!inbound ? 'Sent · ' : ''}
          {relativeTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    minHeight: 64,
    borderBottomWidth: 1,
  },
  who: { ...type.title, fontSize: 16 },
  meta: { marginTop: spacing.xs, fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 16 },
  threadContent: { padding: spacing.xl },
  empty: { ...type.bodySm, textAlign: 'center', paddingTop: spacing.xxl },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.md },
  bubble: {
    maxWidth: '88%',
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  bubbleMeta: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  bubbleText: { ...type.body },
  composerWrap: {
    borderTopWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  composerLabel: { ...type.label, letterSpacing: 1 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: touch.minimum,
    maxHeight: 128,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  sendBtn: {
    width: touch.minimum,
    height: touch.minimum,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  sendError: {
    marginTop: spacing.sm,
    ...type.bodySm,
  },
  noReply: {
    ...type.bodySm,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
