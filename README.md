<div align="center">

# ↕ LiftLab
### Smart Multi-Elevator Scheduling using Hill Climbing

**A small AI experiment in smarter movement.**

`HTML` · `CSS` · `JavaScript` · `Local Search`

</div>

---

## The idea

LiftLab visualizes elevator assignments through moving lifts, AI decisions, and comparisons using identical requests.

| Normal scheduler | AI scheduler |
| --- | --- |
| Assigns each waiting group to its nearest elevator. | Starts with that assignment and improves it using Hill Climbing. |
| Uses current floor distance for assignment. | Considers predicted waiting, travel, and direction reversals. |

Both methods use identical movement rules and measured results.

## Explore the building

Choose **1–6 elevators** and **1–30 total floors**, including Ground. Defaults are **3 elevators and 10 floors**, with lifts starting at floors **0, 4, and 9**. A single lift starts at Ground.

Add manual/random requests or load the preset. **Start**, **Pause**, and **Step** control movement at one floor per tick. Cards show elevator status; the decision panel shows costs and improvements.

**Apply & reset** rebuilds the building and clears requests and comparison results. Ordinary **Reset** preserves the applied size. One-floor mode disables journeys. Passenger capacity is unlimited.

## Waiting groups and search states

A **waiting group** contains passengers at the same pickup floor traveling in the same direction. Requests **4 → 7** and **4 → 9** share one group; **4 → 1** belongs to a separate group.

Identical paused requests share one lift. Later arrivals are evaluated again. Onboard passengers keep their elevator.

A **state** is one complete assignment of waiting groups:

```text
Group A → E1     Group B → E3     Group C → E2
State: [E1, E3, E2]
```

The **initial state** assigns each group to its nearest elevator. Distance ties go to the lower elevator ID.

## How neighbours are generated

A neighbour changes **exactly one group's elevator**, leaving all other assignments unchanged. From `[E1, E3]`, assigning the first group to E2 produces `[E2, E3]`.

For **G groups** and **E elevators**:

- **Immediate neighbours:** `G × (E − 1)`, each group has E minus one alternatives.
- **Total possible states:** `E^G`, each group has E choices.

Example: two groups, three elevators give **9 states** and **4 neighbours**.

This implementation uses **Steepest Hill Climbing (best-neighbour / steepest improvement)**: evaluate every immediate neighbour, accept the cheapest strictly better assignment, and repeat from that new state. Stop when no neighbour improves the cost. Scheduling runs when requests arrive; search rounds are separate from elevator movement ticks.

## The cost function

```text
Cost = predicted remaining waiting + travel distance + 5 × direction reversals
```

Candidates simulate known requests through completion. Waiting sums remaining pickup delays; travel counts floor moves; reversals penalize backtracking. The weight **5** is illustrative.

## Limitations

- Enter all requests before starting for the intended fixed-workload demo. Later requests are accepted but trigger rescheduling; future demand is not predicted.
- Hill Climbing can stop at a **local optimum**. Lower combined cost does not guarantee improvement in every metric or workload.

## Compare and run

**Compare schedulers** independently replays all entered requests through completion using identical arrival ticks, building settings, and starting positions. It reports waiting, distance, completed requests, and reversals without moving visible elevators. Results refresh only when clicked.

Open `index.html` directly, or run:

```bash
python3 -m http.server 5173
```

Visit **http://localhost:5173**. Everything runs in the browser, without a backend, database, or external API.

## Code map

| File | Responsibility |
| --- | --- |
| [`hillClimbing.js`](src/hillClimbing.js) | Neighbour search and stopping rule |
| [`scheduler.js`](src/scheduler.js) | Groups, baseline, and candidate costs |
| [`simulation.js`](src/simulation.js) | Movement, pickups, deliveries, and metrics |
| [`comparison.js`](src/comparison.js) | Independent comparison replay |
| [`app.js`](src/app.js) / [`styles.css`](src/styles.css) | Controls and visualization |

Optional checks with Node.js: `node test.cjs` and `node test-ui.cjs`.
