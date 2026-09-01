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
import {
  appendUploadFiles,
  pickImageForUpload,
  uploadFailureNotice,
  uploadSelectionNote,
  type PickedFile,
} from '@/lib/media';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice, PillGroup } from '../trades/ui';
import { SectionLoading, SectionScreen } from './SectionScreen';
import {
  MAX_REFERENCE_IMAGES,
  VIDEO_OWNER_PHOTO_POLICY,
  VIDEO_REFERENCE_PHOTO_POLICY,
  appendReferenceImages,
} from './video-reference-images';

const MAX_SCRIPT_CHARS = 220;
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
  onAttemptSettled,
}: {
  kind: 'welcome' | 'thankyou';
  slot: Slot;
  trade: string | null;
  busy: boolean;
  onAttemptSettled: () => void;
}) {
  const { colors } = useTheme();
  const [script, setScript] = useState<string | null>(null);
  const [ownerPhoto, setOwnerPhoto] = useState<PickedFile | null>(null);
  const [extraImages, setExtraImages] = useState<PickedFile[]>([]);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const [pickerPending, setPickerPending] = useState(false);
  const pickerOpenRef = useRef(false);
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
        onAttemptSettled();
      },
      onError: error => {
        // Network/timeout/5xx can land after the server accepted the kick.
        // Confirmed auth/file rejections do not need a minute of polling.
        const failure = uploadFailureNotice(error, 'video generation', { canReconcile: true });
        if (failure.retry === 'check_first') onAttemptSettled();
      },
    },
  );

  const status = slot.state?.status ?? 'idle';
  const generating = status === 'generating';
  const locked = generating || busy || generate.isPending || pickerPending;
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
    if (pickerOpenRef.current) return;
    if (target === 'extra' && extraImages.length >= MAX_REFERENCE_IMAGES) {
      setPhotoNote('You can attach up to two reference photos. Remove one to choose another.');
      return;
    }
    pickerOpenRef.current = true;
    setPickerPending(true);
    try {
      const routePolicy =
        target === 'owner' ? VIDEO_OWNER_PHOTO_POLICY : VIDEO_REFERENCE_PHOTO_POLICY;
      const pickerPolicy =
        target === 'extra'
          ? { ...routePolicy, maxFiles: MAX_REFERENCE_IMAGES - extraImages.length }
          : routePolicy;
      const result = await pickImageForUpload(source, pickerPolicy);
      if (result.kind === 'cancelled') return;
      if (result.kind === 'denied' || result.kind === 'failed') {
        setPhotoNote(result.message);
        return;
      }
      if (result.kind === 'rejected') {
        setPhotoNote(result.problem.message);
        return;
      }

      if (target === 'owner') {
        setOwnerPhoto(result.files[0]);
      } else {
        const next = appendReferenceImages(extraImages, result.files);
        if (!next.ok) {
          setPhotoNote('You can attach up to two reference photos. Remove one to choose another.');
          return;
        }
        setExtraImages(next.files);
      }
      setPhotoNote(uploadSelectionNote(result));
    } finally {
      pickerOpenRef.current = false;
      setPickerPending(false);
    }
  }

  function fireGenerate() {
    const form = new FormData();
    form.append('slot', kind);
    if (trade) form.append('trade', trade);
    form.append(kind === 'welcome' ? 'script_welcome' : 'script_thankyou', scriptValue.trim());
    if (ownerPhoto) {
      const owner = appendUploadFiles(form, VIDEO_OWNER_PHOTO_POLICY, [ownerPhoto]);
      if (!owner.ok) {
        setPhotoNote(owner.problem.message);
        return;
      }
    }
    if (extraImages.length > 0) {
      const references = appendUploadFiles(form, VIDEO_REFERENCE_PHOTO_POLICY, extraImages);
      if (!references.ok) {
        setPhotoNote(references.problem.message);
        return;
      }
    }
    generate.mutate(form);
  }

  return (
    <View style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={styles.cardTop}>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: colors.textPri }]}>
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

      <View style={styles.scriptHeading}>
        <Text style={[styles.photoLabel, { color: colors.textSec }]}>SCRIPT</Text>
        <Text style={[styles.counter, { color: colors.textDim }]}>
          {scriptValue.length}/{MAX_SCRIPT_CHARS}
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

      <View style={[styles.photoGroup, { borderTopColor: colors.inkLine }]}>
        <View style={styles.photoHead}>
          <Text style={[styles.photoLabel, { color: colors.textPri }]}>PRESENTER PHOTO</Text>
          <Text style={[styles.photoHint, { color: colors.textDim }]}>
            PNG, JPEG or WebP · 7 MB max
          </Text>
        </View>
        {ownerPhoto ? (
          <Image
            source={{ uri: ownerPhoto.uri }}
            style={styles.thumb}
            contentFit="cover"
            accessibilityLabel="Presenter photo"
          />
        ) : null}
        <View style={styles.photoRow}>
          <PhotoAction
            label="TAKE PHOTO"
            onPress={() => void attach('owner', 'camera')}
            disabled={locked}
          />
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

      <View style={[styles.photoGroup, { borderTopColor: colors.inkLine }]}>
        <View style={styles.photoHead}>
          <Text style={[styles.photoLabel, { color: colors.textPri }]}>
            REFERENCE PHOTOS · {extraImages.length}/{MAX_REFERENCE_IMAGES}
          </Text>
          <Text style={[styles.photoHint, { color: colors.textDim }]}>
            PNG, JPEG or WebP · up to 2 sent to the generator · 7 MB each
          </Text>
        </View>
        {extraImages.length > 0 ? (
          <View style={styles.photoRow}>
            {extraImages.map((photo, i) => (
              <Pressable
                key={`${photo.uri}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Remove reference photo ${i + 1}`}
                disabled={locked}
                onPress={() => {
                  setExtraImages(prev => prev.filter(p => p !== photo));
                  setPhotoNote(null);
                }}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                  accessibilityLabel={`Reference photo ${i + 1}`}
                />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.photoRow}>
          <PhotoAction
            label="TAKE PHOTO"
            onPress={() => void attach('extra', 'camera')}
            disabled={locked || extraImages.length >= MAX_REFERENCE_IMAGES}
          />
          <PhotoAction
            label="CHOOSE PHOTO"
            onPress={() => void attach('extra', 'library')}
            disabled={locked || extraImages.length >= MAX_REFERENCE_IMAGES}
          />
        </View>
        {extraImages.length > 0 ? (
          <Text style={[styles.photoHint, { color: colors.textDim }]}>
            Tap a photo to remove it.
          </Text>
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
          {uploadFailureNotice(generate.error, 'video generation', { canReconcile: true }).message}
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
                ? 'REGENERATE VIDEO'
                : status === 'failed'
                  ? 'RETRY'
                  : 'GENERATE VIDEO'}
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
        <SectionLoading label="Loading your videos" />
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
              Generation takes a few minutes. The finished clip appears here automatically.
            </Text>
          ) : null}

          <SlotCard
            kind="welcome"
            slot={query.data.slots.welcome}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onAttemptSettled={() => {
              pollUntilRef.current = Date.now() + 60000;
              void query.refetch();
            }}
          />
          <SlotCard
            kind="thankyou"
            slot={query.data.slots.thankyou}
            trade={query.data.trade ?? null}
            busy={!!generating}
            onAttemptSettled={() => {
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
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  cardTop: { gap: spacing.sm },
  cardTitle: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 },
  status: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.3 },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.control,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  script: {
    minHeight: 128,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    padding: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  counter: {
    fontFamily: fonts.mono.regular,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  scriptHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoGroup: { gap: spacing.md, borderTopWidth: 1, paddingTop: spacing.lg },
  photoHead: {
    gap: spacing.xs,
  },
  photoLabel: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.5 },
  photoHint: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: radius.control },
  photoBtn: {
    minHeight: touch.minimum,
    flexGrow: 1,
    flexBasis: 112,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  photoBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  error: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  generateBtn: {
    minHeight: touch.primaryCta,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  generateText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  pollNote: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 22 },
});
