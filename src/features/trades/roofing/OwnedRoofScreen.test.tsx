import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { themes as mockThemes } from '@/lib/theme';
import { OwnedRoofEditor, OwnedRoofScreen } from './OwnedRoofScreen';
import { roofFixture } from './roof-test-fixture';
import type { RoofAttempt } from './roof-attempt';
import type { OwnedRoof } from './owned-roof';

const mockPatch = jest.fn(), mockPromote = jest.fn(), mockPush = jest.fn(), mockRemove = jest.fn(async()=>undefined);
const mockSave = jest.fn(async()=>undefined), mockLoad = jest.fn(async()=>null as unknown);
const mockReadAttempt = jest.fn(async()=>null as RoofAttempt | null);
let mockRow: OwnedRoof; let mockAttempt: RoofAttempt | null; let mockSaved: unknown;
let mockQueryError=false;const mockTenantRefetch=jest.fn();
const mockRefetch = jest.fn(async()=>({ data:{ok:true,measurement:mockRow},error:null }));
jest.mock('react-native-safe-area-context',()=>({useSafeAreaInsets:()=>({top:0,bottom:0,left:0,right:0})}));
jest.mock('@clerk/expo',()=>({useAuth:()=>({userId:'user_A'})}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({goBack:jest.fn()}),usePreventRemove:jest.fn()}));
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:jest.fn()})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush})}));
jest.mock('@/lib/useTheme',()=>({useTheme:()=>({colors:mockThemes.dark})}));
jest.mock('@/lib/useApi',()=>({useApiQuery:()=>({data:{ok:true,measurement:mockRow},isError:mockQueryError,error:mockQueryError?new Error('offline'):null,refetch:mockRefetch}),useApiMutation:()=>({mutateAsync:mockPatch})}));
jest.mock('@/lib/tenant',()=>({useTenantMe:()=>({data:undefined,isError:true,error:new Error('offline'),refetch:mockTenantRefetch}),tenantTrades:()=>['roofing']}));
jest.mock('./api',()=>({useSaveRoofAsQuote:()=>({mutateAsync:mockPromote})}));
jest.mock('./RoofGeometry',()=>({RoofGeometry:()=>null}));
jest.mock('./roof-working-draft',()=>({createRoofWorkingDraftStore:()=>({load:mockLoad,save:mockSave,remove:mockRemove})}));
jest.mock('./roof-attempt',()=>({
  roofRejectedBeforeWrite:()=>false,
  readRoofAttempt:()=>mockReadAttempt(),
  clearRoofAttempt:async()=>{mockAttempt=null;},
  writeRoofAttempt:async(_:unknown,value:RoofAttempt)=>{mockAttempt=value;},
  runRoofAttempt:async(_:unknown,value:RoofAttempt,mutation:()=>Promise<unknown>)=>{mockAttempt=value;return mutation();},
}));
const scope={userId:'user_A',tenantId:'tenant_A',recordId:'10000000-0000-4000-8000-000000000001'};
beforeEach(()=>{
  jest.clearAllMocks(); mockRow=roofFixture();mockAttempt=null;mockSaved=null;mockQueryError=false;
  mockLoad.mockImplementation(async()=>mockSaved);mockSave.mockResolvedValue(undefined);mockRemove.mockResolvedValue(undefined);
  mockReadAttempt.mockImplementation(async()=>mockAttempt);
  mockPatch.mockResolvedValue({ok:true,measureToken:'measure-token-successor',successor:true});
  mockPromote.mockResolvedValue({ok:true,shareToken:'shared',shareUrl:'https://sample.test/q/shared'});
});
const mount=async()=>{const result=await render(<OwnedRoofEditor scope={scope}/>);await screen.findByText('1. Building 1');await waitFor(()=>expect(mockLoad).toHaveBeenCalled());return result;};

