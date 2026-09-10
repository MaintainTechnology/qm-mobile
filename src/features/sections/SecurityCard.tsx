import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { CardBox, CardHint, RetryLine } from '@/features/menu/CardChrome';
import { authenticate, isLockAvailable, isLockEnabled, setLockEnabled } from '@/lib/lock';
import { fonts, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
class LockPreferenceError extends Error {}

/** The lock is a device preference; failed storage never becomes a false Off. */
export function SecurityCard() {
  const { colors } = useTheme();
  const mounted = useRef(false);
  const running = useRef(false);
  const [state, setState] = useState({ loaded: false, available: false, enabled: false, busy: false, error: null as string | null });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    mounted.current = true; let cancelled = false;
    running.current = true;
    setState(previous => ({ ...previous, loaded: false, busy: true, error: null }));
    void Promise.all([isLockAvailable(), isLockEnabled()]).then(([available, enabled]) => {
      if (!cancelled) setState({ loaded: true, available, enabled, busy: false, error: null });
    }).catch(() => {
      if (!cancelled) setState(previous => ({ ...previous, loaded: false, busy: false, error: 'Could not read the lock setting on this device. Check it again.' }));
    }).finally(() => { if (!cancelled) running.current = false; });
    return () => { cancelled = true; mounted.current = false; };
  }, [reload]);

  async function onToggle(next: boolean) {
    if (!mounted.current || running.current || !state.loaded || next === state.enabled) return;
    running.current = true;
    setState(previous => ({ ...previous, busy: true, error: null }));
    let dispatched = false;
    try {
      if (next) {
        if (!(await isLockAvailable())) throw new LockPreferenceError('Set up Face ID or fingerprint in device settings before enabling the lock.');
        if (!mounted.current || !(await authenticate())) return;
        // Enrolment can change while the platform prompt is open. The shared
        // unlock helper deliberately fails open when unavailable; enabling must not.
        if (!(await isLockAvailable())) throw new LockPreferenceError('Biometric enrolment changed. Check device settings and try again.');
      }
      if (!mounted.current) return;
      dispatched = true;
      await setLockEnabled(next);
      const actual = await isLockEnabled();
      if (actual !== next) throw new LockPreferenceError('The saved lock preference could not be confirmed. Check its status before trying again.');
      if (mounted.current) setState(previous => ({ ...previous, enabled: actual }));
    } catch (error) {
      const message = error instanceof LockPreferenceError ? error.message : dispatched
        ? 'The saved lock setting could not be confirmed on this device. Check it again.'
        : 'Biometric verification could not finish. Check device settings and try again.';
      if (mounted.current) setState(previous => ({ ...previous, error: message, loaded: dispatched ? false : previous.loaded }));
    } finally {
      running.current = false;
      if (mounted.current) setState(previous => ({ ...previous, busy: false }));
    }
  }

  return <CardBox title="SECURITY">
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.label, { color: colors.textPri }]}>Biometric lock</Text>
        <CardHint>{!state.loaded ? 'The saved lock setting is not yet confirmed.' : !state.available
          ? 'Set up Face ID or fingerprint in device settings. You can turn off an existing lock here.'
          : 'Ask for Face ID or fingerprint when you come back to the app.'}</CardHint>
      </View>
      <ThemedSwitch accessibilityLabel="Biometric lock" value={state.enabled}
        disabled={!state.loaded || state.busy || (!state.available && !state.enabled)}
        onValueChange={next => void onToggle(next)} trackColor={{ false: colors.inkLine, true: colors.accent }} style={{ minHeight: touch.minimum }} />
    </View>
    {state.error ? <RetryLine message={state.error} onRetry={() => { if (!running.current) setReload(value => value + 1); }} /> : null}
  </CardBox>;
}
const styles = StyleSheet.create({
  row: { marginTop: spacing.lg, minHeight: touch.minimum, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  label: { fontFamily: fonts.sans.bold, fontSize: 16, lineHeight: 22 },
});
