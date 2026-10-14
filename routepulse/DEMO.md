# RoutePulse — three-minute judge walkthrough

## Opening · 0:00–0:25

“A dot on a map tells you where a bus is. RoutePulse tells an operator what to change, proves that the change is feasible, and measures what passengers gain.”

Start on **Overview**, with Morning peak and seed 2026. Explain the fixed 07:30–09:30 evaluation window. The displayed metrics cover that whole window; the map shows the selected replay instant.

## The decision · 0:25–1:15

1. Scrub the map to 08:15. Toggle the demand layer and click North Residences.
2. Select **Optimize plan**. Show the reserve assignment, departure headways and explicit rotation inequalities.
3. Explain that the search uses an independent forecast, then evaluates against the baseline's exact passenger dataset.
4. Apply the plan. Average elapsed waiting goes from **7.75 to 6.33 minutes**, an **18.32% reduction** at the published seed. Late/overdue journeys fall from **26 to 6**. The additional cost is approximately **109 vehicle-minutes** and activating the reserve. All six checks pass.

These are outcomes from the current model, not guaranteed results for an actual campus.

## The passenger · 1:15–1:40

Switch to the **Student dashboard**. The arrival board shows stop-specific arrival windows and projected seat availability. North Residences → Innovation Park produces a capacity-checked transfer. Expand its leg proof to show minimum seats on each segment. On the arrival board, choose Central Library at 08:08 to show GPS-driven arrivals and their source labels. Select step-free journeys, then try an earlier arrival deadline to show the planner rejecting an impossible connection. Explain the two-minute transfer buffer and that the system does not promise a reserved seat. The Operator switch returns to fleet planning.

## The disruption · 1:40–2:20

In **Scenario lab**, choose Vehicle unavailable. RP-04 disappears from the candidate fleet. Review the reserve substitution and prove no bus is counted twice.

Then choose East road congestion. The fixed baseline accumulates six departure conflicts. The proposed plan removes them, but waiting increases from 7.69 to 7.87 minutes. Explain why: a longer headway is required to respect the conservative travel envelope and recovery time. There is no fabricated improvement.

## The evidence · 2:20–3:00

Open **Impact report**, evaluate all four scenarios, and download the evidence. Show GPS holdout MAE, interval coverage, the simulation seed and metric definitions. Run `npm test` if judges ask about engineering reliability.

Close with: “An operator can review a recommendation before dispatch. A student can find a feasible connection. A campus can audit whether the new timetable helped.”

## Rubric mapping

| Criterion                       | Demonstration                                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Feasibility · 20                | Rotation proof, unique assignments, availability, accessible service, headway and capacity checks                 |
| ETA quality · 15                | Timestamped noisy GPS coordinates, 60 calibration / 120 held-out traces, measured MAE and coverage                |
| Demand / capacity · 15          | Independent stop demand, FIFO queues, hard boarding caps, deferred and unserved riders                            |
| Operational improvement · 20    | Fixed baseline and window, identical evaluation passengers, wait / late / utilization / operating-time comparison |
| Robustness · 10                 | Four seeded scenarios, conservative congestion plan and unavailable-bus substitution                              |
| Engineering · 10                | Dependency-free run, exported common datasets, 23 invariant tests and browser workflow checks                     |
| Explainability / relevance · 10 | Before/after dispatch plan, cost trade-offs, rotation inequalities and an operator approval workflow              |

## Commercial story

The buyer is the transport office or campus fleet contractor. The value is reduced passenger waiting, fewer schedule conflicts, transparent capacity handling and an auditable dispatch workflow. A campus subscription can be priced by active fleet size; fleet contractors can license the planning engine across institutions. No invented savings or pricing benchmarks are needed for the MVP pitch.

Organizer import and validation are implemented: demonstrate Manage data with data/organizer-template.json, then show that an invalid file leaves the current model untouched. Remaining extensions are real-road GIS mapping, live passenger-counting feeds, calendar integration and field validation on observed campus data. The current prototype's limitations are already exposed in the report.
