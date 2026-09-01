/**
 * Aircon recommender (native) — the web /dashboard/aircon tool at mobile
 * scope. Property form → POST recommend (or POST plan when a floor-plan file
 * is attached, exactly the web's one-button routing) → the deterministic
 * result rendered VERBATIM: sizing working, both system options with their
 * line-item price breakdown, and the book-an-assessment routing. Nothing here
 * computes a price — every number is the engine's, unchanged.
 *
 * Web-only pieces (satellite map, roof tiles, floor-plan overlay SVG) stay on
 * the web; the WebOnlyCard at the bottom links there.
 */
import { useAuth } from '@clerk/expo';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import type { PickedFile } from '@/lib/media';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { buildPlanForm, downloadAirconPdf, useAirconPlan, useAirconRecommend } from './api';
import {
  AREA_SOURCE_LABEL,
  acceptsAirconRun,
  airconRunFingerprint,
  AUS_STATES,
  buildRecommendRequest,
  CEILINGS,
  DEFAULT_FORM,
  FLOOR_AREA_SOURCE_LABEL,
  INSULATIONS,
  newAirconRequestId,
  PLAN_MEDIA_TYPES,
  planFileProblem,
  roomLabels,
  SITUATIONS,
  STOREY_OPTIONS,
  type AcOption,
  type AirconForm,
  type AirconResult,
  type AusState,
  type CeilingHeight,
  type CurrentSituation,
  type Insulation,
  type RoomLoad,
} from './schema';
import { WebOnlyCard } from '../hub/SectionsContent';
import { apiErrorMessage, Card, Notice, PillGroup, SectionLabel } from '../ui';

/** API dollars → displayed AUD. Display conversion only — never arithmetic. */
function aud(dollars: number): string {
  return formatAud(centsFromApiDollars(dollars));
}

