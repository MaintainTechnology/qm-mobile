import { PaintEditSnapshotSchema, paintEditMatchesDisplay } from './edit-review';

const runId = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb', extractionId = 'cccccccc-1111-4111-8111-cccccccccccc';
const item = { surface: 'walls', quantity: 0, separate_price: false, excluded: false, note: 'Keep this scope' };
const snapshot = PaintEditSnapshotSchema.parse({ runId, extractionId, revision: 'a'.repeat(64), job_name: 'Job', site_address: 'Address', items: [item], corrected_items: [item], released: false });
const run = { id: runId, job_name: 'Job', site_address: 'Address' };
const extraction = { id: extractionId, items: [item], corrected_items: [item] };
it('retains zero, false and exact correction rows in the observed source', () => {
  expect(paintEditMatchesDisplay(snapshot, run, extraction)).toBe(true);
  expect(paintEditMatchesDisplay(snapshot, { ...run, id: runId.toUpperCase() }, extraction)).toBe(true);
});
it.each([
  { run: { ...run, job_name: 'Other' } }, { run: { ...run, site_address: 'Other' } },
  { extraction: { ...extraction, id: runId } }, { extraction: { ...extraction, corrected_items: null } },
  { extraction: { ...extraction, items: [{ ...item, quantity: 1 }] } },
  { extraction: { ...extraction, corrected_items: [{ ...item, excluded: true }] } },
  { extraction: { ...extraction, corrected_items: [{ ...item, note: '' }] } },
])('refuses a different displayed source %j', changed => {
  expect(paintEditMatchesDisplay(snapshot, changed.run ?? run, changed.extraction ?? extraction)).toBe(false);
});
