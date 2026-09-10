import type { OwnedRoof } from './owned-roof';

export const roofFixture = (): OwnedRoof => ({
  id: '10000000-0000-4000-8000-000000000001', tenant_id: 'tenant_A', measure_token: 'measure-token-one', public_token: 'public-token-one',
  revision: 'a'.repeat(64), address: '1 Sample Street', postcode: '2000', state: 'NSW', provider: 'geoscape',
  customer_name: 'Sample Customer', customer_phone: '0400000000', created_at: '2026-09-09T00:00:00Z', released_at: null, paid_at: null,
  included_indices: [1], pricing_authority: { source: 'tenant_pricing_book', tenant_id: 'tenant_A', pricing_book_id: 'book_A', revision: 'b'.repeat(64) },
  promoted_quote_id: null, promotion_pending: false,
  quote: { structures: [1,2].map(i => ({ buildingId: `building-${i}`, role: i === 1 ? 'primary' as const : 'secondary' as const, label: `Building ${i}`,
    metrics: { footprint_m2: 100, sloped_area_m2: 120, storeys: 1, form: 'gable', hips: 0, valleys: 0,
      polygon_geojson: { type: 'Polygon', coordinates: [[[151,-33],[151.001,-33],[151.001,-33.001],[151,-33]]] } },
    inputs: { material: 'colorbond_corrugated', pitch: 'standard', intent: 'full_reroof' },
    price: { area_m2: 120, effective_rate_per_m2: 40, tiers: [
      { tier:'good' as const,label:'Good',ex_gst:100,inc_gst:110,scope:'Repair' },
      { tier:'better' as const,label:'Better',ex_gst:200,inc_gst:220,scope:'Replace' },
      { tier:'best' as const,label:'Best',ex_gst:300,inc_gst:330,scope:'Upgrade' },
    ], loadings_applied: [], routing:{decision:'auto_quote' as const,reason:'Reviewed'} } })),
    combined: {area_m2:240,tiers:[{tier:'good',label:'Good',ex_gst:200,inc_gst:220,scope:''},{tier:'better',label:'Better',ex_gst:400,inc_gst:440,scope:''},{tier:'best',label:'Best',ex_gst:600,inc_gst:660,scope:''}]},
    routing:{decision:'auto_quote',reason:'Reviewed'},inspection_structures:[],
  },
});