export function AirconToolScreen() {
  const { colors } = useTheme();
  const { getToken } = useAuth();

  const [form, setForm] = useState<AirconForm>(DEFAULT_FORM);
  const [planFile, setPlanFile] = useState<PickedFile | null>(null);
  const [planNote, setPlanNote] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<AirconResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const activeFingerprintRef = useRef<string | null>(null);
  const currentFingerprintRef = useRef('');

  currentFingerprintRef.current = airconRunFingerprint(form, planFile);

  useEffect(
    () => () => {
      mountedRef.current = false;
      activeRequestIdRef.current = null;
      activeFingerprintRef.current = null;
    },
    [],
  );

  const recommend = useAirconRecommend();
  const plan = useAirconPlan();
  const busy = recommend.isPending || plan.isPending;
  const runError = recommend.isError ? recommend.error : plan.isError ? plan.error : null;

  function invalidateRun() {
    requestIdRef.current = null;
    activeRequestIdRef.current = null;
    activeFingerprintRef.current = null;
    setResult(null);
    setPdfError(null);
  }

  function update<K extends keyof AirconForm>(key: K, value: AirconForm[K]) {
    invalidateRun();
    setForm(f => ({ ...f, [key]: value }));
  }

  async function pickPlan() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [...PLAN_MEDIA_TYPES],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    if (!asset) return;
    const file: PickedFile = {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType ?? '',
      size: asset.size ?? undefined,
    };
    const problem = planFileProblem(file);
    if (problem) {
      setPlanNote(problem);
      return;
    }
    setPlanNote(null);
    invalidateRun();
    setPlanFile(file);
  }

  function removePlan() {
    invalidateRun();
    setPlanFile(null);
    setPlanNote(null);
  }

  function onSubmit() {
    if (busy || result) return;
    setPdfError(null);
    const requestId = requestIdRef.current ?? newAirconRequestId();
    requestIdRef.current = requestId;
    const built = buildRecommendRequest(form, requestId);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    setFormError(null);
    recommend.reset();
    plan.reset();
    const fingerprint = airconRunFingerprint(form, planFile);
    activeRequestIdRef.current = requestId;
    activeFingerprintRef.current = fingerprint;
    const accept = (data: AirconResult) => {
      if (
        acceptsAirconRun({
          mounted: mountedRef.current,
          activeRequestId: activeRequestIdRef.current,
          activeFingerprint: activeFingerprintRef.current,
          responseRequestId: data.request_id,
          currentFingerprint: currentFingerprintRef.current,
        })
      ) {
        setResult(data);
      }
    };
    // Web parity: one button — an attached plan routes to the vision pipeline.
    if (planFile) plan.mutate(buildPlanForm(built.body, planFile), { onSuccess: accept });
    else recommend.mutate(built.body, { onSuccess: accept });
  }

  async function savePdf() {
    if (!result || result.recommendation.pricing_status !== 'priced' || !result.saved || pdfBusy)
      return;
    setPdfBusy(true);
    setPdfError(null);
    requestIdRef.current = null;
    activeRequestIdRef.current = null;
    activeFingerprintRef.current = null;
    try {
      await downloadAirconPdf({
        recommendationId: result.saved.id,
        token: (await getToken()) ?? undefined,
      });
    } catch (error) {
      setPdfError(
        apiErrorMessage(error, 'Could not generate the PDF. Check your signal and try again.'),
      );
    } finally {
      setPdfBusy(false);
    }
  }

  function startAgain() {
    setResult(null);
    setForm(DEFAULT_FORM);
    setPlanFile(null);
    setPlanNote(null);
    setFormError(null);
    setPdfError(null);
    recommend.reset();
    plan.reset();
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <Card style={{ gap: spacing.lg }}>
        <SectionLabel>Property</SectionLabel>
        <Field
          label="Address"
          value={form.address}
          onChangeText={v => update('address', v)}
          required
          height={54}
          autoCapitalize="words"
        />
        <Field
          label="Postcode"
          value={form.postcode}
          onChangeText={v => update('postcode', v)}
          required
          height={52}
          keyboardType="number-pad"
        />
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>STATE</Text>
          <PillGroup
            options={AUS_STATES.map(s => [s, s] as const)}
            value={form.state}
            onChange={v => update('state', v as AusState)}
          />
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SectionLabel>Rooms &amp; levels</SectionLabel>
        <Field
          label="Bedrooms"
          value={form.bedrooms}
          onChangeText={v => update('bedrooms', v)}
          height={52}
          keyboardType="number-pad"
        />
        <Field
          label="Bathrooms"
          value={form.bathrooms}
          onChangeText={v => update('bathrooms', v)}
          height={52}
          keyboardType="number-pad"
        />
        <Field
          label="Living spaces"
          value={form.livingSpaces}
          onChangeText={v => update('livingSpaces', v)}
          height={52}
          keyboardType="number-pad"
        />
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>STOREYS / LEVELS</Text>
          <PillGroup
            options={STOREY_OPTIONS}
            value={form.storeys}
            onChange={v => update('storeys', v)}
          />
        </View>
        <Field
          label="Floor area m²"
          value={form.floorArea}
          onChangeText={v => update('floorArea', v)}
          height={52}
          keyboardType="decimal-pad"
          hint="Blank = satellite"
        />
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>CEILING HEIGHT</Text>
          <PillGroup
            options={CEILINGS}
            value={form.ceiling}
            onChange={v => update('ceiling', v as CeilingHeight)}
          />
        </View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SectionLabel>Conditions &amp; budget</SectionLabel>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>INSULATION</Text>
          <PillGroup
            options={INSULATIONS}
            value={form.insulation}
            onChange={v => update('insulation', v as Insulation)}
          />
        </View>
        <View>
          <Text style={[styles.label, { color: colors.textPri }]}>CURRENT SITUATION</Text>
          <PillGroup
            options={SITUATIONS}
            value={form.situation}
            onChange={v => update('situation', v as CurrentSituation)}
          />
        </View>
        <Field
          label="Budget (optional)"
          value={form.budget}
          onChangeText={v => update('budget', v)}
          height={52}
          keyboardType="decimal-pad"
          prefix="$"
        />
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SectionLabel>Floor plan (optional)</SectionLabel>
        <Text style={[styles.hint, { color: colors.textSec }]}>
          Real rooms beat estimates — attach a PDF or photo of any plan and the rooms and areas are
          read off the drawing. Reading a full plan can take a minute or two.
        </Text>
        {planFile ? (
          <View style={styles.attachRow}>
            <Text style={[styles.attachName, { color: colors.textPri }]} numberOfLines={2}>
              {planFile.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={removePlan}
              style={styles.textBtn}
              hitSlop={8}
            >
              <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>REMOVE</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickPlan()}
            style={[styles.borderedBtn, { borderColor: colors.ctlLine }]}
          >
            <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>ATTACH A PLAN</Text>
          </Pressable>
        )}
        {planNote ? (
          <Text style={[styles.warnLine, { color: colors.warningBright }]}>{planNote}</Text>
        ) : null}
      </Card>

      {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}

      <PrimaryCta
        label={busy ? (planFile ? 'Reading the plan…' : 'Calculating…') : 'Get recommendation'}
        onPress={onSubmit}
        loading={busy}
        disabled={result !== null}
      />

      {runError != null ? (
        <Notice
          tone="danger"
          label="Could not size this job"
          body={apiErrorMessage(runError)}
          onRetry={onSubmit}
        />
      ) : null}

      {result ? (
        <>
          <LocationCard result={result} />
          <SizingCard result={result} />
          {result.plan ? <PlanCard plan={result.plan} /> : null}
          {result.recommendation.pricing_status === 'priced' ? (
            <View style={{ gap: spacing.lg }}>
              {result.recommendation.options.map(option => (
                <OptionCardView
                  key={option.system_type}
                  option={option}
                  rooms={result.recommendation.sizing.rooms}
                />
              ))}
            </View>
          ) : (
            <AirconPricingRequiredCard
              setupReason={result.recommendation.pricing_setup_reason}
              routingReason={result.recommendation.routing.reason}
            />
          )}
          <Card style={{ gap: spacing.md }}>
            <SectionLabel>Next step</SectionLabel>
            <Text style={[styles.nextTitle, { color: colors.textPri }]}>
              BOOK A SITE ASSESSMENT
            </Text>
            <Text style={[styles.body, { color: colors.textSec }]}>
              {result.recommendation.routing.reason}
            </Text>
            {result.recommendation.pricing_status === 'priced' && result.saved ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void savePdf()}
                disabled={pdfBusy}
                style={[
                  styles.borderedBtn,
                  { borderColor: colors.ctlLine },
                  pdfBusy && styles.dimmed,
                ]}
              >
                <Text style={[styles.textBtnLabel, { color: colors.textPri }]}>
                  {pdfBusy ? 'PREPARING PDF…' : 'SAVE PDF'}
                </Text>
              </Pressable>
            ) : null}
            {pdfError ? (
              <Notice
                tone="danger"
                label="Could not save the PDF"
                body={pdfError}
                onRetry={() => void savePdf()}
              />
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={startAgain}
              style={styles.textBtn}
              hitSlop={8}
            >
              <Text style={[styles.textBtnLabel, { color: colors.textDim }]}>
                START A NEW RECOMMENDATION
              </Text>
            </Pressable>
          </Card>
        </>
      ) : null}

      <WebOnlyCard
        label="Satellite map & plan overlay are on the web"
        body="The web recommender adds the Google satellite view, roof tiles and the ducted/split layout drawn over your floor plan. Results match this tool."
        path="/dashboard/aircon"
        cta="Open the aircon recommender"
      />
    </View>
  );
}

