/**
 * Per-job-type form field registry for the job quoter (spec web-parity F2).
 *
 * Ported VERBATIM (field codes, questions, option strings) from the web source of
 * truth — quotemate-automation/lib/quote/job-fields.ts — electrical + plumbing
 * entries only, per this build's scope. See that file for the full "why a const,
 * not a table" rationale; it applies unchanged here. Option strings stay
 * human-readable because the server turns them into prose for the estimator
 * (quotemate-automation/app/api/tenant/job-quote/route.ts buildTranscript) —
 * canonicalising them here would silently change what the tradie's answer says.
 */

export type JobField = {
  code: string;
  label: string;
  type: 'number' | 'select' | 'text';
  options?: readonly string[];
};

export type JobFormSpec = {
  fields: readonly JobField[];
  /** tenant_material_catalogue.category to offer a product picker from. */
  catalogueCategory?: string;
  /** No standard priced assembly for this job type — usually routes to the
   *  $99 on-site inspection unless the tenant has added their own pricing. */
  usuallyInspection?: boolean;
};

const GENERIC: readonly JobField[] = [
  { code: 'room', label: 'Which room or area is the work in?', type: 'text' },
];

export const JOB_FIELDS: Record<string, JobFormSpec> = {
  // ── Electrical ──────────────────────────────────────────────────
  downlights: {
    catalogueCategory: 'downlight',
    fields: [
      { code: 'count', label: 'How many downlights are we doing?', type: 'number' },
      { code: 'room', label: 'Which room or area are the downlights for?', type: 'text' },
      {
        code: 'ceiling_type',
        label: 'What ceiling type is it?',
        type: 'select',
        options: ['flat plaster', 'raked', 'cathedral', 'sheet metal', 'not sure'],
      },
      {
        code: 'replace_or_new',
        label: 'Replacing existing downlights, or new installs where there are no fittings now?',
        type: 'select',
        options: ['replacing existing', 'new install'],
      },
      {
        code: 'colour',
        label: 'Any colour or feature preference?',
        type: 'select',
        options: ['warm white', 'cool white', 'tri-colour', 'dimmable', 'smart', 'standard'],
      },
    ],
  },
  power_points: {
    catalogueCategory: 'gpo',
    fields: [
      { code: 'count', label: 'How many GPOs or power points?', type: 'number' },
      { code: 'room', label: 'Which room or area are the power points for?', type: 'text' },
      {
        code: 'replace_or_new',
        label:
          'Replacing existing GPOs, adding near existing power, or a new run from the switchboard?',
        type: 'select',
        options: [
          'replacing existing',
          'adding near existing power',
          'new run from the switchboard (on-site inspection)',
        ],
      },
      {
        code: 'distance_to_existing_power',
        label:
          'For a new or extended run: how far from the nearest existing power point, in metres? (leave blank for a straight swap)',
        type: 'number',
      },
      {
        code: 'circuit_required',
        label: 'Circuit required? 20A is a dedicated circuit, three-phase is a 32A outlet',
        type: 'select',
        options: ['10A', '20A', 'three-phase'],
      },
    ],
  },
  ceiling_fans: {
    catalogueCategory: 'fan',
    fields: [
      { code: 'count', label: 'How many fans are we doing?', type: 'number' },
      { code: 'room', label: 'Which room or rooms are the fans for?', type: 'text' },
      {
        code: 'supplied_by',
        label: 'Does the customer already have the fan, or are we supplying it?',
        type: 'select',
        options: ['customer supplies', 'we supply'],
      },
    ],
  },
  smoke_alarms: {
    catalogueCategory: 'smoke_alarm',
    fields: [
      {
        code: 'smoke_class',
        label: 'Is this a like-for-like swap, or a full-property compliance hardwire?',
        type: 'select',
        options: [
          'like-for-like swap of existing alarms',
          'full-property compliance hardwire (all bedrooms + hallways)',
        ],
      },
      {
        code: 'count',
        label: 'How many alarms (or how many bedrooms, for a full compliance install)?',
        type: 'number',
      },
    ],
  },
  outdoor_lighting: {
    catalogueCategory: 'outdoor_light',
    fields: [
      { code: 'count', label: 'How many outdoor light fittings?', type: 'number' },
      { code: 'room', label: 'Where are the outdoor lights going?', type: 'text' },
      {
        code: 'sensor',
        label: 'On a sensor, or always-on / switched?',
        type: 'select',
        options: ['on a sensor', 'always-on', 'switched'],
      },
    ],
  },
  switchboard: { fields: GENERIC, usuallyInspection: true },
  oven_cooktop: {
    catalogueCategory: 'oven_cooktop',
    fields: [
      {
        code: 'appliance',
        label: 'Which appliance?',
        type: 'select',
        options: ['oven', 'cooktop', 'induction cooktop', 'oven and cooktop'],
      },
      {
        code: 'replace_or_new',
        label: 'Is there existing wiring in place, or does a new circuit need running?',
        type: 'select',
        options: ['existing wiring', 'new circuit needed (on-site inspection)', 'not sure'],
      },
    ],
  },
  ev_charger: {
    catalogueCategory: 'ev_charger',
    fields: [
      { code: 'room', label: 'Where is the charger going?', type: 'text' },
      {
        code: 'phase',
        label: 'Single phase or three phase?',
        type: 'select',
        options: ['single phase', 'three phase (on-site inspection)', 'not sure'],
      },
    ],
  },
  fault_finding: {
    catalogueCategory: 'fault_find',
    fields: [
      { code: 'room', label: 'Which room or circuit is affected?', type: 'text' },
      {
        code: 'fault_symptom',
        label: "What's happening?",
        type: 'select',
        options: [
          'breaker tripping',
          'no power to an area',
          'lights flickering',
          'burning smell',
          'something else',
        ],
      },
    ],
  },
  renovation: { fields: GENERIC, usuallyInspection: true },

  // ── Plumbing ────────────────────────────────────────────────────
  blocked_drain: {
    catalogueCategory: 'drain',
    fields: [
      {
        code: 'room',
        label: 'Which drain is blocked?',
        type: 'select',
        options: [
          'kitchen sink',
          'bathroom basin',
          'shower',
          'toilet',
          'laundry',
          'external / stormwater',
        ],
      },
      {
        code: 'blockage_severity',
        label: 'Is it slow draining, or completely blocked?',
        type: 'select',
        options: ['slow draining', 'completely blocked'],
      },
    ],
  },
  hot_water: {
    catalogueCategory: 'hot_water',
    fields: [
      {
        code: 'energy_source',
        label: 'What type of hot water system is it?',
        type: 'select',
        options: [
          'electric',
          'gas',
          'heat pump',
          'solar (on-site inspection)',
          'not sure (on-site inspection)',
        ],
      },
      {
        code: 'litres',
        label: 'Roughly what size is the unit?',
        type: 'select',
        options: ['125L', '160L', '250L', '315L', '400L', 'not sure'],
      },
      {
        code: 'room',
        label: 'Where is the unit located?',
        type: 'select',
        options: ['laundry', 'outside wall', 'garage', 'roof', 'somewhere else'],
      },
    ],
  },
  tap_repair: {
    catalogueCategory: 'tap',
    fields: [
      {
        code: 'room',
        label: 'Which tap is it?',
        type: 'select',
        options: ['kitchen', 'basin', 'laundry', 'outdoor', 'shower'],
      },
      {
        code: 'tap_symptom',
        label: "What's happening?",
        type: 'select',
        options: ['dripping', 'leaking from the body', 'stuck / won’t turn'],
      },
    ],
  },
  tap_replace: {
    catalogueCategory: 'tap',
    fields: [
      {
        code: 'room',
        label: 'Which tap are we replacing?',
        type: 'select',
        options: ['kitchen mixer', 'basin', 'laundry', 'outdoor', 'shower'],
      },
      {
        code: 'supplied_by',
        label: 'Is the customer supplying the tap, or are we?',
        type: 'select',
        options: ['customer supplies', 'we supply'],
      },
    ],
  },
  toilet_repair: {
    catalogueCategory: 'toilet',
    fields: [
      {
        code: 'room',
        label: 'Which toilet is it?',
        type: 'select',
        options: ['main', 'ensuite', 'second bathroom'],
      },
      {
        code: 'toilet_symptom',
        label: "What's happening?",
        type: 'select',
        options: ['constantly running', 'leaking', 'won’t flush'],
      },
    ],
  },
  toilet_replace: {
    catalogueCategory: 'toilet',
    fields: [
      {
        code: 'room',
        label: 'Which toilet are we replacing?',
        type: 'select',
        options: ['main', 'ensuite', 'second bathroom'],
      },
      {
        code: 'toilet_style',
        label: 'Any style preference?',
        type: 'select',
        options: [
          'standard close-coupled',
          'wall-faced',
          'back-to-wall',
          'in-wall cistern',
          'not sure',
        ],
      },
      {
        code: 'supplied_by',
        label: 'Is the customer supplying the suite, or are we?',
        type: 'select',
        options: ['customer supplies', 'we supply'],
      },
    ],
  },
  gas_fitting: {
    catalogueCategory: 'gas',
    fields: [
      { code: 'room', label: 'Where is the appliance going?', type: 'text' },
      {
        code: 'appliance',
        label: 'Which appliance is being connected?',
        type: 'select',
        options: ['cooktop', 'oven', 'hot water unit', 'heater', 'BBQ point', 'something else'],
      },
    ],
  },
  burst_pipe: { fields: GENERIC, usuallyInspection: true },
  bathroom_renovation: { fields: GENERIC, usuallyInspection: true },
  cctv_inspection: {
    catalogueCategory: 'cctv',
    fields: [
      {
        code: 'room',
        label: 'Which line needs the camera run through it?',
        type: 'select',
        options: ['sewer', 'stormwater', 'kitchen waste', 'not sure'],
      },
    ],
  },
  prv_install: {
    catalogueCategory: 'prv',
    fields: [{ code: 'room', label: 'Where is the water main / meter located?', type: 'text' }],
  },

  // ── Fallback ────────────────────────────────────────────────────
  other: { fields: GENERIC, usuallyInspection: true },
};

