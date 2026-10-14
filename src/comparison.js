/* Two independent simulations receive identical requests at the same tick.
   The mode switch selects which one to display; it does not change either run. */
const Comparison = (() => {
  const create = () => ({normal:Simulation.create(), ai:Simulation.create(), arrivals:[]});
  function addBatch(runs, journeys) {
    // Validate the whole batch before mutating either run.
    const check = Simulation.create();
    journeys.forEach(([from, to]) => Simulation.add(check, from, to));
    runs.arrivals.push({time:runs.ai.time, journeys:journeys.map(j => [...j])});
    for (const mode of ['normal', 'ai']) {
      journeys.forEach(([from, to]) => Simulation.add(runs[mode], from, to));
      Scheduler.schedule(runs[mode], mode);
    }
  }
  function tick(runs) {
    Simulation.tick(runs.normal);
    Simulation.tick(runs.ai);
  }
  const finished = runs => [runs.normal, runs.ai].every(s => s.requests.every(p => p.completed !== null));
  // Replay the recorded arrivals from the original starting floors. Only the
  // requests already entered are included; no future demand is generated.
  function replay(arrivals) {
    const replayRuns = create();
    let next = 0;
    while (next < arrivals.length || !finished(replayRuns)) {
      // Skip idle gaps without changing any passenger's arrival or waiting time.
      if (finished(replayRuns) && next < arrivals.length) {
        replayRuns.normal.time = replayRuns.ai.time = arrivals[next].time;
      }
      while (next < arrivals.length && arrivals[next].time === replayRuns.ai.time) {
        addBatch(replayRuns, arrivals[next].journeys);
        next++;
      }
      if (!finished(replayRuns)) tick(replayRuns);
    }
    return {normal:Simulation.metrics(replayRuns.normal), ai:Simulation.metrics(replayRuns.ai),
      count:replayRuns.ai.requests.length};
  }
  return {create, addBatch, tick, finished, replay};
})();
