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
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import type { PickedFile } from '@/lib/media';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { buildPlanForm, downloadAirconPdf, useAirconPlan, useAirconRecommend } from './api';
import {
  AREA_SOURCE_LABEL,
  AUS_STATES,
  buildRecommendRequest,
  CEILINGS,
  DEFAULT_FORM,
  FLOOR_AREA_SOURCE_LABEL,
  INSULATIONS,
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

  const recommend = useAirconRecommend();
  const plan = useAirconPlan();
  const busy = recommend.isPending || plan.isPending;
  const runError = recommend.isError ? recommend.error : plan.isError ? plan.error : null;

  function update<K extends keyof AirconForm>(key: K, value: AirconForm[K]) {
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
    setPlanFile(file);
  }

  function onSubmit() {
    if (busy) return;
    setPdfError(null);
    const built = buildRecommendRequest(form);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    setFormError(null);
    recommend.reset();
    plan.reset();
    // Web parity: one button — an attached plan routes to the vision pipeline.
    if (planFile) plan.mutate(buildPlanForm(built.body, planFile), { onSuccess: setResult });
    else recommend.mutate(built.body, { onSuccess: setResult });
  }

  async function savePdf() {
    if (!result || result.recommendation.pricing_status !== 'priced' || !result.saved || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
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
        <Text style={[styles.hint, { color: colors.textSec, borderLeftColor: colors.accent }]}>
          Real rooms beat estimates — attach a PDF or photo of any plan and the rooms and areas are
          read off the drawing. Reading a full plan can take a minute or two.
        </Text>
        {planFile ? (
          <View style={styles.attachRow}>
            <Text
              style={[styles.attachName, { color: colors.textPri }]}
              numberOfLines={1}
            >
              {planFile.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPlanFile(null)}
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
                style={[styles.borderedBtn, { borderColor: colors.ctlLine }, pdfBusy && styles.dimmed]}
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
        <View style={styles.tableRow}>
          <Text style={[styles.thName, { color: colors.textDim }]}>ROOM</Text>
          <Text style={[styles.thNum, { color: colors.textDim }]}>M²</Text>
          <Text style={[styles.thNum, { color: colors.textDim }]}>M³</Text>
          <Text style={[styles.thNum, { color: colors.textDim }]}>KW</Text>
        </View>
        {sizing.rooms.map((room: RoomLoad, i: number) => (
          <View key={`${labels[i] ?? i}`} style={styles.tableRow}>
            <Text style={[styles.tdName, { color: colors.textPri }]} numberOfLines={1}>
              {labels[i]}
            </Text>
            <Text style={[styles.tdNum, { color: colors.textSec }]}>{room.area_m2}</Text>
            <Text style={[styles.tdNum, { color: colors.textSec }]}>{room.volume_m3}</Text>
            <Text style={[styles.tdNum, { color: colors.textSec }]}>{room.kw}</Text>
          </View>
        ))}
        <View style={styles.tableRow}>
          <Text style={[styles.tdName, styles.bold, { color: colors.textPri }]}>TOTAL</Text>
          <Text style={[styles.tdNum, styles.boldNum, { color: colors.textPri }]}>
            {sizing.total_floor_area_m2}
          </Text>
          <Text style={[styles.tdNum, styles.boldNum, { color: colors.textPri }]}>
            {sizing.total_volume_m3}
          </Text>
          <Text style={[styles.tdNum, styles.boldNum, { color: colors.accentText }]}>
            {sizing.connected_kw}
          </Text>
        </View>
      </View>

      <Bullets lines={sizing.notes} />
      <Bullets lines={sizing.warnings} warn />
    </Card>
  );
}

function PlanCard({ plan }: { plan: NonNullable<AirconResult['plan']> }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: spacing.md }}>
      <SectionLabel>{`Plan read · page ${plan.page}`}</SectionLabel>
      <Text style={[styles.addressLine, { color: colors.textPri }]} numberOfLines={1}>
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
            <Text style={[styles.tdName, { color: colors.textPri }]}>{room.name}</Text>
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
      <Notice
        tone="warn"
        label="Price needed"
        body={`${setupReason} ${routingReason}`}
      />
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
    <Card
      style={[{ gap: spacing.md }, option.best_fit ? { borderColor: colors.accent } : null]}
    >
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

      <Text style={[styles.priceBig, { color: colors.textPri }]}>
        {`${aud(option.price.low)} – ${aud(option.price.high)}`}
      </Text>
      <Text style={[styles.priceSub, { color: colors.textDim }]}>
        {`${p.gst_registered ? 'INC GST' : 'NO GST CHARGED'} · INDICATIVE · POINT ${aud(p.point_estimate_inc_gst)} ±${p.confidence_band_pct}%`}
      </Text>

      <Pressable
        accessibilityRole="button"
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
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  hint: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    fontFamily: fonts.sans.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  body: { fontFamily: fonts.sans.regular, fontSize: 13.5, lineHeight: 20 },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  attachName: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 13.5 },
  warnLine: {
    fontFamily: fonts.sans.bold,
    fontSize: 11,
    letterSpacing: 0.4,
    lineHeight: 15,
  },
  textBtn: { minHeight: touch.minimum, alignSelf: 'flex-start', justifyContent: 'center' },
  textBtnLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 11,
    letterSpacing: 0.88, // .08em @ 11
  },
  borderedBtn: {
    minHeight: touch.minimum,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
  },
  dimmed: { opacity: 0.5 },
  chip: {
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontFamily: fonts.mono.semiBold,
    fontSize: 9,
    letterSpacing: 0.72, // .08em @ 9
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statLabel: {
    flexShrink: 1,
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  statValue: {
    fontFamily: fonts.mono.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  noteLine: { fontFamily: fonts.sans.regular, fontSize: 12.5, lineHeight: 18 },
  addressLine: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 19 },
  tableWrap: { borderTopWidth: 1, paddingTop: spacing.sm, gap: spacing.xs },
  tableRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  thName: { flex: 1, fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  thNum: {
    width: 56,
    textAlign: 'right',
    fontFamily: fonts.mono.semiBold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  tdName: { flex: 1, fontFamily: fonts.sans.regular, fontSize: 13 },
  tdNum: {
    width: 56,
    textAlign: 'right',
    fontFamily: fonts.mono.medium,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  bold: { fontFamily: fonts.sans.bold },
  boldNum: { fontFamily: fonts.mono.bold },
  roomMeta: {
    fontFamily: fonts.mono.medium,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.5,
  },
  optionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  optionKw: { fontFamily: fonts.mono.semiBold, fontSize: 10, letterSpacing: 0.8 },
  optionTitle: {
    marginTop: 2,
    fontFamily: fonts.sans.extraBold,
    fontSize: 20,
    letterSpacing: -0.2,
  },
  priceBig: {
    fontFamily: fonts.mono.bold,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
  },
  priceSub: { fontFamily: fonts.mono.medium, fontSize: 10, letterSpacing: 0.8 },
  breakdown: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.sm },
  compRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  compTotal: {
    fontFamily: fonts.mono.medium,
    fontSize: 12.5,
    fontVariant: ['tabular-nums'],
  },
  nextTitle: {
    fontFamily: fonts.sans.extraBold,
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
