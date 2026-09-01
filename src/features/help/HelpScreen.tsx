import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Notice } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import { downloadAndShare, DownloadCancelledError } from '@/lib/download';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { SectionEmpty, SectionGroup, SectionScreen } from '../sections/SectionScreen';
import {
  filterHelpDocuments,
  HELP_DOCUMENTS,
  helpDocumentFilename,
  helpDocumentMime,
  type HelpDocument,
} from './help-documents';
import { openHelpDocument } from './open-help-document';

const TRADIE_DOCUMENTS = HELP_DOCUMENTS.filter(document => document.audience === 'tradie');
const GATED_COUNT = HELP_DOCUMENTS.length - TRADIE_DOCUMENTS.length;

function DocumentRow({ document }: { document: HelpDocument }) {
  const { colors } = useTheme();
  const abortRef = useRef<AbortController | null>(null);
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function open() {
    if (opening || saving) return;
    setError(null);
    setOpening(true);
    try {
      await openHelpDocument(document);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'That guide could not be opened. Try again.'));
    } finally {
      setOpening(false);
    }
  }

  async function save() {
    if (opening || saving || document.format === 'html') return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setProgress(null);
    setSaving(true);
    try {
      await downloadAndShare({
        path: document.path,
        filename: helpDocumentFilename(document),
        mimeType: helpDocumentMime(document),
        signal: controller.signal,
        onProgress: setProgress,
      });
    } catch (cause) {
      if (!(cause instanceof DownloadCancelledError && cause.reason === 'cancelled')) {
        setError(apiErrorMessage(cause, 'That document could not be saved or shared. Try again.'));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setSaving(false);
      setProgress(null);
    }
  }

  const formatLabel = document.format.toUpperCase();
  const progressLabel =
    progress == null ? 'Downloading…' : `Downloading ${Math.round(progress * 100)}%`;

  return (
    <View style={[styles.card, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={styles.heading}>
        <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
          <Text style={[styles.title, { color: colors.textPri }]}>{document.title}</Text>
          <Text style={[styles.meta, { color: colors.textDim }]}>
            {formatLabel}
            {document.historical ? ' · HISTORICAL REFERENCE' : ' · CURRENT GUIDE'}
          </Text>
        </View>
      </View>
      {document.historical ? (
        <Text style={[styles.note, { color: colors.textSec }]}>
          This document records an earlier product snapshot. Current server and in-app behaviour
          take precedence.
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${document.title}`}
          accessibilityHint="Opens the public QuoteMax document viewer"
          accessibilityState={{ disabled: opening || saving, busy: opening }}
          disabled={opening || saving}
          onPress={() => void open()}
          style={({ pressed }) => [
            styles.primary,
            { backgroundColor: pressed ? colors.accentPress : colors.accent },
          ]}
        >
          <Text style={[styles.primaryText, { color: colors.accentInk }]}>
            {opening ? 'OPENING…' : 'OPEN GUIDE'}
          </Text>
        </Pressable>
        {document.format !== 'html' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Save or share ${document.title}`}
            accessibilityState={{ disabled: opening || saving, busy: saving }}
            disabled={opening || saving}
            onPress={() => void save()}
            style={({ pressed }) => [
              styles.secondary,
              {
                borderColor: colors.ctlLine,
                backgroundColor: pressed ? colors.ink : 'transparent',
              },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPri }]}>
              {saving ? progressLabel.toUpperCase() : 'SAVE / SHARE'}
            </Text>
          </Pressable>
        ) : null}
        {saving ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${document.title} download`}
            onPress={() => abortRef.current?.abort()}
            style={styles.cancel}
          >
            <Text style={[styles.cancelText, { color: colors.dangerBright }]}>CANCEL DOWNLOAD</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="assertive"
          style={[styles.error, { color: colors.dangerBright }]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const visibleDocuments = filterHelpDocuments(TRADIE_DOCUMENTS, query);

  return (
    <SectionScreen
      title="Help & guides"
      subtitle="Public QuoteMax guides and downloads. Historical documents are labelled and do not override today’s app or server behaviour."
    >
      <View style={styles.searchGroup}>
        <Text style={[styles.searchLabel, { color: colors.textSec }]}>SEARCH GUIDES</Text>
        <TextInput
          accessibilityLabel="Search QuoteMax guides"
          value={query}
          onChangeText={setQuery}
          placeholder="Pricing, estimating, SMS…"
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          style={[
            styles.searchInput,
            {
              color: colors.textPri,
              borderColor: colors.ctlLine,
              backgroundColor: colors.inkCard,
            },
          ]}
        />
      </View>
      <SectionGroup title="Tradie guides" count={visibleDocuments.length}>
        {visibleDocuments.length ? (
          visibleDocuments.map(document => <DocumentRow key={document.path} document={document} />)
        ) : (
          <SectionEmpty
            title="No matching guides"
            body="Try a broader word. Technical and unreviewed documents are not included in tradie search results."
          />
        )}
      </SectionGroup>
      <Notice
        tone="accent"
        label={`${GATED_COUNT} technical references catalogued`}
        body="Architecture, investor, red-team and build documents stay out of the tradie catalogue until their audience and publication status are approved. Nothing in those documents enables an app feature."
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Contact QuoteMax support"
        onPress={() => router.push('/support' as never)}
        style={({ pressed }) => [
          styles.support,
          {
            borderColor: colors.ctlLine,
            backgroundColor: pressed ? colors.ink : colors.inkCard,
          },
        ]}
      >
        <Text style={[styles.supportTitle, { color: colors.textPri }]}>NEED MORE HELP?</Text>
        <Text style={[styles.supportBody, { color: colors.textSec }]}>
          Send a support enquiry from the app. Your draft stays here if delivery fails.
        </Text>
      </Pressable>
      <Notice
        tone="warn"
        label="Paint calculator pending"
        body="The illustrative paint-estimator document is withheld here until its complete educational calculator and explanations have a safe native counterpart. It is never a source of tenant prices."
      />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchGroup: { gap: spacing.sm },
  searchLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  searchInput: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 22,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  title: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 23 },
  meta: { fontFamily: fonts.mono.semiBold, fontSize: 11, lineHeight: 17, letterSpacing: 0.5 },
  note: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primary: {
    minHeight: touch.minimum,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: fonts.sans.bold, fontSize: 13, lineHeight: 19, letterSpacing: 0.5 },
  secondary: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.sans.bold, fontSize: 13, lineHeight: 19, letterSpacing: 0.4 },
  cancel: { minHeight: touch.minimum, justifyContent: 'center', paddingHorizontal: spacing.md },
  cancelText: { fontFamily: fonts.sans.bold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  error: { fontFamily: fonts.sans.medium, fontSize: 14, lineHeight: 20 },
  support: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  supportTitle: { fontFamily: fonts.sans.bold, fontSize: 14, lineHeight: 20, letterSpacing: 0.5 },
  supportBody: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 21 },
});
