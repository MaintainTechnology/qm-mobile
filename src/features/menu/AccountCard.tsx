/**
 * G1 — read-only account summary: business name, owner, email, trades, state, AI line number.
 */
import { StyleSheet, Text, View } from 'react-native';

import { tenantTrades, type TenantMe } from '@/lib/tenant';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';

import { CardBox } from './CardChrome';

/** `+61468048422` → `0468 048 422` (mobile-style grouping) or `03 9999 8888` (8-digit landline) —
 *  the au-conventions "display back in local form" rule. Display-only, so it stays local rather
 *  than growing `@/lib/money` for a single caller. */
function localAuNumber(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  const national = digits.startsWith('61') ? digits.slice(2) : digits;
  if (national.length !== 9) return e164;
  const withZero = `0${national}`;
  return national.startsWith('4')
    ? `${withZero.slice(0, 4)} ${withZero.slice(4, 7)} ${withZero.slice(7)}`
    : `${withZero.slice(0, 2)} ${withZero.slice(2, 6)} ${withZero.slice(6)}`;
}

const TRADE_LABELS: Record<string, string> = {
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  roofing: 'Roofing',
  painting: 'Painting',
};

export function AccountCard({ me }: { me: TenantMe }) {
  const { colors } = useTheme();
  const trades = tenantTrades(me);

  const rows: { label: string; value: string }[] = [
    { label: 'Business', value: me.tenant.business_name ?? '—' },
    { label: 'Owner', value: me.tenant.owner_first_name ?? me.tenant.contact_name ?? '—' },
    { label: 'Email', value: me.tenant.owner_email ?? '—' },
    {
      label: 'Trades',
      value: trades.length > 0 ? trades.map(t => TRADE_LABELS[t] ?? t).join(', ') : '—',
    },
    { label: 'State', value: me.tenant.state ?? '—' },
    {
      label: 'AI line',
      value: me.tenant.twilio_sms_number
        ? localAuNumber(me.tenant.twilio_sms_number)
        : 'Not provisioned',
    },
  ];

  return (
    <CardBox title="BUSINESS DETAILS">
      {rows.map(row => (
        <View key={row.label} style={[styles.row, { borderTopColor: colors.inkLine }]}>
          <Text style={[styles.label, { color: colors.textDim }]}>{row.label.toUpperCase()}</Text>
          <Text
            selectable
            style={[
              styles.value,
              { color: colors.textPri },
              row.label === 'AI line' ? styles.phone : null,
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </CardBox>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    width: 76,
    paddingTop: 2,
    fontFamily: fonts.mono.semiBold,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.5,
  },
  value: { flex: 1, minWidth: 0, fontFamily: fonts.sans.semiBold, fontSize: 14, lineHeight: 22 },
  phone: { fontFamily: fonts.mono.regular, fontVariant: ['tabular-nums'] },
});
