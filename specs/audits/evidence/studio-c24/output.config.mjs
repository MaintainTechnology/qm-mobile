// Execute from the frozen web checkout; artifacts and harness live in mobile.
export default {
  root: 'C:/Users/dalig/Desktop/MaintainTech/MaintainOrg/qm-mobile/specs/audits/evidence/studio-c24',
  test: { globals: true, environment: 'node', include: ['output.fixture.mjs'], testTimeout: 90000, maxWorkers: 1 },
  resolve: { alias: { '@': 'C:/Users/dalig/Downloads/QuoteMate/quoteMate/quotemate-automation' } },
};