// ── Result cards (everything rendered verbatim from the response) ───────────

function Chip({ label, accent }: { label: string; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        styles.chip,
        {
          color: accent ? colors.accentText : colors.textSec,
          borderColor: accent ? colors.accent : colors.inkLine,
        },
      ]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, { color: colors.textPri }]}>{value}</Text>
    </View>
  );
}

function Bullets({ lines, warn }: { lines: string[]; warn?: boolean }) {
  const { colors } = useTheme();
  if (lines.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {lines.map(line => (
        <Text
          key={line}
          style={[styles.noteLine, { color: warn ? colors.warningBright : colors.textSec }]}
        >
          {'· '}
          {line}
        </Text>
      ))}
    </View>
  );
}

function LocationCard({ result }: { result: AirconResult }) {
  const { colors } = useTheme();
  const { geocode, weather, building } = result.location;
  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>Property evidence</SectionLabel>
      {geocode.ok ? (
        <Text style={[styles.addressLine, { color: colors.textPri }]}>
          {geocode.formatted_address ?? 'Address resolved'}
        </Text>
      ) : (
        <Text style={[styles.body, { color: colors.textSec }]}>
          Address could not be pinpointed — satellite evidence unavailable.
        </Text>
      )}
      <View style={styles.chipRow}>
        {weather.ok && weather.temperature_c != null ? (
          <Chip
            label={`Now ${weather.temperature_c}°C${weather.condition ? ` · ${weather.condition}` : ''}`}
          />
        ) : null}
        {weather.ok && weather.feels_like_c != null ? (
          <Chip label={`Feels like ${weather.feels_like_c}°C`} />
        ) : null}
        {weather.ok && weather.humidity_pct != null ? (
          <Chip label={`${weather.humidity_pct}% humidity`} />
        ) : null}
        {building.ok && building.footprint_m2 != null ? (
          <Chip label={`Roof footprint ${building.footprint_m2} m²`} accent />
        ) : null}
        {building.ok && building.estimated_floor_area_m2 != null ? (
          <Chip
            label={`≈ ${building.estimated_floor_area_m2} m² over ${building.storeys_assumed ?? 1} level${building.storeys_assumed === 1 ? '' : 's'}`}
            accent
          />
        ) : null}
      </View>
      <Bullets lines={result.location.notes} />
    </Card>
  );
}

