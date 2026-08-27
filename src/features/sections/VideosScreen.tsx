/**
 * Videos — the web VideosTab at mobile scope: per-trade welcome/thank-you
 * slots (GET /api/tenant/videos?trade=), the ≤220-char script editors and
 * Generate/Regenerate (POST /api/tenant/videos/generate, multipart — the
 * route accepts FormData only). Playback links out to the web: no video
 * player ships in this app yet, and the customer-facing pages are the real
 * render target anyway. Polls while a slot is generating (web: 8s).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice, PillGroup } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

const MAX_SCRIPT_CHARS = 220;

const SlotSchema = z.looseObject({
  url: z.string().nullish(),
  using_default: z.boolean().nullish(),
  default_script: z.string().nullish(),
  state: z
    .looseObject({
      status: z.enum(['idle', 'generating', 'ready', 'failed']).nullish(),
      script: z.string().nullish(),
      error: z.string().nullish(),
    })
    .nullish(),
});
type Slot = z.infer<typeof SlotSchema>;

const VideosSchema = z.looseObject({
  ok: z.literal(true),
  trade: z.string().nullish(),
  trades: z.array(z.looseObject({ slug: z.string(), label: z.string() })).default([]),
  slots: z.looseObject({ welcome: SlotSchema, thankyou: SlotSchema }),
});

const GenerateSchema = z.looseObject({ ok: z.literal(true) });

function SlotCard({
  kind,
  slot,
  trade,
  busy,
  onGenerated,
}: {
  kind: 'welcome' | 'thankyou';
  slot: Slot;
  trade: string | null;
  busy: boolean;
  onGenerated: () => void;
}) {
  const { colors } = useTheme();
  const [script, setScript] = useState<string | null>(null);
  const generate = useApiMutation<FormData, z.infer<typeof GenerateSchema>>(
    '/api/tenant/videos/generate',
    GenerateSchema,
    { timeoutMs: 30000, onSuccess: onGenerated },
  );

  const status = slot.state?.status ?? 'idle';
  const generating = status === 'generating';
  const scriptValue = script ?? slot.state?.script ?? slot.default_script ?? '';
  const statusColor =
    status === 'ready'
      ? colors.successBright
      : status === 'failed'
        ? colors.dangerBright
        : status === 'generating'
          ? colors.warningBright
          : colors.textDim;

  function fireGenerate() {
    const form = new FormData();
    form.append('slot', kind);
    if (trade) form.append('trade', trade);
    form.append(kind === 'welcome' ? 'script_welcome' : 'script_thankyou', scriptValue.trim());
    generate.mutate(form);
  }

  return (
    <View style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: colors.textPri }]}>
          {kind === 'welcome' ? 'WELCOME VIDEO' : 'THANK-YOU VIDEO'}
        </Text>
        <Text style={[styles.status, { color: statusColor }]}>
          {generating ? 'GENERATING…' : status.toUpperCase()}
          {slot.using_default !== false && status !== 'generating' ? ' · QUOTEMAX DEFAULT' : ''}
        </Text>
      </View>

      <TextInput
        value={scriptValue}
        onChangeText={v => setScript(v.slice(0, MAX_SCRIPT_CHARS))}
        multiline
        editable={!generating && !busy}
        placeholder="What the presenter says…"
        placeholderTextColor={colors.textDim}
        accessibilityLabel={`${kind} video script`}
        style={[
          styles.script,
          { borderColor: colors.ctlLine, backgroundColor: colors.ink, color: colors.textPri },
        ]}
      />
      <Text style={[styles.counter, { color: colors.textDim }]}>
        {scriptValue.length}/{MAX_SCRIPT_CHARS}
      </Text>

      {slot.state?.error ? (
        <Text style={[styles.error, { color: colors.dangerBright }]}>{slot.state.error}</Text>
      ) : null}
      {generate.isError ? (
        <Text style={[styles.error, { color: colors.dangerBright }]}>
          {apiErrorMessage(generate.error)}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={status === 'ready' ? 'Regenerate video' : 'Generate video'}
        disabled={generating || busy || generate.isPending}
        onPress={fireGenerate}
        style={({ pressed }) => [
          styles.generateBtn,
          {
            opacity: generating || busy ? 0.45 : 1,
            backgroundColor: pressed ? colors.accentPress : colors.accent,
          },
        ]}
      >
        <Text style={[styles.generateText, { color: colors.accentInk }]}>
          {generate.isPending
            ? 'STARTING…'
            : generating
              ? 'GENERATING…'
              : status === 'ready' || slot.url
                ? 'REGENERATE'
                : status === 'failed'
                  ? 'RETRY'
                  : 'GENERATE'}
        </Text>
      </Pressable>
    </View>
  );
}

export function VideosScreen() {
  const { colors } = useTheme();
  const [tradeChoice, setTradeChoice] = useState<string | null>(null);
  const path = tradeChoice
    ? `/api/tenant/videos?trade=${encodeURIComponent(tradeChoice)}`
    : '/api/tenant/videos';
  const query = useApiQuery(['tenant', 'videos', tradeChoice ?? ''], path, VideosSchema);

  const generating =
    query.data?.slots.welcome.state?.status === 'generating' ||
    query.data?.slots.thankyou.state?.status === 'generating';

  // The web polls every 8s while generating; mobile leans on pull-to-refresh —
  // the GET is also the server's resume path, so any refresh completes a stall.
  return (
    <SectionScreen
      title="Videos"
      subtitle="AI welcome and thank-you clips that front your customer quote pages."
      refreshing={query.isFetching}
      onRefresh={() => void query.refetch()}
    >
      {query.isPending ? (
        <Notice tone="accent" label="Loading your videos…" />
      ) : query.isError && !query.data ? (
        <Notice
          tone="danger"
          label="Could not load videos"
          body={apiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <>
          {query.data.trades.length > 1 ? (
            <PillGroup
              options={query.data.trades.map(t => [t.slug, t.label] as [string, string])}
              value={tradeChoice ?? query.data.trade ?? query.data.trades[0]?.slug ?? ''}
              onChange={v => setTradeChoice(v)}
            />
          ) : null}

          {generating ? (
            <Text style={[styles.pollNote, { color: colors.textSec }]}>
              Generation runs for a few minutes — pull down to refresh for the result.
            </Text>
          ) : null}

          <SlotCard
            kind="welcome"
            slot={query.data.slots.welcome}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onGenerated={() => void query.refetch()}
          />
          <SlotCard
            kind="thankyou"
            slot={query.data.slots.thankyou}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onGenerated={() => void query.refetch()}
          />

          <LinkOutButton label="Watch & add photos on the web" path="/dashboard?tab=videos" />
        </>
      ) : null}
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { fontFamily: fonts.mono.semiBold, fontSize: 11, letterSpacing: 0.88 },
  status: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
  script: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  error: { fontFamily: fonts.sans.medium, fontSize: 12.5 },
  generateBtn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
  },
  generateText: { fontFamily: fonts.mono.bold, fontSize: 11, letterSpacing: 0.88 },
  pollNote: { fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 18 },
});
