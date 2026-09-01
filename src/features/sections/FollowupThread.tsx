/**
 * The two-way SMS thread behind one follow-up — the web FollowupThread
 * (page.tsx:15093) as a card expander. GET /api/tenant/followups/messages
 * takes exactly one of quoteId (quote follow-up) or conversationId (no-quote
 * SMS lead); the server resolves the phone and scopes the thread. Mounted
 * only while the row is expanded, so the fetch is lazy by construction.
 */
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing } from '@/lib/theme';
import { useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionLoading } from './SectionScreen';

const ThreadSchema = z.looseObject({
  ok: z.literal(true),
  messages: z
    .array(
      z.looseObject({
        direction: z.enum(['inbound', 'outbound']),
        body: z.string(),
        created_at: z.string(),
      }),
    )
    .default([]),
  last_inbound_at: z.string().nullish(),
  last_outbound_at: z.string().nullish(),
});

/** "26 Aug, 4:12 pm" — same en-AU stamp as the web thread. */
function fmtSmsWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function FollowupThread({
  quoteId,
  conversationId,
}: {
  quoteId?: string | null;
  conversationId?: string | null;
}) {
  const { colors } = useTheme();
  const qs = quoteId
    ? `quoteId=${encodeURIComponent(quoteId)}`
    : `conversationId=${encodeURIComponent(conversationId ?? '')}`;
  const query = useApiQuery(
    ['tenant', 'followups', 'messages', quoteId ? `q:${quoteId}` : `c:${conversationId ?? ''}`],
    `/api/tenant/followups/messages?${qs}`,
    ThreadSchema,
  );

  if (query.isPending) {
    return <SectionLoading label="Loading messages" />;
  }
  if (query.isError || !query.data) {
    return (
      <Notice
        tone="danger"
        label="Could not load messages"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  }

  const { messages, last_inbound_at: lastIn, last_outbound_at: lastOut } = query.data;
  if (messages.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textDim }]}>
        No messages yet. Your text and any reply from the customer will appear here.
      </Text>
    );
  }
  const customerRepliedLast =
    lastIn != null && (lastOut == null || new Date(lastIn) > new Date(lastOut));

  return (
    <View style={styles.thread}>
      {customerRepliedLast ? (
        <Text style={[styles.replied, { color: colors.successBright }]}>
          CUSTOMER REPLIED · AWAITING YOUR RESPONSE
        </Text>
      ) : null}
      {messages.map((m, i) => {
        const mine = m.direction === 'outbound';
        return (
          <View
            key={`${m.created_at}-${i}`}
            style={[
              styles.bubble,
              mine
                ? {
                    alignSelf: 'flex-end',
                    borderColor: colors.ctlLine,
                    backgroundColor: colors.inkDeep,
                  }
                : {
                    alignSelf: 'flex-start',
                    borderColor: colors.inkLine,
                    backgroundColor: colors.inkCard,
                  },
            ]}
          >
            <Text style={[styles.body, { color: mine ? colors.textPri : colors.textSec }]}>
              {m.body}
            </Text>
            <Text style={[styles.stamp, { color: colors.textDim }]}>
              {mine ? 'YOU' : 'CUSTOMER'} · {fmtSmsWhen(m.created_at)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  thread: { gap: spacing.md },
  replied: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  empty: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  bubble: {
    maxWidth: '92%',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  body: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 22 },
  stamp: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.2 },
});
