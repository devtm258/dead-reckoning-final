import React,{useState} from 'react';
import Boot from './components/nexus/Boot';
import Dock from './components/nexus/Dock';
import ModeSelect from './components/nexus/ModeSelect';
import Calibration from './components/nexus/Calibration';
import Navigate from './components/nexus/Navigate';
import Engine from './components/nexus/Engine';
import Train from './components/nexus/Train';
import Replay from './components/nexus/Replay';
import Settings from './components/nexus/Settings';
export default function App(){
 const [boot,setBoot]=useState(false),[mode,setMode]=useState('train'),[tab,setTab]=useState('Train');
 const [selected,setSelected]=useState(null),[model,setModel]=useState(null),[simulation,setSimulation]=useState(null);
 const switchMode=()=>{setMode(null);setTab('Align')};
 if(boot)return <Boot onDone={()=>setBoot(false)}/>;
 if(!mode)return <ModeSelect onChoose={m=>{setMode(m);setTab(m==='live'?'Align':'Train')}}/>;
 const common={selected,setSelected,model,setModel,simulation,setSimulation};
 return <div className="font-body bg-ink text-ivory selection:bg-route/40 min-h-dvh">
  {mode==='live'&&tab==='Align'&&<Calibration onStart={()=>setTab('Navigate')}/>}
  {mode==='live'&&tab==='Navigate'&&<Navigate/>}
  {mode==='train'&&tab==='Train'&&<Train {...common}/>}
  {mode==='train'&&tab==='Diagnostics'&&<Engine {...common}/>}
  {tab==='Replay'&&<Replay {...common}/>}
  {tab==='More'&&<Settings onSwitchMode={switchMode}/>}
  <Dock mode={mode} tab={tab} setTab={setTab} onSwitchMode={switchMode}/>
 </div>;
}