function SizingCard({ result }: { result: AirconResult }) {
  const { colors } = useTheme();
  const sizing = result.recommendation.sizing;
  const labels = roomLabels(sizing.rooms);
  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>Volumetric sizing</SectionLabel>
      <View style={{ gap: spacing.xs }}>
        <StatRow label="Connected load" value={`${sizing.connected_kw} kW`} />
        <StatRow label="Conditioned air" value={`${sizing.total_volume_m3} m³`} />
        <StatRow label="Floor area" value={`${sizing.total_floor_area_m2} m²`} />
        <StatRow label="Zones" value={`${sizing.conditioned_zones}`} />
        <StatRow label={sizing.storeys === 1 ? 'Storey' : 'Storeys'} value={`${sizing.storeys}`} />
        <StatRow
          label={`Climate · ${sizing.confidence} confidence`}
          value={result.climate_zone.toUpperCase()}
        />
      </View>
      <View style={styles.chipRow}>
        <Chip
          label={FLOOR_AREA_SOURCE_LABEL[sizing.floor_area_source]}
          accent={sizing.floor_area_source !== 'typical_room_mix'}
        />
      </View>
      <Text style={[styles.noteLine, { color: colors.textDim }]}>
        {`kW = m³ × ${sizing.volumetric_factor_kw_m3} (${result.climate_zone}) × room type × insulation × storeys`}
      </Text>
      <Text style={[styles.body, { color: colors.textSec }]}>{result.climate_note}</Text>

      <View style={[styles.tableWrap, { borderTopColor: colors.inkLine }]}>
        {sizing.rooms.map((room: RoomLoad, i: number) => (
          <RoomMetrics
            key={`${labels[i] ?? i}`}
            label={labels[i] ?? `Room ${i + 1}`}
            area={room.area_m2}
            volume={room.volume_m3}
            load={room.kw}
          />
        ))}
        <RoomMetrics
          label="Total"
          isTotal
          area={sizing.total_floor_area_m2}
          volume={sizing.total_volume_m3}
          load={sizing.connected_kw}
        />
      </View>

      <Bullets lines={sizing.notes} />
      <Bullets lines={sizing.warnings} warn />
    </Card>
  );
}

function RoomMetrics({
  label,
  area,
  volume,
  load,
  isTotal = false,
}: {
  label: string;
  area: number;
  volume: number;
  load: number;
  isTotal?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.roomRow,
        isTotal && { borderTopWidth: 1, borderTopColor: colors.inkLine, paddingTop: spacing.lg },
      ]}
    >
      <Text style={[styles.roomName, isTotal && styles.bold, { color: colors.textPri }]}>
        {label}
      </Text>
      <View style={styles.roomMetrics}>
        <View style={styles.roomMetric}>
          <Text style={[styles.roomMetricLabel, { color: colors.textDim }]}>AREA</Text>
          <Text
            style={[styles.roomMetricValue, isTotal && styles.boldNum, { color: colors.textPri }]}
          >
            {area} m²
          </Text>
        </View>
        <View style={styles.roomMetric}>
          <Text style={[styles.roomMetricLabel, { color: colors.textDim }]}>VOLUME</Text>
          <Text
            style={[styles.roomMetricValue, isTotal && styles.boldNum, { color: colors.textPri }]}
          >
            {volume} m³
          </Text>
        </View>
        <View style={styles.roomMetric}>
          <Text style={[styles.roomMetricLabel, { color: colors.textDim }]}>LOAD</Text>
          <Text
            style={[
              styles.roomMetricValue,
              isTotal && styles.boldNum,
              { color: isTotal ? colors.accentText : colors.textPri },
            ]}
          >
            {load} kW
          </Text>
        </View>
      </View>
    </View>
  );
}

