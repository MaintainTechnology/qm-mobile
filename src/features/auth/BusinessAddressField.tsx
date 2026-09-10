import { useAuth } from '@clerk/expo';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { apiRequest } from '@/lib/api';
import { requireClerkToken } from '@/lib/auth-token';
import { fonts, spacing, touch } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { Field, GhostButton } from './ui';

const SuggestionsSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), suggestions: z.array(z.object({
    id: z.string().min(1).max(256), address: z.string().trim().min(1).max(200),
    state: z.string().nullable(), postcode: z.string().nullable(),
  })).max(20) }),
  z.object({ ok: z.literal(false) }),
]);
type Suggestion = { id: string; address: string };
type TokenGetter = () => Promise<string | null | undefined>;

/** Shared Account/onboarding input. Selecting a suggestion only edits the form. */
export function BusinessAddressField({ value, onChange, disabled = false, error, getAccessToken, scopeKey }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; error?: string;
  getAccessToken?: TokenGetter; scopeKey?: string;
}) {
  const auth = useAuth();
  const { colors } = useTheme();
  const scope = JSON.stringify([scopeKey ?? null, auth.userId ?? null, auth.sessionId ?? null]);
  const latest = useRef({ value, disabled, scope, getToken: getAccessToken ?? auth.getToken });
  latest.current = { value, disabled, scope, getToken: getAccessToken ?? auth.getToken };
  const lifecycle = useRef({ active: false, epoch: 0, busy: false, controller: null as AbortController | null });
  const [result, setResult] = useState<{ busy: boolean; rows: Suggestion[]; message: string; input?: string; scope?: string; epoch?: number }>({ busy: false, rows: [], message: '' });
  useEffect(() => {
    const current = lifecycle.current;
    current.active = true;
    current.epoch += 1;
    current.busy = false;
    current.controller?.abort();
    setResult({ busy: false, rows: [], message: '' });
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'background') current.controller?.abort();
    });
    return () => {
      current.active = false;
      current.epoch += 1;
      current.controller?.abort();
      subscription.remove();
    };
  }, [scope, value, disabled]);

  async function search() {
    const current = lifecycle.current;
    const snapshot = latest.current;
    const query = snapshot.value.trim();
    if (!current.active || current.busy || snapshot.disabled || query.length < 3 || query.length > 200) return;
    const epoch = ++current.epoch;
    const controller = new AbortController();
    current.controller = controller;
    current.busy = true;
    const active = () => current.active && current.epoch === epoch && latest.current.scope === snapshot.scope
      && latest.current.value === snapshot.value && !latest.current.disabled;
    setResult({ busy: true, rows: [], message: '' });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Token acquisition is bounded too; a late old-session token cannot start a request.
      const token = requireClerkToken(await Promise.race([
        snapshot.getToken(),
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), 5000); }),
      ]));
      clearTimeout(timer);
      if (!active() || controller.signal.aborted) return;
      const response = await apiRequest('/api/roofing/suggest-address', SuggestionsSchema, {
        method: 'POST', body: { query }, token, signal: controller.signal,
      });
      if (!active()) return;
      const rows = response.ok ? response.suggestions : [];
      setResult({ busy: false, rows, input: snapshot.value, scope: snapshot.scope, epoch, message: rows.length ? '' : response.ok
        ? 'No matching addresses were found. You can enter your address manually.'
        : 'Address suggestions are unavailable. You can enter your address manually.' });
    } catch {
      if (active()) setResult({ busy: false, rows: [], message: 'Address suggestions are unavailable. You can enter your address manually.' });
    } finally {
      clearTimeout(timer);
      if (active()) {
        current.busy = false;
        current.controller = null;
        setResult(previous => ({ ...previous, busy: false }));
      }
    }
  }

  return <View style={{ gap: spacing.sm }}>
    <Field label="Business address" hint="Optional · enter manually or find an address" value={value}
      onChangeText={onChange} maxLength={200} editable={!disabled} autoCapitalize="words" height={54} error={error} />
    <GhostButton label={result.busy ? 'Looking up addresses…' : 'Find address'} onPress={() => void search()}
      disabled={disabled || result.busy || value.trim().length < 3 || value.trim().length > 200} />
    {result.message ? <Text accessibilityRole="alert" style={{ color: colors.textSec, fontFamily: fonts.sans.regular }}>{result.message}</Text> : null}
    {(result.input === value && result.scope === scope ? result.rows : []).map((row, index) => <Pressable key={`${row.id}:${index}`} accessibilityRole="button"
      accessibilityLabel={`Use business address ${row.address}`} disabled={disabled}
      onPress={() => {
        if (!lifecycle.current.active || lifecycle.current.epoch !== result.epoch || latest.current.disabled
          || latest.current.value !== result.input || latest.current.scope !== result.scope) return;
        lifecycle.current.epoch += 1;
        lifecycle.current.controller?.abort();
        lifecycle.current.busy = false;
        setResult({ busy: false, rows: [], message: '' });
        onChange(row.address);
      }}
      style={{ minHeight: touch.minimum, justifyContent: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.ctlLine }}>
      <Text style={{ color: colors.textPri, fontFamily: fonts.sans.medium }}>{row.address}</Text>
    </Pressable>)}
  </View>;
}
