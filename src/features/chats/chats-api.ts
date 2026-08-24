/**
 * Chats tab data layer (spec web-parity E1-E3).
 *
 * Web sources: `app/api/tenant/chats/route.ts` (GET — merges SMS conversations + Vapi voice
 * calls, newest activity first, capped at 30) and `app/api/tenant/chats/[id]/reply/route.ts`
 * (POST, tradie -> customer manual SMS). Schemas are loose (H2): the web payload carries fields
 * (turn_count, intake_id, conversation_type, ...) this app doesn't render yet and must never fail
 * to parse over.
 */
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiErrorMessage, type ApiError } from '@/lib/api';
import { useApiMutation, useApiQuery } from '@/lib/useApi';

const ChatMessageSchema = z.looseObject({
  direction: z.enum(['inbound', 'outbound']),
  body: z.string(),
  created_at: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatRowSchema = z.looseObject({
  id: z.string(),
  channel: z.enum(['sms', 'voice']),
  from_number: z.string().nullish(),
  to_number: z.string().nullish(),
  status: z.string().nullish(),
  conversation_type: z.string().nullish(),
  intake_id: z.string().nullish(),
  turn_count: z.number().nullish(),
  created_at: z.string(),
  last_message_at: z.string().nullish(),
  duration_seconds: z.number().nullish(),
  first_name: z.string().nullish(),
  job_type: z.string().nullish(),
  suburb: z.string().nullish(),
  messages: z.array(ChatMessageSchema).default([]),
});
export type ChatRow = z.infer<typeof ChatRowSchema>;

const ChatsResponseSchema = z.looseObject({
  chats: z.array(ChatRowSchema).default([]),
});

const ChatReplyResponseSchema = z.looseObject({
  message: ChatMessageSchema,
});

const CHATS_KEY = ['tenant', 'chats'] as const;

/** GET /api/tenant/chats — newest conversation activity first, SMS + voice merged (E1). */
export function useChats() {
  return useApiQuery(CHATS_KEY, '/api/tenant/chats', ChatsResponseSchema);
}

/**
 * POST /api/tenant/chats/[id]/reply — a tradie -> customer manual SMS on one conversation (E2).
 * Bound to a conversation id so callers only ever pass the message body.
 *
 * The reply response IS the server-persisted message row, so on success we splice it straight
 * into the cached chats list (and bump last_message_at, which is all the server itself bumps —
 * see lib/sms/tradie-reply.ts) instead of invalidating and refetching the whole inbox.
 */
export function useSendChatReply(conversationId: string) {
  const queryClient = useQueryClient();
  return useApiMutation<{ body: string }, { message: ChatMessage }>(
    `/api/tenant/chats/${conversationId}/reply`,
    ChatReplyResponseSchema,
    {
      timeoutMs: 30000,
      onSuccess: ({ message }) => {
        queryClient.setQueryData<z.infer<typeof ChatsResponseSchema>>(CHATS_KEY, prev =>
          prev
            ? {
                chats: prev.chats.map(chat =>
                  chat.id === conversationId
                    ? {
                        ...chat,
                        messages: [...chat.messages, message],
                        last_message_at: message.created_at,
                      }
                    : chat,
                ),
              }
            : prev,
        );
      },
    },
  );
}

/**
 * Composer only makes sense on an SMS thread with a known customer number — a voice call has no
 * `sms_conversations` row to reply against and 404s server-side (web parity, see reply route).
 */
export function canReply(chat: Pick<ChatRow, 'channel' | 'from_number'>): boolean {
  return chat.channel === 'sms' && Boolean(chat.from_number);
}

/**
 * Maps the reply endpoint's `{ error }` codes to a tradie-readable line. body_too_long is the
 * one code that needs feature-specific copy; everything else (including the generic network/5xx
 * case) runs through the shared apiErrorMessage mapper, which already reads the same `{ error }`
 * slug as its own fallback.
 */
export function replyErrorMessage(error: unknown): string {
  const code = (error as ApiError | undefined)?.body as { error?: string } | undefined;
  if (code?.error === 'body_too_long') {
    return 'That message is too long for a text — trim it and try again.';
  }
  return apiErrorMessage(error, "Couldn't send — check your signal and try again.");
}