function PlanCard({ plan }: { plan: NonNullable<AirconResult['plan']> }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>{`Plan read · page ${plan.page}`}</SectionLabel>
      <Text style={[styles.addressLine, { color: colors.textPri }]} numberOfLines={2}>
        {plan.filename}
      </Text>
      <View style={styles.chipRow}>
        <Chip label={plan.dimensioned ? 'dimensioned' : 'no printed dimensions'} />
        <Chip label={`${plan.total_area_m2} m² total`} />
        {plan.stated_total_area_m2 != null ? (
          <Chip label={`plan states ${plan.stated_total_area_m2} m²`} />
        ) : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        {plan.rooms.map(room => (
          <View key={room.name}>
            <Text style={[styles.roomName, { color: colors.textPri }]}>{room.name}</Text>
            <Text style={[styles.roomMeta, { color: colors.textDim }]}>
              {[
                room.room_type,
                room.load_type ? `conditioned · ${room.load_type}` : 'not conditioned',
                `${room.area_m2} m²`,
                AREA_SOURCE_LABEL[room.area_source],
              ]
                .join(' · ')
                .toUpperCase()}
            </Text>
          </View>
        ))}
      </View>
      <Bullets lines={[plan.overall_note, ...plan.notes].filter((n): n is string => !!n)} />
      <Bullets lines={plan.warnings} warn />
    </Card>
  );
}

export function AirconPricingRequiredCard({
  setupReason,
  routingReason,
}: {
  setupReason: string;
  routingReason: string;
}) {
  return (
    <Card style={{ gap: spacing.md }}>
      <Notice tone="warn" label="Price needed" body={`${setupReason} ${routingReason}`} />
      <WebOnlyCard
        label="Set up air-conditioning pricing"
        body="Complete your tenant rate card before presenting or saving a customer price. Book the site visit to confirm sizing and access."
        path="/dashboard?tab=pricing"
        cta="Open pricing setup"
      />
    </Card>
  );
}

