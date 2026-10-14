# RoutePulse

**A campus transport control room that turns a timetable into a feasible, measurable decision.** Built for PS 02, with a seeded simulation and a transparent finite-search optimizer behind every recommendation.

## Run

Requires Node.js 22 or newer. No dependency installation, API keys, database or build step is needed.

```powershell
cd routepulse
npm start
```

Open **http://localhost:4173**. On Windows, `Start-RoutePulse.cmd` starts the same local server. Stop it with Ctrl+C. Host the contents of `dist/` on any static web host.

The interface uses Google Fonts when available and falls back to system fonts offline. No transport data leaves the browser. Exports are generated locally.

## What works

- **Operations overview:** a custom campus map with moving vehicles, replay controls, route visibility, a demand heat layer, seat occupancy and stop arrival boards.
- **Network & fleet:** 3 circular routes, 11 geographic stops, 7 capacity-limited vehicles, first departures, headways, accessibility and vehicle details.
- **Demand forecast:** stop-weighted stochastic demand with lecture peaks, an independent forecast sample, per-route charts and measured forecast error.
- **Scenario lab:** morning peak, 45% road delay, 80% Innovation demand spike and RP-04 unavailable.
- **Explainable plan review:** vehicle allocation, before/after departures, rotation proofs, operating cost, hard constraints and application to the simulation.
- **Student dashboard:** a dedicated page at `/#student`, accessed with the Student switch. Stop-specific arrival windows, projected seats, service disruption notices, campus map, departure-time selection, arrival deadlines, direct and single-transfer alternatives, and step-free journey filtering. Every segment of both legs needs a forecast seat. Transfers preserve the published buffer after incoming/outgoing uncertainty. Full buses and tight transfers are excluded; seats are not reserved.
- **Passenger quick view:** the operator can preview student connections without leaving the operator dashboard.
- **Organizer import:** a versioned JSON contract, field-level validation, reviewed activation, device persistence and restoration of demo data. Imports drive routes, baseline schedules, capacities, evaluation/forecast demand, constraints, GPS and custom service windows. See [DATA_FORMAT.md](DATA_FORMAT.md).
- **Impact report:** fixed-window comparison, held-out GPS ETA accuracy and coverage, reproducibility details, all-scenario evaluation and JSON/CSV exports.

## Verify and reproduce

```powershell
npm test
npm run evaluate
# Or supply another seed:
node scripts/evaluate.mjs 42
```

`npm test` runs 23 engine tests covering four scenarios, capacity limits, passenger conservation, unique fleet assignments, unavailable vehicles, travel feasibility, independent forecasts, ETA holdout metrics, no future GPS leakage, full intermediate/transfer buses, uncertainty-aware connections, invalid import isolation, custom route counts/windows, and three additional seeds. The tests execute in the current Node process to work in restricted environments.

`npm run evaluate` writes each scenario's passengers, forecast, vehicle and route model, GPS traces, boarding events and metrics to `data/`. `data/evaluation.json` is the compact evaluation result. Both plans receive identical passenger objects within a scenario. The baseline and 120-minute service window are fixed before evaluation.

Browser checks are in `tests/browser.mjs`. They use an installed `playwright` package, or `PLAYWRIGHT_PATH` pointing to an installed Playwright / Playwright Core package. The checkout was verified using the environment's preinstalled package and browser. With the server running, `node tests/browser.mjs` checks navigation, plan application, disruption selection, accessible transfers, stop interaction, demand layers, timeline, CSV download and mobile overflow. `node tests/browser-import.mjs` additionally checks invalid data isolation, reviewed activation, custom route counts/windows, imported GPS, persistence, capacity proofs and mobile layouts. Screenshots are in `artifacts/`.

## Planning contract

The baseline is `Fixed baseline v1`: 15-minute departures on all routes, first offsets A=0, B=3, C=6 minutes from 07:30, and two regular vehicles per route. The reserve RP-07 starts at the depot. In the unavailable scenario RP-04 is removed. Infeasible baseline rotations delay departure until the assigned vehicle is actually ready; the evaluator never overlaps a vehicle with itself.

Every proposed plan must satisfy:

1. Each vehicle belongs to exactly one route for the full window.
2. No unavailable or unknown vehicle is allocated.
3. All three routes and their stops remain served, with at least one accessible vehicle per route.
4. Departure headway is 10–20 minutes, and first departure is 07:30–07:36.
5. `vehicle count × headway ≥ road travel × disruption multiplier × travel envelope + stop count × dwell + recovery`.
6. Boarding never exceeds vehicle capacity. Riders unable to board remain queued.

Nominal cycles include 30 seconds of dwell per stop. Realized road travel varies by route, segment and clock time, within the conservative envelope. Passenger demand is terminal-bound: a rider can travel to a downstream stop or the current loop's terminal. Cross-loop passenger journeys and mid-window vehicle reassignment are excluded.

The optimizer searches available reserve assignments, headways `[10, 12, 15, 18, 20]` and offsets `[0, 3, 6]`. Route costs are separable and cached, allowing thousands of combinations to be checked in the browser. It selects using seed `evaluationSeed + 89`, then evaluates the selected plan on the unseen evaluation demand. It optimizes only the declared candidate set; it is not a global network-design solver.

The predeclared objective is:

```text
mean elapsed wait
+ 35 × fraction unserved at 09:30
+ 10 × fraction arriving late or overdue at 09:30
+ 0.0006 × vehicle operating minutes
```

Wait includes actual waiting for boarded passengers and elapsed waiting for unboarded passengers at the horizon. Late journeys use individual 25–30 minute deadlines. A journey still in progress only counts as late if its deadline has passed. Fleet utilization is in-window travel and dwell divided by dispatched vehicles × 120 minutes.

## ETA experiment

There are 180 synthetic edge traces. Each supplies three timestamped latitude/longitude readings over 30 seconds, with small coordinate noise. The estimator projects these GPS readings onto known route geometry and infers observed speed; it does not read future arrival truth. The remaining segment time is extrapolated from this speed. A 90th-percentile absolute-residual margin is calibrated using 60 traces. MAE and actual interval coverage are measured using the remaining 120 held-out traces.

The campus map is schematic. Student, stop and fleet arrival boards use this GPS estimator for moving vehicles. Observations from the future are excluded. GPS positions use route-speed priors when stationary; missing/stale telemetry is clearly labeled as a timetable fallback. Later segments add the published travel envelope. Connections use the latest incoming and earliest outgoing times. Segment coverage is measured separately; it is not a claim of identical full-journey coverage.

## Hackathon presentation

See [DEMO.md](DEMO.md) for a three-minute walkthrough, the rubric mapping and the commercial story. Show the unfavorable congestion outcome: a credible planning system should make its trade-offs visible.

## Source layout

```text
dist/index.html      Application entry
dist/theme.css       Blue/navy identity, larger typography and responsive dashboards
dist/app.js          UI, map, interactions, exports and operator workflow
dist/engine.js       Seeded data, schedules, queues, constraints, optimizer and GPS estimates
dist/telemetry.js    Past-observation GPS replay, map matching and arrival-window prediction
dist/journeys.js     Per-segment capacity proofs and uncertainty-aware transfer planning
dist/data.js         Versioned organizer data validation and model activation
server.mjs           Dependency-free local static server
scripts/evaluate.mjs Reproducible CLI evaluation and dataset export
tests/               Simulation invariants and browser workflow checks
data/                Generated common data and evaluation evidence
artifacts/           Verified screenshots
```
