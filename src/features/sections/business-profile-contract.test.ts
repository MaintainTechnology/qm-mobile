import { createHash } from 'node:crypto';
import fixture from './business-profile-hash.fixture.json';
import { PROFILE_FIELDS, ProfilePatchSchema } from './business-profile';
import { profileInputText, ProfileRequestSchema } from './business-profile-contract';

it('matches the shared cross-language UTF8 hash vector including false, empty, Unicode, newline and escaping', () => {
  const patch = ProfilePatchSchema.parse(fixture.patch);
  const text = profileInputText(fixture.expectedRevision, patch);
  expect(text).toBe(fixture.canonicalText);
  expect(createHash('sha256').update(text, 'utf8').digest('hex')).toBe(fixture.sha256);
  expect(Object.keys(patch).sort()).toEqual([...PROFILE_FIELDS].sort());
  expect(patch.sms_estimator_enabled).toBe(false); expect(patch.abn).toBe('');
});
it('enforces all eight fields including the 200-character address bound before preparing an operation', () => {
  const request = { requestId: '30000000-0000-4000-8000-000000000001', expectedRevision: fixture.expectedRevision,
    patch: { business_address: 'x'.repeat(200), sms_estimator_enabled: false, abn: '' } };
  expect(ProfileRequestSchema.parse(request).patch).toEqual(request.patch);
  expect(ProfileRequestSchema.safeParse({ ...request, patch: { business_address: 'x'.repeat(201) } }).success).toBe(false);
  expect(ProfileRequestSchema.safeParse({ ...request, patch: { password: 'not-a-business-field' } }).success).toBe(false);
  expect(ProfileRequestSchema.safeParse({ ...request, patch: {} }).success).toBe(false);
});
