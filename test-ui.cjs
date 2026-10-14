// Regression checks for the REAL app event handlers with a minimal DOM/timer stub.
// Browser interaction tests separately verify actual HTML behavior and layout.
const fs=require('node:fs'),vm=require('node:vm');
const elements=new Map();
function get(id){
 if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',style:{},classList:{toggle(){}},setAttribute(){},add(){},scrollIntoView(){},click(){this.onclick?.();}});
 return elements.get(id);
}
let callback=null;
const ctx=vm.createContext({document:{getElementById:get},Option:function(){},setInterval:fn=>(callback=fn,1),clearInterval:()=>callback=null});
for(const f of ['simulation','hillClimbing','scheduler','comparison','app'])vm.runInContext(fs.readFileSync(`${__dirname}/src/${f}.js`,'utf8'),ctx);
const read=code=>vm.runInContext(code,ctx);
const assert=(value,msg)=>{if(!value)throw Error(msg);};
const add=(from,to)=>{get('pickup').value=from;get('destination').value=to;get('requestForm').onsubmit({preventDefault(){}});};
add(2,9);
add(2,9);
assert(read('new Set(runs.ai.requests.map(p=>p.assigned)).size')===1,'Paused identical requests share one lift');
assert(get('comparisonStatus').textContent.includes('2 requests'),'Add updates live comparison immediately');
get('step').click();
assert(read('Simulation.metrics(runs.ai).wait')===1,'Waiting before pickup appears in live metrics');
assert(get('comparisonResult').innerHTML.includes('1.00'),'Waiting rendered before pickup');
get('comparisonToggle').click();
assert(callback!==null && read('running'),'Comparison Start runs actual simulation');
callback();
add(2,9);
assert(read('runs.ai.decision.candidateCosts.every(Number.isFinite)'),'Late duplicate evaluates every lift');
get('normalMode').click();
assert(read('state === runs.normal'),'Mode switches view to existing baseline run');
get('comparisonReset').click();
assert(callback===null&&!read('running'),'Reset cancels running timer');
assert(read('runs.ai.time===0 && runs.normal.time===0'),'Reset clears both clocks');
assert(read('runs.ai.requests.length===0 && runs.normal.requests.length===0'),'Reset clears both request lists');
assert(get('comparisonStatus').textContent==='0 requests · Step 0 · Paused','Reset renders zero request count');
assert(get('comparisonResult').innerHTML.includes('No requests yet.'),'Reset removes old comparison result');
add(0,7);get('start').click();for(let i=0;i<15;i++)callback();
assert(read('Comparison.finished(runs) && running'),'Finished run remains active for new arrivals');
add(1,6);callback();
assert(read('runs.ai.requests.length===2 && runs.normal.requests.length===2'),'Post-completion arrivals reach both runs');
get('reset').click();
assert(read('runs.ai.requests.length===0 && runs.normal.requests.length===0')&&callback===null,'Toolbar reset also clears comparison and timer');
console.log('UI-handler regression checks passed: live requests, pre-pickup wait, mode switching, both resets, timers, late duplicates, and post-completion arrivals.');
