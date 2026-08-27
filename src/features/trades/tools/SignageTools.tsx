/**
 * Signage hub tool panel — the native port of the web SignageHubTab
 * (page.tsx:16242-16437): the org-wide fleet rollup, the recent-requests
 * history (flattened from the sweeps payload, newest first) and link-outs to
 * the sweep builder + review queue, which stay web surfaces. Tapping an
 * assessed row deep-links the web review queue on that assessment — the AI
 * triages, HQ decides, and deciding happens on the web.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { LinkOutButton, openWebPath } from '../hub/LinkOut';
import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';
import {
  flattenRecentRequests,
  formatJobDate,
  signageChip,
  useSignageQueue,
  useSignageSweeps,
  type RecentSignageRequest,
  type SignageChipTone,
  type SignageRollup,
} from './tools-api';

const PAGE = 10;

/** Web SgStat parity: label + count, toned like the web (good/warn/accent). */
function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'good' | 'warn' | 'accent';
}) {
  const { colors } = useTheme();
  const colour =
    tone === 'good'
      ? colors.successBright
      : tone === 'warn'
        ? colors.warningBright
        : tone === 'accent'
          ? colors.accentText
          : colors.textPri;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colour }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function RollupRow({ rollup }: { rollup: SignageRollup }) {
  return (
    <Card>
      <SectionLabel>Fleet rollup</SectionLabel>
      <View style={styles.statRow}>
        <StatCell label="Studios" value={rollup.studios} />
        <StatCell label="Assessed" value={rollup.assessed} />
        <StatCell label="Compliant" value={rollup.pass} tone="good" />
        <StatCell label="To fix" value={rollup.fix_needed} tone="warn" />
        <StatCell label="Needs review" value={rollup.needs_review} tone="accent" />
        <StatCell label="Awaiting" value={rollup.awaiting} />
      </View>
    </Card>
  );
}

function ChipText({ tone, label }: { tone: SignageChipTone; label: string }) {
  const { colors } = useTheme();
  const colour =
    tone === 'success'
      ? colors.successBright
      : tone === 'warn'
        ? colors.warningBright
        : colors.textDim;
  return <Text style={[styles.chip, { color: colour, borderColor: colour }]}>{label.toUpperCase()}</Text>;
}

function RequestRow({ req }: { req: RecentSignageRequest }) {
  const { colors } = useTheme();
  const chip = signageChip(req.state, req.overall);
  const assessmentId = req.assessment_id;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${req.studio_name} — ${chip.label}`}
      disabled={assessmentId == null}
      onPress={() => {
        if (assessmentId != null) {
          openWebPath(`/dashboard/signage/queue?a=${encodeURIComponent(assessmentId)}`);
        }
      }}
      style={({ pressed }) => [
        styles.row,
        { borderTopColor: colors.inkLine },
        pressed && assessmentId != null && styles.pressed,
      ]}
    >
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]} numberOfLines={1}>
          {req.studio_name}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textDim }]} numberOfLines={1}>
          {`${req.sweep_name} · ${formatJobDate(req.sweep_created_at)}`.toUpperCase()}
        </Text>
      </View>
      <ChipText tone={chip.tone} label={chip.label} />
      {assessmentId != null ? (
        <Text style={[styles.rowChevron, { color: colors.accentText }]}>→</Text>
      ) : null}
    </Pressable>
  );
}

export function SignageTools() {
  const { colors } = useTheme();
  const sweeps = useSignageSweeps();
  const queue = useSignageQueue();
  const [visible, setVisible] = useState(PAGE);

  if (sweeps.isPending) return <Notice tone="accent" label="Loading signage compliance…" />;
  if (sweeps.isError && !sweeps.data)
    return (
      <Notice
        tone="danger"
        label="Could not load signage requests"
        body={apiErrorMessage(sweeps.error)}
        onRetry={() => void sweeps.refetch()}
      />
    );

  const recent = flattenRecentRequests(sweeps.data?.sweeps ?? []);
  const shown = recent.slice(0, visible);
  // Web parity: the rollup renders only once the queue payload lands — a
  // failed queue call never blocks the request history.
  const rollup = queue.data?.rollup ?? null;

  return (
    <View style={styles.stack}>
      {rollup ? <RollupRow rollup={rollup} /> : null}

      <View style={styles.linkRow}>
        <LinkOutButton label="Open sweeps" path="/dashboard/signage" tone="accent" />
        <LinkOutButton label="Open review queue" path="/dashboard/signage/queue" />
      </View>

      <Card>
        <SectionLabel>
          {recent.length > 0 ? `Recent requests · ${recent.length}` : 'Recent requests'}
        </SectionLabel>
        {recent.length === 0 ? (
          <Text style={[styles.emptyBody, { color: colors.textSec }]}>
            No requests yet. Run a sweep to send your studios their upload links — each one shows
            up here as it responds.
          </Text>
        ) : (
          shown.map(r => <RequestRow key={r.id} req={r} />)
        )}
        {recent.length > shown.length ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setVisible(v => v + PAGE)}
            style={styles.showMore}
            hitSlop={8}
          >
            <Text style={[styles.showMoreLabel, { color: colors.accentText }]}>
              {`SHOW MORE (${recent.length - shown.length} LEFT)`}
            </Text>
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  stat: { flexGrow: 1, flexBasis: 84 },
  statValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    marginTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    minHeight: touch.minimum,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.sans.semiBold, fontSize: 13.5, lineHeight: 18 },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8, // .08em @ 10
  },
  chip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 6,
    paddingVertical: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  rowChevron: { fontFamily: fonts.mono.bold, fontSize: 14 },
  pressed: { opacity: 0.6 },
  emptyBody: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 13.5,
    lineHeight: 19,
  },
  showMore: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    minHeight: touch.minimum,
    justifyContent: 'center',
  },
  showMoreLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
});