/** Field spec for a job type. Unknown job types fall back to the generic set. */
export function fieldsForJobType(jobType: string | null | undefined): JobFormSpec {
  return JOB_FIELDS[(jobType ?? '').trim()] ?? { fields: GENERIC, usuallyInspection: true };
}

// ── Trade routing (web lib/intake/schema.ts, verbatim job_type → trade split) ──

const ELECTRICAL_JOB_TYPES = [
  'downlights',
  'power_points',
  'ceiling_fans',
  'smoke_alarms',
  'outdoor_lighting',
  'switchboard',
  'oven_cooktop',
  'ev_charger',
  'fault_finding',
  'renovation',
] as const;

const PLUMBING_JOB_TYPES = [
  'blocked_drain',
  'hot_water',
  'tap_repair',
  'tap_replace',
  'toilet_repair',
  'toilet_replace',
  'gas_fitting',
  'burst_pipe',
  'bathroom_renovation',
  'cctv_inspection',
  'prv_install',
] as const;

const PLUMBING_SET = new Set<string>(PLUMBING_JOB_TYPES);

/** Job types not in the plumbing set (including 'other') default to electrical. */
export function deriveTradeFromJobType(jobType: string): 'electrical' | 'plumbing' {
  return PLUMBING_SET.has(jobType) ? 'plumbing' : 'electrical';
}

/** Job types offered for a trade — 'other' is electrical's fallback, matching the web picker. */
export function jobTypesForTrade(trade: 'electrical' | 'plumbing'): readonly string[] {
  return trade === 'plumbing' ? PLUMBING_JOB_TYPES : [...ELECTRICAL_JOB_TYPES, 'other'];
}

const ACRONYMS: Record<string, string> = {
  ev: 'EV',
  cctv: 'CCTV',
  prv: 'PRV',
  gpo: 'GPO',
  rcd: 'RCD',
};

/** "blocked_drain" → "Blocked drain", "ev_charger" → "EV charger". */
export function formatJobType(jobType: string | null | undefined): string {
  if (!jobType) return 'Unclassified';
  return jobType
    .split('_')
    .map((word, i) => {
      const acronym = ACRONYMS[word.toLowerCase()];
      if (acronym) return acronym;
      return i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(' ');
}
