/**
 * Solar tools panel — the native port of the web Solar tab's list + Pylon
 * hardware card (app/dashboard/_components/SolarTab.tsx + PylonHardwareCard).
 *
 *  • Recent estimates (GET /api/tenant/solar, 50 newest): customer, address,
 *    date, status, headline system kW + net price, routing, STC rebate and —
 *    on flagged rows — the open guardrail checks verbatim. Every figure is
 *    the server's own; nothing is computed here. Each row links out to its
 *    public /q/solar/<token> page (and its Felt editor when one exists).
 *  • Pylon hardware settings (GET/PUT /api/tenant/pylon/settings): nominate
 *    the standard panel / inverter / battery SKUs. Hidden entirely when the
 *    integration is off (404 pylon_disabled), exactly like the web card.
 *  • The Cesium 3D designer stays a web tool — WebOnlyCard link-out.
 *
 * Confirm / re-draft / building switching stay on the web this round.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { openProviderHandoff } from '@/lib/provider-handoff';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, Notice, SectionLabel } from '../ui';
import { LinkOutButton } from '../hub/LinkOut';
import { WebOnlyCard } from '../hub/SectionsContent';
import {
  buildPylonSettingsBody,
  feltStatusLabel,
  formatSolarDate,
  isPylonDisabled,
  pylonSaveErrorMessage,
  pylonSkuInputError,
  SOLAR_STATUS_LABELS,
  solarKwLabel,
  solarMoneyLabel,
  solarRoutingLabel,
  solarStcLabel,
  usePylonSettings,
  useSavePylonSettings,
  useSolarEstimates,
  type SolarEstimate,
} from './solar-api';

/** Rows shown before the first "Show more" — lists here live in a ScrollView,
 *  so pagination is incremental, never a nested list. */
const PAGE_SIZE = 10;

export function SolarTools() {
  return (
    <View style={{ gap: spacing.xl }}>
      <SolarEstimatesCard />
      <PylonHardwareSettingsCard />
      <WebOnlyCard
        label="3D designer is on the web"
        body="Spin the full 3D roof model — satellite imagery, panel layout and the fly-around viewer — in the web dashboard’s Solar tab."
        path="/dashboard?tab=solar"
        cta="Open the solar tab"
      />
    </View>
  );
}

// ── Estimate list ───────────────────────────────────────────────────────────

function StatPair({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statPair}>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ? colors.accentText : colors.textPri }]}>
        {value}
      </Text>
    </View>
  );
}

