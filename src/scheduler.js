const Scheduler = (() => {
  function schedule(s,mode){
    const waiting=s.requests.filter(p=>p.picked===null);
    if(!waiting.length)return;
    const allowed=[0,1,2]; // Capacity is intentionally unlimited for this classroom demo.
    const initial=waiting.map(p=>allowed.reduce((best,i)=>Math.abs(s.elevators[i].floor-p.from)<Math.abs(s.elevators[best].floor-p.from)?i:best,allowed[0]));
    function cost(assignment){
      const trial=Simulation.clone(s), base=Simulation.metrics(s);
      const pending=trial.requests.filter(p=>p.picked===null);
      pending.forEach((p,i)=>p.assigned=assignment[i]);
      let steps=0;
      while(trial.requests.some(p=>p.completed===null)&&steps++<500)Simulation.tick(trial);
      const after=Simulation.metrics(trial);
      const wait=pending.reduce((sum,p)=>sum+(p.picked===null?10000:p.picked-s.time),0);
      const counts=s.elevators.map(e=>e.load);
      assignment.forEach(i=>{if(i!==null)counts[i]++;});
      // Sum of queue/load penalties: adding to a busy elevator costs more.
      const load=counts.reduce((sum,n)=>sum+n*(n-1)/2,0);
      return wait+(after.distance-base.distance)+5*(after.turns-base.turns)+2*load;
    }
    const result=mode==='ai'?hillClimbing(initial,cost,allowed):{assignment:initial,cost:cost(initial),history:[cost(initial)],evaluations:1};
    const last=waiting.length-1;
    const candidateCosts=s.elevators.map((e,i)=>{if(!allowed.includes(i))return null;const a=[...result.assignment];a[last]=i;return cost(a);});
    const chosen=result.assignment[last],e=s.elevators[chosen],p=waiting[last];
    const aligned=e.direction===p.direction&&Math.sign(p.from-e.floor)===e.direction;
    s.decision={mode,request:p.id,from:p.from,to:p.to,chosen,candidateCosts,...result,reason:mode==='normal'?'Nearest available elevator by floor distance.':aligned?'Already moving toward the pickup in the passenger’s direction.':e.direction===0?'An idle elevator can serve this request without interrupting its route.':'This assignment balances predicted waiting, movement, reversals, and queued load.'};
    waiting.forEach((p,i)=>p.assigned=result.assignment[i]);
    s.elevators.forEach((e,i)=>e.stops=[...new Set(s.requests.filter(p=>p.assigned===i&&p.completed===null).map(p=>p.picked===null?p.from:p.to))]);
  }
  return {schedule};
})();
