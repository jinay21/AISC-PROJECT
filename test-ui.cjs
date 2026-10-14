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
get('start').click();get('step').click();
assert(callback===null && read('state.time')===0,'Empty simulation does not start or increment');
add(2,9);add(2,9);
assert(read('new Set(runs.ai.requests.map(p=>p.assigned)).size')===1,'Paused identical requests share one lift');
assert(read('comparison')===null,'Adding requests does not calculate comparison');
const before=read('JSON.stringify(runs)');
get('compare').click();
assert(read('JSON.stringify(runs)')===before,'Compare leaves visible simulation unchanged');
assert(read('comparison.normal.completed===2 && comparison.ai.completed===2'),'Compare completes all entered requests');
const snapshot=get('comparisonResult').innerHTML;
get('step').click();add(2,9);
assert(get('comparisonResult').innerHTML===snapshot,'Steps and new arrivals do not refresh saved results');
assert(get('comparisonStatus').textContent.includes('1 new requests'),'New requests visibly marked as not compared yet');
get('compare').click();
assert(read('comparison.normal.completed===3 && comparison.ai.completed===3'),'Compare again includes old and new requests');
assert(read('state.time')===1,'Recomparison does not advance screen');
get('normalMode').click();
assert(read('state===runs.normal'),'Mode switch preserves independent runs');
get('start').click();
for(let i=0;i<100 && callback;i++)callback();
assert(callback===null && read('Comparison.finished(runs) && !running'),'Completion automatically stops timer');
const time=read('state.time');get('step').click();get('start').click();
assert(read('state.time')===time && callback===null,'Idle start and step do not increase counter');
const lastResult=get('comparisonResult').innerHTML;
add(1,6);
assert(get('comparisonResult').innerHTML===lastResult,'Arrival after completion leaves results frozen');
get('compare').click();
assert(read('comparison.normal.completed===4 && comparison.ai.completed===4'),'Replay includes new arrivals after previous completion');
get('start').click();get('reset').click();
assert(callback===null && read('comparison===null'),'Reset clears timer and saved comparison');
assert(read('runs.ai.time===0 && runs.normal.time===0 && runs.arrivals.length===0'),'Reset clears clocks and recorded arrivals');
assert(get('comparisonResult').innerHTML.includes('Add requests, then click Compare'),'Reset removes stale results');
console.log('UI regressions passed: on-demand final results, frozen results, Compare again, no screen mutation, paused grouped requests, idle clock stop, reset.');