function EstimateRow({ estimate: e }: { estimate: SolarEstimate }) {
  const { colors } = useTheme();
  const [feltError, setFeltError] = useState<string | null>(null);
  const released = e.status === 'confirmed' || e.status === 'paid';
  const feltUrl = e.feltMapUrl ?? null;
  const meta = [
    formatSolarDate(e.createdAt),
    feltStatusLabel(e.feltStatus),
    e.pylonStage ? `Pylon: ${e.pylonStage}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
    .toUpperCase();

  return (
    <View style={[styles.row, { borderTopColor: colors.inkLine }]}>
      <View style={styles.rowHead}>
        <Text style={[styles.rowName, { color: colors.textPri }]}>
          {e.customerName || 'Customer'}
        </Text>
        <Text
          style={[
            styles.badge,
            {
              color: released ? colors.successBright : colors.warningBright,
              borderColor: released ? colors.successBright : colors.warningBright,
            },
          ]}
        >
          {SOLAR_STATUS_LABELS[e.status].toUpperCase()}
        </Text>
      </View>
      {e.address ? (
        <Text style={[styles.rowAddress, { color: colors.textSec }]}>{e.address}</Text>
      ) : null}
      {meta ? <Text style={[styles.rowMeta, { color: colors.textDim }]}>{meta}</Text> : null}

      <View style={styles.statRow}>
        <StatPair label="SYSTEM" value={solarKwLabel(e.systemKw)} />
        <StatPair label="NET (INC GST)" value={solarMoneyLabel(e.netIncGst)} accent />
        <StatPair label="ROUTING" value={solarRoutingLabel(e.routing)} />
        <StatPair label="STC REBATE" value={solarStcLabel(e.stcRebateAud, e.stcCertificates)} />
      </View>

      {e.status === 'flagged' && e.guardrailFlags.length > 0 ? (
        <View style={[styles.flagBox, { borderColor: colors.warningBright }]}>
          <Text style={[styles.flagTitle, { color: colors.warningBright }]}>
            {`${e.guardrailFlags.length} open check${e.guardrailFlags.length === 1 ? '' : 's'} blocking release`}
          </Text>
          {e.guardrailFlags.map((flag, i) => (
            <Text key={i} style={[styles.flagLine, { color: colors.textSec }]}>
              {flag}
            </Text>
          ))}
          <Text style={[styles.flagHint, { color: colors.textDim }]}>
            Fix the underlying data (rates, STC zone, config) and re-draft on the web dashboard —
            the engine re-prices the estimate and clears any check the fix resolves.
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <LinkOutButton label="View quote" path={`/q/solar/${encodeURIComponent(e.token)}`} />
        {feltUrl ? (
          <LinkOutButton
            label="Open in Felt"
            onPress={() => {
              setFeltError(null);
              void openProviderHandoff(feltUrl, 'felt').catch(error =>
                setFeltError(apiErrorMessage(error)),
              );
            }}
          />
        ) : null}
      </View>
      {feltError ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.errorLine, { color: colors.dangerBright }]}
        >
          {feltError}
        </Text>
      ) : null}
    </View>
  );
}

function SolarEstimatesCard() {
  const { colors } = useTheme();
  const query = useSolarEstimates();
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (query.isPending) return <Notice tone="accent" label="Loading solar estimates…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load solar estimates"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  const estimates = query.data?.estimates ?? [];
  if (estimates.length === 0)
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label="No solar estimates yet"
          body="Share your solar link with a customer from the web dashboard — every estimate they request lands here with its status, system size and net price."
        />
        <LinkOutButton label="Open solar on the web" path="/dashboard?tab=solar" tone="accent" />
      </View>
    );

  const shown = estimates.slice(0, visible);
  const remaining = estimates.length - shown.length;

  return (
    <Card>
      <SectionLabel>{`Solar estimates · ${estimates.length}`}</SectionLabel>
      <Text style={[styles.intro, { color: colors.textDim }]}>
        Your most recent estimates, newest first — every figure exactly as the engine drafted it.
        Review, release and re-draft on the web dashboard.
      </Text>
      {shown.map(e => (
        <EstimateRow key={e.token} estimate={e} />
      ))}
      {remaining > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisible(v => v + PAGE_SIZE)}
          style={styles.textBtn}
          hitSlop={8}
        >
          <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
            {`SHOW MORE (${remaining} MORE)`}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

// ── Pylon hardware settings ─────────────────────────────────────────────────

type SkuKey = 'module' | 'inverter' | 'battery';

const SKU_FIELDS: readonly {
  key: SkuKey;
  wireKey: 'module_sku' | 'inverter_sku' | 'battery_sku';
  label: string;
  hint: string;
}[] = [
  { key: 'module', wireKey: 'module_sku', label: 'Panel SKU', hint: 'Your standard solar module' },
  {
    key: 'inverter',
    wireKey: 'inverter_sku',
    label: 'Inverter SKU',
    hint: 'Your standard inverter',
  },
  {
    key: 'battery',
    wireKey: 'battery_sku',
    label: 'Battery SKU',
    hint: 'Optional — battery add-on',
  },
];

function PylonHardwareSettingsCard() {
  const { colors } = useTheme();
  const query = usePylonSettings();
  const save = useSavePylonSettings();
  const [values, setValues] = useState<Record<SkuKey, string>>({
    module: '',
    inverter: '',
    battery: '',
  });
  const [seeded, setSeeded] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const settings = query.data?.settings;
  useEffect(() => {
    if (seeded || !settings) return;
    setValues({
      module: settings.module_sku ?? '',
      inverter: settings.inverter_sku ?? '',
      battery: settings.battery_sku ?? '',
    });
    setSeeded(true);
  }, [seeded, settings]);

  // Integration off server-side (404 pylon_disabled) → no card, web parity.
  if (query.isError && isPylonDisabled(query.error)) return null;
  if (query.isPending) return <Notice tone="accent" label="Checking Pylon hardware…" />;
  if (query.isError && !query.data)
    return (
      <Notice
        tone="danger"
        label="Could not load your Pylon hardware settings"
        body={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );

  function setField(key: SkuKey, next: string) {
    setValues(v => ({ ...v, [key]: next }));
    setFormError(null);
    if (save.isSuccess || save.isError) save.reset();
  }

  function onSave() {
    // Invalid input never saves — mirror the route's parse, plus the one
    // client-side check (no embedded whitespace) before spending a round-trip.
    for (const f of SKU_FIELDS) {
      const err = pylonSkuInputError(values[f.key]);
      if (err) {
        setFormError(`${f.label}: ${err}`);
        return;
      }
    }
    setFormError(null);
    save.mutate(buildPylonSettingsBody(values.module, values.inverter, values.battery));
  }

  return (
    <Card>
      <SectionLabel>Your standard hardware</SectionLabel>
      <Text style={[styles.intro, { color: colors.textDim }]}>
        Nominate the hardware you install as standard (Pylon component SKUs). Every instant estimate
        then shows the customer the real brand, model and manufacturer datasheet — and your own
        Pylon prices guard against a tier quoted below hardware cost.
      </Text>
      {SKU_FIELDS.map(f => {
        const resolvedName = save.data?.resolved[f.wireKey];
        return (
          <View key={f.key} style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textDim }]}>
              {f.label.toUpperCase()}
            </Text>
            <TextInput
              value={values[f.key]}
              onChangeText={next => setField(f.key, next)}
              placeholder={f.hint}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={f.label}
              style={[
                styles.input,
                { backgroundColor: colors.ink, borderColor: colors.ctlLine, color: colors.textPri },
              ]}
            />
            {resolvedName ? (
              <Text style={[styles.resolvedLine, { color: colors.successBright }]}>
                {`✓ ${resolvedName}`}
              </Text>
            ) : null}
          </View>
        );
      })}
      {formError ? (
        <Text style={[styles.errorLine, { color: colors.warningBright }]}>{formError}</Text>
      ) : null}
      {save.isError ? (
        <Text style={[styles.errorLine, { color: colors.dangerBright }]}>
          {pylonSaveErrorMessage(save.error)}
        </Text>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          disabled={save.isPending}
          style={[styles.saveBtn, { borderColor: colors.accent }, save.isPending && styles.dimmed]}
        >
          <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
            {save.isPending ? 'CHECKING WITH PYLON…' : 'SAVE HARDWARE'}
          </Text>
        </Pressable>
        {save.isSuccess ? (
          <Text style={[styles.statusLine, { color: colors.successBright }]}>
            Saved · SKUs verified
          </Text>
        ) : null}
      </View>
      <Text style={[styles.footHint, { color: colors.textDim }]}>
        Find a SKU in Pylon: open any design’s component, or copy the UUID segment from a datasheet
        URL.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowName: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22, flexShrink: 1 },
  rowAddress: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  rowMeta: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  statPair: { flexBasis: 132, flexGrow: 1, minWidth: 0, maxWidth: '100%' },
  statLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  statValue: {
    marginTop: spacing.xs,
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  flagBox: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: spacing.md,
    gap: spacing.xs,
  },
  flagTitle: { fontFamily: fonts.sans.bold, fontSize: 14, lineHeight: 20 },
  flagLine: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  flagHint: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  actionRow: {
    alignItems: 'stretch',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  textBtn: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  textBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  saveBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
  },
  dimmed: { opacity: 0.5 },
  field: { marginTop: spacing.lg },
  fieldLabel: {
    marginBottom: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.mono.medium,
    fontSize: 16,
  },
  resolvedLine: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  errorLine: {
    marginTop: spacing.sm,
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  statusLine: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  footHint: {
    marginTop: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
});