it('opens privately without calculating, saving, promoting or sending',async()=>{
  await mount(); expect(mockPatch).not.toHaveBeenCalled();expect(mockPromote).not.toHaveBeenCalled();
  expect(screen.getByText('Customer: Sample Customer · 0400000000')).toBeTruthy();
});
it('preserves zero accessory corrections and saves only the explicit revision-bound fields',async()=>{
  await mount();await fireEvent.changeText(screen.getByLabelText('Building 1: Downpipes'),'0');
  await waitFor(()=>expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({edits:{'1':{downpipe_count:'0'}}})));
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));
  await waitFor(()=>expect(mockPatch).toHaveBeenCalledWith({expected_revision:'a'.repeat(64),edges:[{index:1,downpipe_count:0}]}));
  expect(mockPromote).not.toHaveBeenCalled();
});
it('reopens a returned immutable successor through GET before discarding the working copy',async()=>{
  await mount();await fireEvent.changeText(screen.getByLabelText('Building 1: Sloped roof area (m²)'),'135');
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));
  await screen.findByRole('button',{name:'Check previous action status'});
  expect(mockRemove).not.toHaveBeenCalled();
  mockRow={...roofFixture(),id:'10000000-0000-4000-8000-000000000002',measure_token:'measure-token-successor',revision:'c'.repeat(64)};
  await fireEvent.press(screen.getByRole('button',{name:'Check previous action status'}));
  await waitFor(()=>expect(mockRemove).toHaveBeenCalledTimes(1));expect(mockAttempt).toBeNull();
});
it('retains a failed/unknown write and cannot blindly replay it',async()=>{
  mockPatch.mockRejectedValueOnce(new Error('lost response'));
  await mount();await fireEvent.changeText(screen.getByLabelText('Building 1: Hip count'),'2');
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));
  await screen.findByRole('button',{name:'Check previous action status'});
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));
  expect(mockPatch).toHaveBeenCalledTimes(1);expect(mockRemove).not.toHaveBeenCalled();
});
it('restores dirty corrections but blocks stale-price promotion',async()=>{
  mockSaved={value:{revision:'f'.repeat(64),included:[1],edits:{'1':{hips:'2'}}}};
  await mount();await screen.findByText('The saved measurement changed');
  expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('2');
  await fireEvent.press(screen.getByRole('button',{name:'Review and create customer quote'}));expect(mockPromote).not.toHaveBeenCalled();
});
it('requires explicit review then promotion with only token and pricing revision',async()=>{
  await mount();await fireEvent.press(screen.getByRole('button',{name:'Review and create customer quote'}));
  expect(mockPromote).not.toHaveBeenCalled();await fireEvent.press(screen.getByRole('button',{name:'Confirm create customer quote'}));
  await waitFor(()=>expect(mockPromote).toHaveBeenCalledWith({measure_token:'measure-token-one',expected_pricing_revision:'b'.repeat(64)}));
  expect(mockPush).not.toHaveBeenCalled();
});
it('ignores late completion after the editor has unmounted',async()=>{
  let finish!:(v:unknown)=>void;mockPatch.mockReturnValueOnce(new Promise(resolve=>{finish=resolve;}));
  const view=await mount();await fireEvent.changeText(screen.getByLabelText('Building 1: Hip count'),'2');
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));
  await waitFor(()=>expect(mockPatch).toHaveBeenCalled());await view.unmount();
  await act(async()=>{finish({ok:true,measureToken:'measure-token-successor',successor:true});});
  expect(mockPush).not.toHaveBeenCalled();expect(mockRemove).not.toHaveBeenCalled();
});
it('does not apply a delayed original draft load after reopening a recorded successor',async()=>{
  let finishOriginal!:(value:unknown)=>void;
  let finishReceipt!:(value:RoofAttempt)=>void;
  mockLoad.mockImplementationOnce(()=>new Promise(resolve=>{finishOriginal=resolve;}));
  mockReadAttempt.mockImplementationOnce(()=>new Promise(resolve=>{finishReceipt=resolve;}));
  await mount();
  const successor={...roofFixture(),id:'10000000-0000-4000-8000-000000000002',measure_token:'measure-token-successor',revision:'c'.repeat(64)};
  mockRow=successor;
  mockSaved={value:{revision:successor.revision,included:[1],edits:{'1':{hips:'3'}}}};
  await act(async()=>{finishReceipt({version:1,action:'corrections',revision:'a'.repeat(64),measureToken:successor.measure_token});});
  await waitFor(()=>expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('3'));
  await act(async()=>{finishOriginal({value:{revision:'a'.repeat(64),included:[1],edits:{'1':{hips:'8'}}}});});
  expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('3');
  expect(screen.queryByText('The saved measurement changed')).toBeNull();
  expect(mockRemove).not.toHaveBeenCalled();
});
it('labels cached server data after a read failure and keeps corrections while blocking mutations',async()=>{
  const view=await mount();await fireEvent.changeText(screen.getByLabelText('Building 1: Hip count'),'2');
  mockQueryError=true;await view.rerender(<OwnedRoofEditor scope={scope}/>);
  await screen.findByText('Showing the last verified saved job');
  expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('2');
  await fireEvent.press(screen.getByRole('button',{name:'Save corrections and recalculate'}));expect(mockPatch).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));expect(mockRefetch).toHaveBeenCalled();
  expect(mockRemove).not.toHaveBeenCalled();
});
it('offers a retry for an unavailable tenant instead of an endless sign-in notice',async()=>{
  await render(<OwnedRoofScreen id={scope.recordId}/>);await screen.findByText('Could not load your roofing account');
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));expect(mockTenantRefetch).toHaveBeenCalledTimes(1);
});
it('retries secure storage with the retained correction and restores editing only after success',async()=>{
  await mount();mockSave.mockRejectedValueOnce(new Error('secure write failed'));
  await fireEvent.changeText(screen.getByLabelText('Building 1: Hip count'),'4');
  await screen.findByText('Working-copy storage unavailable');
  expect(screen.getByLabelText('Building 1: Hip count').props.editable).toBe(false);
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));
  await waitFor(()=>expect(screen.getByLabelText('Building 1: Hip count').props.editable).toBe(true));
  expect(mockSave).toHaveBeenLastCalledWith({revision:'a'.repeat(64),included:[1],edits:{'1':{hips:'4'}}});
  expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('4');expect(mockPatch).not.toHaveBeenCalled();
});
it('restores the actual dirty draft and revision conflict after an initial secure read failure',async()=>{
  mockSaved={value:{revision:'f'.repeat(64),included:[2],edits:{'1':{hips:'7'}}}};
  mockLoad.mockRejectedValueOnce(new Error('read unavailable'));
  await mount();await screen.findByText('Working-copy storage unavailable');
  await fireEvent.press(screen.getByRole('button',{name:'Refresh saved job'}));
  expect(mockRefetch).not.toHaveBeenCalled();expect(mockRemove).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));
  await screen.findByText('The saved measurement changed');
  expect(screen.getByLabelText('Building 1: Hip count').props.value).toBe('7');
  expect(screen.queryByText('Working-copy storage unavailable')).toBeNull();
  expect(mockRemove).not.toHaveBeenCalled();expect(mockSave).not.toHaveBeenCalled();
});
it('cannot refresh or discard an unknown receipt before its initial read resolves',async()=>{
  let finishReceipt!:(value:RoofAttempt)=>void;
  mockReadAttempt.mockImplementationOnce(()=>new Promise(resolve=>{finishReceipt=resolve;}));
  mockSaved={value:{revision:'a'.repeat(64),included:[1],edits:{'1':{hips:'2'}}}};
  await mount();await screen.findByRole('button',{name:'Discard local corrections and reload'});
  await fireEvent.press(screen.getByRole('button',{name:'Refresh saved job'}));
  await fireEvent.press(screen.getByRole('button',{name:'Discard local corrections and reload'}));
  expect(mockRefetch).not.toHaveBeenCalled();expect(mockRemove).not.toHaveBeenCalled();
  await act(async()=>{mockAttempt={version:1,action:'corrections',revision:'a'.repeat(64)};finishReceipt(mockAttempt);});
  await screen.findByRole('button',{name:'Check previous action status'});
  expect(mockAttempt).not.toBeNull();expect(mockRemove).not.toHaveBeenCalled();
});
