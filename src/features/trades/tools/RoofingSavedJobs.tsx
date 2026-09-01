/**
 * Roofing saved-jobs panel — the native port of the web RoofingHubTab's
 * "Saved roofing jobs" history (page.tsx:16786-16935). The measure entry point
 * stays the native RoofMeasureScreen; this is just the history table beside
 * it. Totals render exactly as /api/roofing/save GET denormalised them — no
 * client-side arithmetic. Tapping a row opens the job's web page (the rich
 * ?full=1 measurement view, falling back to the measurement-results page).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { openWebPath } from '../hub/LinkOut';
import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';
import {
  formatJobDate,
  formatJobPrice,
  roofJobHref,
  useRoofingSavedJobs,
  type SavedRoofJob,
} from './tools-api';

const PAGE = 10;

function JobRow({ job }: { job: SavedRoofJob }) {
  const { colors } = useTheme();
  const inspection = job.routing === 'inspection_required';
  // Web parity: a row with no structure count reads as one structure.
  const structures = job.structure_count ?? 1;
  const href = roofJobHref(job);
  const pillColour = inspection ? colors.warningBright : colors.successBright;
  const price = inspection
    ? 'Inspection'
    : job.combined_better_inc_gst == null
      ? '—'
      : `${formatJobPrice(job.combined_better_inc_gst)} inc GST`;
  const meta = [
    `${structures} structure${structures === 1 ? '' : 's'}`,
    job.combined_area_m2 ? `${Math.round(job.combined_area_m2)} m²` : null,
    formatJobDate(job.created_at),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={job.address ?? 'Saved roofing job'}
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

export function RoofingSavedJobs() {
  const { colors } = useTheme();
  const query = useRoofingSavedJobs();
  const [visible, setVisible] = useState(PAGE);

  if (query.isPending) return <Notice tone="accent" label="Loading saved roofing jobs…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load saved roofing jobs"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  const jobs = query.data?.jobs ?? [];
  if (jobs.length === 0)
    return (
      <Notice
        tone="accent"
        label="No saved roofing jobs yet"
        body="Measure a roof with the measure tool and hit Save job — every saved job shows up here."
      />
    );

  const shown = jobs.slice(0, visible);
  return (
    <Card>
      <SectionLabel>{`Saved roofing jobs · ${jobs.length}`}</SectionLabel>
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
