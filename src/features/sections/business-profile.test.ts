import { profileChanges, profileConflicts, profileFromTenant } from './business-profile';

const tenant = { business_name: 'Trade Co', owner_first_name: 'Alex', owner_email: 'contact@example.test',
  owner_mobile: '0412345678', state: 'NSW', abn: '123', sms_estimator_enabled: false };
it('sends only changed business fields and never provisioned phone, credentials, licences or other settings', () => {
  const base = profileFromTenant({ ...tenant, twilio_sms_number: '+61499999999', password: 'never', licence_number: 'LIC' });
  expect(profileChanges({ ...base, business_name: 'New name' }, base)).toEqual({ business_name: 'New name' });
});
it('preserves blank optional ABN as an explicit clear and does not fabricate legacy absent details', () => {
  const base = profileFromTenant(tenant);
  expect(profileChanges({ ...base, abn: '' }, base)).toEqual({ abn: '' });
  const legacy = profileFromTenant({ business_name: 'Old name' });
  expect(profileChanges({ ...legacy, business_name: 'New name' }, legacy)).toEqual({ business_name: 'New name' });
});
it.each([{ business_name: 'A' }, { owner_first_name: '' }, { owner_email: 'not-email' }, { owner_mobile: '123' }, { state: 'NZ' }])('rejects invalid edited fields %j', patch => {
  const base = profileFromTenant(tenant); expect(() => profileChanges({ ...base, ...patch }, base)).toThrow();
});
it('detects edits to the same field elsewhere without treating unrelated changes as a conflict', () => {
  const base = profileFromTenant(tenant);
  expect(profileConflicts({ ...base, state: 'VIC' }, base, { business_name: 'New name' })).toEqual([]);
  expect(profileConflicts({ ...base, business_name: 'Other device' }, base, { business_name: 'New name' })).toEqual(['business_name']);
});
