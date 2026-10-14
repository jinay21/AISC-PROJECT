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
for (const seed of [1,7,42,123,999]) {
  const runs = Comparison.create();
  const arrivals = Comparison.demo(seed);
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
  assert(Scheduler.pickupGroups(s.requests).length===2,'Opposite directions are separate pickup groups');
  assert(s.requests[0].assigned===s.requests[1].assigned,'Compatible requests stay together');
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
const optimum=hillClimbing([0,0],a=>(a[0]-1)**2+(a[1]-1)**2,[0,1,2]);
assert(optimum.cost===0,'Known toy optimum');
console.log('All live comparison, shared pickup, movement, and Hill Climbing tests passed.');
`, context);
