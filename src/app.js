const $=id=>document.getElementById(id);
let runs=Comparison.create(),mode='ai',state=runs.ai,running=false,timer=null,comparison=null;
const floor=f=>f===0?'Ground':`Floor ${f}`;
const arrow=d=>d===1?'↑':d===-1?'↓':'—';
for(let i=1;i<=6;i++) $('elevatorCount').add(new Option(i,i));
for(let i=1;i<=30;i++) $('floorCount').add(new Option(i,i));
function presetJourneys(){
  const top=runs.config.floorCount-1;
  return [[2,8],[6,1],[4,9],[8,3],[0,7]]
    .map(pair=>pair.map(f=>Math.floor(f*top/9)))
    .filter(([from,to])=>from!==to);
}
function buildBuilding(){
  const {floorCount,elevatorCount}=runs.config;
  $('elevatorCount').value=elevatorCount;
  $('floorCount').value=floorCount;
  const options=Array.from({length:floorCount},(_,f)=>`<option value="${f}">${floor(f)}</option>`).join('');
  for(const id of ['pickup','destination']) $(id).innerHTML=options;
  $('pickup').value=0;
  $('destination').value=Math.min(7,floorCount-1);
  $('buildingSummary').textContent=`${floorCount} ${floorCount===1?'floor':'floors'} · ${elevatorCount} ${elevatorCount===1?'elevator':'elevators'} · unlimited capacity`;
  $('buildingCanvas').style.setProperty('--elevator-count',elevatorCount);
  $('buildingCanvas').style.minWidth=`${125+elevatorCount*96+(elevatorCount+1)*12}px`;
  $('building').style.height=`${floorCount*42}px`;
  $('shaftLabels').innerHTML='<span>FLOOR</span>'+state.elevators.map((e,i)=>`<b>${e.id} <i class="key c${i}"></i></b>`).join('')+'<span>WAITING</span>';
  $('building').innerHTML=Array.from({length:floorCount},(_,r)=>{
    const f=floorCount-1-r;
    return `<div class="floor-row"><span class="floor-label">${f===0?'G':String(f).padStart(2,'0')}</span>${state.elevators.map(()=>'<div class="track"></div>').join('')}<span class="waiting" id="waiting${f}"></span></div>`;
  }).join('')+`<div class="cab-layer"><div></div>${state.elevators.map((e,i)=>`<div class="cab-lane"><div id="cab${i}" class="cab c${i}"><b>${e.id} <span id="cabDir${i}">—</span></b><small id="cabLoad${i}">0 riders</small></div></div>`).join('')}<div></div></div>`;
  $('legend').innerHTML=state.elevators.map((e,i)=>`<span><i class="key c${i}"></i> Elevator ${i+1}</span>`).join('')+'<span>↑ Up &nbsp; ↓ Down &nbsp; — Idle</span>';
  $('demoCount').textContent=`${presetJourneys().length} requests →`;
  const noJourney=floorCount===1;
  for(const id of ['pickup','destination','addRequest','random','demo','start','step']) $(id).disabled=noJourney;
  $('requestHelp').textContent=noJourney?'Only Ground is available. Select at least 2 floors to create a journey.':'Give your elevators somewhere to go.';
  $('buildingScroll').scrollTop=0;
  $('buildingScroll').scrollLeft=0;
}
function render(){
  const m=Simulation.metrics(state);
  updateComparisonStatus();
  $('clock').textContent=`STEP ${String(state.time).padStart(2,'0')}`;
  $('runStatus').textContent=running?'Running':'Paused';$('runStatus').classList.toggle('running',running);
  $('start').textContent=running?'Ⅱ Pause simulation':'▶ Start simulation';
  for(let i=0;i<state.elevators.length;i++){const e=state.elevators[i];$('cab'+i).style.bottom=`${e.floor*42+5}px`;$('cabDir'+i).textContent=arrow(e.direction);$('cabLoad'+i).textContent=`${e.load} riders`;}
  for(let f=0;f<runs.config.floorCount;f++){const n=state.requests.filter(p=>p.from===f&&p.picked===null).length;$('waiting'+f).textContent=n?`${n} waiting`:'';}
  $('elevatorCards').innerHTML=state.elevators.map((e,i)=>`<div class="elevator-card"><div><b><i class="key c${i}"></i>${e.id}</b><span>${arrow(e.direction)} ${e.direction===0?'IDLE':e.direction===1?'UP':'DOWN'}</span></div><strong>${floor(e.floor)}</strong><p>Load <b>${e.load}</b> <span>Travel <b>${e.distance}</b></span></p><small>Stops &nbsp; ${e.stops.length?e.stops.join(' · '):'None'}</small></div>`).join('');
  $('metrics').innerHTML=[['Average waiting time',m.wait.toFixed(1),'elapsed steps · all requests'],['Total distance travelled',m.distance,'floors moved'],['Requests completed',`${m.completed}<small> / ${state.requests.length}</small>`,'passengers delivered'],['Direction changes',m.turns,'elevator reversals']].map(([label,val,unit])=>`<div class="panel metric"><span>${label}</span><strong>${val}</strong><small>${unit}</small></div>`).join('');
  const d=state.decision;
  $('decision').innerHTML=d?`<div class="journey"><span>${d.request}</span><strong>${floor(d.from)} <span>→</span> ${floor(d.to)}</strong></div><p class="muted">${d.mode==='ai'?'Costs for moving this pickup group':'Total costs if this request changes elevator'}</p><div class="costs">${d.candidateCosts.map((c,i)=>`<div class="${i===d.chosen?'chosen':''}"><span>E${i+1}</span><b>${c}</b>${i===d.chosen?'<small>SELECTED</small>':'<small>cost</small>'}</div>`).join('')}</div><p class="reason"><b>E${d.chosen+1} selected.</b> ${d.reason}</p><div class="trace">${d.mode==='ai'?`${d.history.length-1} improvements · ${d.evaluations} states evaluated<br>Cost: ${d.history.join(' → ')}<br>${d.breakdown.wait} wait + ${d.breakdown.distance} travel + 5 × ${d.breakdown.reversals} reversals = ${d.cost}`:'Baseline: nearest available elevator'}</div>`:'<div class="decision-empty"><span>↕</span><h3>Ready for a smarter move.</h3><p>Add a request to see the scheduler evaluate its options.</p></div>';
  $('queueCount').textContent=`${state.requests.filter(p=>p.completed===null).length} active requests`;
  $('requests').innerHTML=state.requests.length?[...state.requests].reverse().map(p=>`<tr><td><b>${p.id}</b></td><td>${floor(p.from)} <span class="muted">→</span> ${floor(p.to)}</td><td>${arrow(p.direction)} ${p.direction===1?'Up':'Down'}</td><td>${p.assigned===null?'Queued':`E${p.assigned+1}`}</td><td>${(p.picked??state.time)-p.created}</td><td><span class="pill ${p.completed!==null?'done':p.picked!==null?'riding':''}">${p.completed!==null?'Completed':p.picked!==null?'On board':'Waiting'}</span></td></tr>`).join(''):'<tr><td colspan="6" class="empty">No passengers yet. Add a request or load the demo to get started.</td></tr>';
}
function pause(){running=false;clearInterval(timer);timer=null;render();}
function step(){if(Comparison.finished(runs))return pause();Comparison.tick(runs);if(Comparison.finished(runs))return pause();render();}
function add(from,to){Comparison.addBatch(runs,[[from,to]]);render();}
function reset(journeys=[],settings=runs.config){
  const nextRuns=Comparison.create(settings);
  if(journeys.length)Comparison.addBatch(nextRuns,journeys);
  running=false;clearInterval(timer);timer=null;
  runs=nextRuns;state=runs[mode];comparison=null;
  buildBuilding();renderComparison();
  $('error').textContent='';$('settingsError').textContent='';render();
}
$('buildingSettings').onsubmit=e=>{
  e.preventDefault();
  try {reset([],{floorCount:Number($('floorCount').value),elevatorCount:Number($('elevatorCount').value)});}
  catch(err){$('settingsError').textContent=err.message;}
};
$('start').onclick=()=>{if(running)return pause();if(Comparison.finished(runs))return;running=true;timer=setInterval(step,650);render();};
$('step').onclick=()=>{pause();step();};
$('reset').onclick=()=>reset();
for(const name of ['ai','normal']) $(name+'Mode').onclick=()=>{mode=name;for(const n of ['ai','normal']){$(n+'Mode').classList.toggle('active',n===mode);$(n+'Mode').setAttribute('aria-pressed',n===mode);}state=runs[mode];render();};
$('requestForm').onsubmit=e=>{e.preventDefault();try{add(Number($('pickup').value),Number($('destination').value));$('error').textContent='';}catch(err){$('error').textContent=err.message;}};
$('random').onclick=()=>{const count=runs.config.floorCount;if(count<2)return;const from=Math.floor(Math.random()*count);let to=Math.floor(Math.random()*(count-1));if(to>=from)to++;add(from,to);};
$('demo').onclick=()=>{if(runs.config.floorCount>1)reset(presetJourneys());};
$('theoryBtn').onclick=()=>$('theory').scrollIntoView({behavior:'smooth'});
// Only the Compare click computes a replay. Animation never updates its results.
function updateComparisonStatus(){
  const count=runs.ai.requests.length;
  $('compare').disabled=count===0;
  $('compare').textContent=comparison?'↻ Compare again':'Compare schedulers';
  $('comparisonStatus').textContent=!comparison
    ? `${count} requests ready to compare`
    : `Last compared: ${comparison.count} requests · ${count-comparison.count} new requests`;
}
function renderComparison(){
  if(!comparison){
    $('comparisonResult').innerHTML='<p class="empty">Add requests, then click Compare to calculate both schedulers through completion. Your building will stay where it is.</p>';
    return;
  }
  const {normal,ai,count}=comparison;
  const rows=[['Final average waiting','wait','steps per passenger'],['Total distance','distance','floors'],['Direction changes','turns','reversals'],['Requests completed','completed','passengers']];
  $('comparisonResult').innerHTML=`<div class="comparison-grid">${rows.map(([label,key,unit])=>`<div><h3>${label}</h3>${[['Normal',normal],['AI',ai]].map(([name,m])=>`<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar ${name==='AI'?'ai':''}" style="width:${100*m[key]/Math.max(normal[key],ai[key],1)}%"></div></div><b>${key==='wait'?m[key].toFixed(2):m[key]}</b></div>`).join('')}<small>${unit}</small></div>`).join('')}</div>
  <p class="comparison-note">Final results for all ${count} requests entered when you clicked Compare, replayed with ${comparison.config.floorCount} floors, ${comparison.config.elevatorCount} elevators, and identical arrival times and starting floors. Normal completed ${normal.completed}/${count}; AI completed ${ai.completed}/${count}. These results stay unchanged until you click Compare again. The building animation is unaffected.</p>`;
}
$('compare').onclick=()=>{
  if(!runs.ai.requests.length)return;
  comparison=Comparison.replay(runs.arrivals,runs.config);
  renderComparison();
  updateComparisonStatus();
};
buildBuilding();
renderComparison();
render();
