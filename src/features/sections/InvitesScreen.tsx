/**
 * Marketing — the web marketing page + invite codes at mobile scope:
 *   QR codes  → GET/POST/PATCH /api/dashboard/marketing/qr (list, create,
 *               pause/resume; share the public /s/{code} link natively; the
 *               PNG endpoint is deliberately auth-free so Share can carry it)
 *   Codes     → GET/POST /api/dashboard/invites/codes (+ send via email/SMS)
 * No money on any of these wires — only counts.
 */
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { apiUrl } from '@/lib/env';
import { apiErrorMessage } from '@/lib/api';
import { fonts, radius, spacing, touch } from '@/lib/theme';
import { useApiMutation, useApiQuery } from '@/lib/useApi';
import { useTheme } from '@/lib/useTheme';

import { Notice, PillGroup } from '../trades/ui';
import { SectionEmpty, SectionGroup, SectionLoading, SectionScreen } from './SectionScreen';

const QR_KEY = ['marketing', 'qr'] as const;
const CODES_KEY = ['marketing', 'codes'] as const;

const QrSchema = z.looseObject({
  id: z.string(),
  short_code: z.string(),
  label: z.string().nullish(),
  destination_type: z.enum(['sms', 'landing', 'signup']).nullish(),
  status: z.enum(['active', 'paused', 'archived']).nullish(),
  scan_count: z.number().nullish(),
});
type Qr = z.infer<typeof QrSchema>;

const QrListSchema = z.looseObject({
  qrs: z.array(QrSchema).default([]),
  slug: z.string().nullish(),
});

const CodeSchema = z.looseObject({
  id: z.string(),
  code: z.string(),
  campaign: z.string().nullish(),
  quota_total: z.number().nullish(),
  quota_used: z.number().nullish(),
  status: z.enum(['active', 'paused', 'revoked']).nullish(),
});
type Code = z.infer<typeof CodeSchema>;

const CodesSchema = z.looseObject({ codes: z.array(CodeSchema).default([]) });
const OkSchema = z.looseObject({ ok: z.literal(true) });
const NewCodeSchema = z.looseObject({ ok: z.literal(true), code: z.string() });

const DEST_LABELS: Record<string, string> = {
  sms: 'Text me a quote',
  landing: 'Landing page',
  signup: 'Signup',
};

function QrRow({ qr }: { qr: Qr }) {
  const { colors } = useTheme();
  const patch = useApiMutation(
    (vars: { id: string; status: 'active' | 'paused' }) => `/api/dashboard/marketing/qr/${vars.id}`,
    OkSchema,
    { method: 'PATCH', invalidates: [QR_KEY] },
  );
  const paused = qr.status === 'paused';
  const shareUrl = apiUrl(`/s/${qr.short_code}`);
  return (
    <View style={[styles.row, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={{ minWidth: 0, gap: spacing.xs }}>
        <Text style={[styles.rowTitle, { color: colors.textPri }]} numberOfLines={2}>
          {qr.label ?? qr.short_code}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.textDim }]}>
          {DEST_LABELS[qr.destination_type ?? '']?.toUpperCase() ?? ''} · {qr.scan_count ?? 0} SCANS
          · {(qr.status ?? 'active').toUpperCase()}
        </Text>
        {patch.isError ? (
          <Text style={[styles.rowMeta, { color: colors.dangerBright }]}>
            {apiErrorMessage(patch.error)}
          </Text>
        ) : null}
      </View>
      <View style={[styles.rowActions, { borderTopColor: colors.inkLine }]}>
        <SmallBtn
          label="Share"
          expand
          onPress={() =>
            void Share.share({
              message: `${shareUrl}\nQR image: ${apiUrl(`/api/dashboard/marketing/qr/${qr.id}/image?format=png`)}`,
            })
          }
        />
        <SmallBtn
          label={paused ? 'Resume' : 'Pause'}
          expand
          disabled={patch.isPending}
          onPress={() => patch.mutate({ id: qr.id, status: paused ? 'active' : 'paused' })}
        />
      </View>
    </View>
  );
}