export function OptionCardView({ option, rooms }: { option: AcOption; rooms: RoomLoad[] }) {
  const { colors } = useTheme();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const p = option.pricing;
  return (
    <Card style={[{ gap: spacing.md }, option.best_fit ? { borderColor: colors.accent } : null]}>
      <View style={styles.optionHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.optionKw, { color: colors.textDim }]}>
            {`${option.capacity_kw} KW SYSTEM`}
          </Text>
          <Text style={[styles.optionTitle, { color: colors.textPri }]}>
            {option.system_type.toUpperCase()}
          </Text>
        </View>
        {option.best_fit ? <Chip label="Best fit" accent /> : null}
      </View>

      <View style={styles.priceRange}>
        <View style={styles.priceBound}>
          <Text style={[styles.priceSub, { color: colors.textDim }]}>FROM</Text>
          <Text style={[styles.priceBig, { color: colors.textPri }]}>{aud(option.price.low)}</Text>
        </View>
        <View style={styles.priceBound}>
          <Text style={[styles.priceSub, { color: colors.textDim }]}>TO</Text>
          <Text style={[styles.priceBig, { color: colors.textPri }]}>{aud(option.price.high)}</Text>
        </View>
      </View>
      <Text style={[styles.priceSub, { color: colors.textDim }]}>
        {`${p.gst_registered ? 'INC GST' : 'NO GST CHARGED'} · INDICATIVE · POINT ${aud(p.point_estimate_inc_gst)} ±${p.confidence_band_pct}%`}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showBreakdown }}
        onPress={() => setShowBreakdown(v => !v)}
        style={styles.textBtn}
        hitSlop={8}
      >
        <Text style={[styles.textBtnLabel, { color: colors.accentText }]}>
          {showBreakdown ? 'HIDE THE PRICE WORKING ↑' : 'HOW THIS PRICE WAS CALCULATED ↓'}
        </Text>
      </Pressable>

      {showBreakdown ? (
        <View style={[styles.breakdown, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.roomMeta, { color: colors.textDim }]}>{p.formula}</Text>
          {p.components.map(c => (
            <View key={c.label} style={styles.compRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.noteLine, { color: colors.textPri }]}>{c.label}</Text>
                {c.note ? (
                  <Text style={[styles.roomMeta, { color: colors.textDim }]}>{c.note}</Text>
                ) : null}
                <Text style={[styles.roomMeta, { color: colors.textSec }]}>
                  {`${c.quantity} ${c.unit}${c.rate_ex_gst > 0 ? ` × ${aud(c.rate_ex_gst)}` : ''}`}
                </Text>
              </View>
              <Text style={[styles.compTotal, { color: colors.textPri }]}>
                {aud(c.total_ex_gst)}
              </Text>
            </View>
          ))}
          {p.adjustments.map(a => (
            <View key={a.label} style={styles.compRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.noteLine, { color: colors.textSec }]}>{a.label}</Text>
                {a.note ? (
                  <Text style={[styles.roomMeta, { color: colors.textDim }]}>{a.note}</Text>
                ) : null}
                {a.unit === '%' ? (
                  <Text style={[styles.roomMeta, { color: colors.textSec }]}>
                    {`${a.quantity}%`}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.compTotal, { color: colors.textSec }]}>
                {a.total_ex_gst < 0
                  ? `−${aud(Math.abs(a.total_ex_gst))}`
                  : `+${aud(a.total_ex_gst)}`}
              </Text>
            </View>
          ))}
          <View style={styles.compRow}>
            <Text style={[styles.noteLine, styles.bold, { flex: 1, color: colors.textPri }]}>
              POINT ESTIMATE EX GST
            </Text>
            <Text style={[styles.compTotal, styles.boldNum, { color: colors.textPri }]}>
              {aud(p.point_estimate_ex_gst)}
            </Text>
          </View>
          <View style={styles.compRow}>
            <Text style={[styles.noteLine, styles.bold, { flex: 1, color: colors.textPri }]}>
              {p.gst_registered ? 'POINT ESTIMATE INC GST' : 'NO GST CHARGED'}
            </Text>
            <Text style={[styles.compTotal, styles.boldNum, { color: colors.accentText }]}>
              {aud(p.point_estimate_inc_gst)}
            </Text>
          </View>
          <Text style={[styles.roomMeta, { color: colors.textDim }]}>{p.band_reason}</Text>
          <Text style={[styles.roomMeta, { color: colors.textDim }]}>
            {`SIZED FROM ${rooms.length} CONDITIONED ${rooms.length === 1 ? 'ZONE' : 'ZONES'} · LAYOUT SCHEMATIC ON THE WEB`}
          </Text>
        </View>
      ) : null}

      <Bullets lines={option.pros} />
    </Card>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  hint: {
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  body: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attachName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.sans.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  warnLine: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  textBtn: {
    minHeight: touch.minimum,
    minWidth: touch.minimum,
    maxWidth: '100%',
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  textBtnLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  borderedBtn: {
    minHeight: touch.minimum,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dimmed: { opacity: 0.5 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statLabel: {
    flexShrink: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  statValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  noteLine: { fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 20 },
  addressLine: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 19 },
  tableWrap: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md },
  roomRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  roomName: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  roomMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  roomMetric: { flexGrow: 1, flexBasis: 72, minWidth: 0, gap: spacing.xs },
  roomMetricLabel: {
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  roomMetricValue: {
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  bold: { fontFamily: fonts.sans.bold },
  boldNum: { fontFamily: fonts.mono.bold },
  roomMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  optionHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  optionKw: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  optionTitle: {
    marginTop: 2,
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  priceBig: {
    fontFamily: fonts.mono.bold,
    fontSize: 20,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  priceRange: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  priceBound: { flexGrow: 1, flexBasis: 132, gap: spacing.xs },
  priceSub: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18, letterSpacing: 0.4 },
  breakdown: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  compRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: spacing.md },
  compTotal: {
    fontFamily: fonts.mono.medium,
    fontSize: 14,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  nextTitle: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
