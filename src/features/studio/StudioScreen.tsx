import { useAuth } from '@clerk/expo';
import { usePreventRemove } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GhostButton, PrimaryCta } from '@/features/auth/ui';
import { SectionScreen } from '@/features/sections/SectionScreen';
import { Notice } from '@/features/trades/ui';
import { fonts, radius, spacing, touch, type } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { useTenantMe } from '@/lib/tenant';
import { assertStudioActive, replaceStudioSlide, STUDIO_HEIGHT, STUDIO_LABELS, STUDIO_WIDTH, studioPngDataUri } from './studio-contract';
import { DEFAULT_CAROUSEL } from './studio-presets';
import { renderStudioPng, type StudioToken } from './studio-render';
import { createStudioPdf } from './studio-pdf';
import { shareStudioBytes } from './studio-share';
import { StudioFields } from './StudioFields';
import { useStudioDraft } from './use-studio-draft';
import { beginStudioExport, beginStudioRender, clearStudioExportCache, finishStudioExport, StudioExportCleanupError } from './studio-export-cache';

export function StudioScreen() {
  const { userId, sessionId, getToken } = useAuth();
  const tenant = useTenantMe();
  return <SectionScreen title="Brand Studio" subtitle="Five slides. Your copy. Ready to share.">
    {tenant.isError && !tenant.data ? <Notice tone="danger" label="Could not load your Studio account" onRetry={() => void tenant.refetch()} />
      : !userId || !tenant.data ? <Notice tone="warn" label="Loading your Studio account…" />
        : <StudioEditor key={`${userId}:${sessionId}:${tenant.data.tenant.id}`} scope={{ userId, tenantId: tenant.data.tenant.id }} getToken={getToken} />}
  </SectionScreen>;
}

