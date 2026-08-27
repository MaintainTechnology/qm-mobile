/**
 * Services & brands write layer — mobile mirror of the web ServicesTab's three write paths
 * (quotemate-automation app/dashboard/page.tsx ServicesTab + PreferredBrandsCard):
 *
 *   toggles + brand prefs → PATCH /api/tenant/me with the legacy uuid→bool maps
 *     ({ services }, { custom_services }) and { material_preferences } (category → brand,
 *     null clears). NOT trade-gated — UpdateSchema accepts these for every hub trade.
 *   custom services       → POST /api/tenant/services, PATCH/DELETE /api/tenant/services/[id].
 *     CREATE is trade-gated server-side (CustomServiceSchema pins trade to TRADE_ENUM =
 *     electrical + plumbing — see ../write-gate.ts). The [id] PATCH only validates `trade`
 *     when the field is sent, so edits omit it and the row keeps its trade.
 *
 * Wire money is DOLLARS ex-GST (`default_unit_price_ex_gst`) — convert at the render/submit
 * boundary with centsFromApiDollars/apiDollarsFromCents, never in state.
 */
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { ApiError } from '@/lib/api';
import { TENANT_ME_KEY, type ServiceRow, type TenantMe } from '@/lib/tenant';
import { useApiMutation } from '@/lib/useApi';

/** All three write routes answer `{ ok: true, … }`; pin the literal so a 200-with-ok:false
 *  lands in the error path instead of reading as a success (same trick as quotes/api.ts). */
const WriteOkSchema = z.looseObject({ ok: z.literal(true) });
type WriteOk = z.infer<typeof WriteOkSchema>;

// ── PATCH /api/tenant/me — toggles + preferred brands ───────────────────────

export type TenantMePatch = {
  /** Shared-catalogue toggles, keyed by the row's assembly_id. */
  services?: Record<string, boolean>;
  /** Custom-service toggles, keyed by tenant_custom_assemblies.id (= merged assembly_id). */
  custom_services?: Record<string, boolean>;
  /** category → preferred brand; null (or '') clears the preference server-side. */
  material_preferences?: Record<string, string | null>;
};

/** Pure optimistic write-through: apply a me-PATCH body to the cached payload. */
export function applyMePatch(me: TenantMe, patch: TenantMePatch): TenantMe {
  const toggles: Record<string, boolean> = { ...patch.services, ...patch.custom_services };
  const services = me.services?.map(row => {
    const key = row.assembly_id ?? row.id;
    if (key == null) return row;
    const next = toggles[key];
    return next === undefined ? row : { ...row, enabled: next };
  });
  let prefs = me.material_preferences ?? undefined;
  if (patch.material_preferences) {
    const next: Record<string, string> = { ...(prefs ?? {}) };
    for (const [category, brand] of Object.entries(patch.material_preferences)) {
      if (brand == null || brand === '') delete next[category];
      else next[category] = brand;
    }
    prefs = next;
  }
  return { ...me, services: services ?? me.services, material_preferences: prefs };
}

/**
 * One mutation for toggles and brand picks. Optimistic: the cache is patched immediately so a
 * switch flips under the thumb on a two-bar connection; success re-fetches via `invalidates`,
 * failure re-fetches too (server truth wins — per-row rollbacks can clobber a concurrent flip).
 */
export function usePatchTenantMe() {
  const queryClient = useQueryClient();
  return useApiMutation<TenantMePatch, WriteOk>('/api/tenant/me', WriteOkSchema, {
    method: 'PATCH',
    invalidates: [TENANT_ME_KEY],
    onMutate: async vars => {
      await queryClient.cancelQueries({ queryKey: TENANT_ME_KEY });
      const snapshot = queryClient.getQueryData<TenantMe>(TENANT_ME_KEY);
      if (snapshot) queryClient.setQueryData<TenantMe>(TENANT_ME_KEY, applyMePatch(snapshot, vars));
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: TENANT_ME_KEY }),
  });
}

// ── Custom services: POST / PATCH [id] / DELETE [id] ────────────────────────

/** The CustomServiceSchema fields the web form submits, verbatim (minus `trade`, which only the
 *  create needs, and `category`, which mobile leaves untouched — omitted = auto-detect on create,
 *  unchanged on edit). Price is dollars ex-GST, the wire's own unit. */
export type CustomServiceFields = {
  name: string;
  description: string;
  default_unit: string;
  default_unit_price_ex_gst: number;
  default_labour_hours: number;
  default_exclusions: string;
  always_inspection: boolean;
};

export function useCreateCustomService() {
  return useApiMutation<CustomServiceFields & { trade: string }, WriteOk>(
    '/api/tenant/services',
    WriteOkSchema,
    { invalidates: [TENANT_ME_KEY] },
  );
}

/** `id` rides along for the path builder; the server's zod object strips it from the body. */
export function useUpdateCustomService() {
  return useApiMutation<CustomServiceFields & { id: string }, WriteOk>(
    vars => `/api/tenant/services/${vars.id}`,
    WriteOkSchema,
    { method: 'PATCH', invalidates: [TENANT_ME_KEY] },
  );
}

export function useDeleteCustomService() {
  return useApiMutation<{ id: string }, WriteOk>(
    vars => `/api/tenant/services/${vars.id}`,
    WriteOkSchema,
    { method: 'DELETE', invalidates: [TENANT_ME_KEY] },
  );
}

/** POST and PATCH surface a unique-name violation as 409 { error: 'duplicate_name' }. */
export function isDuplicateName(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) return false;
  const body = error.body as { error?: unknown } | null | undefined;
  return body?.error === 'duplicate_name';
}

// ── Loose-field readers ─────────────────────────────────────────────────────

/** The merged /api/tenant/me services rows carry more than TenantMeSchema types (is_custom,
 *  always_inspection, …) — looseObject keeps them as `unknown`; narrow them here, once. */
export function serviceExtras(row: ServiceRow): {
  isCustom: boolean;
  alwaysInspection: boolean;
  labourHours: number | null;
  exclusions: string;
} {
  const r = row as Record<string, unknown>;
  return {
    isCustom: r.is_custom === true,
    alwaysInspection: r.always_inspection === true,
    labourHours: typeof r.default_labour_hours === 'number' ? r.default_labour_hours : null,
    exclusions: typeof r.default_exclusions === 'string' ? r.default_exclusions : '',
  };
}

/** Toggle key: shared rows key by assembly_id; merged custom rows set assembly_id to their id. */
export function serviceKey(row: ServiceRow): string | null {
  return row.assembly_id ?? row.id ?? null;
}
