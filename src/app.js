const $=id=>document.getElementById(id);
let runs=Comparison.create(),mode='ai',state=runs.ai,running=false,timer=null;
const floor=f=>f===0?'Ground':`Floor ${f}`;
const arrow=d=>d===1?'↑':d===-1?'↓':'—';
for(let i=0;i<10;i++) for(const id of ['pickup','destination']) $(id).add(new Option(floor(i),i));
$('destination').value=7;
$('building').innerHTML=Array.from({length:10},(_,r)=>{const f=9-r;return `<div class="floor-row"><span class="floor-label">${f===0?'G':String(f).padStart(2,'0')}</span><div class="track"></div><div class="track"></div><div class="track"></div><span class="waiting" id="waiting${f}"></span></div>`;}).join('')+state.elevators.map((e,i)=>`<div id="cab${i}" class="cab c${i}"><b>${e.id} <span id="cabDir${i}">—</span></b><small id="cabLoad${i}">0 riders</small></div>`).join('');
function render(){
  const m=Simulation.metrics(state);
  renderComparison();
  $('clock').textContent=`STEP ${String(state.time).padStart(2,'0')}`;
  $('runStatus').textContent=running?'Running':'Paused';$('runStatus').classList.toggle('running',running);
  $('start').textContent=running?'Ⅱ Pause simulation':'▶ Start simulation';
  for(let i=0;i<3;i++){const e=state.elevators[i];$('cab'+i).style.bottom=`calc(${e.floor*10}% + 5px)`;$('cabDir'+i).textContent=arrow(e.direction);$('cabLoad'+i).textContent=`${e.load} riders`;}
  for(let f=0;f<10;f++){const n=state.requests.filter(p=>p.from===f&&p.picked===null).length;$('waiting'+f).textContent=n?`${n} waiting`:'';}
  $('elevatorCards').innerHTML=state.elevators.map((e,i)=>`<div class="elevator-card"><div><b><i class="key c${i}"></i>${e.id}</b><span>${arrow(e.direction)} ${e.direction===0?'IDLE':e.direction===1?'UP':'DOWN'}</span></div><strong>${floor(e.floor)}</strong><p>Load <b>${e.load}</b> <span>Travel <b>${e.distance}</b></span></p><small>Stops &nbsp; ${e.stops.length?e.stops.join(' · '):'None'}</small></div>`).join('');
  $('metrics').innerHTML=[['Average waiting time',m.wait.toFixed(1),'steps · picked-up passengers'],['Total distance travelled',m.distance,'floors moved'],['Requests completed',`${m.completed}<small> / ${state.requests.length}</small>`,'passengers delivered'],['Direction changes',m.turns,'elevator reversals']].map(([label,val,unit])=>`<div class="panel metric"><span>${label}</span><strong>${val}</strong><small>${unit}</small></div>`).join('');
  const d=state.decision;
  $('decision').innerHTML=d?`<div class="journey"><span>${d.request}</span><strong>${floor(d.from)} <span>→</span> ${floor(d.to)}</strong></div><p class="muted">${d.mode==='ai'?'Costs for moving this pickup group':'Total costs if this request changes elevator'}</p><div class="costs">${d.candidateCosts.map((c,i)=>`<div class="${i===d.chosen?'chosen':''}"><span>E${i+1}</span><b>${c===null?'Full':c}</b>${i===d.chosen?'<small>SELECTED</small>':'<small>cost</small>'}</div>`).join('')}</div><p class="reason"><b>E${d.chosen+1} selected.</b> ${d.reason}</p><div class="trace">${d.mode==='ai'?`${d.history.length-1} improvements · ${d.evaluations} states evaluated<br>Cost: ${d.history.join(' → ')}<br>${d.breakdown.wait} wait + ${d.breakdown.distance} travel + 5 × ${d.breakdown.reversals} reversals = ${d.cost}`:'Baseline: nearest available elevator'}</div>`:'<div class="decision-empty"><span>↕</span><h3>Ready for a smarter move.</h3><p>Add a request to see the scheduler evaluate its options.</p></div>';
  $('queueCount').textContent=`${state.requests.filter(p=>p.completed===null).length} active requests`;
  $('requests').innerHTML=state.requests.length?[...state.requests].reverse().map(p=>`<tr><td><b>${p.id}</b></td><td>${floor(p.from)} <span class="muted">→</span> ${floor(p.to)}</td><td>${arrow(p.direction)} ${p.direction===1?'Up':'Down'}</td><td>${p.assigned===null?'Queued':`E${p.assigned+1}`}</td><td>${(p.picked??state.time)-p.created}</td><td><span class="pill ${p.completed!==null?'done':p.picked!==null?'riding':''}">${p.completed!==null?'Completed':p.picked!==null?'On board':'Waiting'}</span></td></tr>`).join(''):'<tr><td colspan="6" class="empty">No passengers yet. Add a request or load the demo to get started.</td></tr>';
}
function pause(){running=false;clearInterval(timer);render();}
function step(){Comparison.tick(runs);render();if(running&&Comparison.finished(runs))pause();}
function add(from,to){Comparison.addBatch(runs,[[from,to]]);render();}
function reset(journeys=[]){pause();runs=Comparison.create();state=runs[mode];if(journeys.length)Comparison.addBatch(runs,journeys);$('error').textContent='';render();}
$('start').onclick=()=>{if(running)return pause();running=true;timer=setInterval(step,650);render();};
$('step').onclick=()=>{pause();step();};
$('reset').onclick=()=>reset();
for(const name of ['ai','normal']) $(name+'Mode').onclick=()=>{mode=name;for(const n of ['ai','normal']){$(n+'Mode').classList.toggle('active',n===mode);$(n+'Mode').setAttribute('aria-pressed',n===mode);}state=runs[mode];render();};
$('requestForm').onsubmit=e=>{e.preventDefault();try{add(Number($('pickup').value),Number($('destination').value));$('error').textContent='';}catch(err){$('error').textContent=err.message;}};
$('random').onclick=()=>{const from=Math.floor(Math.random()*10);let to=Math.floor(Math.random()*9);if(to>=from)to++;add(from,to);};
$('demo').onclick=()=>reset([[2,8],[6,1],[4,9],[8,3],[0,7]]);
$('theoryBtn').onclick=()=>$('theory').scrollIntoView({behavior:'smooth'});
// Live comparison: no separate hidden experiment or cached result.
function renderComparison(){
  const normal=Simulation.metrics(runs.normal),ai=Simulation.metrics(runs.ai);
  const count=runs.ai.requests.length;
  const rows=[['Average waiting time','wait','steps · picked-up passengers'],['Total distance','distance','floors'],['Direction changes','turns','reversals'],['Requests completed','completed','passengers']];
  $('comparisonResult').innerHTML=`<div class="comparison-grid">${rows.map(([label,key,unit])=>`<div><h3>${label}</h3>${[['Normal',normal],['AI',ai]].map(([name,m])=>`<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar ${name==='AI'?'ai':''}" style="width:${100*m[key]/Math.max(normal[key],ai[key],1)}%"></div></div><b>${key==='wait'?m[key].toFixed(2):m[key]}</b></div>`).join('')}<small>${unit}</small></div>`).join('')}</div><p class="comparison-note">${count} identical requests · Step ${runs.ai.time} · Picked up: Normal ${normal.picked}/${count}, AI ${ai.picked}/${count}. ${!count?'Add requests or load a demo, then press Start or Step.':Comparison.finished(runs)?'Both runs complete. These are final measured results.':'Live results are provisional: waiting averages cover picked-up passengers only. Both runs continue until every passenger is delivered.'} Switching modes changes the building view only. Reset clears both runs.</p>`;
}
$('compare').onclick=()=>reset(Comparison.demo());
render();
