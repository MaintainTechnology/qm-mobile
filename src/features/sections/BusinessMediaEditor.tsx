import { usePreventRemove } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { Card, Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { spacing, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { businessMediaPreviewUrl, type BusinessMediaKind } from './business-media-contract';
import { MediaInputError } from './business-media-file';
import { MediaRecoveryError } from './business-media-write';
import { useBusinessMedia } from './use-business-media';

function MediaPreview({ uri, label, photo = false }: { uri: string | null; label: string; photo?: boolean }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  return <View style={{ gap: spacing.sm }}>
    {uri && !failed ? <Image source={{ uri }} accessibilityLabel={label} accessible contentFit={photo ? 'cover' : 'contain'}
      cachePolicy="none" onError={() => setFailed(true)} style={{ width: '100%', height: 160, backgroundColor: '#ffffff', borderRadius: 8 }} />
      : <Text style={[type.bodySm, { color: colors.textSec }]}>{failed ? 'This image preview could not be loaded.' : `${label} is unavailable.`}</Text>}
    {failed ? <GhostButton label="Retry image preview" onPress={() => setFailed(false)} /> : null}
  </View>;
}

export function BusinessMediaEditor({ tenantId }: { tenantId: string }) {
  const { colors } = useTheme();
  const model = useBusinessMedia(tenantId);
  usePreventRemove(model.busy || (!!model.selection && !model.receipt), () => {
    Alert.alert('Keep your image change open', model.busy ? 'Wait for this image action to finish.'
      : 'The selected image is kept only while this screen is open. Save or discard it before leaving.');
  });
  const text = [type.bodySm, { color: colors.textSec }];
  const pending = model.receipt && ['unknown', 'pending'].includes(model.receipt.status);
  const retryMatches = model.receipt && model.selection
    && model.receipt.identity.kind === model.selection.kind
    && model.receipt.identity.sourceSha256 === model.selection.image.sourceSha256
    && model.receipt.identity.sourceMime === model.selection.image.sourceMime
    && model.receipt.identity.expectedRevision === model.selection.expectedRevision;
  const confirmCancel = () => Alert.alert('Cancel the original image change?',
    'QuoteMax will prevent that request from applying later. If it already finished, its saved result will be shown instead.', [
      { text: 'Keep checking', style: 'cancel' }, { text: 'Cancel image change', style: 'destructive', onPress: () => void model.cancel() },
    ]);
  return <Card style={{ gap: spacing.lg }}>
    <Text accessibilityRole="header" style={[type.title, { color: colors.textPri }]}>Business logo and photo</Text>
    <Text style={text}>Choose a PNG, JPG or WebP image up to 2 MB. Images are optimised for quotes while preserving their proportions.</Text>
    {!model.loaded ? <Notice tone="accent" label="Checking your saved business images…" /> : null}
    {model.error ? <Notice tone="danger" label="Image change needs attention" body={model.error instanceof MediaInputError || model.error instanceof MediaRecoveryError
      ? model.error.message : apiErrorMessage(model.error, 'The image result could not be checked. Your previous request reference and selected image have been retained.')} /> : null}
    {(['logo', 'photo'] as const).map(kind => {
      const data = model.snapshot?.media;
      const url = businessMediaPreviewUrl(kind === 'logo' ? data?.logoUrl ?? null : data?.photoUrl ?? null,
        kind === 'logo' ? data?.logoPath ?? null : data?.photoPath ?? null);
      const label = kind === 'logo' ? 'Current business logo' : 'Current business photo';
      return <View key={kind} style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={[type.body, { color: colors.textPri }]}>{label}</Text>
        <MediaPreview key={`${kind}:${url}`} uri={url} label={`${label} preview`} photo={kind === 'photo'} />
        <GhostButton label={kind === 'logo' ? 'Choose logo' : 'Choose photo'} disabled={!model.loaded || model.busy || !!model.receipt}
          onPress={() => void model.pick(kind as BusinessMediaKind)} />
      </View>;
    })}
    {model.selection ? <View style={{ gap: spacing.sm }}>
      <Text accessibilityRole="header" style={[type.body, { color: colors.textPri }]}>Selected {model.selection.kind === 'logo' ? 'logo' : 'photo'}</Text>
      <MediaPreview key={model.selection.image.sourceSha256} uri={model.selection.image.previewUri} label="Selected business image preview" photo={model.selection.kind === 'photo'} />
      <Text style={text}>This selection is kept only while this screen is open. Your current image changes after QuoteMax confirms Save.</Text>
      {model.needsReview ? <>
        <Notice tone="warn" label="Your saved business images changed" body="Review the current images above before using your selection with the latest account version." />
        <GhostButton label="Use this selection with the current version" onPress={model.rebase} disabled={model.busy} />
      </> : null}
      <PrimaryCta label={model.receipt ? 'Retry the exact image change' : 'Save selected image'} loading={model.busy}
        disabled={!model.loaded || model.needsReview || (!!model.receipt && (!pending || !retryMatches))} onPress={() => void model.save()} />
      {!model.receipt ? <GhostButton label="Discard selected image" disabled={model.busy} onPress={() => Alert.alert('Discard this selection?', 'Your saved business images remain unchanged.', [
        { text: 'Keep selection', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: model.discard },
      ])} /> : null}
    </View> : null}
    {model.receipt ? <Notice tone="warn" label="Check the previous image change"
      body="Its reference is safely retained. Check the original request before starting another. If this screen was closed, you can check or cancel without the image file." /> : null}
    {model.note ? <Notice tone="accent" label="Business image update" body={model.note} /> : null}
    <GhostButton label="Check saved business images" onPress={() => void model.refresh()} disabled={model.busy} />
    {pending ? <GhostButton label="Cancel original image change" onPress={confirmCancel} disabled={model.busy} /> : null}
  </Card>;
}
