# Smart Multi-Elevator Scheduling using Hill Climbing

A small browser-only AI course project. HTML, CSS, and plain JavaScript; no dependencies, APIs, backend, database, or installation required.

## Run

Open `index.html` in a browser. Keep the `src` folder beside it. It also works from a static server, for example `python3 -m http.server 5173` from this folder.

1. Click **Load preset demo** to create the five requested journeys.
2. Click **Step** to explain each move, or **Start simulation** for animation.
3. Inspect the request table, elevator cards, and scheduling decision.
4. Switch between **Normal Scheduler** and **AI Scheduler**. Switching preserves the current simulation and reschedules waiting passengers; onboard passengers never change elevator.
5. Click **Run comparison** for an independent, fair 25-request experiment. This does not alter the visual simulation.

Reset and Load preset demo replace the current visual run. Requests are created manually or with the random button; the animation does not silently create requests. All state is in memory and resets on page reload.

## Files to explain in the viva

- `src/hillClimbing.js`: standalone steepest-improvement Hill Climbing algorithm.
- `src/scheduler.js`: nearest-elevator initial assignment and AI cost evaluation.
- `src/simulation.js`: shared elevator movement, pickup, drop-off, and statistics.
- `src/app.js`: controls, rendering, and reproducible comparison experiment.
- `src/styles.css`: responsive interface.
- `test.cjs`: optional automated checks (`node test.cjs`). Node is only needed for tests, not the app.

## Viva explanation

**Problem:** Assign waiting passengers among three elevators efficiently.

**State:** An array such as `[0, 2, 1]`: P1 → E1, P2 → E3, P3 → E2.

**Initial state:** Assign each waiting passenger to the geographically nearest elevator. Ties go to the lower elevator ID.

**Neighbour:** Change one waiting passenger's elevator.

**Cost:** Predicted remaining waiting time + remaining elevator travel + 5 × future direction changes + 2 × load penalty. Evaluate a candidate by copying the current simulation and running its assigned routes to completion with no future arrivals. This is deterministic simulation, not a shortest-path search or machine learning.

For each elevator, `n` is its onboard plus assigned waiting passengers. Its load penalty is `n × (n − 1) / 2`, the sum of the loads seen when adding those passengers one by one. This discourages concentrating requests on one elevator. Passenger capacity is unlimited, as requested; the count affects the heuristic only.

**Algorithm:** Enumerate every one-passenger reassignment. Move to the cheapest neighbour only if its cost is strictly lower. Repeat until no neighbour improves the cost. The trace displays accepted costs and evaluation count. A strict decrease prevents cycles. No random restarts or other search algorithms are used.

**Limitation:** The result is a local optimum. Joint changes might help even when no single change does. Future requests are unknown, so lower predicted cost does not guarantee lower waiting, travel, and reversals individually.

## Movement model

Ten floors (0–9), starting elevator floors 0, 4, and 9. Each tick services the current floor, moves each elevator at most one floor, advances time, and services the arrival floor. Doors take no extra time. Onboard destinations determine movement first; continue in the current direction if possible, otherwise reverse toward the nearest destination. Empty elevators head toward assigned pickups. Compatible assigned passengers are collected along the route. Pickup always precedes delivery; passengers are never teleported or transferred.

Scheduling runs when requests arrive or the selected method changes, optimizing all still-waiting passengers. The normal mode uses the same rescheduling opportunities and movement rules. Stops display unique immediate pickup/drop-off floors, not an ordered itinerary. Destination becomes an immediate stop after pickup.

## Statistics and fair comparison

- Waiting: pickup tick minus creation tick, averaged over passengers already picked up. Unpicked passengers show their elapsed waiting in the request table.
- Distance: total one-floor elevator moves.
- Completed: passengers actually dropped at their destination.
- Direction changes: changes between successive nonzero travel directions, including a reversal after idling. The first departure is not a reversal.

The comparison uses a fixed pseudorandom seed (42), 25 requests arriving every three steps, identical initial positions, and the same movement model. Both runs continue until all passengers finish. It computes every value at runtime.

Measured default results:

| Metric | Normal | Hill Climbing |
|---|---:|---:|
| Average waiting (steps) | 2.40 | 2.36 |
| Travel (floors) | 101 | 122 |
| Direction changes | 23 | 17 |
| Completed | 25 | 25 |

This workload shows a small waiting improvement and fewer reversals, with extra travel. Do not claim universal superiority or hide that tradeoff. The five-passenger preset shows an estimated assignment cost reduction from 47 to 31. Change the experiment seed in `src/app.js` to explore other workloads.

## Verification

`node test.cjs` checks five different 25-request workloads, delivery completion, floor bounds, passenger counts, pickup-before-drop-off, a busy pickup floor, strictly decreasing Hill Climbing costs, and a known toy optimum.
