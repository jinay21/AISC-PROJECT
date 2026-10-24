/* Viva: a state is an array of elevator indices, one per waiting pickup group.
   A neighbour changes ONE pickup group's elevator. Strict improvement prevents cycles.
   This is Steepest Hill Climbing (best-neighbour / steepest improvement),
   expressed as cost minimization: evaluate every immediate neighbour each round.
   It stops at a local optimum, which need not be the global optimum. */
function hillClimbing(initialSolution, cost, allowedElevators) {
  let currentSolution = [...initialSolution];
  let currentCost = cost(currentSolution);
  const history = [currentCost];
  let evaluations = 1;
  while (true) {
    let bestNeighbour = currentSolution;
    let bestCost = currentCost;
    for (let group = 0; group < currentSolution.length; group++) {
      for (const elevator of allowedElevators) {
        if (elevator === currentSolution[group]) continue;
        const neighbour = [...currentSolution];
        neighbour[group] = elevator;
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