function CodeRow({ code }: { code: Code }) {
  const { colors } = useTheme();
  const [recipient, setRecipient] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const send = useApiMutation(
    (vars: { id: string; channel: 'sms' | 'email'; to: string }) =>
      `/api/dashboard/invites/codes/${vars.id}/send`,
    OkSchema,
    {
      timeoutMs: 30000,
      onSuccess: () => {
        setNote('Sent ✓');
        setSendOpen(false);
        setRecipient('');
      },
      onError: err => setNote(apiErrorMessage(err)),
    },
  );
  return (
    <View style={[styles.row, { borderColor: colors.inkLine, backgroundColor: colors.inkCard }]}>
      <View style={{ minWidth: 0, gap: spacing.xs }}>
        <Text style={[styles.codeText, { color: colors.textPri }]}>{code.code}</Text>
        <Text style={[styles.rowMeta, { color: colors.textDim }]}>
          {code.campaign?.toUpperCase() ?? ''} · USED {code.quota_used ?? 0}/{code.quota_total ?? 0}{' '}
          · {(code.status ?? 'active').toUpperCase()}
        </Text>
      </View>
      <View style={[styles.rowActions, { borderTopColor: colors.inkLine }]}>
        <SmallBtn
          label="Share"
          expand
          onPress={() => void Share.share({ message: apiUrl(`/signup?code=${code.code}`) })}
        />
        <SmallBtn label={sendOpen ? 'Close' : 'Send'} expand onPress={() => setSendOpen(v => !v)} />
      </View>
      {sendOpen ? (
        <View style={[styles.sendForm, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSec }]}>RECIPIENT</Text>
          <TextInput
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Mobile or email…"
            placeholderTextColor={colors.textDim}
            autoCapitalize="none"
            accessibilityLabel="Invite recipient"
            style={[
              styles.input,
              { borderColor: colors.ctlLine, backgroundColor: colors.ink, color: colors.textPri },
            ]}
          />
          <View style={styles.sendActions}>
            <SmallBtn
              label="Send SMS"
              primary
              expand
              disabled={send.isPending || recipient.trim().length === 0}
              onPress={() => send.mutate({ id: code.id, channel: 'sms', to: recipient.trim() })}
            />
            <SmallBtn
              label="Send email"
              expand
              disabled={send.isPending || recipient.trim().length === 0}
              onPress={() => send.mutate({ id: code.id, channel: 'email', to: recipient.trim() })}
            />
          </View>
        </View>
      ) : null}
      {note ? <Text style={[styles.rowMeta, { color: colors.textSec }]}>{note}</Text> : null}
    </View>
  );
}

function SmallBtn({
  label,
  onPress,
  primary = false,
  disabled = false,
  expand = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  expand?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallBtn,
        expand && styles.expand,
        primary && styles.primaryBtn,
        {
          opacity: disabled ? 0.45 : 1,
          borderColor: primary ? colors.accent : colors.ctlLine,
          backgroundColor: primary
            ? pressed
              ? colors.accentPress
              : colors.accent
            : pressed
              ? colors.ink
              : 'transparent',
        },
      ]}
    >
      <Text style={[styles.smallBtnText, { color: primary ? colors.accentInk : colors.textPri }]}>
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

