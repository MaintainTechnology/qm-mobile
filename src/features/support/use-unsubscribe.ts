import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, apiRequest } from '@/lib/api';
import { UNSUBSCRIBE_DIAGNOSTIC_PATH, UnsubscribeErrorSchema, UnsubscribeResponseSchema, unsubscribeToken } from './unsubscribe-contract';

type Status = 'ready' | 'submitting' | 'unconfirmed' | 'invalid' | 'confirmed';
export function useUnsubscribe(rawToken: unknown) {
  const token = unsubscribeToken(rawToken);
  const [state, setState] = useState({ status: (token ? 'ready' : 'invalid') as Status, message: '' });
  const owner = useRef({ active: false, epoch: 0, token, submitting: false, confirmed: false, invalid: !token, controller: null as AbortController | null });
  owner.current.token = token;
  useEffect(() => {
    const current = owner.current; current.active = true; current.epoch += 1;
    current.submitting = false; current.confirmed = false; current.invalid = !token;
    setState({ status: token ? 'ready' : 'invalid', message: '' });
    const subscription = AppState.addEventListener('change', next => { if (next === 'background') current.controller?.abort(); });
    return () => { current.active = false; current.epoch += 1; current.controller?.abort(); subscription.remove(); };
  }, [token]);
  const submit = async (online: boolean) => {
    const current = owner.current;
    if (!current.active || !token || current.token !== token || current.submitting || current.confirmed || current.invalid) return;
    if (!online) { setState({ status: 'unconfirmed', message: 'You are offline. Reconnect, then try this unsubscribe request again.' }); return; }
    current.submitting = true;
    const epoch = current.epoch;
    const controller = new AbortController(); current.controller = controller;
    const active = () => current.active && current.epoch === epoch && current.token === token;
    setState({ status: 'submitting', message: '' });
    try {
      // This existing GET mutates suppression. It is called only by the explicit
      // action, never by mounting, refetching, reconnecting or foregrounding.
      await apiRequest(`/api/email/unsubscribe/${encodeURIComponent(token)}`, UnsubscribeResponseSchema, {
        anonymous: true, diagnosticPath: UNSUBSCRIBE_DIAGNOSTIC_PATH, signal: controller.signal,
      });
      if (active()) { current.confirmed = true; setState({ status: 'confirmed', message: '' }); }
    } catch (error) {
      if (!active()) return;
      const parsed = error instanceof ApiError ? UnsubscribeErrorSchema.safeParse(error.body) : null;
      const invalid = error instanceof ApiError && error.status === 400 && parsed?.success && parsed.data.error === 'invalid_link';
      current.invalid = !!invalid;
      setState({ status: invalid ? 'invalid' : 'unconfirmed', message: invalid
        ? 'This unsubscribe link could not be verified. Open the original link from your email again.'
        : 'The unsubscribe result is not confirmed. Try this same request again when you are connected; repeating it safely keeps the same email preference.' });
    } finally {
      if (active()) { current.submitting = false; current.controller = null; }
    }
  };
  return { ...state, submit };
}
