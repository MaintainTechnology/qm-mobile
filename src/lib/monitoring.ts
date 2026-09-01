import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';

import {
  privacySafeMonitoringEvent,
  privacySafeRoute,
  type MonitoringErrorKind,
  validOperationId,
} from '@/lib/monitoring-safety';

const APP_VERSION = Constants.expoConfig?.version ?? 'unknown';
const runtimeVersion = Constants.expoConfig?.runtimeVersion;
const RUNTIME_VERSION =
  typeof runtimeVersion === 'string'
    ? runtimeVersion
    : runtimeVersion && 'policy' in runtimeVersion
      ? runtimeVersion.policy
      : 'unknown';

let enabled = false;

function validDsn(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    // Sentry DSNs use the public project key as the URL username. A password,
    // query, or fragment is never part of the approved client DSN contract.
    return (
      parsed.protocol === 'https:' &&
      Boolean(parsed.hostname) &&
      Boolean(parsed.username) &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

/** Initialise once, and remain a local no-op until a deployment supplies its public Sentry DSN. */
export function initialiseMonitoring(): boolean {
  if (enabled) return true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!validDsn(dsn)) return false;

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoPerformanceTracing: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    // Drop SDK breadcrumbs rather than risk request URLs, labels, or customer
    // content entering an otherwise safe crash event.
    beforeBreadcrumb: () => null,
    beforeSend: privacySafeMonitoringEvent,
  });
  enabled = true;
  Sentry.setTags({
    app_version: APP_VERSION,
    runtime_version: RUNTIME_VERSION,
    update_id: Updates.updateId ?? 'embedded',
    route: '/startup',
  });
  return true;
}

export function setMonitoringRoute(route: string): void {
  if (!enabled) return;
  Sentry.setTag('route', privacySafeRoute(route));
}

export function captureAppError(
  error: unknown,
  context: {
    kind: MonitoringErrorKind;
    operationId: string;
    route?: string;
  },
): void {
  if (!enabled || !validOperationId(context.operationId)) return;
  const safeError = error instanceof Error ? error : new Error('Non-Error failure');

  Sentry.withScope(scope => {
    scope.setTags({
      error_kind: context.kind,
      operation_id: context.operationId,
      ...(context.route ? { route: privacySafeRoute(context.route) } : {}),
    });
    Sentry.captureException(safeError);
  });
}
