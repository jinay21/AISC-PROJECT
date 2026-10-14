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
  function demo(seed = 42) {
    let value = seed;
    const random = () => {value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296;};
    return Array.from({length:25}, () => {
      const from = Math.floor(random() * 10);
      let to = Math.floor(random() * 9);
      if (to >= from) to++;
      return [from, to];
    });
  }
  return {create, addBatch, tick, finished, demo};
})();
