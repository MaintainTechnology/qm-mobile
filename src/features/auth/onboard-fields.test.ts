import {
  API_TO_LOCAL_KEY,
  buildActivatePayload,
  EMPTY_ONBOARD_FORM,
  fieldLabel,
  formatAuMobileDisplay,
  isCodeError,
  OnboardNumericValidationError,
  parseOptionalNumber,
  ROOFING_RATE_FIELDS,
  stepForFields,
} from './onboard-fields';

describe('parseOptionalNumber (zero-safe web schema parity)', () => {
  it('parses a plain amount', () => {
    expect(parseOptionalNumber('110')).toEqual({ kind: 'value', value: 110 });
  });

  it('distinguishes blank from a literal zero', () => {
    expect(parseOptionalNumber('')).toEqual({ kind: 'blank' });
    expect(parseOptionalNumber('   ')).toEqual({ kind: 'blank' });
    expect(parseOptionalNumber('0', { min: 0 })).toEqual({ kind: 'value', value: 0 });
  });

  it('strips currency formatting', () => {
    expect(parseOptionalNumber('$ 1,234.50')).toEqual({ kind: 'value', value: 1234.5 });
  });

  it('reports non-numeric input as invalid instead of dropping it', () => {
    expect(parseOptionalNumber('TBC')).toEqual({ kind: 'invalid', raw: 'TBC' });
    expect(parseOptionalNumber('n/a')).toEqual({ kind: 'invalid', raw: 'n/a' });
    expect(parseOptionalNumber('$')).toEqual({ kind: 'invalid', raw: '$' });
  });

  it('reports zero as out-of-range only for a strictly-positive field', () => {
    expect(parseOptionalNumber('0', { min: 0, exclusiveMin: true })).toMatchObject({
      kind: 'out_of_range',
      value: 0,
    });
  });

  it('distinguishes a syntactically valid but out-of-range value', () => {
    expect(parseOptionalNumber('-5', { min: 0 })).toMatchObject({
      kind: 'out_of_range',
      value: -5,
    });
    expect(parseOptionalNumber('101', { min: 0, max: 100 })).toMatchObject({
      kind: 'out_of_range',
      value: 101,
    });
  });
});

describe('buildActivatePayload (spec B4)', () => {
  it('omits every blank optional numeric field rather than sending 0', () => {
    const payload = buildActivatePayload(EMPTY_ONBOARD_FORM, {
      invitationCode: 'JON-JUNE-FLYERS-7K2P',
    });
    expect(payload.hourly_rate).toBeUndefined();
    expect(payload.call_out_minimum).toBeUndefined();
    expect(payload.risk_buffer_pct).toBeUndefined();
    expect(payload.roofing_cement_sheet_rate).toBeUndefined();
    // Cement sheet's default IS blank — asserting it never silently becomes 0.
    expect(payload.roofing_cement_sheet_rate).not.toBe(0);
  });

  it('carries the pre-filled painting/roofing defaults as numbers, not strings', () => {
    const payload = buildActivatePayload(EMPTY_ONBOARD_FORM, {
      invitationCode: 'CODE',
    });
    expect(payload.painting_walls_rate).toBe(28);
    expect(payload.roofing_corrugated_rate).toBe(90);
  });

  it('trims the invitation code and omits all client-controlled ownership ids', () => {
    const payload = buildActivatePayload(EMPTY_ONBOARD_FORM, {
      invitationCode: '  CODE  ',
    });
    expect(payload.invitation_code).toBe('CODE');
    expect(payload).not.toHaveProperty('clerk_user_id');
    expect(payload).not.toHaveProperty('owner_user_id');
  });

  it('carries only the verified intent token and lets the server derive its phone', () => {
    const payload = buildActivatePayload(
      { ...EMPTY_ONBOARD_FORM, mobile: '0412 345 678' },
      { invitationCode: 'SMS-CODE', intentToken: 'abc123' },
    );

    expect(payload.intent_token).toBe('abc123');
    expect(payload.owner_mobile).toBeUndefined();
  });

  it('preserves every field whose server bound permits zero', () => {
    const payload = buildActivatePayload(
      {
        ...EMPTY_ONBOARD_FORM,
        markupPct: '0',
        apprenticeRate: '0.00',
        seniorRate: '$0',
        minLabourHours: '0',
        riskBufferPct: '0',
        paintingCallOutMin: '0',
      },
      { invitationCode: 'CODE' },
    );

    expect(payload.default_markup_pct).toBe(0);
    expect(payload.apprentice_rate).toBe(0);
    expect(payload.senior_rate).toBe(0);
    expect(payload.min_labour_hours).toBe(0);
    expect(payload.risk_buffer_pct).toBe(0);
    expect(payload.painting_call_out_minimum).toBe(0);
  });

  it('surfaces invalid and out-of-range fields under their API keys', () => {
    try {
      buildActivatePayload(
        {
          ...EMPTY_ONBOARD_FORM,
          markupPct: 'TBC',
          afterHoursMultiplier: '0',
          paintingWallsRate: '201',
          roofing: { ...EMPTY_ONBOARD_FORM.roofing, colorbond_corrugated: '0' },
        },
        { invitationCode: 'CODE' },
      );
      throw new Error('Expected numeric validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(OnboardNumericValidationError);
      expect((error as OnboardNumericValidationError).fieldErrors).toMatchObject({
        default_markup_pct: ['Enter a valid number.'],
        after_hours_multiplier: [expect.stringContaining('1')],
        painting_walls_rate: [expect.stringContaining('200')],
        roofing_corrugated_rate: [expect.stringContaining('above 0')],
      });
    }
  });
});

describe('stepForFields / fieldLabel (spec B5 — jump to earliest offending step)', () => {
  it('sends a pricing-only failure to step 3', () => {
    expect(stepForFields(['hourly_rate', 'default_markup_pct'])).toBe(3);
  });

  it('picks the EARLIEST step across a mixed failure', () => {
    expect(stepForFields(['risk_buffer_pct', 'trades', 'business_name'])).toBe(1);
  });

  it('returns null when nothing rejected is rendered by the wizard', () => {
    expect(stepForFields(['owner_user_id'])).toBeNull();
  });

  it('labels a known field with its on-screen label, not the raw key', () => {
    expect(fieldLabel('default_markup_pct')).toBe('Default markup');
  });

  it('falls back to a humanised label for an unmapped field', () => {
    expect(fieldLabel('some_new_field_pct')).toBe('Some new field');
  });
});

describe('isCodeError (spec B5 — code errors return to the code pane)', () => {
  it.each(['code_not_found', 'code_revoked', 'code_paused', 'code_expired', 'quota_exhausted'])(
    '%s routes back to the code pane',
    code => expect(isCodeError(code)).toBe(true),
  );

  it('a validation error is not a code error', () => {
    expect(isCodeError('validation_failed')).toBe(false);
    expect(isCodeError(undefined)).toBe(false);
  });
});

describe('API_TO_LOCAL_KEY', () => {
  it('maps every roofing material to its dotted local key', () => {
    for (const f of ROOFING_RATE_FIELDS) {
      expect(API_TO_LOCAL_KEY[f.apiField]).toBe(`roofing.${f.key}`);
    }
  });
});

describe('formatAuMobileDisplay', () => {
  it('spaces an E.164 AU mobile', () => {
    expect(formatAuMobileDisplay('+61412345678')).toBe('+61 412 345 678');
  });

  it('passes through anything it does not recognise', () => {
    expect(formatAuMobileDisplay('0412345678')).toBe('0412345678');
  });
});
