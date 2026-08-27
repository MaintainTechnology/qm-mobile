/**
 * Pins the solar tools' pure helpers to the web contracts:
 * app/api/tenant/solar/route.ts + lib/solar/dashboard-view.ts (list + labels)
 * and app/api/tenant/pylon/settings/route.ts + lib/solar/pylon-hardware.ts
 * (SKU parse, 404 gate, 422 verbatim error).
 */
import { ApiError } from '@/lib/api';

import {
  buildPylonSettingsBody,
  feltStatusLabel,
  formatSolarDate,
  isPylonDisabled,
  parsePylonSku,
  PylonSaveResponseSchema,
  pylonSaveErrorMessage,
  pylonSkuInputError,
  SOLAR_STATUS_LABELS,
  SolarListResponseSchema,
  solarKwLabel,
  solarMoneyLabel,
  solarRoutingLabel,
  solarStcLabel,
} from './solar-api';

describe('status labels — web STATUS_META parity', () => {
  it('carries the four web labels verbatim', () => {
    expect(SOLAR_STATUS_LABELS.awaiting_confirmation).toBe('Awaiting review');
    expect(SOLAR_STATUS_LABELS.confirmed).toBe('Released');
    expect(SOLAR_STATUS_LABELS.paid).toBe('Deposit paid');
    expect(SOLAR_STATUS_LABELS.flagged).toBe('Needs review');
  });
});

describe('solarRoutingLabel — web routing stat parity', () => {
  it('maps the three routings', () => {
    expect(solarRoutingLabel('inspection_required')).toBe('Site visit');
    expect(solarRoutingLabel('auto_quote')).toBe('Auto');
    expect(solarRoutingLabel('tradie_review')).toBe('Tradie review');
  });

  it('null/undefined read as tradie review, matching the web fallthrough', () => {
    expect(solarRoutingLabel(null)).toBe('Tradie review');
    expect(solarRoutingLabel(undefined)).toBe('Tradie review');
  });
});

describe('solarMoneyLabel — wire dollars rendered verbatim, never computed', () => {
  it('formats dollars through the cents boundary', () => {
    expect(solarMoneyLabel(12345.67)).toBe('A$12,345.67');
    expect(solarMoneyLabel(0)).toBe('A$0.00');
  });

  it('missing money is a dash, never a zero', () => {
    expect(solarMoneyLabel(null)).toBe('—');
    expect(solarMoneyLabel(undefined)).toBe('—');
    expect(solarMoneyLabel(Number.NaN)).toBe('—');
  });
});

describe('solarKwLabel', () => {
  it('one decimal with unit; dash when absent', () => {
    expect(solarKwLabel(6.6)).toBe('6.6 kW');
    expect(solarKwLabel(10)).toBe('10.0 kW');
    expect(solarKwLabel(null)).toBe('—');
  });
});

describe('solarStcLabel — rebate first, certs fallback (web stat parity)', () => {
  it('prefers the dollar rebate', () => {
    expect(solarStcLabel(1480, 33)).toBe('A$1,480.00');
  });

  it('falls back to the certificate count, then a dash', () => {
    expect(solarStcLabel(null, 33)).toBe('33 certs');
    expect(solarStcLabel(null, null)).toBe('—');
  });
});

describe('feltStatusLabel — web FELT_CHIP copy', () => {
  it('maps every provisioning state', () => {
    expect(feltStatusLabel('ready')).toBe('Map ready');
    expect(feltStatusLabel('partial')).toBe('Map building…');
    expect(feltStatusLabel('provisioning')).toBe('Map building…');
    expect(feltStatusLabel('pending')).toBe('Map building…');
    expect(feltStatusLabel('failed')).toBe('Map unavailable');
  });

  it('hides on unknown / absent states', () => {
    expect(feltStatusLabel('something_new')).toBeNull();
    expect(feltStatusLabel(null)).toBeNull();
    expect(feltStatusLabel(undefined)).toBeNull();
  });
});

describe('formatSolarDate', () => {
  it('renders en-AU day-month-year and empties on junk', () => {
    expect(formatSolarDate('2026-06-13T12:00:00Z')).toMatch(/Jun 2026$/);
    expect(formatSolarDate('not-a-date')).toBe('');
  });
});

describe('parsePylonSku — route parsePylonSkuSettings parity', () => {
  it('trims and passes a nominated SKU through', () => {
    expect(parsePylonSku('  abc-123  ')).toBe('abc-123');
  });

  it('empty / whitespace-only means none nominated', () => {
    expect(parsePylonSku('')).toBeNull();
    expect(parsePylonSku('   ')).toBeNull();
  });
});

