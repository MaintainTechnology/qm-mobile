import { usePreventRemove } from '@react-navigation/native';
import { Alert, Text, View } from 'react-native';
import { z } from 'zod';
import { ThemedSwitch } from '@/components/ThemedSwitch';
import { Field, GhostButton, PrimaryCta } from '@/features/auth/ui';
import { BusinessAddressField } from '@/features/auth/BusinessAddressField';
import { Card, Notice, PillGroup } from '@/features/trades/ui';
import { apiErrorMessage } from '@/lib/api';
import type { TenantMe } from '@/lib/tenant';
import { fonts, spacing } from '@/lib/theme';
import { useTheme } from '@/lib/useTheme';
import { WorkingDraftStorageError } from '@/lib/working-draft-storage';
import { PROFILE_FIELDS, PROFILE_STATES, profileFromTenant, type BusinessProfile, type ProfileField } from './business-profile';
import { BusinessProfileError } from './business-profile-contract';
import { useBusinessProfile } from './use-business-profile';

const fields: { key: Exclude<ProfileField, 'state' | 'sms_estimator_enabled'>; label: string; limit: number; keyboard?: 'email-address' | 'phone-pad' | 'number-pad' }[] = [
  { key: 'business_name', label: 'Business name', limit: 80 },
  { key: 'owner_first_name', label: 'Your first name', limit: 40 },
  { key: 'owner_email', label: 'Business contact email', limit: 120, keyboard: 'email-address' },
  { key: 'owner_mobile', label: 'Business contact mobile', limit: 20, keyboard: 'phone-pad' },
  { key: 'abn', label: 'ABN (optional)', limit: 20, keyboard: 'number-pad' },
];
export function BusinessProfileEditor({ me }: { me: TenantMe }) {
  try { profileFromTenant(me.tenant); }
  catch { return <Notice tone="danger" label="Business details could not be validated" body="Refresh your account before editing. The saved details have not been changed." />; }
  return <BusinessProfileForm me={me} />;
}
function BusinessProfileForm({ me }: { me: TenantMe }) {
  const { colors } = useTheme();
  const model = useBusinessProfile(me);
  usePreventRemove(model.busy || (model.loaded && !model.stored), () => {
    Alert.alert('Keep your business details open', model.busy ? 'Wait for the account update to finish.' : 'Your latest fields have not finished saving securely. Retry working-copy storage before leaving.');
  });
  const text = { color: colors.textSec, fontFamily: fonts.sans.regular, fontSize: 14, lineHeight: 21 };
  const errors = model.error instanceof z.ZodError ? Object.fromEntries(model.error.issues.map(issue => [String(issue.path[0]), issue.message]))
    : model.error instanceof BusinessProfileError && model.error.field ? { [model.error.field]: model.error.message } : {};
  const errorMessage = model.error instanceof BusinessProfileError || model.error instanceof WorkingDraftStorageError ? model.error.message : apiErrorMessage(model.error);
  return <Card style={{ gap: spacing.lg }}>
    <Text accessibilityRole="header" style={{ color: colors.textPri, fontFamily: fonts.sans.bold, fontSize: 20 }}>Edit business details</Text>
    <Text style={text}>These details appear on customer quotes. Your login email and password are managed separately by Clerk; the provisioned QuoteMax phone number stays in your account summary.</Text>
    {!model.loaded ? <Notice tone="accent" label="Loading your saved business edit…" /> : null}
    {model.error ? <Notice tone="danger" label="Business details need attention" body={Object.keys(errors).length ? 'Check the marked fields below.' : errorMessage} /> : null}
    {!model.loaded || !model.stored ? <GhostButton label="Retry working-copy storage" onPress={() => void model.retryStorage()} disabled={model.busy} /> : null}
    {fields.map(field => <View key={field.key} style={{ gap: spacing.xs }}>
      <Field label={field.label} value={model.value[field.key]} onChangeText={value => model.edit({ [field.key]: value } as Partial<BusinessProfile>)}
        maxLength={field.limit} keyboardType={field.keyboard} autoCapitalize={field.keyboard === 'email-address' ? 'none' : 'words'}
        editable={model.loaded && !model.busy} height={54} />
      {errors[field.key] ? <Text accessibilityRole="alert" style={{ ...text, color: colors.danger }}>{errors[field.key]}</Text> : null}
    </View>)}
    <BusinessAddressField value={model.value.business_address} onChange={business_address => model.edit({ business_address })}
      disabled={!model.loaded || model.busy} error={errors.business_address} />
    <Text style={text}>State or territory</Text>
    <PillGroup options={PROFILE_STATES.map(state => [state, state] as const)} value={model.value.state}
      disabled={!model.loaded || model.busy}
      onChange={state => { if (model.loaded && !model.busy) model.edit({ state }); }} />
    {errors.state ? <Text accessibilityRole="alert" style={{ ...text, color: colors.danger }}>{errors.state}</Text> : null}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Text style={[text, { flex: 1 }]}>Offer electrical plan estimation by SMS</Text>
      <ThemedSwitch accessibilityLabel="SMS plan estimator" value={model.value.sms_estimator_enabled} disabled={!model.loaded || model.busy}
        onValueChange={enabled => model.edit({ sms_estimator_enabled: enabled })} />
    </View>
    {model.dirty ? <Notice tone="accent" label={model.stored ? 'Working copy saved on this device' : 'Saving working copy…'} body="Your encrypted edit is retained for seven days. Save business details to update your account." /> : null}
    {model.note ? <Notice tone="accent" label="Business update" body={model.note} /> : null}
    {model.receipt ? <Notice tone="warn" label="Check the previous business update" body={model.receipt.version === 1
      ? 'This older update has no server reference. Its outcome must be checked before another change can be submitted.'
      : 'Checking status reads the original server operation. A retry reuses its reference and exact fields, so a newer saved update cannot be overwritten.'} /> : null}
    {model.latest && !model.receipt ? <View style={{ gap: spacing.md }}>
      <Text accessibilityRole="header" style={text}>Review current business details</Text>
      {PROFILE_FIELDS.filter(field => model.value[field] !== model.latest!.value[field]).map(field => <View key={field} style={{ gap: spacing.xs }}>
        <Text style={text}>{fields.find(item => item.key === field)?.label ?? (field === 'state' ? 'State or territory' : field === 'business_address' ? 'Business address' : 'SMS plan estimator')}</Text>
        <Text style={text}>Saved: {typeof model.latest!.value[field] === 'boolean' ? model.latest!.value[field] ? 'On' : 'Off' : model.latest!.value[field] || 'Blank'}</Text>
        <Text style={text}>Your edit: {typeof model.value[field] === 'boolean' ? model.value[field] ? 'On' : 'Off' : model.value[field] || 'Blank'}</Text>
      </View>)}
      <GhostButton label="Use reviewed details and keep my edits" disabled={model.busy || !model.stored} onPress={model.rebase} />
    </View> : null}
    <PrimaryCta label={model.receipt ? 'Retry the same business update' : 'Save business details'} onPress={() => void model.save()}
      disabled={!model.loaded || !model.stored || (!model.dirty && !model.receipt) || model.receipt?.version === 1 || !!model.latest} loading={model.busy} />
    <GhostButton label="Check saved business details" onPress={() => void model.refresh()} disabled={!model.loaded || !model.stored || model.busy} />
    {model.dirty && !model.receipt ? <GhostButton label="Discard local business edit" disabled={model.busy} onPress={() => Alert.alert('Discard your business edit?', 'The latest saved business details will be reloaded.', [
      { text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: () => void model.refresh(true) },
    ])} /> : null}
  </Card>;
}
