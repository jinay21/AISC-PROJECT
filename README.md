# Smart Multi-Elevator Scheduling using Hill Climbing

A browser-only AI course project: HTML, CSS, and plain JavaScript. No dependencies, API, backend, database, or installation. Capacity is unlimited. Select 1–6 elevators and 1–30 total floors, including Ground.

## Run and demonstrate

Open `index.html` in a browser with the `src` folder alongside it. Or run `python3 -m http.server 5173` in this folder.

1. Load the five-request preset, or add manual/random requests.
2. Press **Step** to explain each move, or **Start simulation** for animation.
3. The selected mode chooses which building and live metrics you see. Both schedulers receive the same arrivals and advance together.
4. Click **Compare schedulers** at any time—even before starting the animation. It independently replays all requests entered so far from the original starting floors, preserving their recorded arrival ticks, and runs both schedulers until every passenger is delivered. It does not advance or modify the visible simulation.
5. Results remain unchanged as the animation progresses or new requests are added. The badge shows how many new requests have not been compared yet. **Compare again** recomputes final results for ALL current requests, not just new ones.
6. **Reset** clears both live runs, recorded arrivals, and the saved comparison. The five-request preset also starts a fresh run. There is no 25-request demo.

A step is one simulation tick: an elevator can move at most one floor per tick. Start automatically pauses when both live runs finish. Start and Step do nothing while there is no work, so the counter never runs indefinitely while idle. New requests can be added afterward; press Start to animate them or Compare to calculate their final results directly.

All data is in memory. The live metric cards use elapsed waiting across all requests, including passengers not yet picked up. Comparison instead shows final waiting after everyone is delivered in its independent replay. Waiting is measured as pickup tick minus arrival tick; the replay has no unserved requests. All statistics are calculated, never hard-coded.

## Building settings

The default is 3 elevators and 10 floors (Ground through Floor 9). Change **Elevators** and **Total floors**, then click **Apply & reset**. This stops animation, clears requests and saved comparison results, and rebuilds the building. Editing a selector alone does not alter the current run. Regular Reset preserves the applied settings.

Elevators start evenly across the available floors using `floor(i × (floorCount − 1) / (elevatorCount − 1))`; a single elevator starts at Ground. The defaults therefore still start at 0, 4, and 9. More elevators than floors is allowed and some starting positions will coincide.

With one total floor, only Ground exists. Passenger creation, the demo, and simulation controls are disabled because there is no valid journey. Choose at least two floors to enable them.

Manual and random requests use the applied floor range. The preset scales its original floor numbers to the selected range and omits any resulting same-floor journeys; its button shows the resulting request count. Tall buildings scroll vertically and extra shafts scroll horizontally inside the building view. Comparison replays the same applied building size and starting positions.

## Why this cost formula?

```
cost = total predicted remaining waiting + remaining travel + 5 × future reversals
```

- **Waiting:** Sum of remaining steps until pickup across all waiting passengers. Reducing this improves passenger service. Delaying three passengers one step contributes three units.
- **Travel:** Total floors that all elevators still need to move to deliver the current requests. This discourages avoidable movement. It is a simple proxy, not measured electricity consumption.
- **Reversals:** Changes between successive nonzero movement directions. Penalizing them encourages route continuity and discourages backtracking. Travel already captures detours; this extra term expresses an additional preference for fewer reversals.
- **Weights 1, 1, 5:** Design choices for this teaching simulation, not learned parameters, physical constants, or proven optimal values. One reversal is treated as equivalent to five extra floor moves or five passenger-wait steps. We combine unlike quantities into a dimensionless score; the weights express priorities. Changing them changes the tradeoff.

The original version also included a load-balancing term, as suggested in the initial brief. Its per-elevator penalty was `2 × n(n−1)/2`, where n was onboard plus assigned waiting passengers. For four passengers, placing everyone in one elevator contributed 12; a 2+2 split contributed 4. That could reward splitting a useful shared pickup. With unlimited capacity, the term is unnecessary and has been removed. Passenger counts remain visible.

**Viva answer:** “I use a weighted heuristic to balance passenger delay, movement, and reversals. Waiting measures service quality, distance discourages wasted movement, and the reversal weight favors continuing a useful route. Five is an illustrative priority, not an experimentally optimal value. Hill Climbing minimizes this combined score, so it does not guarantee that every metric improves separately.”

