/** Populated phone layouts. Every business API is mocked; no save/send action is executed. */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { signIn, tab } from './helpers';
import { installApiMocks, tenantMe, type ApiMockOverrides } from './mocks';

const artifactDir = path.resolve(__dirname, '../test-results/mobile-tools-polish');
const button = (page: Page, name: string | RegExp) =>
  page
    .getByRole('button', { name, exact: typeof name === 'string' })
    .filter({ visible: true })
    .last();
const text = (page: Page, name: string | RegExp) =>
  page
    .getByText(name, { exact: typeof name === 'string' })
    .filter({ visible: true })
    .first();
const field = (page: Page, name: string) =>
  page.getByLabel(name, { exact: true }).filter({ visible: true }).first();

// Values come from the catalogue/roofing/aircon unit-test fixtures. They are test
// payloads, not suggested product prices or a substitute for a tenant price book.
const catalogue = [
  {
    id: 'catalogue-gpo',
    name: 'Clipsal Iconic double power point',
    category: 'gpo',
    trade: 'electrical',
    brand: 'Clipsal',
    range_series: 'Iconic',
    unit_price_ex_gst: '42.00',
    image_path: null,
    tier_hint: 'better',
    active: true,
    unit: 'each',
    description: 'Matte black',
    cost_price_ex_gst: 28.5,
    is_preferred: true,
  },
  {
    id: 'catalogue-light',
    name: 'HPM tri-colour dimmable LED downlight with integrated driver',
    category: 'downlight',
    trade: 'electrical',
    brand: 'HPM',
    range_series: null,
    unit_price_ex_gst: '42.00',
    image_path: null,
    tier_hint: 'good',
    active: true,
    unit: 'each',
    description: 'Tri-colour 9W LED',
    properties: { dimmable: true, integrated_driver: true },
  },
];
const assembly = { id: 'asm-1', name: 'Downlight installation', trade: 'electrical' };
const roofTiers = [
  { tier: 'good', label: 'Good', ex_gst: 6000, inc_gst: 6600, scope: 'Patch' },
  { tier: 'better', label: 'Better', ex_gst: 8000, inc_gst: 8800, scope: 'Match' },
  { tier: 'best', label: 'Best', ex_gst: 10000, inc_gst: 11000, scope: 'Upgrade' },
];
const roofResult = {
  ok: true,
  provider: 'mock',
  warnings: [],
  quote: {
    structures: [
      {
        buildingId: 'roof-primary',
        role: 'primary',
        label: 'Main dwelling and covered outdoor area',
        metrics: {
          footprint_m2: 100,
          sloped_area_m2: 120,
          storeys: 1,
          form: 'gable',
          hips: 0,
          valleys: 0,
        },
        inputs: { material: 'colorbond_corrugated', pitch: 'standard', intent: 'full_reroof' },
        price: {
          area_m2: 120,
          effective_rate_per_m2: 50,
          tiers: roofTiers,
          loadings_applied: [],
          routing: {
            decision: 'tradie_review',
            reason: 'Review the scope and measurements before sending.',
          },
        },
      },
    ],
    combined: { area_m2: 120, tiers: roofTiers },
    routing: {
      decision: 'tradie_review',
      reason: 'Review the scope and measurements before sending.',
    },
    inspection_structures: [],
  },
};
const airconResult = {
  ok: true,
  climate_zone: 'subtropical',
  climate_note: 'Postcode 2750 sits in the subtropical band.',
  location: {
    geocode: {
      ok: true,
      formatted_address: '27 Smith St, Penrith NSW 2750',
      lat: -33.7,
      lng: 150.7,
    },
    weather: { ok: false, code: 'config_missing', detail: 'No weather in this fixture.' },
    building: { ok: false, code: 'skipped', detail: 'No building lookup in this fixture.' },
    notes: [],
  },
  recommendation: {
    pricing_status: 'priced',
    sizing: {
      rooms: [
        {
          room_type: 'bedroom',
          name: 'Main bedroom with adjoining study',
          area_m2: 12,
          volume_m3: 28.8,
          kw: 1.3,
        },
      ],
      conditioned_zones: 1,
      total_floor_area_m2: 12,
      floor_area_source: 'entered',
      total_volume_m3: 28.8,
      ceiling_height_m: 2.4,
      storeys: 1,
      volumetric_factor_kw_m3: 0.045,
      connected_kw: 1.3,
      confidence: 'high',
      notes: [],
      warnings: [],
    },
    options: [
      {
        system_type: 'split',
        capacity_kw: 2.5,
        price: { low: 1800, high: 2400 },
        best_fit: true,
        pros: ['Cheapest to run'],
        pricing: {
          point_estimate_ex_gst: 1900,
          point_estimate_inc_gst: 2090,
          confidence_band_pct: 12,
          gst_registered: true,
          formula: 'heads × band rate',
          band_reason: 'High confidence — entered floor area.',
          components: [
            {
              label: '1 × 2.5 kW head',
              quantity: 1,
              unit: 'head',
              rate_ex_gst: 1900,
              total_ex_gst: 1900,
            },
          ],
          adjustments: [],
        },
      },
    ],
    routing: { decision: 'book_assessment', reason: 'Every result needs a site assessment.' },
    confidence: 'high',
  },
  saved: { id: 'recommendation-1', public_token: 'public-token-1' },
};

