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

import { canReply, replyErrorMessage, useSendChatReply, type ChatMessage, type ChatRow } from './chats-api';
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
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
          { borderTopColor: colors.inkLine, paddingBottom: spacing.md + insets.bottom },
        ]}
      >
        {allowReply ? (
          <>
            <View style={styles.composerRow}>
              <TextInput
                value={draft}
                onChangeText={onDraftChange}
                placeholder="Reply by SMS"
                placeholderTextColor={colors.textDim}
                editable={!mutation.isPending}
                style={[
                  styles.input,
                  { backgroundColor: colors.ink, borderColor: colors.inkLine, color: colors.textPri },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send reply"
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
              <Text style={[styles.sendError, { color: colors.dangerBright }]}>
                {replyErrorMessage(mutation.error)}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={[styles.noReply, { color: colors.textDim }]}>Voice call · no SMS thread</Text>
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
            : { backgroundColor: colors.ink, borderColor: colors.accent },
        ]}
      >
        {!inbound ? (
          <Text style={[styles.bubbleLabel, { color: colors.accentText }]}>YOU</Text>
        ) : null}
        <Text style={[styles.bubbleText, { color: inbound ? colors.textSec : colors.textPri }]}>
          {message.body}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  who: { ...type.title, fontSize: 16 },
  meta: { marginTop: 2, ...type.label, fontSize: 10, letterSpacing: 1 },
  threadContent: { padding: spacing.lg, gap: spacing.sm },
  empty: { ...type.bodySm, textAlign: 'center', paddingTop: spacing.xxl },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bubble: {
    maxWidth: '84%',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 4,
  },
  bubbleText: { ...type.bodySm, lineHeight: 20 },
  composerWrap: { borderTopWidth: 1, padding: spacing.md },
  composerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    height: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 15,
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
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  noReply: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
