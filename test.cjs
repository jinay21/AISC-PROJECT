const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({console});
for (const name of ['simulation','hillClimbing','scheduler','comparison']) {
  vm.runInContext(fs.readFileSync(`${__dirname}/src/${name}.js`, 'utf8'), context);
}
vm.runInContext(`
function assert(ok, message) { if (!ok) throw Error(message); }
function invariants(s) {
  assert(s.elevators.every(e => e.floor >= 0 && e.floor <= 9 && e.load >= 0), 'Floor and load bounds');
  assert(s.requests.every(p => p.completed === null || (p.picked !== null && p.completed >= p.picked)), 'Pickup before delivery');
  s.elevators.forEach((e,i) => assert(e.load === s.requests.filter(p => p.assigned === i && p.picked !== null && p.completed === null).length, 'Onboard count'));
}
function workload(seed) {
 let value=seed;
 const random=()=>{value=(Math.imul(1664525,value)+1013904223)>>>0;return value/4294967296;};
 return Array.from({length:25},()=>{const from=Math.floor(random()*10);let to=Math.floor(random()*9);if(to>=from)to++;return [from,to];});
}
for (const seed of [1,7,42,123,999]) {
  const runs = Comparison.create();
  const arrivals = workload(seed);
  for(let time=0;time<500;time++) {
    if(time%3 === 0 && time/3 < arrivals.length) Comparison.addBatch(runs,[arrivals[time/3]]);
    Comparison.tick(runs);
    for(const s of [runs.normal,runs.ai]) invariants(s);
    assert(runs.normal.time === runs.ai.time, 'Clocks stay synchronized');
    if(runs.ai.requests.length===25 && Comparison.finished(runs)) break;
  }
  assert(Comparison.finished(runs), 'Both runs finish');
  console.log('Seed',seed,JSON.stringify([Simulation.metrics(runs.normal),Simulation.metrics(runs.ai)]));
}
for (const mode of ['normal','ai']) {
  const s=Simulation.create();
  // Approach floor 2 from above: an empty downward-moving car must board
  // the whole upward group immediately, not leave all but one behind.
  s.elevators.forEach(e=>e.floor=9);
  for(let i=0;i<20;i++) Simulation.add(s,2,3+i%7);
  Scheduler.schedule(s,mode);
  assert(new Set(s.requests.map(p=>p.assigned)).size===1,'Same floor + direction share an elevator');
  for(let t=0;t<7;t++) Simulation.tick(s);
  assert(s.requests.every(p=>p.picked===7),'Whole group boards on arrival, even after opposite approach direction');
  assert(s.elevators.some(e=>e.load===20),'No capacity restriction');
  for(let t=0;t<100 && s.requests.some(p=>p.completed===null);t++){Simulation.tick(s);invariants(s);}
  assert(Simulation.metrics(s).completed===20,'All shared-pickup passengers delivered');
}
const runs=Comparison.create();
Comparison.addBatch(runs,[[4,9],[4,7],[4,1]]);
for(const s of [runs.ai,runs.normal]) {
  assert(Scheduler.pickupGroups(s.requests).length===2,'Opposite directions remain separate groups');
  assert(s.requests[0].assigned===s.requests[1].assigned,'Same-floor same-direction requests stay together');
}
Comparison.tick(runs);
Comparison.addBatch(runs,[[2,8]]);
assert(runs.ai.requests[3].created===1 && runs.normal.requests[3].created===1,'New requests share arrival tick');
assert(runs.ai.requests.length===4 && runs.normal.requests.length===4,'Requests update both runs');
const fresh=Comparison.create();
assert(fresh.ai.time===0 && fresh.normal.time===0 && !fresh.ai.requests.length && !fresh.normal.requests.length,'Reset clears both runs');
assert(Object.values(Simulation.metrics(fresh.ai)).every(v=>v===0),'Reset clears comparison metrics');
let rejected=false;try{Comparison.addBatch(runs,[[2,3],[4,4]]);}catch{rejected=true;}
assert(rejected && runs.ai.requests.length===4 && runs.normal.requests.length===4,'Invalid batch leaves both runs unchanged');
const d=runs.ai.decision;
assert(d.history.every((c,i,a)=>i===0||c<a[i-1]),'Hill Climbing strictly improves');
assert(d.cost===d.breakdown.wait+d.breakdown.distance+5*d.breakdown.reversals,'Displayed breakdown matches actual cost');
const live=Comparison.create();
Comparison.addBatch(live,[[2,9]]);
Comparison.tick(live);
for(const s of [live.normal,live.ai]) {
 const m=Simulation.metrics(s);
 assert(m.wait===1 && m.totalWait===1 && m.waiting===1,'Waiting updates BEFORE pickup');
}
Comparison.addBatch(live,[[2,9],[2,8]]);
for(const s of [live.normal,live.ai]) {
 const m=Simulation.metrics(s);
 assert(m.total===3 && m.waiting===3 && m.totalWait===1,'New requests enter live comparison immediately');
 assert(new Set(s.requests.map(p=>p.assigned)).size===1,'Same-direction arrivals share existing floor pickup');
}
for(let t=0;t<100&&!Comparison.finished(live);t++)Comparison.tick(live);
assert(Comparison.finished(live),'Shared pickup group finishes');
for(const s of [live.normal,live.ai]){
 assert(new Set(s.requests.map(p=>p.picked)).size===1,'Whole same-direction group boards together');
 const measured=s.requests.reduce((sum,p)=>sum+p.picked-p.created,0)/s.requests.length;
 assert(Simulation.metrics(s).wait===measured,'Final waiting equals actual pickup waiting');
}
const duplicates=Comparison.create();
for(let i=0;i<8;i++)Comparison.addBatch(duplicates,[[2,9]]);
for(const s of [duplicates.normal,duplicates.ai]) {
 assert(s.time===0,'Adding paused requests does not advance time');
 assert(new Set(s.requests.map(p=>p.assigned)).size===1,'All paused identical requests share one elevator');
}
for(let t=0;t<100&&!Comparison.finished(duplicates);t++)Comparison.tick(duplicates);
for(const s of [duplicates.normal,duplicates.ai])assert(s.elevators.filter(e=>e.distance>0).length===1,'One lift serves paused identical requests');
const departed=Comparison.create();
Comparison.addBatch(departed,[[0,9]]);
for(let t=0;t<8;t++)Comparison.tick(departed);
Comparison.addBatch(departed,[[0,9]]);
assert(departed.ai.requests[1].assigned!==departed.ai.requests[0].assigned,'New arrival can use cheaper idle lift after first lift departed');
assert(departed.ai.decision.candidateCosts.every(Number.isFinite),'All elevators remain candidates for later arrivals');
const replaySource=Comparison.create();
Comparison.addBatch(replaySource,[[2,9],[2,9]]);
for(let i=0;i<3;i++)Comparison.tick(replaySource);
Comparison.addBatch(replaySource,[[6,1]]);
const original=JSON.stringify(replaySource);
const replayed=Comparison.replay(replaySource.arrivals);
assert(JSON.stringify(replaySource)===original,'Replay cannot mutate input runs or events');
while(!Comparison.finished(replaySource))Comparison.tick(replaySource);
assert(JSON.stringify(replayed.ai)===JSON.stringify(Simulation.metrics(replaySource.ai)),'Replay matches actual AI arrival timing');
assert(JSON.stringify(replayed.normal)===JSON.stringify(Simulation.metrics(replaySource.normal)),'Replay matches actual normal arrival timing');
assert(Comparison.replay([]).count===0,'Empty replay terminates');
const optimum=hillClimbing([0,0],a=>(a[0]-1)**2+(a[1]-1)**2,[0,1,2]);
assert(optimum.cost===0,'Known toy optimum');
console.log('All live comparison, shared pickup, movement, and Hill Climbing tests passed.');
`, context);
