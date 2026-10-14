import test from "node:test";
import "./planning.test.mjs";
import assert from "node:assert/strict";
import {
  SCENARIOS,
  ROUTES,
  VEHICLES,
  HORIZON,
  SEED,
  demand,
  forecast,
  baseline,
  optimize,
  simulate,
  validate,
  gpsDataset,
  alternatives,
  cycleBound,
} from "../dist/engine.js";

for (const scenario of Object.values(SCENARIOS)) {
  test(`${scenario.id}: optimized allocation passes every hard constraint and every boarding cap`, () => {
    const o = optimize(scenario);
    assert.ok(o.plan);
    assert.ok(o.validation.ok);
    assert.ok(o.candidates > 0);
    const ids = o.plan.routes.flatMap((r) => r.vehicles);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => !scenario.unavailable.includes(id)));
    for (const p of o.plan.routes) {
      const r = ROUTES.find((r) => r.id === p.route);
      assert.ok(p.headway * p.vehicles.length >= cycleBound(r, scenario));
      assert.ok(p.headway >= 10 && p.headway <= 20);
    }
    assert.equal(o.proposed.conflicts, 0);
    for (const e of [...o.baseResult.records, ...o.proposed.records])
      assert.ok(
        e.load >= 0 && e.load <= e.capacity,
        `over-capacity at ${e.trip}:${e.stop}`,
      );
    for (const r of [o.baseResult, o.proposed]) {
      assert.equal(r.total, r.boarded + r.unmet);
      assert.equal(r.boarded, r.completed + r.unfinished);
      assert.equal(r.results.length, r.boarded);
      assert.ok(r.utilization <= 100);
      assert.ok(r.results.every((j) => j.wait >= 0));
    }
    const evaluation = demand(scenario);
    assert.deepEqual(o.baseResult, simulate(o.baseline, scenario, evaluation));
    assert.deepEqual(o.proposed, simulate(o.plan, scenario, evaluation));
  });
}
test("normal seed 2026 measurably improves the predeclared wait objective", () => {
  const o = optimize(SCENARIOS.normal);
  assert.ok(o.improvement > 0);
  assert.ok(o.proposed.score < o.baseResult.score);
});
test("congestion restores a valid rotation and reports unfavorable outcomes honestly", () => {
  const o = optimize(SCENARIOS.traffic);
  assert.equal(validate(o.baseline, SCENARIOS.traffic).ok, false);
  assert.ok(o.baseResult.conflicts > 0);
  assert.equal(o.proposed.conflicts, 0);
  assert.equal(
    o.improvement,
    Math.round(
      ((o.baseResult.avgWait - o.proposed.avgWait) / o.baseResult.avgWait) *
        10000,
    ) / 100,
  );
});
test("seeded demand is reproducible, forecast is independent, and journeys are terminal-bound", () => {
  const s = SCENARIOS.normal,
    p = demand(s);
  assert.deepEqual(p, demand(s));
  assert.notDeepEqual(p, forecast(s));
  assert.notDeepEqual(p, demand(s, 7));
  assert.ok(
    p.every(
      (p) =>
        p.arrival >= 0 && p.arrival < HORIZON && p.origin !== p.destination,
    ),
  );
  for (const person of p) {
    const r = ROUTES.find((r) => r.id === person.route);
    assert.ok(
      r.stops.indexOf(person.destination) > r.stops.indexOf(person.origin) ||
        person.destination === r.stops[0],
    );
  }
});
test("rejects unavailable, duplicated and impossible vehicle assignments", () => {
  const p = baseline(SCENARIOS.normal);
  p.routes[1].vehicles.push("RP-01");
  assert.equal(validate(p, SCENARIOS.normal).ok, false);
  assert.equal(
    validate(baseline(SCENARIOS.normal), SCENARIOS.breakdown).ok,
    false,
  );
  const q = baseline(SCENARIOS.normal);
  q.routes[0].headway = 1;
  assert.equal(validate(q, SCENARIOS.normal).ok, false);
  const z = baseline(SCENARIOS.normal);
  z.routes[0].vehicles = [];
  assert.equal(validate(z, SCENARIOS.normal).ok, false);
});
test("ETA coverage and MAE are derived only from held-out traces", () => {
  const gps = gpsDataset(SCENARIOS.normal);
  assert.equal(gps.traces.length, 180);
  assert.equal(gps.calibrationCount, 60);
  assert.equal(gps.testCount, 120);
  const calibration = gps.traces
    .slice(0, 60)
    .map((t) => t.error)
    .sort((a, b) => a - b);
  const exactMargin = calibration[Math.ceil(0.9 * 61) - 1];
  const holdout = gps.traces.slice(60);
  const mae = (holdout.reduce((s, t) => s + t.error, 0) / 120) * 60;
  assert.equal(gps.maeSeconds, Math.round(mae * 100) / 100);
  const coverage =
    (holdout.filter((t) => t.error <= exactMargin).length / 120) * 100;
  assert.equal(gps.coverage, Math.round(coverage * 100) / 100);
  assert.deepEqual(gps, gpsDataset(SCENARIOS.normal));
  assert.ok(
    gps.traces.every((t) => t.window[0] >= 0 && t.window[1] > t.window[0]),
  );
});
test("passenger alternatives enforce a 2-minute transfer buffer and accessibility", () => {
  const s = SCENARIOS.normal,
    o = optimize(s);
  const trips = alternatives("hostels", "innovation", 20, o.plan, s, true);
  assert.ok(trips.length > 0);
  for (const t of trips) {
    assert.ok(t.depart >= 20 && t.arrive <= 120 && t.arrive > t.depart);
    if (t.transfer) assert.ok(t.transferWait >= 2);
    const ids = t.vehicle.split(" → ");
    assert.ok(ids.every((id) => VEHICLES.find((v) => v.id === id).accessible));
  }
});
test("multiple unseen seeds preserve feasibility and passenger conservation", () => {
  for (const seed of [1, 42, 9999])
    for (const s of Object.values(SCENARIOS)) {
      const o = optimize(s, seed);
      assert.ok(o.validation.ok);
      assert.equal(o.proposed.conflicts, 0);
      assert.equal(o.proposed.total, o.proposed.boarded + o.proposed.unmet);
    }
});
