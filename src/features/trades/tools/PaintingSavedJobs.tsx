/**
 * Painting saved-jobs panel — the native port of the web PaintingHubTab's
 * "Saved paint jobs" history (page.tsx:16573-16671). Address, routing pill and
 * the denormalised totals exactly as /api/painting/save GET returns them — no
 * client-side arithmetic ever (the pricing book stays the only price source).
 * Tapping a row opens the job's web page (tradie estimate results, falling
 * back to the customer quote page); the estimator itself stays a web tool.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { openWebPath } from '../hub/LinkOut';
import { WebOnlyCard } from '../hub/SectionsContent';
import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';
import {
  formatJobDate,
  formatJobPrice,
  paintJobHref,
  usePaintingSavedJobs,
  type SavedPaintJob,
} from './tools-api';

const PAGE = 10;

function JobRow({ job }: { job: SavedPaintJob }) {
  const { colors } = useTheme();
  const inspection = job.routing === 'inspection_required';
  const scopes = job.scopes ?? [];
  const href = paintJobHref(job);
  const pillColour = inspection ? colors.warningBright : colors.successBright;
  const price = inspection
    ? 'Inspection'
    : job.better_inc_gst == null
      ? '—'
      : `${formatJobPrice(job.better_inc_gst)} inc GST`;
  const meta = [
    scopes.length > 0 ? scopes.join(', ') : null,
    job.total_area_m2 ? `${Math.round(job.total_area_m2)} m²` : null,
    job.confidence ? `${job.confidence} conf` : null,
    formatJobDate(job.created_at),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={job.address ?? 'Saved paint job'}
      disabled={href == null}
      onPress={() => {
        if (href != null) openWebPath(href);
      }}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: colors.inkLine },
        pressed && href != null && styles.pressed,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]} numberOfLines={2}>
          {job.address ?? 'Unknown address'}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      <View style={styles.rowFooter}>
        <Text style={[styles.pill, { color: pillColour, borderColor: pillColour }]}>
          {inspection ? 'INSPECTION' : 'QUOTE'}
        </Text>
        <Text style={[styles.rowPrice, { color: colors.textPri }]}>{price}</Text>
        {href != null ? (
          <Text style={[styles.rowChevron, { color: colors.textDim }]}>→</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function PaintingSavedJobs() {
  const { colors } = useTheme();
  const query = usePaintingSavedJobs();
  const [visible, setVisible] = useState(PAGE);

  if (query.isPending) return <Notice tone="accent" label="Loading saved paint jobs…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load saved paint jobs"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  const jobs = query.data?.jobs ?? [];
  if (jobs.length === 0)
    return (
      <WebOnlyCard
        label="No saved paint jobs yet"
        body="Run an estimate in the web paint tool and hit Save job — every saved job shows up here."
        path="/dashboard?tab=painting"
        cta="Open the paint tool"
      />
    );

  const shown = jobs.slice(0, visible);
  return (
    <Card>
      <SectionLabel>{`Saved paint jobs · ${jobs.length}`}</SectionLabel>
      {shown.map(j => (
        <JobRow key={j.id} job={j} />
      ))}
      {jobs.length > shown.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisible(v => v + PAGE)}
          style={styles.showMore}
          hitSlop={8}
        >
          <Text style={[styles.showMoreLabel, { color: colors.accentText }]}>
            {`SHOW MORE (${jobs.length - shown.length} LEFT)`}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    minHeight: touch.listRow,
  },
  rowMain: { minWidth: 0, gap: spacing.xs },
  rowTitle: { fontFamily: fonts.sans.semiBold, fontSize: 16, lineHeight: 22 },
  rowFooter: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  rowPrice: {
    flexGrow: 1,
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  pill: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  rowChevron: { fontFamily: fonts.mono.bold, fontSize: 14 },
  pressed: { opacity: 0.6 },
  showMore: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
  },
  showMoreLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
});