export function InvitesScreen() {
  const { colors } = useTheme();
  const qrs = useApiQuery(QR_KEY, '/api/dashboard/marketing/qr', QrListSchema);
  const codes = useApiQuery(CODES_KEY, '/api/dashboard/invites/codes', CodesSchema);

  const [qrLabel, setQrLabel] = useState('');
  const [qrDest, setQrDest] = useState<'sms' | 'landing'>('sms');
  const [qrNote, setQrNote] = useState<string | null>(null);
  const createQr = useApiMutation('/api/dashboard/marketing/qr', OkSchema, {
    invalidates: [QR_KEY],
    onSuccess: () => {
      setQrLabel('');
      setQrNote('QR created ✓');
    },
    onError: err => setQrNote(apiErrorMessage(err)),
  });

  const [campaign, setCampaign] = useState('');
  const [codeNote, setCodeNote] = useState<string | null>(null);
  const createCode = useApiMutation<
    { campaign: string; quota_total: number },
    z.infer<typeof NewCodeSchema>
  >('/api/dashboard/invites/codes', NewCodeSchema, {
    invalidates: [CODES_KEY],
    onSuccess: result => {
      setCampaign('');
      setCodeNote(`Code ${result.code} created ✓`);
    },
    onError: err => setCodeNote(apiErrorMessage(err)),
  });

  const activeQrs = (qrs.data?.qrs ?? []).filter(
    q => q.destination_type !== 'signup' && q.status !== 'archived',
  );
  const codeRows = codes.data?.codes ?? [];

  return (
    <SectionScreen
      title="Marketing"
      subtitle="QR codes and invite codes that bring the work to your AI line."
      refreshing={qrs.isFetching || codes.isFetching}
      onRefresh={() => {
        void qrs.refetch();
        void codes.refetch();
      }}
    >
      {qrs.data?.slug ? (
        <View
          style={[styles.landingPage, { borderColor: colors.inkLine, backgroundColor: colors.ink }]}
        >
          <Text style={[styles.fieldLabel, { color: colors.textDim }]}>YOUR LANDING PAGE</Text>
          <Text selectable style={[styles.slug, { color: colors.textPri }]}>
            {apiUrl(`/t/${qrs.data.slug}`)}
          </Text>
        </View>
      ) : null}

      <SectionGroup title="QR codes" count={activeQrs.length}>
        {qrs.isPending ? (
          <SectionLoading label="Loading QR codes" />
        ) : qrs.isError && !qrs.data ? (
          <Notice
            tone="danger"
            label="Could not load QR codes"
            body={apiErrorMessage(qrs.error)}
            onRetry={() => void qrs.refetch()}
          />
        ) : (
          <>
            {activeQrs.length === 0 ? (
              <SectionEmpty
                title="Create your first QR code"
                body="Add a code to your ute or printed materials so customers can reach you."
              />
            ) : null}
            {activeQrs.map(qr => (
              <QrRow key={qr.id} qr={qr} />
            ))}
            <View
              style={[
                styles.form,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <Text
                accessibilityRole="header"
                style={[styles.formTitle, { color: colors.textPri }]}
              >
                NEW QR CODE
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.textSec }]}>LABEL</Text>
              <TextInput
                value={qrLabel}
                onChangeText={v => setQrLabel(v.slice(0, 60))}
                placeholder="e.g. Ute rear window"
                placeholderTextColor={colors.textDim}
                accessibilityLabel="QR label"
                style={[
                  styles.input,
                  {
                    borderColor: colors.ctlLine,
                    backgroundColor: colors.ink,
                    color: colors.textPri,
                  },
                ]}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSec }]}>DESTINATION</Text>
              <PillGroup
                options={[
                  ['sms', 'Text me a quote'],
                  ['landing', 'Landing page'],
                ]}
                value={qrDest}
                onChange={v => setQrDest(v as 'sms' | 'landing')}
              />
              <SmallBtn
                label={createQr.isPending ? 'Creating…' : 'Create QR'}
                primary
                disabled={qrLabel.trim().length === 0 || createQr.isPending}
                onPress={() => {
                  setQrNote(null);
                  createQr.mutate({ label: qrLabel.trim(), destination_type: qrDest });
                }}
              />
              {qrNote ? (
                <Text style={[styles.rowMeta, { color: colors.textSec }]}>{qrNote}</Text>
              ) : null}
            </View>
          </>
        )}
      </SectionGroup>

      <SectionGroup title="Invite codes" count={codeRows.length}>
        {codes.isPending ? (
          <SectionLoading label="Loading invite codes" />
        ) : codes.isError && !codes.data ? (
          <Notice
            tone="danger"
            label="Could not load invite codes"
            body={apiErrorMessage(codes.error)}
            onRetry={() => void codes.refetch()}
          />
        ) : (
          <>
            {codeRows.length === 0 ? (
              <SectionEmpty
                title="No invite codes yet"
                body="Create a code for a campaign, then share it or send it to a customer."
              />
            ) : null}
            {codeRows.map(code => (
              <CodeRow key={code.id} code={code} />
            ))}
            <View
              style={[
                styles.form,
                { borderColor: colors.inkLine, backgroundColor: colors.inkCard },
              ]}
            >
              <Text
                accessibilityRole="header"
                style={[styles.formTitle, { color: colors.textPri }]}
              >
                NEW INVITE CODE
              </Text>
              <Text style={[styles.fieldLabel, { color: colors.textSec }]}>CAMPAIGN</Text>
              <TextInput
                value={campaign}
                onChangeText={v => setCampaign(v.slice(0, 40))}
                placeholder="e.g. winter-mailout"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
                accessibilityLabel="Campaign name"
                style={[
                  styles.input,
                  {
                    borderColor: colors.ctlLine,
                    backgroundColor: colors.ink,
                    color: colors.textPri,
                  },
                ]}
              />
              <SmallBtn
                label={createCode.isPending ? 'Creating…' : 'Create code'}
                disabled={campaign.trim().length === 0 || createCode.isPending}
                onPress={() => {
                  setCodeNote(null);
                  createCode.mutate({ campaign: campaign.trim(), quota_total: 100 });
                }}
              />
              {codeNote ? (
                <Text style={[styles.rowMeta, { color: colors.textSec }]}>{codeNote}</Text>
              ) : null}
            </View>
          </>
        )}
      </SectionGroup>
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  formTitle: { fontFamily: fonts.sans.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 },
  fieldLabel: { fontFamily: fonts.mono.semiBold, fontSize: 12, lineHeight: 18, letterSpacing: 0.6 },
  landingPage: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  slug: { fontFamily: fonts.mono.medium, fontSize: 12, lineHeight: 18 },
  row: {
    gap: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.lg,
  },
  rowTitle: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
  rowMeta: { fontFamily: fonts.mono.regular, fontSize: 12, lineHeight: 18, letterSpacing: 0.2 },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderTopWidth: 1,
    paddingTop: spacing.md,
  },
  sendForm: { borderTopWidth: 1, paddingTop: spacing.lg, gap: spacing.md },
  sendActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  codeText: { fontFamily: fonts.mono.bold, fontSize: 18, lineHeight: 26, letterSpacing: 0.5 },
  form: {
    borderWidth: 1,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  input: {
    minHeight: touch.minimum,
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  smallBtn: {
    minHeight: touch.minimum,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.control,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  expand: { flex: 1, minWidth: 104 },
  primaryBtn: { minHeight: touch.primaryCta },
  smallBtnText: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
