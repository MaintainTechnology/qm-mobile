import { parseStoredContactDraft } from './contact-draft';

describe('encrypted contact draft boundary', () => {
  it('restores only the expected bounded fields', () => {
    expect(
      parseStoredContactDraft(
        JSON.stringify({
          name: 'n'.repeat(110),
          email: 'person@example.com',
          phone: '',
          topic: 'Pricing and plans',
          message: 'm'.repeat(4010),
          token: 'must-not-restore',
        }),
      ),
    ).toEqual({
      name: 'n'.repeat(100),
      email: 'person@example.com',
      phone: '',
      topic: 'Pricing and plans',
      message: 'm'.repeat(4000),
    });
  });

  it('fails closed for corrupt or unapproved topic data', () => {
    expect(parseStoredContactDraft('{')).toBeNull();
    expect(
      parseStoredContactDraft(
        JSON.stringify({ name: '', email: '', phone: '', topic: 'Admin', message: '' }),
      ),
    ).toBeNull();
  });
});
