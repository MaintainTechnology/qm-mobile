/**
 * Services & brands — the native editor mirroring the web ServicesTab in trade-hub mode
 * (quotemate-automation app/dashboard/page.tsx:7093-7834):
 *   • enable/disable switches on shared + custom services (PATCH /api/tenant/me maps, live for
 *     every hub trade — that route is not trade-gated),
 *   • preferred-brand pills per material category ('No preference' clears with null),
 *   • custom-service create/edit/delete — CREATE is server-gated to electrical/plumbing
 *     (CustomServiceSchema TRADE_ENUM), so non-writable trades get gatedWriteCopy + a web
 *     link instead of the form. Edits omit `trade` so the [id] PATCH never trips that gate,
 *     and custom rows only exist on writable trades anyway.
 * Money renders via centsFromApiDollars + formatAud and submits as plain wire dollars.
 */
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { apiDollarsFromCents, centsFromApiDollars, formatAud, parseAud } from '@/lib/money';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useTenantMe, type ServiceRow } from '@/lib/tenant';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { useTheme } from '@/lib/useTheme';

import { apiErrorMessage, Card, MultilineField, Notice, PillGroup, SectionLabel } from '../../ui';
import { LinkOutButton } from '../LinkOut';
import { TRADE_LABELS, type HubTrade } from '../sections';
import { canWritePricingEngine, gatedWriteCopy } from '../write-gate';
import {
  isDuplicateName,
  serviceExtras,
  serviceKey,
  useCreateCustomService,
  useDeleteCustomService,
  usePatchTenantMe,
  useUpdateCustomService,
  type CustomServiceFields,
} from './services-api';

type FormState = { mode: 'create' } | { mode: 'edit'; row: ServiceRow };

