import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { themes as mockThemes } from '@/lib/theme';
import { StudioEditor } from './StudioScreen';
import { DEFAULT_CAROUSEL } from './studio-presets';
import type { StudioDraft } from './studio-contract';
import { StudioExportCleanupError } from './studio-export-cache';
const mockLoad = jest.fn(async () => null as null | { value: StudioDraft });
const mockSave = jest.fn<Promise<void>, [StudioDraft]>(async () => undefined);
const mockRemove = jest.fn(async () => undefined);
const mockRender = jest.fn<Promise<Uint8Array>, unknown[]>(async () => new Uint8Array([1]));
const mockShare = jest.fn<Promise<void>, unknown[]>(async () => undefined);
const mockPdf = jest.fn<Promise<Uint8Array>, unknown[]>(async () => new Uint8Array([2]));
const mockPrevent = jest.fn();
const mockClearCache = jest.fn<Promise<void>, []>(async () => {});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@react-navigation/native', () => ({ usePreventRemove: (...args: unknown[]) => mockPrevent(...args) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), canGoBack: () => true }) }));
jest.mock('@/lib/useTheme', () => ({ useTheme: () => ({ colors: mockThemes.dark }) }));
jest.mock('@/lib/tenant', () => ({ useTenantMe: () => ({}) }));
jest.mock('@/lib/working-draft-storage', () => ({ createWorkingDraftStore: () => ({ load: mockLoad, save: mockSave, remove: mockRemove }) }));
jest.mock('./studio-render', () => ({ renderStudioPng: (...args: unknown[]) => mockRender(...args as []) }));
jest.mock('./studio-share', () => ({ shareStudioBytes: (...args: unknown[]) => mockShare(...args as []) }));
jest.mock('./studio-pdf', () => ({ createStudioPdf: (...args: unknown[]) => mockPdf(...args as []) }));
jest.mock('./studio-export-cache', () => ({ clearStudioExportCache: () => mockClearCache(), beginStudioExport: () => new AbortController(), beginStudioRender: () => new AbortController(), finishStudioExport: () => {},
  StudioExportCleanupError: class extends Error { constructor() { super('Temporary cleanup fixture failed'); } } }));
