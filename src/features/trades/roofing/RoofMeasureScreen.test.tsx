import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StrictMode } from 'react';
import { themes as mockThemes } from '@/lib/theme';
import { RoofMeasureForm, RoofMeasureScreen } from './RoofMeasureScreen';
import { roofFixture } from './roof-test-fixture';
import type { MeasureAllRequest, MeasureAllResponse } from './schema';
import type { RoofAttempt } from './roof-attempt';
import type { OwnedRoof } from './owned-roof';
const mockMeasure=jest.fn(),mockSaveRoof=jest.fn(),mockPromote=jest.fn(),mockLoad=jest.fn(),mockStore=jest.fn(async(value:unknown)=>{void value;}),mockPush=jest.fn();
const mockRefetch=jest.fn(async()=>({}));const mockReset=jest.fn();let mockAttempt:RoofAttempt|null=null;
const mockPreventRemove=jest.fn(),mockTenantRefetch=jest.fn();let mockOwned:OwnedRoof|undefined;
jest.mock('@react-navigation/native',()=>({usePreventRemove:(...args:unknown[])=>mockPreventRemove(...args)}));
jest.mock('@/lib/tenant',()=>({useTenantMe:()=>({data:undefined,isError:true,error:new Error('offline'),refetch:mockTenantRefetch}),tenantTrades:()=>['roofing']}));
jest.mock('@clerk/expo',()=>({useAuth:()=>({userId:'user_A'})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush})}));
jest.mock('@/lib/useTheme',()=>({useTheme:()=>({colors:mockThemes.dark})}));
jest.mock('@/lib/useApi',()=>({useApiQuery:()=>({data:mockOwned?{ok:true,measurement:mockOwned}:undefined,refetch:mockRefetch})}));
jest.mock('./api',()=>({useMeasureRoof:()=>({mutate:mockMeasure,reset:mockReset,isPending:false}),useSaveRoof:()=>({mutateAsync:mockSaveRoof,reset:mockReset,isPending:false}),useSaveRoofAsQuote:()=>({mutate:mockPromote,reset:mockReset,isPending:false})}));
jest.mock('./RoofGeometry',()=>({RoofGeometry:()=>null}));
jest.mock('./RoofAddressField',()=>({RoofAddressField:({value,onChange}:{value:string;onChange:(v:string)=>void})=>{
  const {TextInput}=jest.requireActual('react-native');return <TextInput accessibilityLabel="Address" value={value} onChangeText={onChange}/>;
}}));
jest.mock('./roof-input-draft',()=>({createRoofInputDraftStore:()=>({load:mockLoad,save:mockStore})}));
jest.mock('./roof-attempt',()=>({readRoofAttempt:async()=>mockAttempt,writeRoofAttempt:async(_:unknown,value:RoofAttempt)=>{mockAttempt=value;},clearRoofAttempt:async()=>{mockAttempt=null;}}));
const scope={userId:'user_A',tenantId:'tenant_A'};
const result=():Extract<MeasureAllResponse,{ok:true}>=>({ok:true,pricing_status:'priced',pricing_authority:roofFixture().pricing_authority!,run_id:'d'.repeat(32),run_token:'verified-roof-run-capability',run_expires_at:'2099-01-01T00:00:00Z',provider:'geoscape',quote:roofFixture().quote!,warnings:[]});
beforeEach(()=>{
  jest.clearAllMocks();mockAttempt=null;mockOwned=undefined;mockLoad.mockResolvedValue(null);mockStore.mockResolvedValue(undefined);
  mockMeasure.mockImplementation((_request:MeasureAllRequest,options:{onSuccess:(v:MeasureAllResponse)=>void})=>options.onSuccess(result()));
  mockSaveRoof.mockResolvedValue({ok:true,id:roofFixture().id,measure_token:'measure-token-one',public_token:'public-token-one',pricing_authority:roofFixture().pricing_authority});
});
async function mount(){await render(<RoofMeasureForm scope={scope}/>);await waitFor(()=>expect(mockStore).toHaveBeenCalled());}
async function measure(){await fireEvent.changeText(screen.getByLabelText('Address'),'1 Sample Street');await fireEvent.changeText(screen.getByLabelText('Postcode'),'2000');await fireEvent.press(screen.getByRole('button',{name:'Measure all structures'}));await screen.findByText('Building 1');}
it('captures customer details and structure selection in the quiet save without sending',async()=>{
  await mount();await measure();await fireEvent.changeText(screen.getByLabelText('Customer name'),'Sample Customer');await fireEvent.changeText(screen.getByLabelText('Customer phone'),'0400000000');
  await fireEvent.press(screen.getByRole('button',{name:'Save job'}));
  await waitFor(()=>expect(mockSaveRoof).toHaveBeenCalledWith(expect.objectContaining({run_token:'verified-roof-run-capability',included_indices:[1],customer_name:'Sample Customer',customer_phone:'0400000000'})));
  expect(mockAttempt?.action).toBe('save');expect(mockPromote).not.toHaveBeenCalled();expect(mockPush).not.toHaveBeenCalled();
});
it('invalidates previous results on a building-specific scope change and forwards exact perBuilding keys',async()=>{
  await mount();await measure();await fireEvent.press(screen.getAllByRole('radio',{name:'Concrete tile'})[1]!);
  await screen.findByText('Measurement is stale');await fireEvent.press(screen.getByRole('button',{name:'Save job'}));expect(mockSaveRoof).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button',{name:'Measure all structures'}));
  expect(mockMeasure.mock.calls.at(-1)![0]).toMatchObject({perBuilding:{'building-1':{material:'concrete_tile'}}});
});
it('retains verified inputs and run in encrypted recovery before the mutation',async()=>{
  await mount();await measure();mockSaveRoof.mockImplementationOnce(async()=>{
    expect(mockStore.mock.calls.at(-1)![0]).toMatchObject({accepted:{response:{run_id:'d'.repeat(32)}},included:{'building-1':true,'building-2':false}});
    expect(mockAttempt).toMatchObject({action:'save',runId:'d'.repeat(32)});throw new Error('lost reply');
  });
  await fireEvent.press(screen.getByRole('button',{name:'Save job'}));await screen.findByText('Check the previous Save');
  await fireEvent.press(screen.getByRole('button',{name:'Measure all structures'}));expect(mockMeasure).toHaveBeenCalledTimes(1);
});
it('reopens inputs and selected buildings after a relaunch without measuring or saving',async()=>{
  const request:MeasureAllRequest={address:{address:'1 Sample Street',postcode:'2000',state:'NSW'},inputs:{material:'colorbond_corrugated',pitch:'standard',intent:'full_reroof',building_year_built:null},perBuilding:{}};
  mockLoad.mockResolvedValue({value:{address:'1 Sample Street',postcode:'2000',state:'NSW',material:'colorbond_corrugated',pitch:'standard',intent:'full_reroof',yearBuilt:'',customerName:'Sample',customerPhone:'',perBuilding:{},included:{'building-1':true,'building-2':true},accepted:{request,response:result()}}});
  await mount();await screen.findByText('Building 1');expect(screen.getByLabelText('Customer name').props.value).toBe('Sample');
  expect(screen.getByText(/Combined total · 2 quotable of 2/)).toBeTruthy();expect(mockMeasure).not.toHaveBeenCalled();expect(mockSaveRoof).not.toHaveBeenCalled();
});
it('blocks a different new run when an earlier Save receipt survives restart',async()=>{
  mockAttempt={version:1,action:'save',revision:'b'.repeat(64),runId:'e'.repeat(32)};
  await mount();await screen.findByText('Check the previous Save');
  await fireEvent.press(screen.getByRole('button',{name:'Measure all structures'}));expect(mockMeasure).not.toHaveBeenCalled();
});
it('accepts current measurement responses after StrictMode effect replay',async()=>{
  await render(<StrictMode><RoofMeasureForm scope={scope}/></StrictMode>);
  await waitFor(()=>expect(mockStore).toHaveBeenCalled());await measure();
  expect(screen.getByText('Building 1')).toBeTruthy();
});
it('blocks navigation for the latest unsaved input and keeps it available for storage retry',async()=>{
  await mount();await screen.findByText('Working copy saved on this device');
  mockStore.mockRejectedValueOnce(new Error('secure storage failed'));
  await fireEvent.changeText(screen.getByLabelText('Address'),'Retain this last edit');
  await screen.findByText('Working-copy recovery unavailable');
  expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(true);
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));
  await screen.findByText('Working copy saved on this device');
  expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);
  expect(screen.getByLabelText('Address').props.value).toBe('Retain this last edit');
});
it('keeps navigation blocked until the latest queued storage write completes',async()=>{
  await mount();let finish!:(value:void)=>void;
  mockStore.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await fireEvent.changeText(screen.getByLabelText('Address'),'Pending latest edit');
  await waitFor(()=>expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(true));
  await act(async()=>{finish();});
  await waitFor(()=>expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false));
});
it.each(['pricing_authority','public_token'] as const)('retains an owned Save receipt when %s is missing from readback',async field=>{
  mockAttempt={version:1,action:'save',revision:'b'.repeat(64),runId:'d'.repeat(32)};
  mockOwned={...roofFixture(),[field]:null,quote:{...roofFixture().quote!,pricing_run_id:'d'.repeat(32)}};
  await mount();await screen.findByText('Saved job found — review is incomplete');
  expect(mockAttempt?.runId).toBe('d'.repeat(32));
  await fireEvent.press(screen.getByRole('button',{name:'Open recovered private roofing job'}));
  expect(mockPush).toHaveBeenCalledWith({pathname:'/roofing/[id]',params:{id:roofFixture().id}});
});
it('recovers a complete exact owned saved-run result before clearing its receipt',async()=>{
  mockAttempt={version:1,action:'save',revision:'b'.repeat(64),runId:'d'.repeat(32)};
  mockOwned={...roofFixture(),quote:{...roofFixture().quote!,pricing_run_id:'d'.repeat(32)}};
  await mount();await waitFor(()=>expect(mockAttempt).toBeNull());expect(mockSaveRoof).not.toHaveBeenCalled();
});
it('offers a tenant-read retry instead of indefinite loading',async()=>{
  await render(<RoofMeasureScreen/>);await screen.findByText('Could not load your roofing account');
  await fireEvent.press(screen.getByRole('button',{name:'TRY AGAIN'}));expect(mockTenantRefetch).toHaveBeenCalledTimes(1);
});
it('opens explicit owned review instead of starting an unreceipted promotion from creation',async()=>{
  await mount();await measure();await fireEvent.press(screen.getByRole('button',{name:'Save job'}));
  await screen.findByText('Saved');await screen.findByText('Working copy saved on this device');
  await fireEvent.press(screen.getByRole('button',{name:'Review saved roof'}));
  expect(mockPush).toHaveBeenCalledWith({pathname:'/roofing/[id]',params:{id:roofFixture().id}});
  expect(mockPromote).not.toHaveBeenCalled();expect(screen.queryByRole('button',{name:'Save as quote'})).toBeNull();
});
