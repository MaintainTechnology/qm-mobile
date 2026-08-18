import { SITE_VISIT_FEE_CENTS, addGst, formatAud, gstOf, parseAud, removeGst } from '@/lib/money';

describe('GST', () => {
  it('adds 10% to an ex-GST amount', () => {
    expect(addGst(SITE_VISIT_FEE_CENTS)).toBe(10890); // A$99.00 -> A$108.90
    expect(addGst(0)).toBe(0);
  });

  it('takes GST as one eleventh of a GST-inclusive amount', () => {
    expect(gstOf(10890)).toBe(990); // A$9.90 of A$108.90
  });

  it('is reversible: strip GST and you are back where you started', () => {
    for (const exGst of [1, 99, 100, 9900, 123456, 999999]) {
      expect(removeGst(addGst(exGst))).toBe(exGst);
    }
  });

  it('does not use ten percent of the inclusive amount', () => {
    // The classic bug. 10% of 10890 is 1089, which is not the GST.
    expect(gstOf(10890)).not.toBe(1089);
  });
});

describe('rounding', () => {
  it('rounds half away from zero so refunds do not drift', () => {
    // Math.round(-2.5) is -2, which would under-refund. addGst must not inherit that.
    expect(addGst(-250)).toBe(-275);
    expect(addGst(250)).toBe(275);
  });

  it('never produces a fractional cent', () => {
    for (const cents of [1, 3, 7, 33, 12345]) {
      expect(Number.isInteger(addGst(cents))).toBe(true);
      expect(Number.isInteger(gstOf(cents))).toBe(true);
    }
  });
});

describe('formatAud', () => {
  it('formats with A$, thousands separators and two decimals', () => {
    expect(formatAud(123456)).toBe('A$1,234.56');
    expect(formatAud(0)).toBe('A$0.00');
    expect(formatAud(5)).toBe('A$0.05');
  });
});

describe('parseAud', () => {
  it('reads the shapes a tradie actually types', () => {
    expect(parseAud('12.34')).toBe(1234);
    expect(parseAud('A$12.34')).toBe(1234);
    expect(parseAud('1,234.56')).toBe(123456);
    expect(parseAud('99')).toBe(9900);
  });

  it('returns null rather than 0 for unreadable input', () => {
    // A silent 0 becomes a free job, so this must never coerce.
    expect(parseAud('')).toBeNull();
    expect(parseAud('abc')).toBeNull();
    expect(parseAud('12.3.4')).toBeNull();
  });
});
