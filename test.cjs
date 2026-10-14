const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({console});
for(const f of ['simulation','hillClimbing','scheduler'])vm.runInContext(fs.readFileSync(`${__dirname}/src/${f}.js`,'utf8'),context);
const app=fs.readFileSync(`${__dirname}/src/app.js`,'utf8');
vm.runInContext(app.slice(app.indexOf('function experiment('),app.indexOf("$('compare').onclick")),context);
vm.runInContext(`
const assert=(condition,message)=>{if(!condition)throw Error(message);};
for (const seed of [1,7,42,123,999]){
 const result=experiment(seed);console.log('Seed',seed,JSON.stringify(result));
 assert(result.every(m=>m.completed===25),'All 25 passengers must complete');
}
for(const method of ['normal','ai']){
 const s=Simulation.create();
 for(let i=0;i<20;i++)Simulation.add(s,0,9);
 Scheduler.schedule(s,method);
 for(let t=0;t<300&&s.requests.some(p=>p.completed===null);t++){
  if(s.requests.some(p=>p.picked===null&&p.assigned===null))Scheduler.schedule(s,method);
  Simulation.tick(s);
  assert(s.elevators.every(e=>e.load>=0&&e.floor>=0&&e.floor<=9),'Nonnegative load and floor bounds');
  assert(s.requests.every(p=>p.completed===null||(p.picked!==null&&p.completed>=p.picked)),'Pickup before drop-off');
  assert(s.elevators.every((e,i)=>e.load===s.requests.filter(p=>p.assigned===i&&p.picked!==null&&p.completed===null).length),'Load matches onboard count');
 }
 assert(Simulation.metrics(s).completed===20,'Busy-floor test completes');
}
const s=Simulation.create();[[2,8],[6,1],[4,9],[8,3],[0,7]].forEach(([a,b])=>Simulation.add(s,a,b));
Scheduler.schedule(s,'ai');
assert(s.decision.history.every((c,i,a)=>i===0||c<a[i-1]),'Hill Climbing strictly improves');
const result=hillClimbing([0,0],a=>(a[0]-1)**2+(a[1]-1)**2,[0,1,2]);
assert(result.cost===0&&result.assignment.every(v=>v===1),'Known optimum');
let rejected=false;try{Simulation.add(s,4,4);}catch{rejected=true;}assert(rejected,'Reject equal floors');
console.log('All simulation and Hill Climbing checks passed.');
`,context);
