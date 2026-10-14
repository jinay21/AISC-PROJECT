/* Two independent simulations receive identical requests at the same tick.
   The mode switch selects which one to display; it does not change either run. */
const Comparison = (() => {
  const create = () => ({normal:Simulation.create(), ai:Simulation.create()});
  function addBatch(runs, journeys) {
    // Validate the whole batch before mutating either run.
    const check = Simulation.create();
    journeys.forEach(([from, to]) => Simulation.add(check, from, to));
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
  return {create, addBatch, tick, finished};
})();
