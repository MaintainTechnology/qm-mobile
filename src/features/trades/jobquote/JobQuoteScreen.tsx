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
import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Field, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { centsFromApiDollars, formatAud } from '@/lib/money';
import { fonts, spacing, type as typeScale } from '@/lib/theme';
import { useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { useJobQuote, useJobQuoteStatus } from './api';
import {
  allowsPinnedCatalogueProduct,
  fieldsForJobType,
  formatJobType,
  jobTypesForTrade,
  productAfterAnswerChange,
} from './job-fields';
import {
  beginAnotherJobDraft,
  loadDraftAttempt,
  reconcileJobDraft,
  runGuardedJobDraft,
  type DraftAttempt,
  type DraftScope,
} from './draft-attempt';
import { JobAddressField } from './JobAddressField';
import { JobPhotos } from './JobPhotos';
import { jobPhotoPayload, type JobPhoto } from './photos';
import { explainJobQuoteFailure, priceLabel } from './schema';
import { useCatalogue, type CatalogueRow } from '../catalogue-api';
import { apiErrorMessage, Card, MultilineField, Notice, PillGroup, SectionLabel } from '../ui';

export function JobQuoteScreen({ trades }: { trades: string[] }) {
  const { userId } = useAuth();
  const tenantMe = useTenantMe();
  const tenantId = tenantMe.data?.tenant.id;
  if (!userId || !tenantId) return <Notice tone="warn" label="Loading your quoting account…" />;
  if (!trades.some(trade => trade === 'electrical' || trade === 'plumbing')) {
    return <Notice tone="warn" label="Job drafting is unavailable for your enabled trades" />;
  }
  // Tenant/account changes discard all inputs and ignore the old component's async UI work.
  return (
    <JobQuoteForm key={`${userId}:${tenantId}`} trades={trades} scope={{ userId, tenantId }} />
  );
}

export function JobQuoteForm({ trades, scope }: { trades: string[]; scope: DraftScope }) {
  const { colors } = useTheme();
  const router = useRouter();
  const mounted = useRef(true);
  const dispatching = useRef(false);
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
  const [productId, setProductId] = useState('');
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [attempt, setAttempt] = useState<DraftAttempt | null>(null);
  const [attemptLoaded, setAttemptLoaded] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { userId, tenantId } = scope;
  const statusLookup = useJobQuoteStatus();
  const readStatus = statusLookup.mutateAsync;

  useEffect(() => {
    mounted.current = true;
    void loadDraftAttempt({ userId, tenantId })
      .then(async value => {
        if (mounted.current) {
          setAttempt(value);
          setAttemptLoaded(true);
        }
        if (
          value?.operationId &&
          value.status !== 'succeeded' &&
          value.status !== 'failed_no_commit'
        ) {
          try {
            const refreshed = await reconcileJobDraft({ userId, tenantId }, readStatus);
            if (mounted.current) setAttempt(refreshed);
          } catch {
            if (mounted.current)
              setFormError(
                'Status is unavailable. Your previous request remains paused. Refresh status when connected.',
              );
          }
        }
      })
      .catch(() => {
        if (mounted.current)
          setReceiptError(
            'The previous draft status could not be read. Drafting is paused to avoid creating a duplicate.',
          );
      });
    return () => {
      mounted.current = false;
    };
  }, [userId, tenantId, readStatus]);

  const spec = useMemo(() => fieldsForJobType(jobType), [jobType]);
  const productAllowed = allowsPinnedCatalogueProduct(jobType, answers);
  const catalogue = useCatalogue(productAllowed && !!spec.catalogueCategory);

  function pickTrade(next: 'electrical' | 'plumbing') {
    setTrade(next);
    const first = jobTypesForTrade(next)[0] ?? 'other';
    setJobType(first);
    setAnswers({});
    setProductId('');
    setPhotos([]);
  }

  function pickJobType(next: string) {
    setJobType(next);
    setAnswers({});
    setProductId('');
    setPhotos([]);
  }

  function answer(code: string, value: string) {
    setAnswers(current => ({ ...current, [code]: value }));
    setProductId(current => productAfterAnswerChange(jobType, code, value, current));
  }

  const products: CatalogueRow[] = useMemo(() => {
    if (!spec.catalogueCategory || !productAllowed) return [];
    return (catalogue.data?.catalogue ?? [])
      .filter(c => c.category === spec.catalogueCategory && c.active !== false && c.trade === trade)
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
  }, [catalogue.data, spec.catalogueCategory, productAllowed, trade]);

  const chosenProduct = products.find(p => p.id === productId) ?? null;

  const jobQuote = useJobQuote();
  // useJobQuote invalidates TENANT_ME_KEY on success; tenantMe is an active query here so
  // react-query refetches it automatically — no manual refetch effect needed.
  const tenantMe = useTenantMe();

  const completedId =
    attempt?.status === 'succeeded' || attempt?.status === 'quote_available'
      ? attempt.quoteId
      : undefined;
  const pricedQuote = completedId
    ? tenantMe.data?.quotes.find(q => q.id === completedId)
    : undefined;

  async function onSubmit() {
    if (dispatching.current || !attemptLoaded || receiptError || attempt) return;
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
    if (
      notes.trim().length > 4000 ||
      customerName.trim().length > 200 ||
      customerMobile.trim().length > 40 ||
      customerEmail.trim().length > 200
    ) {
      setFormError('Shorten the notes or customer details to fit the supported field limits.');
      return;
    }
    let photoFields: ReturnType<typeof jobPhotoPayload>;
    try {
      photoFields = jobPhotoPayload(jobType === 'ev_charger' ? photos : []);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Check the job photos.');
      return;
    }
    if (productAllowed && productId && !chosenProduct) {
      setFormError(
        'The selected product is no longer available. Choose a current product or let the estimator choose.',
      );
      return;
    }
    dispatching.current = true;
    setAttempt({ status: 'pending' });
    jobQuote.reset();
    const request = {
      job_type: jobType,
      address: address.trim(),
      suburb: suburb.trim(),
      answers: { ...answers },
      notes: notes.trim(),
      customer_name: customerName.trim(),
      customer_mobile: customerMobile.trim(),
      customer_email: customerEmail.trim(),
      ...(productAllowed && chosenProduct
        ? { product_name: chosenProduct.name, product_id: chosenProduct.id }
        : {}),
      ...photoFields,
    };
    try {
      await runGuardedJobDraft(scope, request, jobQuote.mutateAsync);
    } catch (error) {
      if (mounted.current) setFormError(explainJobQuoteFailure(error));
    } finally {
      try {
        const stored = await loadDraftAttempt(scope);
        if (mounted.current) setAttempt(stored);
      } catch {
        if (mounted.current)
          setReceiptError(
            'Draft status could not be confirmed. Check Quotes; another request is paused to avoid a duplicate.',
          );
      }
      dispatching.current = false;
    }
  }

  function reviewDraft() {
    router.push(
      completedId
        ? { pathname: '/(tabs)/quotes', params: { quoteId: completedId } }
        : '/(tabs)/quotes',
    );
  }

  async function refreshDraftStatus() {
    if (dispatching.current || statusLookup.isPending) return;
    try {
      const refreshed = await reconcileJobDraft(scope, readStatus);
      if (mounted.current) {
        setAttempt(refreshed);
        setFormError(null);
      }
    } catch {
      if (mounted.current)
        setFormError(
          'Status is unavailable. The request remains paused; refreshing status will not submit it again.',
        );
    }
  }

  function startAnother() {
    void beginAnotherJobDraft(scope)
      .then(() => {
        if (!mounted.current) return;
        setAnswers({});
        setAddress('');
        setSuburb('');
        setNotes('');
        setCustomerName('');
        setCustomerMobile('');
        setCustomerEmail('');
        setProductId('');
        setPhotos([]);
        setFormError(null);
        jobQuote.reset();
        setAttempt(null);
      })
      .catch(() => {
        if (mounted.current)
          setReceiptError('The previous draft status could not be cleared safely.');
      });
  }

  if (!attemptLoaded || receiptError)
    return (
      <Notice
        tone="warn"
        label="Checking draft status"
        body={receiptError ?? 'Checking for a previous request before drafting another job.'}
      />
    );

  if (attempt)
    return (
      <View style={{ gap: spacing.lg }}>
        {completedId ? (
          <Card style={{ gap: spacing.md }}>
            <SectionLabel>
              {attempt.status === 'succeeded' ? 'Quote drafted' : 'Saved draft available'}
            </SectionLabel>
            {attempt.status === 'quote_available' ? (
              <Notice
                tone="warn"
                label="Draft processing is unconfirmed"
                body="A saved quote is available to review. The full draft process has not been confirmed complete; another request remains paused."
              />
            ) : null}
            {pricedQuote ? (
              <>
                {pricedQuote.needs_inspection || pricedQuote.total_inc_gst == null ? (
                  <Notice
                    tone="warn"
                    label="Review required"
                    body="Check the draft and its inspection requirements before sending."
                  />
                ) : null}
                <Text style={[styles.priceValue, { color: colors.accentText }]}>
                  {pricedQuote.total_inc_gst == null
                    ? 'Awaiting a confirmed price'
                    : formatAud(centsFromApiDollars(pricedQuote.total_inc_gst))}
                </Text>
              </>
            ) : (
              <Notice
                tone="accent"
                label="Loading saved quote details"
                body="Your draft was created. Refresh the saved details or open it for review."
                onRetry={() => void tenantMe.refetch()}
              />
            )}
            {attempt.pinRequested && !attempt.pinned ? (
              <Notice
                tone="warn"
                label="Selected product needs review"
                body="The selected catalogue product was not applied. Check the draft's products and prices."
              />
            ) : null}
            <PrimaryCta label="Review draft" onPress={reviewDraft} />
            {attempt.status === 'succeeded' ? (
              <GhostButton
                label="Start another job"
                disabled={dispatching.current}
                onPress={startAnother}
              />
            ) : (
              <GhostButton
                label={statusLookup.isPending ? 'Checking status…' : 'Refresh draft status'}
                disabled={statusLookup.isPending}
                onPress={() => void refreshDraftStatus()}
              />
            )}
          </Card>
        ) : (
          <>
            <Notice
              tone="warn"
              label={
                jobQuote.isPending
                  ? 'Drafting the quote…'
                  : attempt.status === 'failed_no_commit'
                    ? 'Draft was not saved'
                    : 'Draft status unconfirmed'
              }
              body={
                jobQuote.isPending
                  ? 'Keep this request open while QuoteMax creates the draft. Nothing is sent to the customer.'
                  : attempt.status === 'failed_no_commit'
                    ? 'The server confirmed that this attempt did not create an intake or quote. Start another job to submit a new request.'
                    : 'This request may have created a job. Drafting is paused until its result can be confirmed. Refresh its status or open Quotes to check your saved work; returning here will not submit it again.'
              }
            />
            {!jobQuote.isPending ? (
              <GhostButton label="Check Quotes" onPress={reviewDraft} />
            ) : null}
            {!jobQuote.isPending && attempt.status === 'failed_no_commit' ? (
              <GhostButton label="Start another job" onPress={startAnother} />
            ) : null}
            {!jobQuote.isPending && attempt.operationId && attempt.status !== 'failed_no_commit' ? (
              <GhostButton
                label={statusLookup.isPending ? 'Checking status…' : 'Refresh draft status'}
                disabled={statusLookup.isPending}
                onPress={() => void refreshDraftStatus()}
              />
            ) : null}
            {formError && !jobQuote.isPending ? (
              <Text style={[styles.hint, { color: colors.textSec }]}>{formError}</Text>
            ) : null}
          </>
        )}
      </View>
    );

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.sm }}>
        <Text accessibilityRole="header" style={[typeScale.title, { color: colors.textPri }]}>
          Create a quote
        </Text>
        <Text style={[styles.hint, { color: colors.textSec }]}>
          Set the job scope, then draft using your pricing book.
        </Text>
      </View>
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

      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Job type</SectionLabel>
        <PillGroup
          options={jobTypes.map(jt => [jt, formatJobType(jt)] as const)}
          value={jobType}
          onChange={pickJobType}
        />
        {spec.usuallyInspection ? (
          <Text style={[styles.hint, { color: colors.textSec }]}>
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
                onChange={v => answer(f.code, v)}
              />
            </View>
          ) : (
            <Field
              key={f.code}
              label={f.label}
              value={answers[f.code] ?? ''}
              onChangeText={v => answer(f.code, v)}
              height={52}
              keyboardType={f.type === 'number' ? 'number-pad' : undefined}
            />
          ),
        )}

        {productAllowed && spec.catalogueCategory && catalogue.isPending ? (
          <Text style={[styles.hint, { color: colors.textSec }]}>Loading your catalogue…</Text>
        ) : null}

        {productAllowed && spec.catalogueCategory && catalogue.isError ? (
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
                      p.id,
                      [p.name, priceLabel(p.unit_price_ex_gst)].filter(Boolean).join(' — '),
                    ] as const,
                ),
              ]}
              value={productId}
              onChange={setProductId}
            />
            {chosenProduct ? (
              <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
                {chosenProduct.image_path ? (
                  <Image
                    source={{ uri: chosenProduct.image_path }}
                    contentFit="contain"
                    style={{ height: 180, width: '100%' }}
                    accessibilityLabel={chosenProduct.name}
                  />
                ) : null}
                <Text style={[styles.hint, { color: colors.textPri }]}>{chosenProduct.name}</Text>
                <Text style={[styles.hint, { color: colors.textSec }]}>
                  {[chosenProduct.brand, chosenProduct.range_series].filter(Boolean).join(' · ')}
                </Text>
                <Text style={[styles.hint, { color: colors.textSec }]}>
                  {priceLabel(chosenProduct.unit_price_ex_gst) ?? 'Price unavailable'}
                  {chosenProduct.unit ? ` per ${chosenProduct.unit}` : ''} · Your catalogue
                </Text>
                {chosenProduct.description ? (
                  <Text style={[styles.hint, { color: colors.textSec }]}>
                    {chosenProduct.description}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {jobType === 'ev_charger' && !productAllowed ? (
          <Text style={[styles.hint, { color: colors.textSec }]}>
            A catalogue charger can be selected only when you supply the charger unit.
          </Text>
        ) : null}
      </Card>

      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Property details</SectionLabel>
        <JobAddressField value={address} onChange={setAddress} onSuburb={setSuburb} />
        <Field label="Suburb" value={suburb} onChangeText={setSuburb} required height={54} />
        <MultilineField
          label="Anything else about the job"
          value={notes}
          onChangeText={setNotes}
          placeholder="Access, existing wiring, age of the property — anything that changes the price."
        />
      </Card>

      {jobType === 'ev_charger' ? (
        <JobPhotos
          key={jobType}
          photos={photos}
          setPhotos={setPhotos}
          disabled={jobQuote.isPending}
        />
      ) : null}

      <Card style={{ gap: spacing.xl }}>
        <SectionLabel>Customer details · optional</SectionLabel>
        <Text style={[styles.hint, { color: colors.textSec }]}>
          Add contact details now to make sending easier. Nothing is sent until you review the quote
          and press Send.
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
        onPress={() => void onSubmit()}
        loading={jobQuote.isPending}
        disabled={photos.some(photo => photo.status === 'uploading')}
      />

      {jobQuote.isError ? (
        <Notice
          tone="danger"
          label="Could not draft the quote"
          body={explainJobQuoteFailure(jobQuote.error)}
          onRetry={() => void onSubmit()}
        />
      ) : null}
    </View>
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
  priceValue: { fontFamily: fonts.mono.bold, fontSize: 28, fontVariant: ['tabular-nums'] },
  priceSub: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
});
