import React,{useCallback,useEffect,useState} from 'react';
import ScreenShell from './ScreenShell';
import {Play,Pause} from './Icons';
import {request,json,listDatasets,listModels,listJobs,pairFiles,uploadPair} from './api';
const roles=['Train','Val','Test'];
const fmt=n=>Number.isFinite(Number(n))?Number(n).toFixed(3):'—';
function Seg({value,onChange}){return <div className="inline-flex rounded-xl border border-hairline overflow-hidden">{roles.map(r=><button key={r} onClick={()=>onChange(r)} className={`min-h-[44px] px-4 text-xs ${value===r?'bg-route text-ink':'bg-recess text-dust'}`}>{r}</button>)}</div>}
export default function Train({selected,setSelected,model,setModel,simulation,setSimulation}){
 const [estimator,setEstimator]=useState('vehicle'),[blackoutStart,setBlackoutStart]=useState(300),[blackoutDuration,setBlackoutDuration]=useState(30);
 const [split,setSplit]=useState('Train'),[records,setRecords]=useState([]),[models,setModels]=useState([]),[jobs,setJobs]=useState([]);
 const [assign,setAssign]=useState(()=>{try{return JSON.parse(localStorage.getItem('idr_split_draft')||'{}')}catch{return {}}}),[groups,setGroups]=useState({}),[names,setNames]=useState({});
 const [kind,setKind]=useState('cnn_gru'),[window,setWindow]=useState(35),[epochs,setEpochs]=useState(20),[name,setName]=useState('CNN-GRU-35');
 const [parent,setParent]=useState(''),[jobId,setJobId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[benchmark,setBenchmark]=useState(null);
 const refresh=useCallback(async()=>{try{const [ds,ms,js]=await Promise.all([listDatasets(),listModels(),listJobs()]);setRecords(ds);setModels(ms);setJobs(js);if(!selected&&ds[0])setSelected(ds[0].session_id)}catch(e){setError(e.message)}},[selected,setSelected]);
 useEffect(()=>{refresh();const timer=setInterval(refresh,2500);return()=>clearInterval(timer)},[refresh]);
 useEffect(()=>localStorage.setItem('idr_split_draft',JSON.stringify(assign)),[assign]);
 const active=jobs.find(j=>['queued','running','pausing'].includes(j.status));
 const job=jobs.find(j=>j.job_id===jobId)||jobs[0];
 async function upload(files){setBusy(true);setError('');try{const pairs=pairFiles([...files]);if(!pairs.length)throw Error('Select paired S-*.csv and V-*.csv files or an extracted dataset folder.');for(const pair of pairs){const d=await uploadPair(pair.smartphone,pair.vbox);const root=pair.dir.split('/')[0]||'new-drive';const driver=root.match(/\(Driver\s+([^)]+)\)/i);const group=driver?`driver-${driver[1].toLowerCase()}`:root.toLowerCase();await json(`/dataset/${d.session_id}/metadata`,{name:pair.dir,acquisition:group});setMessage(`Imported ${pair.dir}`)}await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function saveIdentity(r){setBusy(true);setError('');try{await json(`/dataset/${r.session_id}/metadata`,{name:names[r.session_id]??r.name,acquisition:groups[r.session_id]??r.acquisition});await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function start(){setBusy(true);setError('');try{
  const assignments=records.filter(r=>assign[r.session_id]).map(r=>({session_id:r.session_id,role:assign[r.session_id]}));
  const payload={session_id:selected||null,mode:parent?'continue':'create',name,kind,window:Number(window),epochs:Number(epochs),n_estimators:60,replay:true,assignments,parent_id:parent||null};
  const j=await json('/pipeline/train',payload);setJobId(j.job_id);setMessage(`Queued ${j.job_id}`);await refresh();
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 async function control(action){setBusy(true);setError('');try{await json(`/jobs/${job.job_id}/${action}`,{});await refresh()}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function attach(mid=model?.model_id){setBusy(true);setError('');try{if(!selected||!mid)throw Error('Select a recording and saved model.');const m=await json('/models/attach',{session_id:selected,model_id:mid});setModel(m);setMessage(`Activated ${mid}`)}catch(e){setError(e.message)}finally{setBusy(false)}}
 async function inference(){setBusy(true);setError('');try{
  if(!selected||!model)throw Error('Select a recording and activate a saved model first.');
  const start=Number(blackoutStart),end=start+Number(blackoutDuration);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw Error('Enter a valid blackout start and positive duration.');
  const result=await json('/pipeline/simulate',{session_id:selected,blackout_start_s:start,blackout_end_s:end,estimator,split:model.evaluation_roles?.includes('test')?'test':'exploration'});
  setSimulation(result);setMessage(`Inference complete: ${fmt(result.metrics.fused_drift_pct)}% endpoint drift. Open Replay for the three real traces.`);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 async function benchmarkTest(){setBusy(true);setError('');try{
  if(!selected||!model?.evaluation_roles?.includes('test'))throw Error('Activate the saved model on its held-out Test recording first.');
  const result=await json('/pipeline/benchmark',{session_id:selected,estimator});setBenchmark(result);
  setMessage(`Benchmark: ${result.eligible_runs} eligible trials, ${(100*(result.pass_rate||0)).toFixed(0)}% pass fraction. Result saved by backend.`);
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <ScreenShell eyebrow="01 / MODEL TRAINING" title="Train" right={<span style={{color:active?'#E6B800':'#A8B5A0'}}>{active?'● RUNNING':'○ IDLE'}</span>}>
  {error&&<p role="alert" className="p-3 mb-3 border border-blackout text-ivory rounded-xl">{error}</p>}{message&&<p role="status" className="mb-3 text-route text-xs">{message}</p>}
  <div className="flex flex-wrap items-center gap-3 mb-4"><span className="border border-hairline rounded-xl px-3 py-2 font-mono text-xs text-route">SAVED RECORDINGS · {records.length}</span><Seg value={split} onChange={setSplit}/><span className="hud-mono">{split.toUpperCase()} · {records.filter(r=>assign[r.session_id]===split.toLowerCase().replace('val','validation')).length} SELECTED</span></div>
  <div className="grid md:grid-cols-3 gap-4">
   <section className="md:col-span-2 bg-recess border border-hairline rounded-xl p-4">
    <div className="hud-label mb-3">TRAINING CONSOLE · REAL SAVED JOB</div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
     <label className="text-xs">Architecture<select className="w-full bg-panel p-2" disabled={!!parent||!!active} value={kind} onChange={e=>setKind(e.target.value)}>{[['cnn_gru','CNN + GRU'],['tcn','Causal TCN'],['extra_trees','Extra Trees'],['random_forest','Random Forest']].map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
     <label className="text-xs">Window<input className="w-full bg-panel p-2" type="number" min="10" max="100" value={window} disabled={!!parent||!!active} onChange={e=>setWindow(e.target.value)}/></label>
     <label className="text-xs">Epochs<input className="w-full bg-panel p-2" type="number" min="1" max="100" value={epochs} onChange={e=>setEpochs(e.target.value)}/></label>
     <label className="text-xs">Model name<input className="w-full bg-panel p-2" value={name} onChange={e=>setName(e.target.value)}/></label>
    </div>
    <label className="text-xs">Continue saved model<select className="w-full bg-panel p-2 mb-3" value={parent} onChange={e=>{setParent(e.target.value);const m=models.find(x=>x.model_id===e.target.value);if(m){setKind(m.kind);setWindow(m.window);setName(m.family_name||m.kind)}}}><option value="">Create new family</option>{models.map(m=><option key={m.model_id} value={m.model_id}>{m.family_name||m.kind} v{m.version||1} ({m.model_id.slice(0,7)})</option>)}</select></label>
    <div className="font-mono text-[13px] leading-relaxed text-ivory space-y-1">
     <div className="flex justify-between"><span className="text-dust">epoch</span><span>{job?.epoch??'—'} / {job?.plan?.epochs??'—'}</span></div>
     <div className="flex justify-between"><span className="text-dust">training loss</span><span className="text-route">{fmt(job?.history?.at(-1)?.loss)}</span></div>
     <div className="flex justify-between"><span className="text-dust">validation MAE</span><span>{fmt(job?.history?.at(-1)?.validation_mae)} m/s</span></div>
     <div className="flex justify-between"><span className="text-dust">validation RMSE</span><span>{fmt(job?.result?.validation?.rmse)} m/s</span></div>
     <div className="flex justify-between"><span className="text-dust">status</span><span>{job?.status?.toUpperCase()||'NO RUN'}</span></div>
    </div>
    <div className="h-1.5 bg-ink mt-4 rounded-xl overflow-hidden"><div className="h-full bg-route" style={{width:`${Math.max(0,Math.min(100,(job?.progress||0)*100))}%`}}/></div>
    <div className="grid md:grid-cols-3 gap-3 mt-4 p-3 border border-hairline rounded-xl">
     <label className="text-xs">Navigation estimator<select className="w-full bg-panel p-2" value={estimator} onChange={e=>setEstimator(e.target.value)}><option value="vehicle">Calibrated vehicle + learned speed</option><option value="legacy">Planar ESKF comparison</option></select></label>
     <label className="text-xs">Blackout start (seconds)<input className="w-full bg-panel p-2" type="number" min="10" value={blackoutStart} onChange={e=>setBlackoutStart(e.target.value)}/></label>
     <label className="text-xs">Duration (seconds)<input className="w-full bg-panel p-2" type="number" min="1" value={blackoutDuration} onChange={e=>setBlackoutDuration(e.target.value)}/></label>
    </div>
    <p className="text-xs text-dust mt-2">Vehicle mode calibrates from earlier phone fixes. Keep at least 120 seconds of history where possible. VBOX supplies scoring only. Some runs still exceed 50%.</p>
    <div className="flex flex-wrap gap-2 mt-4"><button disabled={busy||!!active} onClick={start} className="min-h-[48px] px-4 bg-route text-ink font-semibold text-xs rounded-xl flex items-center gap-2"><Play size={16}/>{parent?'CONTINUE TRAINING':'TRAIN & SAVE'}</button>
     {job&&['running','queued'].includes(job.status)&&<button disabled={busy} onClick={()=>control('pause')} className="border border-hairline px-4 rounded-xl"><Pause size={16}/> Pause</button>}
     {job&&['interrupted','paused','failed'].includes(job.status)&&<button disabled={busy} onClick={()=>control('resume')} className="border border-hairline px-4 rounded-xl">Resume</button>}
     <button disabled={busy||!model} onClick={inference} className="min-h-[48px] px-4 border border-hairline text-dust text-xs rounded-xl">RUN SELECTED BLACKOUT</button>
     <button disabled={busy||!model} onClick={benchmarkTest} className="min-h-[48px] px-4 border border-hairline text-dust text-xs rounded-xl">BENCHMARK 10 / 30 / 60 s</button>
    </div>
    <p className="text-xs text-dust mt-3">{job?.message||'Select separate acquisition groups for Train, Val and Test. The test group is withheld during training.'}</p>
   </section>
   <section className="space-y-3">{models.length?models.slice(0,5).map(m=><button key={m.model_id} onClick={()=>attach(m.model_id)} className="w-full text-left bg-recess border border-hairline rounded-xl p-4"><div className="flex justify-between"><span className="font-semibold text-sm">{m.family_name||m.kind} v{m.version||1}</span><span className="font-mono text-[10px] text-route">{m.model_id===model?.model_id?'ACTIVE':'SAVED'}</span></div><div className="hud-mono mt-3">val MAE {fmt(m.validation?.mae)} m/s · {m.kind}</div></button>):<div className="bg-recess border border-hairline rounded-xl p-4 text-dust">No saved models</div>}</section>
  </div>
  <section className="mt-4 bg-recess border border-hairline rounded-xl p-4"><div className="hud-label">DATASET IMPORT · S/V CSV PAIRS</div><div className="flex flex-wrap gap-4 mt-3 text-xs"><label>Choose CSV pairs<input type="file" multiple accept=".csv,.gz" disabled={busy} onChange={e=>upload(e.target.files)}/></label><label>Or extracted folder<input type="file" multiple webkitdirectory="" directory="" disabled={busy} onChange={e=>upload(e.target.files)}/></label><button className="border border-hairline px-3 rounded-xl" onClick={async()=>{try{await json('/dataset/load-preset',{});await refresh()}catch(e){setError(e.message)}}}>Load preset</button></div>
   <div className="grid md:grid-cols-2 gap-2 mt-3">{records.map(r=><div key={r.session_id} className="border border-hairline rounded-xl p-3 text-xs"><div className="flex justify-between"><label className="truncate">{r.name}</label><span>{r.report?.samples||''}</span></div><div className="flex gap-2 mt-2"><input aria-label={`Name ${r.name}`} className="w-1/2 bg-panel p-2" value={names[r.session_id]??r.name} onChange={e=>setNames({...names,[r.session_id]:e.target.value})}/><input aria-label={`Group ${r.name}`} className="w-1/2 bg-panel p-2" value={groups[r.session_id]??r.acquisition} onChange={e=>setGroups({...groups,[r.session_id]:e.target.value})}/><button className="text-route" onClick={()=>saveIdentity(r)}>Save</button></div><div className="flex gap-2 mt-2"><select aria-label={`Split ${r.name}`} className="flex-1 bg-panel p-2" value={assign[r.session_id]||''} onChange={e=>setAssign({...assign,[r.session_id]:e.target.value})}><option value="">Unassigned</option><option value="train">Train</option><option value="validation">Val</option><option value="test">Test</option></select><button className="text-route" onClick={()=>{setSelected(r.session_id);setModel(null);setSimulation(null)}}>{selected===r.session_id?'Selected':'Select'}</button></div></div>)}</div>
  </section>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">{[['RECORDINGS',records.length],['MODEL VERSIONS',models.length],['SAVED RUNS',jobs.length],['LAST DRIFT',simulation?.metrics?.fused_drift_pct==null?'—':`${fmt(simulation.metrics.fused_drift_pct)}%`]].map(([k,v])=><div key={k} className="bg-recess border border-hairline rounded-xl p-3"><div className="hud-label">{k}</div><div className="font-display text-2xl mt-1">{v}</div></div>)}</div>
  {benchmark&&<p className="text-xs text-dust mt-3">Benchmark · {benchmark.eligible_runs} eligible of {benchmark.attempted_runs} attempted · under 50%: {benchmark.under_50_count} · worst {fmt(benchmark.worst_drift_pct)}% · pass fraction {fmt((benchmark.pass_rate||0)*100)}% · median {fmt(benchmark.median_drift_pct)}% · P95 {fmt(benchmark.p95_drift_pct)}%. Inspect the generated JSON in backend/state/reports.</p>}
 </ScreenShell>;
}
