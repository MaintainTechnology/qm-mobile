import { Image } from 'expo-image';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Text, View } from 'react-native';

import { GhostButton } from '@/features/auth/ui';
import { pickImageForUpload, uploadFailureNotice, uploadSelectionNote } from '@/lib/media';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { JOB_PHOTO_POLICY, jobPhotoForm, useJobPhotoUpload } from './api';
import type { JobPhoto } from './photos';
import { Card, Notice, SectionLabel } from '../ui';

let nextPhotoId = 0;

export function JobPhotos({
  photos,
  setPhotos,
  disabled,
}: {
  photos: JobPhoto[];
  setPhotos: Dispatch<SetStateAction<JobPhoto[]>>;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const upload = useJobPhotoUpload();
  const mounted = useRef(true);
  const picking = useRef(false);
  const transfers = useRef(new Map<number, AbortController>());
  const removed = useRef(new Set<number>());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    const pending = transfers.current;
    return () => {
      mounted.current = false;
      for (const controller of pending.values()) controller.abort();
    };
  }, []);

  async function uploadOne(photo: JobPhoto) {
    if (transfers.current.has(photo.id) || removed.current.has(photo.id)) return;
    const controller = new AbortController();
    transfers.current.set(photo.id, controller);
    const started = Date.now();
    setPhotos(current =>
      current.map(row =>
        row.id === photo.id ? { ...row, status: 'uploading', error: undefined } : row,
      ),
    );
    try {
      const result = await upload.mutateAsync({
        form: jobPhotoForm(photo.file),
        signal: controller.signal,
      });
      if (!mounted.current) return;
      setPhotos(current =>
        current.map(row =>
          row.id === photo.id
            ? {
                ...row,
                status: 'uploaded',
                path: result.paths[0],
                url: result.urls[0],
                uploadedAt: started,
              }
            : row,
        ),
      );
    } catch (error) {
      if (!mounted.current) return;
      setPhotos(current =>
        current.map(row =>
          row.id === photo.id
            ? {
                ...row,
                status: 'failed',
                error: uploadFailureNotice(error, 'job photo').message,
              }
            : row,
        ),
      );
    } finally {
      transfers.current.delete(photo.id);
    }
  }

  async function pick(source: 'camera' | 'library') {
    if (picking.current || disabled || photos.length >= 3) return;
    picking.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const result = await pickImageForUpload(source, {
        ...JOB_PHOTO_POLICY,
        maxFiles: 3 - photos.length,
      });
      if (!mounted.current || result.kind === 'cancelled') return;
      if (result.kind !== 'selected') {
        setNotice(result.kind === 'rejected' ? result.problem.message : result.message);
        return;
      }
      setNotice(uploadSelectionNote(result));
      const rows: JobPhoto[] = result.files.map(file => ({
        id: ++nextPhotoId,
        file,
        status: 'uploading',
      }));
      setPhotos(current => [...current, ...rows]);
      // A one-file request keeps partial success attributable to the correct image.
      for (const photo of rows) {
        if (!mounted.current) break;
        await uploadOne(photo);
      }
    } finally {
      picking.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>Job photos · optional</SectionLabel>
      <Text style={{ color: colors.textSec, fontFamily: fonts.sans.regular }}>
        Add up to three photos of where the charger is going. JPEG, PNG or WebP, up to 8 MB each.
      </Text>
      <GhostButton
        label="Choose job photos"
        onPress={() => void pick('library')}
        disabled={disabled || busy || photos.length >= 3}
      />
      <GhostButton
        label="Take a job photo"
        onPress={() => void pick('camera')}
        disabled={disabled || busy || photos.length >= 3}
      />
      {notice ? <Notice tone="warn" label="Job photos" body={notice} /> : null}
      {photos.map((photo, index) => (
        <View key={photo.id} style={{ gap: spacing.sm }}>
          <Image
            source={{ uri: photo.file.uri }}
            style={{ height: 160, width: '100%' }}
            contentFit="contain"
            accessibilityLabel={`Job photo ${index + 1}`}
          />
          <Text style={{ color: colors.textSec }}>
            {photo.status === 'uploaded'
              ? 'Photo added'
              : photo.status === 'uploading'
                ? 'Uploading photo…'
                : photo.error}
          </Text>
          {photo.status === 'failed' ? (
            <GhostButton
              label={`Retry photo ${index + 1}`}
              disabled={disabled || busy}
              onPress={() => void uploadOne(photo)}
            />
          ) : null}
          <GhostButton
            label={`Remove photo ${index + 1}`}
            disabled={disabled}
            onPress={() => {
              removed.current.add(photo.id);
              transfers.current.get(photo.id)?.abort();
              setPhotos(current => current.filter(row => row.id !== photo.id));
            }}
          />
        </View>
      ))}
      {busy ? (
        <Text style={{ color: colors.textSec }}>
          Removing an uploading photo leaves it out of this draft; its upload may still finish.
        </Text>
      ) : null}
    </Card>
  );
}