jest.mock('./studio-contract', () => ({ ...jest.requireActual('./studio-contract'), studioPngDataUri: (value: Uint8Array) => `data:fixture,${value[0]}` }));
jest.mock('expo-image', () => ({ Image: (props: unknown) => { const { View } = jest.requireActual('react-native'); return <View {...props as object} />; } }));
const scope = { userId: 'user_A', tenantId: 'tenant_A' }; const token = async () => 'fresh';
const deferred = <T,>() => { let resolve!:(value:T)=>void; const promise=new Promise<T>(done=>{resolve=done;}); return {promise,resolve}; };
beforeEach(() => { jest.clearAllMocks(); mockLoad.mockResolvedValue(null); mockSave.mockResolvedValue(undefined); mockRemove.mockResolvedValue(undefined); mockRender.mockResolvedValue(new Uint8Array([1])); mockShare.mockResolvedValue(undefined); mockPdf.mockResolvedValue(new Uint8Array([2])); mockClearCache.mockResolvedValue(undefined); });
const mount = async () => { const view = await render(<StudioEditor scope={scope} getToken={token} />); await screen.findByLabelText('Cover value 1'); return view; };
it('edits only the selected slide and restores the fixed rail selection and copy on reopen', async () => {
  const view = await mount();
  await fireEvent.press(screen.getByLabelText('Slide 2: Benefits')); await fireEvent.changeText(screen.getByLabelText('Benefits heading'), 'My {benefit}');
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ selected: 1 })));
  const value = mockSave.mock.calls.at(-1)![0];
  expect(value.slides[1]).toMatchObject({ h: 'My {benefit}' }); expect(value.slides[0]).toEqual(DEFAULT_CAROUSEL[0]); expect(value.slides[4]).toEqual(DEFAULT_CAROUSEL[4]);
  await view.unmount(); mockLoad.mockResolvedValue({ value }); await render(<StudioEditor scope={scope} getToken={token} />);
  expect((await screen.findByLabelText('Benefits heading')).props.value).toBe('My {benefit}');
  expect(screen.getByLabelText('Slide 2: Benefits').props.accessibilityState.selected).toBe(true);
});
it('preserves independent text, tuple and label edits delivered within the same React batch', async () => {
  await mount();
  const first = screen.getByLabelText('Cover value 1').props.onChangeText;
  const second = screen.getByLabelText('Cover label 1').props.onChangeText;
  const eyebrow = screen.getByLabelText('Eyebrow 1').props.onChangeText;
  const eyebrow2 = screen.getByLabelText('Eyebrow 2').props.onChangeText;
  await act(async () => { first('FIRST'); second('SECOND'); eyebrow('HEAD'); eyebrow2('TAIL'); });
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ slides: expect.arrayContaining([
    expect.objectContaining({ kind: 'stat', lines: expect.arrayContaining([['FIRST', 'SECOND']]), eyebrow: ['HEAD', 'TAIL'] }),
  ]) })));
  expect(screen.getByLabelText('Cover value 1').props.value).toBe('FIRST');
  expect(screen.getByLabelText('Cover label 1').props.value).toBe('SECOND');
  expect(mockSave.mock.calls.at(-1)![0].slides[1]).toEqual(DEFAULT_CAROUSEL[1]);
});
it('blocks new exports after temporary-file cleanup failure until explicit cleanup retry succeeds', async () => {
  await mount(); mockShare.mockRejectedValueOnce(new StudioExportCleanupError());
  await fireEvent.press(screen.getByRole('button', { name: 'Save or share current PNG' }));
  await screen.findByText('Export cleanup needs attention');
  expect(screen.queryByText('The save or share sheet was opened. Your slides are still editable.')).toBeNull();
  expect(screen.getByRole('button', { name: 'Save or share current PNG' })).toBeDisabled();
  expect(mockClearCache).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByRole('button', { name: /try again/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save or share current PNG' })).toBeEnabled());
  expect(mockClearCache).toHaveBeenCalledTimes(2); expect(mockShare).toHaveBeenCalledTimes(1);
});
it('retains custom copy after failed preview and failed PNG export', async () => {
  await mount(); await fireEvent.changeText(screen.getByLabelText('Cover value 1'), 'MY COPY');
  mockRender.mockRejectedValue(new Error('offline render'));
  await screen.findByText('offline render');
  expect(screen.getByLabelText('Cover value 1').props.value).toBe('MY COPY');
  await fireEvent.press(screen.getByRole('button', { name: 'Save or share current PNG' }));
  await screen.findByText('Export could not finish'); expect(mockShare).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Cover value 1').props.value).toBe('MY COPY');
});
it('exports only an explicit current PNG or the full ordered carousel PDF', async () => {
  await mount(); expect(mockShare).not.toHaveBeenCalled(); expect(mockPdf).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('Slide 5: CTA'));
  await fireEvent.press(screen.getByRole('button', { name: 'Save or share current PNG' }));
  await waitFor(() => expect(mockShare).toHaveBeenCalledWith(expect.any(Uint8Array), 'png', expect.any(AbortSignal)));
  expect(mockRender).toHaveBeenCalledWith(expect.objectContaining({ kind: 'cta' }), expect.any(Function), expect.any(AbortSignal));
  await screen.findByRole('button', { name: 'Save or share carousel PDF' });
  await fireEvent.press(screen.getByRole('button', { name: 'Save or share carousel PDF' }));
  await waitFor(() => expect(mockShare).toHaveBeenCalledWith(expect.any(Uint8Array), 'pdf', expect.any(AbortSignal)));
  expect(mockPdf).toHaveBeenCalledWith(DEFAULT_CAROUSEL, expect.any(Function), expect.any(AbortSignal));
});
it('requires protected Reset confirmation and keeps edits when cancelled', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    await mount(); await fireEvent.changeText(screen.getByLabelText('Cover value 1'), 'MY COPY');
    await fireEvent.press(screen.getByRole('button', { name: 'Reset all slides' }));
    expect(screen.getByLabelText('Cover value 1').props.value).toBe('MY COPY');
    expect(alert.mock.calls.at(-1)?.[2]?.[0]).toMatchObject({ style: 'cancel' });
    await act(async () => { alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.(); });
    expect(screen.getByLabelText('Cover value 1').props.value).toBe('<1 MIN');
  } finally { alert.mockRestore(); }
});
it('hides a stale preview and ignores its late result after selecting another slide', async () => {
  const pending = deferred<Uint8Array>(); mockRender.mockReturnValueOnce(pending.promise);
  await mount(); await waitFor(() => expect(mockRender).toHaveBeenCalled());
  await fireEvent.press(screen.getByLabelText('Slide 2: Benefits'));
  await screen.findByLabelText('Benefits slide preview');
  await act(async () => { pending.resolve(new Uint8Array([99])); });
  expect(screen.getByLabelText('Benefits slide preview').props.source.uri).toBe('data:fixture,1');
  expect(screen.queryByLabelText('Cover slide preview')).toBeNull();
});
it('blocks leaving during unsaved storage failures and retries without discarding custom copy', async () => {
  mockSave.mockRejectedValue(new Error('secure store unavailable')); await mount();
  await fireEvent.changeText(screen.getByLabelText('Cover value 1'), 'UNSTORED');
  await screen.findByText('Working copy needs attention'); expect(mockPrevent).toHaveBeenLastCalledWith(true, expect.any(Function));
  mockSave.mockResolvedValue(undefined); await fireEvent.press(screen.getByRole('button', { name: /try again/i }));
  await waitFor(() => expect(mockPrevent).toHaveBeenLastCalledWith(false, expect.any(Function)));
  expect(screen.getByLabelText('Cover value 1').props.value).toBe('UNSTORED'); expect(mockRemove).not.toHaveBeenCalled();
});
it('persists a rapid return to the original value after a different draft write has started', async () => {
  const view = await mount(); const pending = deferred<void>();
  let disk: StudioDraft | null = null; let tail = Promise.resolve();
  mockSave.mockImplementation(value => {
    const next = tail.then(async () => {
      if (value.slides[0]?.kind === 'stat' && value.slides[0].lines[0]?.[0] === 'TEMPORARY B') await pending.promise;
      disk = value;
    });
    tail = next; return next;
  });
  await fireEvent.changeText(screen.getByLabelText('Cover value 1'), 'TEMPORARY B');
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  await fireEvent.changeText(screen.getByLabelText('Cover value 1'), '<1 MIN');
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2));
  expect(mockSave.mock.calls[1]![0].slides[0]).toEqual(DEFAULT_CAROUSEL[0]);
  expect(mockPrevent).toHaveBeenLastCalledWith(true, expect.any(Function));
  await act(async () => { pending.resolve(); });
  await waitFor(() => expect(mockPrevent).toHaveBeenLastCalledWith(false, expect.any(Function)));
  await view.unmount(); mockLoad.mockResolvedValue({ value: disk! });
  await mount(); expect(screen.getByLabelText('Cover value 1').props.value).toBe('<1 MIN');
});
it('keeps a failed saved-copy load closed until explicit discard or successful retry', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  try {
    mockLoad.mockRejectedValue(new Error('corrupt')); await render(<StudioEditor scope={scope} getToken={token} />);
    await screen.findByRole('button', { name: 'Discard saved working copy' }); expect(screen.queryByLabelText('Cover value 1')).toBeNull(); expect(mockSave).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Discard saved working copy' })); expect(mockRemove).not.toHaveBeenCalled();
    await act(async () => { alert.mock.calls.at(-1)?.[2]?.[1]?.onPress?.(); });
    await screen.findByLabelText('Cover value 1'); expect(mockRemove).toHaveBeenCalledTimes(1);
  } finally { alert.mockRestore(); }
});
it('aborts pending export when the account editor unmounts and never opens a late share sheet', async () => {
  const view = await mount(); const pending = deferred<Uint8Array>(); mockRender.mockReturnValueOnce(pending.promise);
  await fireEvent.press(screen.getByRole('button', { name: 'Save or share current PNG' }));
  const signal = mockRender.mock.calls.at(-1)?.[2] as AbortSignal; await view.unmount(); expect(signal.aborted).toBe(true);
  await act(async () => { pending.resolve(new Uint8Array([7])); }); expect(mockShare).not.toHaveBeenCalled();
});
