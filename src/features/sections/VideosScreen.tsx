/**
 * Videos — the web VideosTab at mobile scope: per-trade welcome/thank-you
 * slots (GET /api/tenant/videos?trade=), the ≤220-char script editors, native
 * playback of the finished clips (expo-video), photo attach for the Veo
 * reference images (owner_photo + repeatable extra_image — 7 MB each,
 * mirrored client-side), and Generate/Regenerate
 * (POST /api/tenant/videos/generate, multipart — the route accepts FormData
 * only). Polls every 8s while a slot is generating (web parity); the GET
 * doubles as the server's Veo resume path, so each tick can finalise a job a
 * serverless timeout stranded.
 */
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { LinkOutButton } from '@/features/trades/hub/LinkOut';
import { apiErrorMessage } from '@/lib/api';
import { appendFile, pickImage, sizeOk, type PickedFile } from '@/lib/media';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice, PillGroup } from '../trades/ui';
import { SectionScreen } from './SectionScreen';

const MAX_SCRIPT_CHARS = 220;
/** Mirrors the generate route's MAX_IMAGE_BYTES so oversize photos fail before spending signal. */
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;

const SlotSchema = z.looseObject({
  url: z.string().nullish(),
  /** The tradie's own clip when they have one, else the QuoteMax default — always playable. */
  effective_url: z.string().nullish(),
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

/** Hook rules force one component per player; a slot with no clip simply renders none. */
function SlotVideo({ url, kind }: { url: string; kind: 'welcome' | 'thankyou' }) {
  const player = useVideoPlayer(url);
  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      accessibilityLabel={`${kind === 'welcome' ? 'Welcome' : 'Thank-you'} video player`}
    />
  );
}

function PhotoAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.photoBtn,
        {
          borderColor: colors.ctlLine,
          backgroundColor: pressed ? colors.ink : 'transparent',
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text style={[styles.photoBtnLabel, { color: colors.textPri }]}>{label}</Text>
    </Pressable>
  );
}

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
  const [ownerPhoto, setOwnerPhoto] = useState<PickedFile | null>(null);
  const [extraImages, setExtraImages] = useState<PickedFile[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const generate = useApiMutation<FormData, z.infer<typeof GenerateSchema>>(
    '/api/tenant/videos/generate',
    GenerateSchema,
    {
      // Photos ride this POST (the route stores them before its fast-ack), so
      // the budget covers a few 7 MB uploads on a work-site connection.
      timeoutMs: 120000,
      onSuccess: () => {
        // The kick-off consumed the photos — clear them so a later
        // regeneration doesn't silently re-send stale files (web parity).
        setOwnerPhoto(null);
        setExtraImages([]);
        setPhotoNote(null);
        onGenerated();
      },
    },
  );

  const status = slot.state?.status ?? 'idle';
  const generating = status === 'generating';
  const locked = generating || busy || generate.isPending;
  const scriptValue = script ?? slot.state?.script ?? slot.default_script ?? '';
  const videoUrl = slot.effective_url ?? slot.url ?? null;
  const statusColor =
    status === 'ready'
      ? colors.successBright
      : status === 'failed'
        ? colors.dangerBright
        : status === 'generating'
          ? colors.warningBright
          : colors.textDim;

  async function attach(target: 'owner' | 'extra', source: 'camera' | 'library') {
    const photo = await pickImage(source);
    if (!photo) {
      // Null covers both a cancel and a camera-permission denial — the hint is
      // phrased as a nudge so a plain cancel isn't scolded.
      if (source === 'camera') {
        setPhotoNote(
          "If the camera didn't open, allow camera access for QuoteMax in your phone's settings.",
        );
      }
      return;
    }
    if (!sizeOk(photo, MAX_IMAGE_BYTES)) {
      // Mirrors the server's 400 so the tradie hears it before the upload.
      setPhotoNote('That photo is over 7 MB. Choose a smaller photo and try again.');
      return;
    }
    setPhotoNote(null);
    if (target === 'owner') setOwnerPhoto(photo);
    else setExtraImages(prev => [...prev, photo]);
  }

  function fireGenerate() {
    const form = new FormData();
    form.append('slot', kind);
    if (trade) form.append('trade', trade);
    form.append(kind === 'welcome' ? 'script_welcome' : 'script_thankyou', scriptValue.trim());
    if (ownerPhoto) appendFile(form, 'owner_photo', ownerPhoto);
    for (const photo of extraImages) appendFile(form, 'extra_image', photo);
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

      {videoUrl ? (
        // Keyed by URL: a regeneration swaps the source, and remounting is the
        // one player-replacement path that behaves the same on both platforms.
        <SlotVideo key={videoUrl} url={videoUrl} kind={kind} />
      ) : null}

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

      <View style={styles.photoGroup}>
        <View style={styles.photoHead}>
          <Text style={[styles.photoLabel, { color: colors.textPri }]}>PRESENTER PHOTO</Text>
          <Text style={[styles.photoHint, { color: colors.textDim }]}>
            PNG, JPEG or WebP · 7 MB max
          </Text>
        </View>
        <View style={styles.photoRow}>
          {ownerPhoto ? (
            <Image
              source={{ uri: ownerPhoto.uri }}
              style={styles.thumb}
              contentFit="cover"
              accessibilityLabel="Presenter photo"
            />
          ) : null}
          <PhotoAction label="TAKE PHOTO" onPress={() => void attach('owner', 'camera')} disabled={locked} />
          <PhotoAction
            label="CHOOSE PHOTO"
            onPress={() => void attach('owner', 'library')}
            disabled={locked}
          />
          {ownerPhoto ? (
            <PhotoAction label="REMOVE" onPress={() => setOwnerPhoto(null)} disabled={locked} />
          ) : null}
        </View>
      </View>

      <View style={styles.photoGroup}>
        <View style={styles.photoHead}>
          <Text style={[styles.photoLabel, { color: colors.textPri }]}>REFERENCE PHOTOS</Text>
          <Text style={[styles.photoHint, { color: colors.textDim }]}>
            Ute or finished jobs · 7 MB each
          </Text>
        </View>
        <View style={styles.photoRow}>
          {extraImages.map((photo, i) => (
            <Pressable
              key={`${photo.uri}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`Remove reference photo ${i + 1}`}
              disabled={locked}
              onPress={() => setExtraImages(prev => prev.filter(p => p !== photo))}
            >
              <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
            </Pressable>
          ))}
          <PhotoAction label="TAKE PHOTO" onPress={() => void attach('extra', 'camera')} disabled={locked} />
          <PhotoAction
            label="CHOOSE PHOTO"
            onPress={() => void attach('extra', 'library')}
            disabled={locked}
          />
        </View>
        {extraImages.length > 0 ? (
          <Text style={[styles.photoHint, { color: colors.textDim }]}>Tap a photo to remove it.</Text>
        ) : null}
      </View>

      {photoNote ? (
        <Text style={[styles.error, { color: colors.warningBright }]}>{photoNote}</Text>
      ) : null}
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
        disabled={locked}
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
  // A kicked generation is stamped 'generating' AFTER the fast-ack response
  // (the Veo job runs in the server's after()), so the refetch right after the
  // mutation can race the stamp and still read idle. Polling for a minute
  // after any kick guarantees the stamp — then the poller itself — takes over.
  const pollUntilRef = useRef(0);
  const path = tradeChoice
    ? `/api/tenant/videos?trade=${encodeURIComponent(tradeChoice)}`
    : '/api/tenant/videos';
  const query = useApiQuery(['tenant', 'videos', tradeChoice ?? ''], path, VideosSchema, {
    // Web parity: 8s while generating. Each tick is also the server's resume
    // path, so polling doubles as recovery from a serverless timeout.
    refetchInterval: q => {
      const slots = q.state.data?.slots;
      const busy =
        slots?.welcome.state?.status === 'generating' ||
        slots?.thankyou.state?.status === 'generating';
      return busy || Date.now() < pollUntilRef.current ? 8000 : false;
    },
  });

  const generating =
    query.data?.slots.welcome.state?.status === 'generating' ||
    query.data?.slots.thankyou.state?.status === 'generating';

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
              Generation runs for a few minutes — the finished clip appears here automatically.
            </Text>
          ) : null}

          <SlotCard
            kind="welcome"
            slot={query.data.slots.welcome}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onGenerated={() => {
              pollUntilRef.current = Date.now() + 60000;
              void query.refetch();
            }}
          />
          <SlotCard
            kind="thankyou"
            slot={query.data.slots.thankyou}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onGenerated={() => {
              pollUntilRef.current = Date.now() + 60000;
              void query.refetch();
            }}
          />

          <LinkOutButton label="Watch on the web" path="/dashboard?tab=videos" />
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
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.control,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
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
  photoGroup: { gap: 6 },
  photoHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  photoLabel: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  photoHint: { fontFamily: fonts.sans.regular, fontSize: 11.5, lineHeight: 16 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 48, height: 48, borderRadius: 8 },
  photoBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
  },
  photoBtnLabel: { fontFamily: fonts.mono.bold, fontSize: 10, letterSpacing: 0.8 },
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
