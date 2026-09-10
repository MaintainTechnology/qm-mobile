import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { mockProfilePrevent, mockProfileToken, profileFailures, profileMutations, profileRequests, profileStore, resetProfileHarness, setProfileServer } from './business-profile-test-harness';
import { BusinessProfileEditor } from './BusinessProfileEditor';
import { profileDeferred, profileMe } from './business-profile-test-fixture';

beforeEach(resetProfileHarness);
const mount = async () => { const ui = await render(<BusinessProfileEditor me={profileMe} />); await waitFor(() => expect(screen.getByLabelText('Business name').props.editable).toBe(true)); return ui; };
it('shows eight editable business fields with exact address bounds and keeps login credentials separate', async () => {
  await mount();
  for (const label of ['Business name', 'Your first name', 'Business contact email', 'Business contact mobile', 'ABN (optional)', 'Business address', 'SMS plan estimator'])
    expect(screen.getByLabelText(label)).toBeTruthy();
  expect(screen.getByLabelText('Business address').props.maxLength).toBe(200);
  expect(screen.getByText('State or territory')).toBeTruthy();
  expect(screen.getByText(/login email and password are managed separately by Clerk/)).toBeTruthy();
  expect(profileRequests).toHaveLength(0);
});
it('preserves same-batch changes through the actual editor and durable operation body', async () => {
  await mount();
  const name = screen.getByLabelText('Business name').props.onChangeText;
  const address = screen.getByLabelText('Business address').props.onChangeText;
  await act(() => { name('Updated business'); address('New business address'); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save business details' })).toBeEnabled());
  expect(await profileStore().load()).toMatchObject({ value: { value: { business_name: 'Updated business', business_address: 'New business address' } } });
  await fireEvent.press(screen.getByRole('button', { name: 'Save business details' }));
  await waitFor(() => expect(profileRequests).toHaveLength(1));
  expect(profileRequests[0]?.patch).toEqual({ business_name: 'Updated business', business_address: 'New business address' });
});
it('offers exact read-only operation checking after a lost reply and never replaces a newer saved value', async () => {
  await mount(); await fireEvent.changeText(screen.getByLabelText('Business name'), 'Original pending update');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save business details' })).toBeEnabled());
  profileFailures.afterCommit = true; await fireEvent.press(screen.getByRole('button', { name: 'Save business details' }));
  await screen.findByText('Check the previous business update'); setProfileServer({ business_name: 'Newer saved business' });
  await fireEvent.press(screen.getByRole('button', { name: 'Check saved business details' }));
  await waitFor(() => expect(screen.getByLabelText('Business name').props.value).toBe('Newer saved business'));
  expect(profileRequests).toHaveLength(1); expect(profileMutations).toHaveLength(1);
});
it('shows a changed false boolean as an explicit value during review and keeps the chosen edit until rebase', async () => {
  await mount(); await fireEvent.changeText(screen.getByLabelText('Business name'), 'My unsaved business');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save business details' })).toBeEnabled());
  setProfileServer({ sms_estimator_enabled: true });
  await fireEvent.press(screen.getByRole('button', { name: 'Check saved business details' }));
  await screen.findByText('Review current business details');
  expect(screen.queryByText('Your edit: Blank')).toBeNull();
  expect(screen.getByLabelText('SMS plan estimator').props.value).toBe(false);
  expect(screen.getByRole('button', { name: 'Save business details' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: 'Use reviewed details and keep my edits' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save business details' })).toBeEnabled());
  expect(screen.getByLabelText('SMS plan estimator').props.value).toBe(true);
  expect(screen.getByLabelText('Business name').props.value).toBe('My unsaved business');
  expect(mockProfilePrevent).toHaveBeenLastCalledWith(false, expect.any(Function));
});
it('announces state choices disabled during loading and saving, preserving the selected state when editing resumes', async () => {
  const loading = profileDeferred<string>(); mockProfileToken.mockReturnValueOnce(loading.promise);
  await render(<BusinessProfileEditor me={profileMe} />);
  await waitFor(() => expect(mockProfileToken).toHaveBeenCalledTimes(1));
  for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  await fireEvent.press(screen.getByRole('radio', { name: 'VIC' }));
  expect(screen.getByRole('radio', { name: 'NSW' }).props.accessibilityState.checked).toBe(true);
  await act(() => loading.resolve('token:user_A:session_A'));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'VIC' })).toBeEnabled());
  await fireEvent.press(screen.getByRole('radio', { name: 'VIC' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save business details' })).toBeEnabled());
  const saving = profileDeferred<string>(); mockProfileToken.mockReturnValueOnce(saving.promise);
  await fireEvent.press(screen.getByRole('button', { name: 'Save business details' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'NSW' })).toBeDisabled());
  await fireEvent.press(screen.getByRole('radio', { name: 'NSW' }));
  expect(screen.getByRole('radio', { name: 'VIC' }).props.accessibilityState.checked).toBe(true);
  await act(() => saving.resolve('token:user_A:session_A'));
  await waitFor(() => expect(screen.getByRole('radio', { name: 'VIC' })).toBeEnabled());
  expect(screen.getByRole('radio', { name: 'VIC' }).props.accessibilityState.checked).toBe(true);
  expect(profileRequests.map(request => request.patch)).toEqual([{ state: 'VIC' }]);
});
