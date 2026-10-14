/* Viva: a state is an array of elevator indices, one per waiting passenger.
   A neighbour changes ONE passenger's elevator. Strict improvement prevents cycles.
   This is steepest-ascent hill climbing expressed as cost minimization.
   It stops at a local optimum, which need not be the global optimum. */
function hillClimbing(initialSolution, cost, allowedElevators) {
  let currentSolution = [...initialSolution];
  let currentCost = cost(currentSolution);
  const history = [currentCost];
  let evaluations = 1;
  while (true) {
    let bestNeighbour = currentSolution;
    let bestCost = currentCost;
    for (let passenger = 0; passenger < currentSolution.length; passenger++) {
      for (const elevator of allowedElevators) {
        if (elevator === currentSolution[passenger]) continue;
        const neighbour = [...currentSolution];
        neighbour[passenger] = elevator;
        const neighbourCost = cost(neighbour);
        evaluations++;
        if (neighbourCost < bestCost) {
          bestNeighbour = neighbour;
          bestCost = neighbourCost;
        }
      }
    }
    if (bestCost >= currentCost) break;
    currentSolution = bestNeighbour;
    currentCost = bestCost;
    history.push(currentCost);
  }
  return {assignment:currentSolution,cost:currentCost,history,evaluations};
}