const overrides: ApiMockOverrides = {
  '/api/tenant/me': {
    body: {
      ...tenantMe,
      tenant: { ...tenantMe.tenant, trades: ['electrical', 'roofing', 'aircon'] },
    },
  },
  '/api/tenant/catalogue': { body: { catalogue } },
  '/api/tenant/catalogue/gaps': {
    body: {
      by_trade: [
        {
          trade: 'electrical',
          total_shared_categories: 2,
          covered_categories: 2,
          missing_rows_total: 0,
          coverage_pct: 100,
          categories: ['gpo', 'downlight'].map(category => ({
            category,
            shared_count: 1,
            tenant_count: 1,
            missing_count: 0,
            covered: true,
          })),
        },
      ],
    },
  },
  '/api/tenant/bom': {
    body: {
      assemblies: [assembly],
      baselines: {},
      catalogue_categories_by_trade: { electrical: ['downlight'] },
      lines: [
        {
          id: 'part-1',
          assembly_id: 'asm-1',
          material_category: 'downlight',
          description: 'Tri-colour dimmable downlight',
          quantity: 1,
          required: true,
          include_when: null,
          sort: 1,
        },
      ],
    },
  },
  '/api/tenant/tasks': {
    body: {
      assemblies: [assembly],
      baselines: {},
      lines: [
        {
          id: 'step-1',
          assembly_id: 'asm-1',
          title: 'Isolate the circuit',
          notes: 'Confirm isolation before beginning work.',
          required: true,
          sort: 1,
        },
        {
          id: 'step-2',
          assembly_id: 'asm-1',
          title: 'Install and test the downlight',
          notes: 'Check the fitting and dimmer operation.',
          required: true,
          sort: 2,
        },
      ],
    },
  },
  '/api/roofing/measure-all': { body: roofResult },
  '/api/roofing/save': { body: { ok: true, jobs: [] } },
  '/api/aircon/recommend': { body: airconResult },
};

