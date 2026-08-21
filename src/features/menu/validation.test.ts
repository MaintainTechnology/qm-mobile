import { parsePercent, parseRateCents } from './validation';

describe('parseRateCents', () => {
  it('blocks a blank required field rather than sending 0', () => {
    const result = parseRateCents('', { positive: true });
    expect(result.cents).toBeNull();
    expect(result.error).not.toBeNull();
  });

  it('treats a blank optional field as a deliberate "clear the override" — no error', () => {
    const result = parseRateCents('', { positive: true, required: false });
    expect(result.cents).toBeNull();
    expect(result.error).toBeNull();
    expect(result.provided).toBe(false);
  });

  it('accepts a positive amount within bounds', () => {
    expect(parseRateCents('95', { positive: true, maxDollars: 500 })).toEqual({
      cents: 9500,
      error: null,
      provided: true,
    });
  });

  it('rejects zero when positive is required', () => {
    expect(parseRateCents('0', { positive: true }).error).not.toBeNull();
  });

  it('allows zero when not required to be positive', () => {
    expect(parseRateCents('0', { required: false }).cents).toBe(0);
  });

  it('rejects a value over the max', () => {
    expect(parseRateCents('501', { positive: true, maxDollars: 500 }).error).toBe(
      'Must be at most A$500',
    );
  });

  it('rejects unparseable input rather than coercing to 0', () => {
    expect(parseRateCents('abc', { required: false }).error).not.toBeNull();
  });
});

describe('parsePercent', () => {
  it('blocks blank input', () => {
    expect(parsePercent('').value).toBeNull();
  });

  it('accepts a value in range', () => {
    expect(parsePercent('35')).toEqual({ value: 35, error: null });
  });

  it('rejects a value over the bound', () => {
    expect(parsePercent('150').error).not.toBeNull();
  });

  it('rejects a negative value', () => {
    expect(parsePercent('-5').error).not.toBeNull();
  });
});