describe('pylonSkuInputError — invalid input never saves', () => {
  it('accepts empty (clears) and single-token SKUs', () => {
    expect(pylonSkuInputError('')).toBeNull();
    expect(pylonSkuInputError('  ')).toBeNull();
    expect(pylonSkuInputError('4f9d2c-uuid-segment')).toBeNull();
  });

  it('rejects embedded whitespace — always a paste error', () => {
    expect(pylonSkuInputError('two words')).not.toBeNull();
    expect(pylonSkuInputError(' padded sku ')).not.toBeNull();
  });
});

describe('buildPylonSettingsBody — all three keys, empty → null', () => {
  it('builds the full PUT body', () => {
    expect(buildPylonSettingsBody(' mod-1 ', '', 'bat-9')).toEqual({
      module_sku: 'mod-1',
      inverter_sku: null,
      battery_sku: 'bat-9',
    });
  });
});

describe('isPylonDisabled — the 404 pylon_disabled gate', () => {
  it('true only for a 404 ApiError', () => {
    expect(isPylonDisabled(new ApiError('x', 404, '/api/tenant/pylon/settings'))).toBe(true);
    expect(isPylonDisabled(new ApiError('x', 500, '/api/tenant/pylon/settings'))).toBe(false);
    expect(isPylonDisabled(new Error('offline'))).toBe(false);
    expect(isPylonDisabled(undefined)).toBe(false);
  });
});

describe('pylonSaveErrorMessage — 422 sentences verbatim', () => {
  it('shows the SKU-validation sentence exactly as the route wrote it', () => {
    const sentence =
      'Panel SKU "xyz" was not found in Pylon (not_found). Copy the SKU from a Pylon design or datasheet URL.';
    const err = new ApiError('PUT failed', 422, '/api/tenant/pylon/settings', {
      ok: false,
      error: sentence,
    });
    expect(pylonSaveErrorMessage(err)).toBe(sentence);
  });

  it('everything else routes through the house mapper', () => {
    const err = new ApiError('PUT failed', 500, '/api/tenant/pylon/settings', {
      ok: false,
      error: 'db_down',
    });
    expect(pylonSaveErrorMessage(err)).toContain('db down');
  });
});

describe('schema round-trips', () => {
  const estimate = {
    token: 'tok_1',
    customerName: 'Sam',
    address: '1 Sunny St, Brisbane QLD',
    systemKw: 6.6,
    netIncGst: 8990,
    stcRebateAud: 1480,
    stcCertificates: 33,
    status: 'awaiting_confirmation',
    guardrailFlags: [],
    routing: 'auto_quote',
    createdAt: '2026-06-13T12:00:00Z',
    quoteVariant: 'instant',
    feltStatus: null,
    feltMapUrl: null,
    pylonStage: 'New lead',
    // Web-only fields must pass through a loose parse untouched.
    quoteUrl: 'https://quotemax.com.au/q/solar/tok_1',
    buildings: [],
  };

  it('accepts the route response and defaults the list', () => {
    const parsed = SolarListResponseSchema.parse({
      ok: true,
      estimates: [estimate],
      shareUrl: 'https://quotemax.com.au/solar/tenant-1',
      feltEnabled: false,
    });
    expect(parsed.estimates).toHaveLength(1);
    expect(parsed.estimates[0]?.token).toBe('tok_1');
    expect(parsed.estimates[0]?.netIncGst).toBe(8990);
    expect(SolarListResponseSchema.parse({ ok: true }).estimates).toEqual([]);
  });

  it('rejects a status outside the dashboard-view contract', () => {
    const bad = SolarListResponseSchema.safeParse({
      estimates: [{ ...estimate, status: 'archived' }],
    });
    expect(bad.success).toBe(false);
  });

  it('pylon save round-trip: ok pinned true, resolved defaults', () => {
    const parsed = PylonSaveResponseSchema.parse({
      ok: true,
      settings: { module_sku: 'mod-1', inverter_sku: null, battery_sku: null },
      resolved: { module_sku: 'Jinko Tiger Neo 440W' },
    });
    expect(parsed.resolved['module_sku']).toBe('Jinko Tiger Neo 440W');
    expect(
      PylonSaveResponseSchema.parse({ ok: true, settings: {} }).resolved,
    ).toEqual({});
    expect(PylonSaveResponseSchema.safeParse({ ok: false, settings: {} }).success).toBe(false);
  });
});