async function capture(page: Page, name: string, anchor?: Locator) {
  if (anchor) await anchor.evaluate(el => el.scrollIntoView({ block: 'start', inline: 'nearest' }));
  await page.evaluate(() => document.fonts.ready);
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${name}.png`), animations: 'disabled' });
}

async function expectFits(page: Page, locator: Locator, control = false) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  if (control) {
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    const nav = await tab(page, 'Menu').boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(nav!.y + 1);
  }
}

async function section(page: Page, name: string) {
  const choice = page
    .getByRole('tablist', { name: 'Workspace sections' })
    .filter({ visible: true })
    .getByRole('tab', { name, exact: true });
  await choice.click();
  await expect(choice).toHaveAttribute('aria-selected', 'true');
}

async function trade(page: Page, name: string) {
  const choice = page.getByRole('radio', { name, exact: true }).filter({ visible: true }).first();
  await choice.click();
  await expect(choice).toHaveAttribute('aria-checked', 'true');
}

test('populated trade workspaces keep fields, prices and actions usable at phone widths', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const api = await installApiMocks(page, overrides);
  await signIn(page);
  await tab(page, 'Menu').click();
  await page
    .getByRole('radio', { name: 'Charcoal', exact: true })
    .filter({ visible: true })
    .click();
  await tab(page, 'Tools').click();

  await test.step('catalogue and recipe content at 390px and 320px', async () => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await section(page, 'Catalogue');
      await expect(text(page, 'Clipsal Iconic double power point')).toBeVisible();
      await expectFits(page, button(page, '+ Add product'), true);
      await capture(page, `${width}-charcoal-catalogue`, text(page, 'Product catalogue · 2'));
      await capture(
        page,
        `${width}-charcoal-catalogue-products`,
        text(page, 'HPM tri-colour dimmable LED downlight with integrated driver'),
      );
      await button(page, '+ Add product').click();
      await field(page, 'Product name').fill(
        'Additional downlight for the covered entertaining area',
      );
      await expectFits(page, field(page, 'Product name'));
      await capture(page, `${width}-charcoal-catalogue-form`, text(page, 'PRODUCT NAME'));
      await expectFits(page, button(page, 'Add to catalogue'), true);
      await expectFits(page, button(page, 'Cancel'), true);
      await capture(page, `${width}-charcoal-catalogue-actions`);
      await button(page, 'Cancel').click();

      await section(page, 'Recipes');
      await expect(field(page, 'Step 1 title')).toHaveValue('Isolate the circuit');
      await capture(
        page,
        `${width}-charcoal-recipe-steps`,
        text(page, 'Downlight installation — steps'),
      );
      await expectFits(page, button(page, '+ Add step to this job'), true);
      await capture(
        page,
        `${width}-charcoal-recipe-parts`,
        text(page, 'Downlight installation — parts'),
      );
      await expectFits(page, button(page, '+ Add part to this recipe'), true);
    }
    expect(api.mutations).toEqual([]);
  });

  await test.step('roof result tiers and secondary save remain readable', async () => {
    await section(page, 'Tools');
    await trade(page, 'Roofing');
    await field(page, 'Address').fill('27 Smith Street, Penrith');
    await field(page, 'Postcode').fill('2750');
    await button(page, 'Measure all structures').click();
    await expect(text(page, 'Main dwelling and covered outdoor area')).toBeVisible();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await expectFits(page, text(page, 'A$11,000.00'));
      await capture(
        page,
        `${width}-charcoal-roof-tiers`,
        text(page, 'Main dwelling and covered outdoor area'),
      );
      await expectFits(page, button(page, 'Save job'), true);
      await expectFits(page, button(page, 'Save as quote'), true);
      await capture(page, `${width}-charcoal-roof-actions`, text(page, /Combined total ·/));
    }
  });

  await test.step('air-con sizing, price bounds and assessment requirement remain visible', async () => {
    await trade(page, 'Air-con');
    await field(page, 'Address').fill('27 Smith Street, Penrith');
    await field(page, 'Postcode').fill('2750');
    await button(page, 'Get recommendation').click();
    await expect(text(page, 'Main bedroom with adjoining study')).toBeVisible();
    await button(page, /HOW THIS PRICE WAS CALCULATED/).click();
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await capture(page, `${width}-charcoal-aircon-sizing`, text(page, 'Volumetric sizing'));
      await expectFits(page, text(page, 'A$1,800.00'));
      await expectFits(page, text(page, 'A$2,400.00'));
      await capture(page, `${width}-charcoal-aircon-pricing`, text(page, '2.5 KW SYSTEM'));
      await expectFits(page, button(page, /HIDE THE PRICE WORKING/), true);
      await expect(text(page, 'Every result needs a site assessment.')).toBeVisible();
    }
  });

  expect(api.unmatched).toEqual([]);
  expect(api.mutations).toEqual(['POST /api/roofing/measure-all', 'POST /api/aircon/recommend']);
});
