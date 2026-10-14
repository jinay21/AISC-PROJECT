const Scheduler = (() => {
  // Unlimited capacity: passengers waiting at the same floor in the same
  // direction share a pickup. Opposite directions remain separate groups.
  function pickupGroups(waiting) {
    const groups = new Map();
    for (const p of waiting) {
      const key = `${p.from}:${p.direction}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    return [...groups.values()];
  }

  function schedule(s, mode) {
    const waiting = s.requests.filter(p => p.picked === null);
    if (!waiting.length) return;
    const groups = pickupGroups(waiting);
    const allowed = [0, 1, 2];
    const initial = groups.map(group => allowed.reduce((best, i) =>
      Math.abs(s.elevators[i].floor - group[0].from) <
      Math.abs(s.elevators[best].floor - group[0].from) ? i : best, 0));

    function evaluate(assignment) {
      const trial = Simulation.clone(s);
      const base = Simulation.metrics(s);
      const assigned = new Map();
      groups.forEach((group, i) => group.forEach(p => assigned.set(p.id, assignment[i])));
      const pending = trial.requests.filter(p => p.picked === null);
      pending.forEach(p => p.assigned = assigned.get(p.id));
      // No future demand is assumed. Both candidate and real routes use tick().
      while (trial.requests.some(p => p.completed === null)) Simulation.tick(trial);
      const after = Simulation.metrics(trial);
      const wait = pending.reduce((sum, p) => sum + p.picked - s.time, 0);
      const distance = after.distance - base.distance;
      const reversals = after.turns - base.turns;
      return {wait, distance, reversals, total: wait + distance + 5 * reversals};
    }
    const cost = assignment => evaluate(assignment).total;
    const result = mode === 'ai'
      ? hillClimbing(initial, cost, allowed)
      : {assignment:initial, cost:cost(initial), history:[cost(initial)], evaluations:1};
    const latest = waiting[waiting.length - 1];
    const groupIndex = groups.findIndex(group => group.includes(latest));
    const group = groups[groupIndex];
    const candidateCosts = allowed.map(i => {
      const assignment = [...result.assignment];
      assignment[groupIndex] = i;
      return cost(assignment);
    });
    const chosen = result.assignment[groupIndex];
    const e = s.elevators[chosen];
    const aligned = e.direction === latest.direction && Math.sign(latest.from - e.floor) === e.direction;
    s.decision = {
      mode, request:latest.id, from:latest.from, to:latest.to,
      groupSize:group.length, chosen, candidateCosts, ...result,
      breakdown:evaluate(result.assignment),
      reason: group.length > 1
        ? `${group.length} waiting passengers on this floor going ${latest.direction === 1 ? 'up' : 'down'} share one elevator; capacity is unlimited.`
        : mode === 'normal' ? 'Nearest elevator by floor distance.'
        : aligned ? 'Already moving toward the pickup in the passenger’s direction.'
        : 'This assignment balances predicted waiting, travel, and direction reversals.'
    };
    groups.forEach((group, i) => group.forEach(p => p.assigned = result.assignment[i]));
    s.elevators.forEach((e, i) => e.stops = [...new Set(s.requests
      .filter(p => p.assigned === i && p.completed === null)
      .map(p => p.picked === null ? p.from : p.to))]);
  }
  return {schedule, pickupGroups};
})();
