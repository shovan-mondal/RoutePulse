# RoutePulse

**Tagline:** Better campus commutes. Proven, feasible plans.

**Hackathon:** Wild Bugs — PS 02: Optimise Campus Transport Under Real Constraints

## The problem it solves

A bus moving on a map does not tell a student whether they can board, make a connection, or reach class on time. It does not tell a campus operator how to fix a crowded route without creating an impossible timetable.

RoutePulse connects those two decisions in one browser application.

### For students

- GPS-driven arrival windows with clear telemetry and timetable-fallback labels.
- Direct and one-transfer journey options, departure selection and arrival deadlines.
- Forecast seat checks on every segment of every leg, uncertainty-aware transfer buffers and step-free routing.
- A campus map and service updates for congestion, demand spikes and unavailable buses.

### For operators

- Routes, stops, schedules, vehicle capacities, stop demand and accessible fleet information.
- An independent demand forecast and a finite-search optimizer for reserve allocation, departure spacing and initial departure times.
- Explicit checks for vehicle availability, unique allocation, service coverage, capacity, accessible service and physically feasible rotations.
- Reviewable recommendations with operating-time costs, baseline comparisons and downloadable evidence.
- Validated organizer JSON import with reviewed activation, device persistence and reproducible CLI evaluation.

### Measured impact

The default experiment fixes the 07:30–09:30 window and seed 2026. Both plans face identical evaluation passengers; optimization uses a separate forecast sample. Normal-operation average elapsed waiting falls **7.75 → 6.33 minutes (18.32%)** and late/overdue journeys fall **26 → 6**. The trade-off is one activated reserve and approximately **109 additional vehicle-minutes**.

All four proposed scenario plans pass the published constraints. Congestion removes six baseline departure conflicts but slightly increases waiting; the report exposes that unfavorable trade-off. Held-out synthetic GPS next-stop error is approximately **10.6 seconds MAE**, with **89.2% measured interval coverage** in normal operation.

The buyer is a campus transport office or fleet contractor, with subscriptions by active fleet size or institutional licensing. This is a simulated hackathon prototype; field validation and live fleet integration remain future work.

## Challenges we ran into

### Predicting arrivals without leaking the future

The replay already knows simulated arrival truth, making accidental leakage easy. We separated generated sensor observations from prediction, filtered readings to timestamps at or before the replay instant, and used three recent GPS samples for map matching and observed-speed estimation. Stationary or restarting buses use a labeled route-speed prior; missing/stale observations use a labeled timetable fallback. Calibration and held-out evaluation are separate, and next-stop coverage is not presented as a full-journey guarantee.

### Making a connection feasible all the way through

A free seat at the boarding stop is insufficient if an intermediate segment fills up. The journey planner checks minimum forecast seats across every segment of both legs, checks accessibility on both vehicles, and compares the latest incoming arrival with the earliest outgoing departure plus the transfer buffer. It searches later onward services when the earliest bus is full. Forecast availability is explicitly not a seat reservation.

### Keeping disrupted schedules physically possible

Road-delay multipliers must not scale stop dwell or recovery time. We separated those terms in the rotation constraint, prevented overlapping use of vehicles, and rejected unavailable buses and duplicate allocations. The optimizer chooses only within its documented candidate set; it does not claim global network redesign. Under congestion, feasibility can cost more waiting, so we report it honestly.

### Accepting organizer data safely

Imports can change route counts, service windows, capacities, demand and telemetry. A versioned validator checks references, geometry, timestamps, bounds and scenario feasibility before activation. Invalid files preserve the active model; independent forecast data is required. CLI and browser evaluation share the same engine.

The build passes **23 automated engine/invariant tests** plus desktop/mobile browser workflows covering data import, plan application, accessible connections and exported evidence. The interface uses JavaScript, HTML, CSS and a dependency-free Node.js static server.

## Submission notes

Gallery images are actual screenshots of the running application. The source, common datasets, tests and judging walkthrough are included in this repository. A hosted demo and pitch video are optional additions; the app currently runs locally.
