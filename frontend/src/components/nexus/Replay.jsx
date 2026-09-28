import React,{useEffect,useState} from 'react';
import {Play,Pause} from './Icons';
import SeriesPlot from './SeriesPlot';
import ScreenShell from './ScreenShell';import ReplayPlot from './ReplayPlot';
const fmt=(v,unit='')=>v==null?'—':`${Number(v).toFixed(2)}${unit}`;
export default function Replay({simulation}){
 const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0);
 useEffect(()=>{if(!playing||!simulation)return;const timer=setInterval(()=>setProgress(p=>Math.min(100,p+1)),100);return()=>clearInterval(timer)},[playing,simulation]);
 const m=simulation?.metrics;const legend=[['#3D3D3D','VBOX reference'],['#C62828','Inertial baseline'],['#E6B800','AI-aided navigation']];
 return <ScreenShell eyebrow="03 / SCREENING EVIDENCE" title="Route replay" right={<span className="text-route">{m?m.evaluation_mode.toUpperCase():'NO RESULT'}</span>}>
  <ReplayPlot simulation={simulation} progress={progress}/><div className="mt-3 flex flex-wrap gap-4 text-xs font-mono">{legend.map(([color,title])=><span key={title} className="flex gap-2 items-center text-dust"><span className="w-3 h-0.5" style={{background:color}}/>{title}</span>)}</div>
  {simulation&&<div className="grid md:grid-cols-2 gap-3 mt-4"><SeriesPlot simulation={simulation} kind="speed"/><SeriesPlot simulation={simulation} kind="error"/></div>}
  {m&&<div className="mt-3 text-xs text-dust"><p>Estimator: {m.estimator||'legacy'} · Requested &lt;50%: {m.fused_drift_pct==null?'unscorable':m.fused_drift_pct<50?'BELOW THRESHOLD':'FAILED'} · This is recorded-data evidence, not a guarantee.</p>{m.heading_calibration?.warnings?.map((w,i)=><p key={i} className="mt-1">{w}</p>)}</div>}
  <div className="mt-5 flex items-center gap-3"><button disabled={!m} onClick={()=>{if(progress>=100)setProgress(0);setPlaying(!playing)}} className="w-12 h-12 rounded-xl bg-route text-ink grid place-items-center disabled:opacity-40">{playing?<Pause size={18}/>:<Play size={18}/>}</button><input type="range" min="0" max="100" value={progress} onChange={e=>setProgress(Number(e.target.value))} className="w-full accent-[#E6B800]"/><span className="hud-mono">{m?Math.floor(progress/100*m.blackout_duration_s):'—'}s</span></div>
  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5">{[['RMSE',fmt(m?.fused_rmse_m,' m')],['MAX ERROR',fmt(m?.fused_max_err_m,' m')],['ENDPOINT DRIFT',fmt(m?.fused_drift_pct,'%')],['DISTANCE',fmt(m?.blackout_distance_m,' m')],['BLACKOUT',fmt(m?.blackout_duration_s,' s')]].map(([k,v])=><div key={k} className="bg-recess border border-hairline rounded-xl p-3"><div className="hud-label">{k}</div><div className="font-display text-2xl mt-1">{v}</div></div>)}</div>
  <p className="mt-5 text-xs text-dust border-l-2 border-route pl-3">Recorded-data replay from the selected S/V pair. {m?`Eligible: ${m.benchmark_eligible}; <10% endpoint target: ${m.meets_isro_target}.`:'Run inference on a paired recording in Train.'}</p>
 </ScreenShell>
}
