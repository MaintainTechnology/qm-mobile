import {
  API_TO_LOCAL_KEY,
  buildActivatePayload,
  EMPTY_ONBOARD_FORM,
  fieldLabel,
  formatAuMobileDisplay,
  isCodeError,
  optionalNumber,
  ROOFING_RATE_FIELDS,
  stepForFields,
} from './onboard-fields';

describe('optionalNumber (web optionalNumber parity)', () => {
  it('parses a plain amount', () => {
    expect(optionalNumber('110')).toBe(110);
  });

  it('blank never becomes 0 — it drops the field', () => {
    expect(optionalNumber('')).toBeUndefined();
    expect(optionalNumber('   ')).toBeUndefined();
  });

  it('strips currency formatting', () => {
    expect(optionalNumber('$ 1,234.50'.replace(',', ''))).toBe(1234.5);
  });

  it('non-numeric garbage drops the field rather than becoming 0', () => {
    expect(optionalNumber('TBC')).toBeUndefined();
    expect(optionalNumber('n/a')).toBeUndefined();
    expect(optionalNumber('$')).toBeUndefined();
  });

  it('a literal 0 drops the field — 0 is not an accepted override', () => {
    expect(optionalNumber('0')).toBeUndefined();
    expect(optionalNumber('0.00')).toBeUndefined();
    expect(optionalNumber('$0')).toBeUndefined();
  });

  it('a stray minus is rejected, never silently stripped into a positive number', () => {
    expect(optionalNumber('-5')).toBeUndefined();
    expect(optionalNumber('-45.50')).toBeUndefined();
  });
});

describe('buildActivatePayload (spec B4)', () => {
  it('omits every blank optional numeric field rather than sending 0', () => {
    const payload = buildActivatePayload(EMPTY_ONBOARD_FORM, {
      clerkUserId: 'user_123',
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
      clerkUserId: 'user_123',
      invitationCode: 'CODE',
    });
    expect(payload.painting_walls_rate).toBe(28);
    expect(payload.roofing_corrugated_rate).toBe(90);
  });

  it('trims and carries the invitation code + clerk user id', () => {
    const payload = buildActivatePayload(EMPTY_ONBOARD_FORM, {
      clerkUserId: 'user_123',
      invitationCode: '  CODE  ',
    });
    expect(payload.invitation_code).toBe('CODE');
    expect(payload.clerk_user_id).toBe('user_123');
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
