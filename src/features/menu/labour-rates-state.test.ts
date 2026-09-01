import {
  buildLabourSavePlan,
  labourEditorReducer,
  type LabourEditorState,
} from './labour-rates-state';

const values = (hourly: string, callOut = '0', markup = '0') => ({
  hourly,
  callOut,
  markup,
});

describe('labour-rate acknowledged baseline', () => {
  it('saves A→B and then the reverse B→A instead of comparing forever with the mount seed', () => {
    const a = values('100');
    let state: LabourEditorState = {
      baseline: { electrical: a },
      values: { electrical: a },
    };

    state = labourEditorReducer(state, {
      type: 'EDIT',
      trade: 'electrical',
      field: 'hourly',
      value: '110',
    });
    const forward = buildLabourSavePlan(['electrical'], state.values, state.baseline);
    expect(forward.patch.electrical?.hourly_rate).toBe(110);

    state = labourEditorReducer(state, {
      type: 'ACK',
      trades: ['electrical'],
      submitted: state.values,
    });
    state = labourEditorReducer(state, {
      type: 'EDIT',
      trade: 'electrical',
      field: 'hourly',
      value: '100',
    });
    const reverse = buildLabourSavePlan(['electrical'], state.values, state.baseline);
    expect(reverse.patch.electrical?.hourly_rate).toBe(100);
  });

  it('resyncs clean values to remote truth without overwriting an in-progress edit', () => {
    const original = values('100');
    const remote = values('120');
    const clean = labourEditorReducer(
      { baseline: { plumbing: original }, values: { plumbing: original } },
      { type: 'REMOTE', incoming: { plumbing: remote } },
    );
    expect(clean.values.plumbing).toEqual(remote);

    const dirtyBefore: LabourEditorState = {
      baseline: { plumbing: original },
      values: { plumbing: values('115') },
    };
    const dirty = labourEditorReducer(dirtyBefore, {
      type: 'REMOTE',
      incoming: { plumbing: remote },
    });
    expect(dirty.baseline.plumbing).toEqual(remote);
    expect(dirty.values.plumbing).toEqual(values('115'));
  });

  it('preserves blank and zero semantics at the save boundary', () => {
    const baseline = { electrical: values('90', '25', '10') };
    const zeroAllowed = buildLabourSavePlan(
      ['electrical'],
      { electrical: values('100', '0', '0') },
      baseline,
    );
    expect(zeroAllowed.valid).toBe(true);
    expect(zeroAllowed.patch.electrical).toEqual({
      hourly_rate: 100,
      call_out_minimum: 0,
      default_markup_pct: 0,
    });

    const blank = buildLabourSavePlan(['electrical'], { electrical: values('', '', '') }, baseline);
    expect(blank.valid).toBe(false);
    expect(blank.errors.electrical).toMatchObject({
      hourly: 'Enter an amount',
      callOut: 'Enter an amount',
      markup: 'Enter a percentage',
    });

    const zeroHourly = buildLabourSavePlan(
      ['electrical'],
      { electrical: values('0', '0', '0') },
      baseline,
    );
    expect(zeroHourly.valid).toBe(false);
    expect(zeroHourly.errors.electrical?.hourly).toMatch(/more than A\$0/i);
  });
});