Example: assignment A has 8 wait steps, 12 floor moves, and 0 reversals: cost 20. B has 6 wait steps, 10 moves, and 2 reversals: cost 26. A wins under this preference even though B has less waiting and travel. This demonstrates the tradeoff explicitly.

## Shared pickups

All currently waiting passengers with the same pickup floor AND direction form one pickup group. The scheduler assigns the entire group to one elevator, with no capacity limit. For example, 4→7 and 4→9 share a pickup; 4→1 is a separate downward group. Both baseline and AI use this rule.

Identical requests added while paused are all still waiting and therefore share one group and one elevator. Once those passengers have boarded, later arrivals form a new group and all three elevators are evaluated again. Another lift may serve them if its cost is lower. There is no permanent route reservation. Opposite directions remain separate groups. Onboard passengers never change elevator.

## Hill Climbing in the viva

- **State:** An elevator assignment for each waiting pickup group, e.g. `[0,2,1]`.
- **Initial state:** Nearest-elevator assignments; ties go to the lower ID.
- **Neighbour:** Change exactly one waiting pickup group's elevator. When a group has one passenger, this is the original one-passenger reassignment.
- **Evaluation:** Copy the simulation, apply the candidate assignments, then run the same movement rules until all existing requests finish. Do not assume future requests.
- **Move:** Choose the lowest-cost neighbour only when strictly cheaper.
- **Stop:** No single-group reassignment improves cost: a local optimum, not necessarily the global optimum.

Grouping is a deliberate simplification for unlimited-capacity pickups. The search cannot split a same-floor, same-direction group even if splitting could occasionally improve a different objective. Strict improvements prevent cycles. There is no A*, shortest-path algorithm, machine learning, or random restart.

The decision panel evaluates moving the latest request's whole group while keeping the other optimized groups fixed. Values are total assignment costs, not isolated costs for one elevator. It also displays the chosen cost's waiting/travel/reversal breakdown and the improvement trace.

## Movement and metrics

The selected elevators start evenly across the selected floor range (0, 4, and 9 for the default configuration). Floors are bounded to 0 through floorCount − 1. Each tick services the current floor, moves at most one floor, advances time, and services the arrival floor. Doors add no extra delay. Onboard destinations determine direction first; continue forward if possible, otherwise reverse. Empty elevators head toward assigned pickups. Same-direction assigned passengers board en route. An empty car arriving from the opposite direction turns to the group's direction and boards the whole group.

Scheduling runs for both methods whenever requests arrive. Waiting groups may be reassigned; onboard passengers stay assigned. Pending stops are unique immediate pickup/drop-off floors, not an ordered itinerary; a destination becomes immediate after pickup.

- Waiting so far = `(pickup tick, or current tick if waiting) − creation tick`, averaged over all requests. Once everyone is picked up this is the final average waiting time.
- Distance = total one-floor moves.
- Completed = actual drop-offs.
- Reversals = changes between successive nonzero directions, including after idling. First departure is not a reversal.

## Small code map

- `src/hillClimbing.js`: generic Hill Climbing loop, isolated for the viva.
- `src/scheduler.js`: shared pickup groups, baseline, heuristic, AI decisions.
- `src/simulation.js`: movement, pickup, delivery, statistics.
- `src/comparison.js`: recorded arrivals, independent live runs, and on-demand replay through completion.
- `src/app.js`: interface and controls.
- `src/styles.css`: responsive styling.

## Verification

Optional: `node test.cjs` and `node test-ui.cjs`. Tests cover five 25-request workloads, same-floor grouping, opposite directions, boarding 20 passengers without a capacity restriction, pickup before delivery, floor bounds, synchronized arrival ticks, reset metrics, invalid-input atomicity, a known toy optimum, exact displayed cost breakdowns, waiting before pickup, cost-based scheduling of later arrivals, and the actual UI handlers for Compare, Compare again, frozen results, screen-state preservation, idle timer stopping, Reset, and applying building settings. Configurations tested include one floor, two floors with six elevators, the default, and thirty floors with six elevators; tests check configured bounds, valid assignments, shared pickups, full delivery, and replay agreement. Node is needed only for tests.

## Original backup

The unchanged first version was pushed to the private repository https://github.com/jinay21/smart-multi-elevator-scheduling before these changes, commit `c23416c` on `main`. The revised local version includes live comparison and shared pickups.