export function ServicesSection({ trade }: { trade: HubTrade }) {
  const { colors } = useTheme();
  const me = useTenantMe();
  const patchMe = usePatchTenantMe();
  const deleteService = useDeleteCustomService();
  const [form, setForm] = useState<FormState | null>(null);

  if (me.isPending) return <Notice tone="accent" label="Loading services…" />;
  if (me.isError && !me.data)
    return (
      <Notice
        tone="danger"
        label="Could not load services"
        body={apiErrorMessage(me.error)}
        onRetry={() => void me.refetch()}
      />
    );

  const canWrite = canWritePricingEngine(trade);
  const services = (me.data?.services ?? []).filter(s => (s.trade ?? '').toLowerCase() === trade);
  const brandRows = (me.data?.material_categories ?? []).filter(
    c => (c.trade ?? '').toLowerCase() === trade,
  );
  const preferences = me.data?.material_preferences ?? {};
  const enabledCount = services.filter(s => s.enabled !== false).length;

  if (!canWrite && services.length === 0 && brandRows.length === 0) {
    return (
      <View style={{ gap: spacing.md }}>
        <Notice
          tone="accent"
          label="No services listed yet"
          body="Turn services on or off from the web dashboard's Services & brands section."
        />
        <LinkOutButton
          label="Open services on the web"
          path={`/dashboard?tab=hub-${trade}`}
          tone="accent"
        />
      </View>
    );
  }

  const toggle = (row: ServiceRow) => {
    const key = serviceKey(row);
    if (!key) return;
    const next = row.enabled === false;
    patchMe.mutate(
      serviceExtras(row).isCustom
        ? { custom_services: { [key]: next } }
        : { services: { [key]: next } },
    );
  };

  const confirmDelete = (row: ServiceRow) => {
    const key = serviceKey(row);
    if (!key) return;
    Alert.alert(
      'Delete this service?',
      `"${row.name ?? 'This service'}" will no longer be auto-quoted — customers asking about it fall back to your A$99 paid inspection.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteService.mutate({ id: key }) },
      ],
    );
  };

  return (
    <View style={{ gap: spacing.xl }}>
      {patchMe.isError || deleteService.isError ? (
        <Notice
          tone="danger"
          label="That change didn't save"
          body={apiErrorMessage(patchMe.isError ? patchMe.error : deleteService.error)}
        />
      ) : null}

      <Card>
        <SectionLabel>{`Auto-quote services · ${enabledCount} of ${services.length} on`}</SectionLabel>
        <Text style={[styles.blurb, { color: colors.textSec }]}>
          {
            "Tick the work your AI can auto-quote. Unticked services still get inspections — they just won't auto-draft a price."
          }
        </Text>

        {form ? (
          <CustomServiceForm
            key={form.mode === 'edit' ? (serviceKey(form.row) ?? 'edit') : 'create'}
            trade={trade}
            initial={form.mode === 'edit' ? form.row : null}
            onClose={() => setForm(null)}
          />
        ) : canWrite ? (
          <ActionButton label="+ Add custom service" onPress={() => setForm({ mode: 'create' })} />
        ) : null}

        {services.length === 0 ? (
          <Notice
            tone="warn"
            label="No services for this trade yet"
            body={
              canWrite
                ? 'Add a custom service above, or load the catalogue on the web dashboard.'
                : "This trade has no shared catalogue yet — its pricing lives in the trade's tool settings."
            }
          />
        ) : (
          services.map((row, i) => (
            <ServiceToggleRow
              key={serviceKey(row) ?? `svc-${i}`}
              row={row}
              onToggle={() => toggle(row)}
              onEdit={() => setForm({ mode: 'edit', row })}
              onDelete={() => confirmDelete(row)}
            />
          ))
        )}

        {!canWrite ? (
          <View style={styles.gateBlock}>
            <Text style={[styles.blurb, { color: colors.textDim }]}>
              {gatedWriteCopy(TRADE_LABELS[trade])}
            </Text>
            <LinkOutButton label="Manage on the web" path={`/dashboard?tab=hub-${trade}`} />
          </View>
        ) : null}
      </Card>

      {brandRows.length > 0 ? (
        <Card>
          <SectionLabel>Preferred brands</SectionLabel>
          <Text style={[styles.blurb, { color: colors.textSec }]}>
            {
              "Your AI quote draft will lean toward these brands when the customer's tier and specs allow. Soft hint — never starves a quote."
            }
          </Text>
          {brandRows.map((c, i) => {
            const category = c.category;
            if (!category) return null;
            const brands = c.brands ?? [];
            const current = preferences[category] ?? '';
            const options: [string, string][] = [
              ['', 'No preference'],
              ...brands.map((b): [string, string] => [b, b]),
            ];
            return (
              <View key={category ?? `cat-${i}`} style={styles.brandBlock}>
                <Text style={[styles.brandLabel, { color: colors.textPri }]}>
                  {categoryLabel(category)}
                </Text>
                <PillGroup
                  options={options}
                  value={current}
                  onChange={next => {
                    if (next === current) return;
                    patchMe.mutate({
                      material_preferences: { [category]: next === '' ? null : next },
                    });
                  }}
                />
              </View>
            );
          })}
        </Card>
      ) : null}
    </View>
  );
}

// ── Service row ─────────────────────────────────────────────────────────────

export function servicePriceLabel(price: number, unit: string | null | undefined): string {
  return `${formatAud(centsFromApiDollars(price))}${unit ? ` / ${unit}` : ''} · ex GST`;
}

function ServiceToggleRow({
  row,
  onToggle,
  onEdit,
  onDelete,
}: {
  row: ServiceRow;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const extras = serviceExtras(row);
  const enabled = row.enabled !== false;
  const price = row.default_unit_price_ex_gst;
  const meta = [
    price != null ? servicePriceLabel(price, row.default_unit) : null,
    extras.labourHours != null && extras.labourHours > 0 ? `${extras.labourHours}h labour` : null,
    extras.alwaysInspection ? 'Inspection only' : null,
    extras.isCustom ? 'Custom' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <View style={[styles.row, { borderBottomColor: colors.inkLine }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.rowName, { color: enabled ? colors.textPri : colors.textSec }]}
          numberOfLines={2}
        >
          {row.name ?? '—'}
        </Text>
        {meta ? (
          <Text style={[styles.rowMeta, { color: colors.textDim }]}>{meta.toUpperCase()}</Text>
        ) : null}
        {extras.isCustom ? (
          <View style={styles.rowActions}>
            <ActionButton label="Edit" onPress={onEdit} />
            <ActionButton label="Delete" tone="danger" onPress={onDelete} />
          </View>
        ) : null}
      </View>
      <ThemedSwitch
        accessibilityLabel={`${row.name ?? 'Service'} — ${enabled ? 'on, tap to turn off' : 'off, tap to turn on'}`}
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.inkLine, true: colors.accent }}
        thumbColor={colors.inkCard}
      />
    </View>
  );
}

// ── Custom-service form (create + edit) ─────────────────────────────────────
// Same field set the web CustomServiceForm submits (page.tsx:8064-8145), minus the grounding
// category (omitted → auto-detect on create, unchanged on edit) — validation copy verbatim.

function CustomServiceForm({
  trade,
  initial,
  onClose,
}: {
  trade: HubTrade;
  initial: ServiceRow | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const create = useCreateCustomService();
  const update = useUpdateCustomService();
  const editingId = initial ? serviceKey(initial) : null;
  const extras = initial ? serviceExtras(initial) : null;

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [unit, setUnit] = useState(initial?.default_unit ?? 'each');
  const [priceStr, setPriceStr] = useState(
    initial?.default_unit_price_ex_gst != null ? String(initial.default_unit_price_ex_gst) : '',
  );
  const [hoursStr, setHoursStr] = useState(
    extras?.labourHours != null ? String(extras.labourHours) : '',
  );
  const [exclusions, setExclusions] = useState(extras?.exclusions ?? '');
  const [alwaysInspection, setAlwaysInspection] = useState(extras?.alwaysInspection ?? false);
  const [formError, setFormError] = useState<string | null>(null);

  const busy = create.isPending || update.isPending;

  const submit = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setFormError('Service name must be at least 2 characters.');
      return;
    }
    const priceCents = parseAud(priceStr);
    if (priceCents == null || priceCents < 0) {
      setFormError('Default price must be a positive number.');
      return;
    }
    const hours = hoursStr.trim() === '' ? 0 : Number(hoursStr);
    if (!Number.isFinite(hours) || hours < 0 || hours > 80) {
      setFormError('Labour hours must be a number between 0 and 80.');
      return;
    }
    setFormError(null);
    const fields: CustomServiceFields = {
      name: trimmedName,
      description: description.trim(),
      default_unit: unit.trim() || 'each',
      default_unit_price_ex_gst: apiDollarsFromCents(priceCents),
      default_labour_hours: hours,
      default_exclusions: exclusions.trim(),
      always_inspection: alwaysInspection,
    };
    const onError = (error: unknown) =>
      setFormError(
        isDuplicateName(error)
          ? 'You already have a service with this name — pick a different one.'
          : apiErrorMessage(error),
      );
    if (editingId) update.mutate({ id: editingId, ...fields }, { onSuccess: onClose, onError });
    else create.mutate({ trade, ...fields }, { onSuccess: onClose, onError });
  };

  return (
    <View style={styles.form}>
      <SectionLabel>
        {editingId ? 'Edit custom service' : `New custom service · ${TRADE_LABELS[trade]}`}
      </SectionLabel>
      <Field
        label="Service name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Install pool light"
        maxLength={120}
      />
      <MultilineField
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Mount, terminate, test on existing circuit"
      />
      <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="each" maxLength={30} />
      <Field
        label="Default unit price (ex GST)"
        value={priceStr}
        onChangeText={setPriceStr}
        placeholder="80.00"
        keyboardType="decimal-pad"
      />
      <Field
        label="Default labour hours"
        value={hoursStr}
        onChangeText={setHoursStr}
        placeholder="2.0"
        keyboardType="decimal-pad"
      />
      <MultilineField
        label="Excludes"
        value={exclusions}
        onChangeText={setExclusions}
        placeholder="Excludes new wiring runs and ceiling repair"
      />
      <View style={styles.inspectRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.inspectTitle, { color: colors.textPri }]}>
            Always route to paid inspection
          </Text>
          <Text style={[styles.inspectHint, { color: colors.textDim }]}>
            The AI never auto-quotes this service — customers asking about it get the A$99 paid
            inspection instead.
          </Text>
        </View>
        <ThemedSwitch
          accessibilityLabel="Always route to paid inspection"
          value={alwaysInspection}
          onValueChange={setAlwaysInspection}
          trackColor={{ false: colors.inkLine, true: colors.accent }}
          thumbColor={colors.inkCard}
        />
      </View>
      {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}
      <View style={styles.formActions}>
        <ActionButton label="Cancel" onPress={onClose} />
        <ActionButton
          tone="accent"
          label={busy ? 'Saving…' : editingId ? 'Save changes' : 'Add service'}
          onPress={submit}
          disabled={busy}
        />
      </View>
    </View>
  );
}

// ── Local form primitives ───────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'decimal-pad';
  maxLength?: number;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={[styles.fieldLabel, { color: colors.textPri }]}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        keyboardType={keyboardType}
        maxLength={maxLength}
        selectionColor={colors.accentSoft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: colors.ink,
            borderColor: focused ? colors.accentSoft : colors.ctlLine,
            color: colors.textPri,
          },
        ]}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  tone = 'quiet',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'accent' | 'quiet' | 'danger';
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const accent = tone === 'accent';
  const textColor =
    tone === 'accent' ? colors.accentInk : tone === 'danger' ? colors.dangerBright : colors.textPri;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          opacity: disabled ? 0.5 : 1,
          minHeight: accent ? touch.primaryCta : touch.minimum,
          borderColor: accent
            ? colors.accent
            : tone === 'danger'
              ? colors.dangerBright
              : colors.ctlLine,
          backgroundColor: accent
            ? pressed
              ? colors.accentPress
              : colors.accent
            : pressed
              ? colors.ink
              : 'transparent',
        },
      ]}
    >
      <Text style={[styles.actionLabel, { color: textColor }]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

/** Web categoryLabel (page.tsx:7835-7857), verbatim map + the same title-case fallback. */
function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    downlight: 'Downlights',
    gpo: 'Power points (GPOs)',
    smoke_alarm: 'Smoke alarms',
    safety_switch: 'Safety switches',
    ceiling_fan: 'Ceiling fans',
    outdoor_light: 'Outdoor lights',
    hws_electric: 'Hot water — electric',
    hws_gas: 'Hot water — gas',
    hws_heat_pump: 'Hot water — heat pump',
    tapware_basin: 'Tapware — basin / bath',
    tapware_kitchen: 'Tapware — kitchen',
    tapware_laundry: 'Tapware — laundry',
    tapware_outdoor: 'Tapware — outdoor',
    toilet: 'Toilet suites',
    toilet_repair: 'Toilet repair parts',
    sundries: 'Sundries',
  };
  return labels[category] ?? category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

const styles = StyleSheet.create({
  blurb: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touch.listRow,
    borderBottomWidth: 1,
  },
  rowName: { fontFamily: fonts.sans.semiBold, fontSize: 16, lineHeight: 22 },
  rowMeta: {
    marginTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.4,
  },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  gateBlock: { marginTop: spacing.md, gap: spacing.md },
  brandBlock: { paddingVertical: spacing.lg, gap: spacing.md },
  brandLabel: { fontFamily: fonts.sans.semiBold, fontSize: 16, lineHeight: 22 },
  form: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.xl },
  fieldLabel: {
    marginBottom: spacing.sm,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 1.2,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
  },
  inspectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touch.listRow,
  },
  inspectTitle: { fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 20 },
  inspectHint: {
    marginTop: spacing.xs,
    fontFamily: fonts.sans.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionBtn: {
    minHeight: touch.minimum,
    maxWidth: '100%',
    flexShrink: 1,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
