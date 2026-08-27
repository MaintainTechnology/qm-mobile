/**
 * Account — business identity, contact details and licences, as the web
 * Account tab shows them. The summary card owns its own field rendering; the
 * deeper editors (logo/photo upload, password) stay web-side and link out.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { AccountCard } from '@/features/menu/AccountCard';
import { CardBox, CardHint, RetryLine } from '@/features/menu/CardChrome';
import { WebOnlyCard } from '@/features/trades/hub/SectionsContent';
import { apiErrorMessage } from '@/lib/api';
import { authenticate, isLockAvailable, isLockEnabled, setLockEnabled } from '@/lib/lock';
import { fonts, spacing } from '@/lib/theme';
import { isTenantMissing, useTenantMe } from '@/lib/tenant';
import { useTheme } from '@/lib/useTheme';

import { SectionScreen } from './SectionScreen';

/** Device-local, so it renders regardless of how the tenant fetch is going. */
function SecurityCard() {
  const { colors } = useTheme();
  // null = still asking the hardware; the switch stays disabled until it answers.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [canLock, isOn] = await Promise.all([isLockAvailable(), isLockEnabled()]);
      if (cancelled) return;
      setAvailable(canLock);
      setEnabled(isOn);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      // One proving round-trip before the flag can ever lock the tradie out.
      if (next && !(await authenticate())) return;
      await setLockEnabled(next);
      setEnabled(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <CardBox title="SECURITY">
      <View style={securityStyles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[securityStyles.label, { color: colors.textPri }]}>Biometric lock</Text>
          <CardHint>
            {available === false
              ? 'Set up Face ID or fingerprint in your device settings first.'
              : 'Ask for Face ID or fingerprint when you come back to the app.'}
          </CardHint>
        </View>
        <Switch
          accessibilityLabel="Biometric lock"
          value={enabled}
          disabled={available !== true || busy}
          onValueChange={next => void onToggle(next)}
          trackColor={{ false: colors.inkLine, true: colors.accent }}
        />
      </View>
    </CardBox>
  );
}

const securityStyles = StyleSheet.create({
  row: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  label: { fontFamily: fonts.sans.bold, fontSize: 14.5 },
});

export function AccountScreen() {
  const { colors } = useTheme();
  const me = useTenantMe();

  return (
    <SectionScreen
      title="Account"
      subtitle="Your business as customers see it on quotes and the customer page."
      refreshing={me.isFetching}
      onRefresh={() => void me.refetch()}
    >
      {me.isPending ? (
        <CardBox title="ACCOUNT">
          <ActivityIndicator color={colors.accent} />
        </CardBox>
      ) : me.isError && !me.data && !isTenantMissing(me.error) ? (
        <CardBox title="ACCOUNT">
          <RetryLine message={apiErrorMessage(me.error)} onRetry={() => void me.refetch()} />
        </CardBox>
      ) : me.data ? (
        <View style={{ gap: spacing.lg }}>
          <AccountCard me={me.data} />
          <WebOnlyCard
            label="Logo, photo & licences"
            body="Upload your logo and photo, edit licences and change your password on the web dashboard."
            path="/dashboard?tab=account"
            cta="Open account on the web"
          />
        </View>
      ) : null}
      <SecurityCard />
    </SectionScreen>
  );
}
