/**
 * Files — the web FilesTab at mobile scope: "Ask your documents" (POST
 * /api/tenant/files/chat) and the document list (GET /api/tenant/files) with
 * indexing state. Viewing/downloading needs a bearer-authed byte stream the
 * system browser can't attach headers to, so each row links out to the web
 * Files tab, which owns the authed viewer; comments stay web-side with it.
 * Documents arrive server-side (archived quotes, uploaded invoices) — the web
 * tab has no upload button either.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

const FILES_KEY = ['tenant', 'files'] as const;

const FileDocSchema = z.looseObject({
  id: z.string(),
  display_name: z.string().nullish(),
  source_kind: z.string().nullish(),
  trade: z.string().nullish(),
  state: z.string().nullish(),
  created_at: z.string().nullish(),
  bytes: z.number().nullish(),
  comment_count: z.number().nullish(),
});
type FileDoc = z.infer<typeof FileDocSchema>;

const FilesSchema = z.looseObject({ documents: z.array(FileDocSchema).default([]) });

const AskSchema = z.looseObject({
  answer: z.string().nullish(),
  citations: z
    .array(z.looseObject({ title: z.string().nullish(), snippet: z.string().nullish() }))
    .default([]),
});
type AskResult = z.infer<typeof AskSchema>;

/** Web StatePill mapping: active→Indexed, pending→Indexing, failed/skipped verbatim. */
function stateLabel(state: string | null | undefined): string {
  if (state === 'active') return 'INDEXED';
  if (state === 'pending') return 'INDEXING';
  return (state ?? 'PENDING').toUpperCase();
}

function sizeLabel(bytes: number | null | undefined): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function FilesScreen() {
  const { colors } = useTheme();
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<AskResult | null>(null);
  const files = useApiQuery(FILES_KEY, '/api/tenant/files', FilesSchema);
  const ask = useApiMutation<{ query: string }, AskResult>('/api/tenant/files/chat', AskSchema, {
    timeoutMs: 45000,
    onSuccess: result => setAsked(result),
  });

  const documents = files.data?.documents ?? [];

  return (
    <SectionScreen
      title="Files"
      subtitle="Archived quotes, invoices and your documents — ask them questions."
      refreshing={files.isFetching}
      onRefresh={() => void files.refetch()}
    >
      {/* Ask your documents (web parity: search + answer + sources). */}
      <View
        style={[styles.askCard, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}
      >
        <Text style={[styles.groupLabel, { color: colors.textDim }]}>ASK YOUR DOCUMENTS</Text>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="e.g. what did I quote for downlights last spring?"
          placeholderTextColor={colors.textDim}
          multiline
          accessibilityLabel="Ask your documents"
          style={[
            styles.askInput,
            { borderColor: colors.ctlLine, backgroundColor: colors.ink, color: colors.textPri },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask"
          disabled={question.trim().length === 0 || ask.isPending}
          onPress={() => {
            setAsked(null);
            ask.mutate({ query: question.trim() });
          }}
          style={({ pressed }) => [
            styles.askBtn,
            {
              opacity: question.trim().length === 0 ? 0.45 : 1,
              backgroundColor: pressed ? colors.accentPress : colors.accent,
            },
          ]}
        >
          <Text style={[styles.askBtnText, { color: colors.accentInk }]}>
            {ask.isPending ? 'SEARCHING…' : 'ASK'}
          </Text>
        </Pressable>
        {ask.isError ? (
          <Text style={[styles.answer, { color: colors.dangerBright }]}>
            {apiErrorMessage(ask.error)}
          </Text>
        ) : null}
        {asked?.answer ? (
          <>
            <Text style={[styles.answer, { color: colors.textSec }]}>{asked.answer}</Text>
            {asked.citations.length > 0 ? (
              <Text style={[styles.sources, { color: colors.textDim }]}>
                SOURCES ·{' '}
                {asked.citations
                  .map(c => c.title)
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Document list. */}
      {files.isPending ? (
        <Notice tone="accent" label="Loading your documents…" />
      ) : files.isError && !files.data ? (
        <Notice
          tone="danger"
          label="Could not load your files"
          body={apiErrorMessage(files.error)}
          onRetry={() => void files.refetch()}
        />
      ) : documents.length === 0 ? (
        <Notice
          tone="accent"
          label="No documents yet"
          body="Approved quotes archive here automatically, and invoices you upload on the web join them."
        />
      ) : (
        <>
          <Text style={[styles.groupLabel, { color: colors.textDim }]}>
            YOUR DOCUMENTS · {documents.length}
          </Text>
          {documents.map((doc: FileDoc) => (
            <View
              key={doc.id}
              style={[
                styles.docRow,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.docName, { color: colors.textPri }]} numberOfLines={1}>
                  {doc.display_name ?? 'Document'}
                </Text>
                <Text style={[styles.docMeta, { color: colors.textDim }]} numberOfLines={1}>
                  {[
                    doc.source_kind?.toUpperCase(),
                    doc.trade,
                    dateLabel(doc.created_at),
                    sizeLabel(doc.bytes),
                    doc.comment_count ? `${doc.comment_count} comments` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text
                style={[styles.stateChip, { color: colors.textSec, borderColor: colors.inkLine }]}
              >
                {stateLabel(doc.state)}
              </Text>
            </View>
          ))}
          <LinkOutButton label="View & download on the web" path="/dashboard?tab=files" />
        </>
      )}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  askCard: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  askInput: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  askBtn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
  },
  askBtnText: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
  answer: { fontFamily: fonts.sans.regular, fontSize: 13.5, lineHeight: 20 },
  sources: { fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 0.8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  docName: { fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  docMeta: { marginTop: 2, fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 0.5 },
  stateChip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72,
  },
});
