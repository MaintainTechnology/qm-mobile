/**
 * Job quoter (spec web-parity F2) — ported from
 * quotemate-automation/app/dashboard/job/_components/JobQuoteForm.tsx.
 *
 * Job type picker → typed field set (job-fields.ts) → POST /api/tenant/job-quote →
 * priced result. The route itself returns only ids (no price — quotemax-domain-reviewer
 * note: never invent one client-side), so the priced total is read back verbatim from
 * `GET /api/tenant/me`'s quotes list once the mutation invalidates it — the one place
 * the pricing book's numbers actually live.
 */
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field, PrimaryCta } from '@/features/auth/ui';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts } from '@/lib/theme';
import { useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { useJobQuote } from './api';
import { fieldsForJobType, formatJobType, jobTypesForTrade } from './job-fields';
import { explainJobQuoteFailure, priceLabel } from './schema';
import { useCatalogue, type CatalogueRow } from '../catalogue-api';
import { apiErrorMessage, Card, MultilineField, Notice, PillGroup, SectionLabel } from '../ui';

export function JobQuoteScreen({ trades }: { trades: string[] }) {
  const { colors } = useTheme();
  const hasElectrical = trades.includes('electrical');
  const hasPlumbing = trades.includes('plumbing');

  const [trade, setTrade] = useState<'electrical' | 'plumbing'>(
    hasElectrical ? 'electrical' : 'plumbing',
  );
  const jobTypes = useMemo(() => jobTypesForTrade(trade), [trade]);
  const [jobType, setJobType] = useState<string>(jobTypes[0] ?? 'other');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [address, setAddress] = useState('');
  const [suburb, setSuburb] = useState('');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [productName, setProductName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const spec = useMemo(() => fieldsForJobType(jobType), [jobType]);
  const catalogue = useCatalogue(!!spec.catalogueCategory);

  function pickTrade(next: 'electrical' | 'plumbing') {
    setTrade(next);
    const first = jobTypesForTrade(next)[0] ?? 'other';
    setJobType(first);
    setAnswers({});
    setProductName('');
  }

  function pickJobType(next: string) {
    setJobType(next);
    setAnswers({});
    setProductName('');
  }

  const products: CatalogueRow[] = useMemo(() => {
    if (!spec.catalogueCategory) return [];
    return (catalogue.data?.catalogue ?? [])
      .filter(c => c.category === spec.catalogueCategory && c.active !== false)
      .sort((a, b) => {
        const pa =
          typeof a.unit_price_ex_gst === 'string'
            ? Number.parseFloat(a.unit_price_ex_gst)
            : a.unit_price_ex_gst;
        const pb =
          typeof b.unit_price_ex_gst === 'string'
            ? Number.parseFloat(b.unit_price_ex_gst)
            : b.unit_price_ex_gst;
        return (
          (Number.isFinite(pa) ? (pa as number) : Infinity) -
          (Number.isFinite(pb) ? (pb as number) : Infinity)
        );
      });
  }, [catalogue.data, spec.catalogueCategory]);

  const chosenProduct = products.find(p => p.name === productName) ?? null;

  const jobQuote = useJobQuote();
  // useJobQuote invalidates TENANT_ME_KEY on success; tenantMe is an active query here so
  // react-query refetches it automatically — no manual refetch effect needed.
  const tenantMe = useTenantMe();

  const pricedQuote = jobQuote.data
    ? tenantMe.data?.quotes.find(q => q.id === jobQuote.data.quoteId)
    : undefined;

  function onSubmit() {
    if (jobQuote.isPending) return;
    setFormError(null);
    if (!address.trim() || !suburb.trim()) {
      setFormError('Address and suburb are required — the estimator prices by location.');
      return;
    }
    const countField = spec.fields.find(f => f.code === 'count');
    if (countField) {
      const raw = (answers.count ?? '').trim();
      const n = Number(raw);
      if (!raw || !Number.isFinite(n) || n <= 0) {
        setFormError('Enter how many — without a count the quote prices a single item.');
        return;
      }
    }
    jobQuote.reset();
    jobQuote.mutate({
      job_type: jobType,
      address: address.trim(),
      suburb: suburb.trim(),
      answers,
      notes: notes.trim(),
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      customer_email: customerEmail.trim(),
      ...(productName ? { product_name: productName } : {}),
      ...(chosenProduct ? { product_id: chosenProduct.id } : {}),
    });
  }

  return (
    <View style={{ gap: 16 }}>
      {hasElectrical && hasPlumbing ? (
        <Card style={{ gap: 10 }}>
          <SectionLabel>Trade</SectionLabel>
          <PillGroup
            options={[
              ['electrical', 'Electrical'],
              ['plumbing', 'Plumbing'],
            ]}
            value={trade}
            onChange={v => pickTrade(v as 'electrical' | 'plumbing')}
          />
        </Card>
      ) : null}

      <Card style={{ gap: 14 }}>
        <SectionLabel>Job type</SectionLabel>
        <PillGroup
          options={jobTypes.map(jt => [jt, formatJobType(jt)] as const)}
          value={jobType}
          onChange={pickJobType}
        />
        {spec.usuallyInspection ? (
          <Text style={[styles.hint, { color: colors.textSec, borderLeftColor: colors.accent }]}>
            This job type has no standard priced assembly, so unless you have added your own it will
            usually come back as an on-site inspection quote rather than a price.
          </Text>
        ) : null}

        {spec.fields.map(f =>
          f.type === 'select' ? (
            <View key={f.code}>
              <Text style={[styles.label, { color: colors.textPri }]}>{f.label.toUpperCase()}</Text>
              <PillGroup
                options={(f.options ?? []).map(o => [o, o] as const)}
                value={answers[f.code] ?? ''}
                onChange={v => setAnswers(a => ({ ...a, [f.code]: v }))}
              />
            </View>
          ) : (
            <Field
              key={f.code}
              label={f.label}
              value={answers[f.code] ?? ''}
              onChangeText={v => setAnswers(a => ({ ...a, [f.code]: v }))}
              height={52}
              keyboardType={f.type === 'number' ? 'number-pad' : undefined}
            />
          ),
        )}

        {spec.catalogueCategory && catalogue.isPending ? (
          <Text style={[styles.hint, { color: colors.textSec, borderLeftColor: colors.accent }]}>
            Loading your catalogue…
          </Text>
        ) : null}

        {spec.catalogueCategory && catalogue.isError ? (
          <Notice
            tone="danger"
            label="Could not load your catalogue"
            body={apiErrorMessage(catalogue.error)}
            onRetry={() => void catalogue.refetch()}
          />
        ) : null}

        {products.length > 0 ? (
          <View>
            <Text style={[styles.label, { color: colors.textPri }]}>
              PRODUCT FROM YOUR CATALOGUE (OPTIONAL)
            </Text>
            <PillGroup
              options={[
                ['', 'Let the estimator choose'],
                ...products.map(
                  p =>
                    [
                      p.name,
                      [p.name, priceLabel(p.unit_price_ex_gst)].filter(Boolean).join(' — '),
                    ] as const,
                ),
              ]}
              value={productName}
              onChange={setProductName}
            />
          </View>
        ) : null}
      </Card>

      <Card style={{ gap: 16 }}>
        <SectionLabel>Where and who</SectionLabel>
        <Field label="Address" value={address} onChangeText={setAddress} required height={54} />
        <Field label="Suburb" value={suburb} onChangeText={setSuburb} required height={54} />
        <MultilineField
          label="Anything else about the job"
          value={notes}
          onChangeText={setNotes}
          placeholder="Access, existing wiring, age of the property — anything that changes the price."
        />
        <Text style={[styles.hint, { color: colors.textSec, borderLeftColor: colors.accent }]}>
          Customer details are optional. Adding them now means sending the quote later is one tap —
          nothing is sent to the customer until you press Send on the quote.
        </Text>
        <Field
          label="Customer name"
          value={customerName}
          onChangeText={setCustomerName}
          height={52}
        />
        <Field
          label="Customer mobile"
          value={customerMobile}
          onChangeText={setCustomerMobile}
          height={52}
          keyboardType="phone-pad"
        />
        <Field
          label="Customer email"
          value={customerEmail}
          onChangeText={setCustomerEmail}
          height={52}
          keyboardType="email-address"
        />
      </Card>

      {formError ? <Notice tone="danger" label="Check the form" body={formError} /> : null}

      <PrimaryCta
        label={jobQuote.isPending ? 'Drafting the quote…' : 'Draft the quote'}
        onPress={onSubmit}
        loading={jobQuote.isPending}
      />

      {jobQuote.isError ? (
        <Notice
          tone="danger"
          label="Could not draft the quote"
          body={explainJobQuoteFailure(jobQuote.error)}
          onRetry={onSubmit}
        />
      ) : null}

      {jobQuote.isSuccess ? (
        pricedQuote ? (
          <Card style={{ gap: 10 }}>
            <SectionLabel>Quote drafted</SectionLabel>
            {jobQuote.data.needsInspection || pricedQuote.total_inc_gst == null ? (
              <Notice
                tone="warn"
                label="Needs an on-site visit"
                body="This job routed to the paid site visit rather than an auto-quote — nothing was invented."
              />
            ) : null}
            <Text style={[styles.priceValue, { color: colors.accentText }]}>
              {pricedQuote.total_inc_gst == null
                ? '—'
                : formatAud(centsFromApiDollars(pricedQuote.total_inc_gst))}
            </Text>
            <Text style={[styles.priceSub, { color: colors.textDim }]}>
              {(pricedQuote.selected_tier ?? 'draft').toUpperCase()} TIER
            </Text>
            <Text style={[styles.priceSub, { color: colors.textDim }]}>
              Approve and send it from the Quotes tab.
            </Text>
          </Card>
        ) : (
          <Notice
            tone="accent"
            label={tenantMe.isFetching ? 'Fetching your priced quote…' : 'Quote drafted'}
            body="It will appear here and in the Quotes tab as soon as it syncs."
            onRetry={() => void tenantMe.refetch()}
          />
        )
      ) : null}
    </View>
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
  priceValue: { fontFamily: fonts.mono.bold, fontSize: 28, fontVariant: ['tabular-nums'] },
  priceSub: { fontFamily: fonts.mono.medium, fontSize: 11, letterSpacing: 0.8 },
});
