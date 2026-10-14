# Organizer data contract · schemaVersion 1

In Operator view, select **Manage data**, download the sample, choose a JSON file, inspect the validation result and select **Activate dataset**. Invalid files leave the active dataset and plan untouched. Successful imports are stored on this browser/device and can be replaced with **Restore demo data**. Nothing is sent to a server.

The checked-in, fully populated example is [data/organizer-template.json](data/organizer-template.json). All `data/normal.json`, `traffic.json`, `event.json` and `breakdown.json` exports use the same importable contract. Additional evaluation and boarding-event fields are ignored by the importer.

## Top-level fields

| Field           | Meaning                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion` | Exactly `1`.                                                                                                                                                                           |
| `name`          | Campus name, plain text.                                                                                                                                                               |
| `seed`          | Integer 1–999999. Supplied passenger lists remain fixed regardless of simulation randomness.                                                                                           |
| `window`        | `{ "start": "07:30", "minutes": 120 }`. Local campus clock; 30–240 minutes; must end before midnight. All sample timestamps and passenger arrivals are minutes relative to this start. |
| `constraints`   | Published headway, departure, travel-envelope, dwell, recovery and transfer constraints.                                                                                               |
| `stops`         | 2–100 distinct stops with `id`, `name`, `lat`, `lng`. Optional `x`/`y` schematic positions; otherwise computed from coordinates.                                                       |
| `routes`        | 1–8 circular routes with `id`, `name`, optional hex `color`, ordered unique `stops`, corresponding directed `edges` in minutes, baseline `vehicles`, `headway` and `shift`.            |
| `vehicles`      | Unique `id`, positive integer `capacity` (1–200), boolean `accessible`, optional boolean `reserve`. Up to 64 vehicles and at most two unassigned reserves.                             |
| `scenarios`     | 1–8 scenario objects, as an array or an object keyed by ID.                                                                                                                            |

Names cannot contain HTML, double quotes or backticks. IDs use letters, digits, hyphens and underscores. Each published stop must belong to a route. A baseline vehicle cannot be assigned twice. The final return to a route's first stop is implicit; do not repeat that stop in the route list.

## Constraints

```json
{
  "minHeadway": 10,
  "maxHeadway": 20,
  "headways": [10, 12, 15, 18, 20],
  "firstDepartureMax": 6,
  "shifts": [0, 3, 6],
  "dwell": 0.5,
  "recovery": 2,
  "travelEnvelope": 1.1,
  "transferBuffer": 2
}
```

All time values are minutes. `headways` and `shifts` define the finite search space. First departures must be between offset 0 and `firstDepartureMax`. `travelEnvelope` is a multiplicative upper bound (minimum 1.08 for the built-in bounded road variation). `transferBuffer` must be at least 2 minutes. The importer checks whether available reserve assignments admit a feasible candidate for each scenario and reports an explicit error if they do not.

Required vehicle rotation is:

```text
sum(edge travel minutes) × scenario factor × travel envelope
+ stop count × dwell minutes
+ recovery minutes
```

Traffic factors affect road travel. They do not shorten boarding dwell or driver recovery. All baseline schedules remain fixed during evaluation; an impossible baseline rotation delays the assigned vehicle rather than overlapping trips.

## Scenarios and passenger demand

Each scenario has `id`, `name`, optional `description`, `factor` (one travel multiplier per route), optional `unavailable` vehicle IDs, `passengers`, `forecastPassengers`, `gpsTraces` and optional `gpsObservations`.

Passenger rows contain:

```json
{
  "route": "A",
  "origin": "hostels",
  "destination": "library",
  "arrival": 35.5,
  "deadline": 60.5,
  "accessible": true,
  "count": 1
}
```

`arrival` is inside the fixed window; `deadline` is no earlier than arrival. Optional `count` expands a cohort into individual passengers, with deterministic normalized IDs. Each scenario permits up to 10,000 evaluation riders and 10,000 forecast riders. Journeys must end downstream on the current loop or at its terminal. Cross-loop continuation is not simulated.

Provide a separate **independent forecast sample**, such as prior-day demand or an organizer-provided prediction. The importer validates its structure; the data author is responsible for its independence. The planner uses this forecast for optimization and seat availability. Both plans are evaluated on the exact same `passengers` list. It never substitutes evaluation riders for a missing forecast.

## GPS calibration and observations

`gpsTraces` contains at least 30 directed-edge snippets:

```json
{
  "id": "GPS-1",
  "route": "A",
  "from": "gate",
  "to": "hostels",
  "samples": [
    { "minute": 1.0, "lat": 12.972, "lng": 77.59018 },
    { "minute": 1.25, "lat": 12.9722, "lng": 77.59022 },
    { "minute": 1.5, "lat": 12.9724, "lng": 77.59026 }
  ],
  "actual": 2.5
}
```

The numbers above illustrate the field layout; use the complete sample file for consistent geometry and ground truth. `actual` is remaining minutes to the next stop measured from the latest sample. The final three observations must show forward movement and have strictly increasing timestamps. The estimator recomputes predictions from latitude/longitude; any supplied prediction or error is ignored.

The first third of traces calibrates the nominal 90% absolute-residual interval; the rest measures held-out MAE and coverage. Built-in data uses 60 calibration and 120 holdout traces. Ground truth is used for calibration/evaluation only, never for a displayed prediction.

`gpsObservations` is the optional timestamped vehicle replay:

```json
{
  "vehicle": "RP-01",
  "route": "A",
  "trip": "A-0",
  "minute": 1.5,
  "lat": 12.9724,
  "lng": 77.59026
}
```

Use the simulator trip ID `routeId-departureIndex` where known, for example `A-0`, `A-1`. Duplicate vehicle timestamps, unavailable vehicles, wrong baseline assignments and positions over 100 m from the route are rejected. At most 15,000 observations per scenario are supported. Only samples at or before the replay time are consumed. Three recent observations within two minutes enable a GPS estimate; stationary positions use route-speed priors. Missing, insufficient or stale observations produce an explicitly labeled timetable fallback. Hypothetical proposed plans use simulated GPS rather than replaying the baseline's physical vehicle feed as if it followed the new schedule.

## Arrival and connection assumptions

GPS positions are map-matched to straight directed segments between stops. This is a schematic campus model, not a real-road GIS integration. The next-stop window uses the calibrated segment residual; subsequent segments add the published travel envelope. Full-journey windows are conservative extensions, not a claim that the segment's nominal coverage transfers unchanged to a whole journey.

Connections compare **incoming latest arrival + transfer buffer ≤ outgoing earliest departure**. Every segment on both legs must have at least one spare forecast seat. A full intermediate segment rejects the whole leg. A full onward bus triggers a search for later departures. Accessibility and the requested arrival deadline are checked across the entire journey. Forecast availability can change; no seat reservation is created.

## Reproduce an imported dataset

From the project directory:

```powershell
node scripts/evaluate.mjs --dataset data/organizer-template.json
```

Validated imported results are written to `data/imported/`, preserving the published built-in baseline evidence. The CLI and browser use the same validator, optimizer and evaluation engine.
