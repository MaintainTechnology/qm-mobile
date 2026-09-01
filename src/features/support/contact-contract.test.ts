import {
  CONTACT_TOPICS,
  contactSubmissionGate,
  EMPTY_CONTACT_DRAFT,
  validateContactDraft,
} from './contact-contract';

function validDraft() {
  return {
    ...EMPTY_CONTACT_DRAFT,
    name: '  Alex Tradie  ',
    email: ' alex@example.com ',
    phone: ' 0412 345 678 ',
    message: '  I need help with my QuoteMax account.  ',
  };
}

describe('public contact contract', () => {
  it('matches the five approved web topics', () => {
    expect(CONTACT_TOPICS).toEqual([
      'General enquiry',
      'Pricing and plans',
      'My trade is not listed',
      'Partnership',
      'Something else',
    ]);
  });

  it('trims a valid draft without inventing optional values', () => {
    expect(validateContactDraft(validDraft())).toEqual({
      ok: true,
      value: {
        name: 'Alex Tradie',
        email: 'alex@example.com',
        phone: '0412 345 678',
        topic: 'General enquiry',
        message: 'I need help with my QuoteMax account.',
      },
    });
    expect(validateContactDraft({ ...validDraft(), phone: '' }).ok).toBe(true);
  });

  it('rejects empty, invalid and over-limit fields before sending', () => {
    const empty = validateContactDraft(EMPTY_CONTACT_DRAFT);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(Object.keys(empty.errors)).toEqual(['name', 'email', 'message']);

    const invalid = validateContactDraft({
      ...validDraft(),
      name: 'n'.repeat(101),
      email: 'not-an-email',
      phone: '0'.repeat(41),
      message: 'm'.repeat(4001),
    });
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors).toMatchObject({
        name: expect.any(String),
        email: expect.any(String),
        phone: expect.any(String),
        message: expect.any(String),
      });
    }
  });

  it('blocks offline and duplicate submission attempts', () => {
    expect(contactSubmissionGate(false, true)).toBeNull();
    expect(contactSubmissionGate(false, false)).toBe('offline');
    expect(contactSubmissionGate(true, true)).toBe('busy');
    expect(contactSubmissionGate(true, false)).toBe('busy');
  });
});
