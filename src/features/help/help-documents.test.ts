import {
  HELP_DOCUMENTS,
  filterHelpDocuments,
  helpDocumentFilename,
  helpDocumentMime,
  isApprovedHelpDocumentPath,
} from './help-documents';

describe('static help document census', () => {
  it('assigns every audited public HTML/PDF/CSV asset exactly once', () => {
    expect(HELP_DOCUMENTS).toHaveLength(49);
    expect(new Set(HELP_DOCUMENTS.map(document => document.path)).size).toBe(49);
  });

  it('opens only exact catalogued paths and never a query/token variant', () => {
    expect(isApprovedHelpDocumentPath('/docs/pricing-transparency.html')).toBe(true);
    expect(isApprovedHelpDocumentPath('/docs/pricing-transparency.html?token=secret')).toBe(false);
    expect(isApprovedHelpDocumentPath('/docs/not-in-census.html')).toBe(false);
  });

  it('maps downloadable documents to safe native share metadata', () => {
    const pdf = HELP_DOCUMENTS.find(document =>
      document.path.endsWith('pricing-transparency.pdf'),
    )!;
    expect(helpDocumentMime(pdf)).toBe('application/pdf');
    expect(helpDocumentFilename(pdf)).toBe('pricing-transparency.pdf');
  });

  it('searches approved titles case-insensitively and has an honest no-match result', () => {
    const tradie = HELP_DOCUMENTS.filter(document => document.audience === 'tradie');
    expect(filterHelpDocuments(tradie, 'PRICING transparency')).toHaveLength(2);
    expect(filterHelpDocuments(tradie, 'not a real guide')).toEqual([]);
    expect(filterHelpDocuments(tradie, '')).toHaveLength(tradie.length);
  });
});