export function StudioEditor({ scope, getToken }: { scope: { userId: string; tenantId: string }; getToken: StudioToken }) {
  const { colors } = useTheme();
  const working = useStudioDraft(scope);
  const { draft, setDraft, loaded } = working;
  const slide = draft.slides[draft.selected]!;
  const selectedKey = JSON.stringify(slide);
  const [preview, setPreview] = useState<{ key: string; uri: string } | null>(null);
  const [previewError, setPreviewError] = useState<{ key: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const [progress, setProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [exportError, setExportError] = useState('');
  const [cacheReady, setCacheReady] = useState(false);
  const [cacheError, setCacheError] = useState('');
  const [cacheRetry, setCacheRetry] = useState(0);
  const alive = useRef(true);
  const exportController = useRef<AbortController | null>(null);
  const tokenRef = useRef(getToken);
  tokenRef.current = getToken;
  const freshToken = useCallback(() => tokenRef.current(), []);
  useEffect(() => { alive.current = true; return () => { alive.current = false; exportController.current?.abort(); }; }, []);
  useEffect(() => {
    let active = true;
    void clearStudioExportCache().then(() => { if (active) { setCacheReady(true); setCacheError(''); } })
      .catch(() => { if (active) setCacheError('Temporary Studio exports could not be cleared. Retry before exporting.'); });
    return () => { active = false; };
  }, [cacheRetry]);
  usePreventRemove(working.unstored || !!busy, () => {
    Alert.alert('Keep Studio open', busy ? 'Cancel the current export before leaving.' : 'Your latest edits have not finished saving securely. Retry working-copy storage before leaving.');
  });
  useEffect(() => {
    if (!loaded || busy) return;
    const controller = beginStudioRender();
    let active = true;
    const timer = setTimeout(() => {
      void renderStudioPng(slide, freshToken, controller.signal).then(bytes => {
        if (active && alive.current) { setPreview({ key: selectedKey, uri: studioPngDataUri(bytes) }); setPreviewError(null); }
      }).catch(error => {
        if (active && alive.current) setPreviewError({ key: selectedKey, message: error instanceof Error ? error.message : 'Studio preview failed. Your edits are still here.' });
      });
    }, 350);
    return () => { active = false; clearTimeout(timer); controller.abort(); finishStudioExport(controller); };
  }, [slide, selectedKey, loaded, retry, busy, freshToken]);

  async function exportSlides(kind: 'png' | 'pdf') {
    if (exportController.current || !loaded || !cacheReady || working.unstored || working.error) return;
    let controller: AbortController;
    try { controller = beginStudioExport(); }
    catch (error) {
      if (error instanceof StudioExportCleanupError) { setCacheReady(false); setCacheError(error.message); }
      else setExportError(error instanceof Error ? error.message : 'Studio export cleanup needs attention.');
      return;
    }
    exportController.current = controller;
    setBusy(kind); setNotice(''); setExportError(''); setProgress(kind === 'png' ? 'Rendering current slide…' : 'Rendering slide 1 of 5…');
    try {
      const bytes = kind === 'png' ? await renderStudioPng(slide, freshToken, controller.signal)
        : await createStudioPdf(draft.slides, async (item, index) => {
          if (alive.current && !controller.signal.aborted) setProgress(`Rendering slide ${index + 1} of 5…`);
          return renderStudioPng(item, freshToken, controller.signal);
        }, controller.signal);
      assertStudioActive(controller.signal);
      if (!alive.current) return;
      setProgress('Opening save or share…');
      await shareStudioBytes(bytes, kind, controller.signal);
      if (alive.current && !controller.signal.aborted) setNotice('The save or share sheet was opened. Your slides are still editable.');
    } catch (error) {
      if (alive.current) {
        if (error instanceof StudioExportCleanupError) { setCacheReady(false); setCacheError(error.message); }
        else if (controller.signal.aborted) setNotice('Export cancelled. Your edits are still here.');
        else setExportError(error instanceof Error ? error.message : 'Export failed. Your edits are still here.');
      }
    } finally {
      finishStudioExport(controller);
      if (exportController.current === controller) exportController.current = null;
      if (alive.current) { setBusy(null); setProgress(''); }
    }
  }
  function reset() {
    if (busy) return;
    Alert.alert('Reset all slides?', 'Your custom copy and photo choices will be replaced with the starter carousel.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Reset all slides', style: 'destructive', onPress: () => {
        if (!alive.current || exportController.current) return;
        setDraft(value => ({ ...value, slides: JSON.parse(JSON.stringify(DEFAULT_CAROUSEL)) })); setNotice(''); setExportError('');
      } },
    ]);
  }
  if (!loaded) return <View style={styles.stack}>
    <Notice tone={working.error ? 'danger' : 'warn'} label={working.error || 'Opening your Studio working copy…'} onRetry={working.error ? working.retry : undefined} />
    {working.error && <GhostButton label="Discard saved working copy" onPress={() => Alert.alert('Discard saved Studio copy?', 'This removes your saved custom slides from this device.', [
      { text: 'Keep copy', style: 'cancel' }, { text: 'Discard copy', style: 'destructive', onPress: () => void working.discard() },
    ])} />}
  </View>;
  const currentPreview = preview?.key === selectedKey ? preview : null;
  const currentError = previewError?.key === selectedKey ? previewError.message : '';
  return <View style={styles.stack}>
    {working.error && <Notice tone="danger" label="Working copy needs attention" body={working.error} onRetry={working.retry} />}
    <Text style={[type.bodySm, { color: colors.textSec }]}>{working.unstored ? 'Saving working copy securely…' : working.restored ? 'Working copy restored. Edits are saved securely on this device for up to seven days.' : 'Edits are saved securely on this device for up to seven days.'}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} accessibilityLabel="Carousel slides">
      {STUDIO_LABELS.map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Slide ${index + 1}: ${label}`}
        accessibilityState={{ selected: draft.selected === index, disabled: !!busy }} disabled={!!busy}
        onPress={() => setDraft(value => ({ ...value, selected: index }))}
        style={[styles.slide, { backgroundColor: draft.selected === index ? colors.accent : colors.inkCard, borderColor: colors.inkLine }]}>
        <Text style={[styles.number, { color: draft.selected === index ? colors.accentInk : colors.textDim }]}>{String(index + 1).padStart(2, '0')}</Text>
        <Text style={[type.bodySm, { color: draft.selected === index ? colors.accentInk : colors.textPri }]}>{label}</Text>
      </Pressable>)}
    </ScrollView>
    <Text accessibilityRole="header" style={[type.title, { color: colors.textPri }]}>{STUDIO_LABELS[draft.selected]} · {draft.selected + 1} / 5</Text>
    <View style={[styles.preview, { backgroundColor: colors.ink, borderColor: colors.inkLine }]}>
      {currentPreview && !currentError ? <Image source={{ uri: currentPreview.uri }} cachePolicy="none" contentFit="contain"
        accessibilityLabel={`${STUDIO_LABELS[draft.selected]} slide preview`} style={styles.image}
        onError={() => setPreviewError({ key: selectedKey, message: 'The preview could not be displayed. Your edits are still here.' })} />
        : <Text style={[type.bodySm, { color: colors.textSec, padding: spacing.lg }]}>{currentError || 'Rendering this slide…'}</Text>}
    </View>
    {currentError && <GhostButton label="Retry preview" disabled={!!busy} onPress={() => { setPreviewError(null); setRetry(value => value + 1); }} />}
    <Text style={[type.bodySm, { color: colors.textDim }]}>1080 × 1350 · PNG for this slide · PDF includes all five slides in order.</Text>
    {exportError && <Notice tone="danger" label="Export could not finish" body={exportError} />}
    {cacheError && <Notice tone="danger" label="Export cleanup needs attention" body={cacheError} onRetry={() => setCacheRetry(value => value + 1)} />}
    {notice && <Notice tone="accent" label={notice} />}
    {busy ? <View style={styles.stack}><Notice tone="warn" label={progress} /><GhostButton label="Cancel export" onPress={() => exportController.current?.abort()} /></View>
      : <View style={styles.stack}><PrimaryCta label="Save or share current PNG" disabled={!cacheReady || working.unstored || !!working.error} onPress={() => void exportSlides('png')} />
        <GhostButton label="Save or share carousel PDF" disabled={!cacheReady || working.unstored || !!working.error} onPress={() => void exportSlides('pdf')} /></View>}
    <StudioFields slide={slide} disabled={!!busy} onChange={apply => setDraft(value => exportController.current ? value : ({ ...value,
      slides: replaceStudioSlide(value.slides, draft.selected, apply(value.slides[draft.selected]!)) }))} />
    <GhostButton label="Reset all slides" disabled={!!busy} onPress={reset} />
  </View>;
}
const styles = StyleSheet.create({
  stack: { gap: spacing.lg }, rail: { gap: spacing.sm },
  slide: { minHeight: touch.minimum, minWidth: 104, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderRadius: radius.control },
  number: { fontFamily: fonts.mono.semiBold, fontSize: 12 },
  preview: { width: '100%', aspectRatio: STUDIO_WIDTH / STUDIO_HEIGHT, borderWidth: 1, borderRadius: radius.card, overflow: 'hidden', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
});
