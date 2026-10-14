import test from "node:test";
import assert from "node:assert/strict";
import {
  ROUTES,
  STOPS,
  SCENARIOS,
  VEHICLES,
  HORIZON,
  DATASET_IMPORTED,
  START_MINUTE,
  time,
  baseline,
  simulate,
  forecast,
  optimize,
  gpsDataset,
  activateDataset,
} from "../dist/engine.js";
import {
  validateDataset,
  parseDataset,
  organizerTemplate,
  installDataset,
} from "../dist/data.js";
import {
  predictTripArrivals,
  arrivalWindows,
  recordGPSReplay,
} from "../dist/telemetry.js";
import { feasibleJourneys, checkLegCapacity } from "../dist/journeys.js";

test("GPS-driven predictions react to observed speed, without reading future ground truth", () => {
  const r = ROUTES[0],
    a = STOPS.find((s) => s.id === r.stops[0]),
    b = STOPS.find((s) => s.id === r.stops[1]);
  const samples = (rate) =>
    [0, 0.25, 0.5].map((m, i) => ({
      minute: m,
      lat: a.lat + (b.lat - a.lat) * (0.2 + i * rate),
      lng: a.lng + (b.lng - a.lng) * (0.2 + i * rate),
    }));
  const trip = {
    id: "A-0",
    vehicle: "RP-01",
    route: "A",
    planned: 0,
    start: 0,
    end: 900,
    visits: [{ time: 9000 }],
  };
  const fast = predictTripArrivals(
    trip,
    r,
    SCENARIOS.normal,
    0.5,
    samples(0.08),
    0.2,
    "Imported GPS",
  );
  const slow = predictTripArrivals(
    trip,
    r,
    SCENARIOS.normal,
    0.5,
    samples(0.04),
    0.2,
    "Imported GPS",
  );
  assert.equal(fast[0].mode, "gps");
  assert.ok(fast[0].midpoint < slow[0].midpoint);
  assert.deepEqual(
    fast,
    predictTripArrivals(
      { ...trip, end: 1, visits: [{ time: -999 }] },
      r,
      SCENARIOS.normal,
      0.5,
      samples(0.08),
      0.2,
      "Imported GPS",
    ),
  );
});
test("future GPS samples cannot leak into displayed arrival windows", () => {
  const s = SCENARIOS.normal,
    p = baseline(s),
    result = simulate(p, s),
    eta = gpsDataset(s),
    gps = recordGPSReplay(result);
  const before = arrivalWindows(
    result,
    { ...s, gpsObservations: gps.filter((x) => x.minute <= 38) },
    38,
    eta,
  );
  const future = gps.map((x) =>
    x.minute > 38 ? { ...x, lat: x.lat + 0.1, lng: x.lng + 0.1 } : x,
  );
  assert.deepEqual(
    before,
    arrivalWindows(result, { ...s, gpsObservations: future }, 38, eta),
  );
  assert.ok(before.some((x) => x.source === "Imported GPS"));
  assert.ok(
    before
      .filter((x) => x.mode !== "timetable")
      .every((x) => x.samples.every((p) => p.minute <= 38)),
  );
});
test("a dwell-to-motion transition uses route priors instead of a misleading slow GPS speed", () => {
  const route = ROUTES[0],
    a = STOPS.find((s) => s.id === route.stops[0]),
    b = STOPS.find((s) => s.id === route.stops[1]);
  const samples = [0.2, 0.2, 0.24].map((p, i) => ({
    minute: i * 0.25,
    lat: a.lat + (b.lat - a.lat) * p,
    lng: a.lng + (b.lng - a.lng) * p,
  }));
  const prediction = predictTripArrivals(
    { id: "A-0", route: "A", vehicle: "RP-01", planned: 0 },
    route,
    SCENARIOS.normal,
    0.5,
    samples,
    0.2,
    "Imported GPS",
  );
  assert.equal(prediction[0].mode, "gps-prior");
  assert.ok(prediction[0].source.includes("route speed"));
});
test("stale or missing GPS has a finite, labeled timetable fallback", () => {
  const r = ROUTES[0],
    a = STOPS[0],
    b = STOPS[1],
    trip = { id: "A-0", vehicle: "RP-01", route: "A", planned: 0 };
  const old = [0, 0.25, 0.5].map((m, i) => ({
    minute: m,
    lat: a.lat + (b.lat - a.lat) * (0.2 + i * 0.05),
    lng: a.lng + (b.lng - a.lng) * (0.2 + i * 0.05),
  }));
  const stale = predictTripArrivals(
    trip,
    r,
    SCENARIOS.normal,
    3,
    old,
    0.2,
    "Imported GPS",
  );
  assert.ok(stale.length);
  assert.ok(
    stale.every((p) => p.mode === "timetable" && p.source.includes("stale")),
  );
  assert.ok(stale.every((p) => p.window.every(Number.isFinite)));
});
test("a free boarding seat is insufficient when an intermediate segment is full", () => {
  const s = SCENARIOS.normal,
    result = simulate(baseline(s), s, []),
    trip = result.trips.find((t) => t.route === "A");
  assert.ok(checkLegCapacity(result, trip.id, 1, 4).ok);
  const segment = result.records.find(
    (r) => r.trip === trip.id && r.index === 2,
  );
  segment.load = segment.capacity;
  const check = checkLegCapacity(result, trip.id, 1, 4);
  assert.equal(check.ok, false);
  assert.equal(check.minSeats, 0);
  assert.ok(
    result.records.find((r) => r.trip === trip.id && r.index === 1).load === 0,
  );
});
test("full second-leg buses are excluded and the planner searches later departures", () => {
  const s = SCENARIOS.normal,
    p = baseline(s),
    capacity = simulate(p, s, []),
    eta = gpsDataset(s),
    windows = arrivalWindows(capacity, s, 20, eta);
  const original = feasibleJourneys("hostels", "innovation", 20, p, s, {
    capacityResult: capacity,
    windows,
    calibration: eta,
    limit: 100,
  });
  assert.ok(original.choices.length);
  const blockedTrip = original.choices[0].legs[1].trip;
  for (const r of capacity.records)
    if (r.trip === blockedTrip) r.load = r.capacity;
  const next = feasibleJourneys("hostels", "innovation", 20, p, s, {
    capacityResult: capacity,
    windows,
    calibration: eta,
    limit: 100,
  });
  assert.ok(next.rejected.capacity > 0);
  assert.ok(next.choices.length);
  assert.ok(
    next.choices.every((c) =>
      c.legs.every((l) => l.trip !== blockedTrip && l.capacity.minSeats > 0),
    ),
  );
  assert.ok(
    next.choices.some(
      (c) => c.legs[1].depart > original.choices[0].legs[1].depart,
    ),
  );
});
test("every offered journey satisfies seat, accessibility, uncertainty-buffer and deadline checks", () => {
  for (const scenario of Object.values(SCENARIOS)) {
    const o = optimize(scenario),
      eta = gpsDataset(scenario),
      capacity = simulate(o.plan, scenario, forecast(scenario));
    const r = feasibleJourneys("hostels", "innovation", 20, o.plan, scenario, {
      accessible: true,
      deadline: 100,
      capacityResult: capacity,
      calibration: eta,
      limit: 100,
    });
    assert.ok(r.choices.length);
    for (const c of r.choices) {
      assert.ok(c.arrivalWindow[1] <= 100);
      for (const l of c.legs) {
        assert.ok(VEHICLES.find((v) => v.id === l.vehicle).accessible);
        assert.ok(l.capacity.segments.every((s) => s.load + 1 <= s.capacity));
      }
      if (c.transfer)
        assert.ok(
          c.legs[1].departureWindow[0] - c.legs[0].arrivalWindow[1] >= 2,
        );
    }
  }
});
test("uncertain transfers and deadlines are rejected instead of shown as feasible", () => {
  const s = SCENARIOS.normal,
    p = baseline(s),
    capacity = simulate(p, s, []),
    eta = gpsDataset(s),
    windows = arrivalWindows(capacity, s, 20, eta);
  const r = feasibleJourneys("hostels", "innovation", 20, p, s, {
    capacityResult: capacity,
    windows,
    calibration: eta,
    deadline: 25,
  });
  assert.equal(r.choices.length, 0);
  assert.ok(r.rejected.deadline > 0);
  const valid = feasibleJourneys("hostels", "innovation", 20, p, s, {
    capacityResult: capacity,
    windows,
    calibration: eta,
    limit: 100,
  });
  assert.ok(valid.rejected.transfer > 0);
});
test("versioned organizer export round-trips through complete validation", () => {
  const template = organizerTemplate(),
    checked = parseDataset(JSON.stringify(template));
  assert.ok(checked.ok, JSON.stringify(checked.errors));
  assert.ok(template.scenarios[0].gpsObservations.length > 1000);
  assert.equal(checked.summary.routes, 3);
  assert.equal(checked.summary.minutes, 120);
});
test("invalid identifiers, capacities, coordinate geometry, timestamps and demand are rejected without mutation", () => {
  const base = organizerTemplate();
  const original = ROUTES[0].name;
  const invalid = [
    (x) => {
      x.vehicles[0].capacity = 0;
    },
    (x) => {
      x.stops[1].id = x.stops[0].id;
    },
    (x) => {
      x.routes[0].vehicles.push(x.routes[1].vehicles[0]);
    },
    (x) => {
      x.scenarios[0].passengers[0].origin = "missing";
    },
    (x) => {
      x.scenarios[0].forecastPassengers = [];
    },
    (x) => {
      x.scenarios[0].gpsTraces[0].samples[1].minute =
        x.scenarios[0].gpsTraces[0].samples[0].minute;
    },
    (x) => {
      x.scenarios[0].gpsObservations[0].vehicle = "unknown";
    },
    (x) => {
      x.stops[0].name = 'bad" onclick="alert(1)';
    },
    (x) => {
      x.schemaVersion = 99;
    },
    (x) => {
      x.scenarios[0].unavailable = x.vehicles.map((v) => v.id);
    },
  ];
  for (const mutate of invalid) {
    const data = structuredClone(base);
    mutate(data);
    const v = validateDataset(data);
    assert.equal(v.ok, false);
    assert.ok(v.errors.length);
    assert.equal(v.model, null);
  }
  assert.equal(ROUTES[0].name, original);
  assert.equal(DATASET_IMPORTED, false);
  assert.equal(parseDataset("{not JSON}").ok, false);
  assert.equal(parseDataset(" ").ok, false);
});
test("imports drive a different route count, custom evaluation window, supplied GPS and fixed passenger data", () => {
  const t = organizerTemplate();
  t.name = "Organizer Test Campus";
  t.window = { start: "09:00", minutes: 90 };
  t.routes = t.routes.slice(0, 2);
  const ids = new Set(t.routes.flatMap((r) => r.stops));
  t.stops = t.stops.filter((s) => ids.has(s.id));
  t.vehicles = t.vehicles.filter((v) => !["RP-05", "RP-06"].includes(v.id));
  const s = t.scenarios[0];
  s.factor = s.factor.slice(0, 2);
  s.passengers = s.passengers.filter((p) => p.route !== "C" && p.arrival < 90);
  s.forecastPassengers = s.forecastPassengers.filter(
    (p) => p.route !== "C" && p.arrival < 90,
  );
  s.gpsTraces = s.gpsTraces.filter(
    (g) => g.route !== "C" && g.samples.at(-1).minute <= 90,
  );
  s.gpsObservations = s.gpsObservations.filter(
    (g) => g.route !== "C" && g.minute <= 90,
  );
  const checked = validateDataset(t);
  assert.ok(checked.ok, JSON.stringify(checked.errors));
  try {
    installDataset(checked);
    assert.equal(HORIZON, 90);
    assert.equal(START_MINUTE, 540);
    assert.equal(time(0), "09:00");
    assert.equal(time(HORIZON), "10:30");
    assert.equal(ROUTES.length, 2);
    const scenario = SCENARIOS.normal,
      o = optimize(scenario);
    assert.ok(o.validation.ok);
    assert.equal(o.baseResult.total, s.passengers.length);
    assert.equal(o.proposed.total, s.passengers.length);
    assert.equal(o.proposed.conflicts, 0);
    const arrivals = arrivalWindows(
      o.baseResult,
      scenario,
      38,
      gpsDataset(scenario),
    );
    assert.ok(arrivals.some((x) => x.source === "Imported GPS"));
  } finally {
    activateDataset();
  }
  assert.equal(HORIZON, 120);
  assert.equal(ROUTES.length, 3);
});

test("faster road travel does not shorten dwell time or permit overlapping rotations", () => {
  const t = organizerTemplate();
  t.constraints.dwell = 5;
  t.scenarios[0].factor = [0.5, 0.5, 0.5];
  const checked = validateDataset(t);
  assert.ok(checked.ok, JSON.stringify(checked.errors));
  try {
    installDataset(checked);
    const o = optimize(SCENARIOS.normal);
    assert.ok(o.validation.ok);
    assert.equal(o.proposed.conflicts, 0);
    for (const trip of o.proposed.trips) {
      const next = o.proposed.trips.find(
        (x) => x.vehicle === trip.vehicle && x.start > trip.start,
      );
      if (next) assert.ok(next.start >= trip.end + 2);
    }
  } finally {
    activateDataset();
  }
});
