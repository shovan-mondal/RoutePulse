// RoutePulse simulation engine. Minutes are relative to 07:30; all randomness is seeded.
export const SEED = 2026;
export let HORIZON = 120;
export let START_MINUTE = 450;
export let CONSTRAINTS = {
  minHeadway: 10,
  maxHeadway: 20,
  headways: [10, 12, 15, 18, 20],
  shifts: [0, 3, 6],
  firstDepartureMax: 6,
  dwell: 0.5,
  recovery: 2,
  travelEnvelope: 1.1,
  transferBuffer: 2,
};
export let DATASET_NAME = "Greenfield Campus";
export let DATASET_IMPORTED = false;
export let STOPS = [
  { id: "gate", name: "Main Gate", x: 120, y: 330, lat: 12.971, lng: 77.59 },
  {
    id: "hostels",
    name: "North Residences",
    x: 160,
    y: 120,
    lat: 12.9748,
    lng: 77.5907,
  },
  {
    id: "science",
    name: "Science Block",
    x: 350,
    y: 100,
    lat: 12.9752,
    lng: 77.5941,
  },
  {
    id: "library",
    name: "Central Library",
    x: 440,
    y: 235,
    lat: 12.9728,
    lng: 77.5957,
  },
  {
    id: "hub",
    name: "Transit Hub",
    x: 380,
    y: 375,
    lat: 12.9702,
    lng: 77.5946,
  },
  {
    id: "sports",
    name: "Sports Complex",
    x: 610,
    y: 125,
    lat: 12.9747,
    lng: 77.5988,
  },
  {
    id: "innovation",
    name: "Innovation Park",
    x: 810,
    y: 245,
    lat: 12.9726,
    lng: 77.6024,
  },
  {
    id: "engineering",
    name: "Engineering",
    x: 640,
    y: 320,
    lat: 12.9713,
    lng: 77.5994,
  },
  {
    id: "medical",
    name: "Medical Centre",
    x: 650,
    y: 480,
    lat: 12.9684,
    lng: 77.5995,
  },
  {
    id: "arts",
    name: "Arts & Humanities",
    x: 400,
    y: 520,
    lat: 12.9677,
    lng: 77.595,
  },
  {
    id: "lakeside",
    name: "Lakeside Residences",
    x: 210,
    y: 500,
    lat: 12.9681,
    lng: 77.5916,
  },
];
export let ROUTES = [
  {
    id: "A",
    name: "North loop",
    color: "#2563eb",
    stops: ["gate", "hostels", "science", "library", "hub"],
    edges: [4, 3, 3, 3, 4],
    vehicles: ["RP-01", "RP-02"],
    headway: 15,
    shift: 0,
  },
  {
    id: "B",
    name: "Innovation express",
    color: "#06a3a8",
    stops: ["engineering", "hub", "library", "sports", "innovation"],
    edges: [4, 3, 3, 4, 4],
    vehicles: ["RP-03", "RP-04"],
    headway: 15,
    shift: 3,
  },
  {
    id: "C",
    name: "South connector",
    color: "#ee9e1a",
    stops: ["hub", "engineering", "medical", "arts", "lakeside", "gate"],
    edges: [4, 3, 3, 4, 3, 3],
    vehicles: ["RP-05", "RP-06"],
    headway: 15,
    shift: 6,
  },
];
export let VEHICLES = [
  { id: "RP-01", capacity: 32, accessible: true },
  { id: "RP-02", capacity: 32, accessible: true },
  { id: "RP-03", capacity: 28, accessible: true },
  { id: "RP-04", capacity: 28, accessible: false },
  { id: "RP-05", capacity: 24, accessible: true },
  { id: "RP-06", capacity: 24, accessible: true },
  { id: "RP-07", capacity: 32, accessible: true, reserve: true },
];
export let SCENARIOS = {
  normal: {
    id: "normal",
    name: "Morning peak",
    description:
      "A regular weekday. Residence departures peak before the 08:30 lecture window.",
    factor: [1, 1, 1],
    demand: [1, 1, 1],
    unavailable: [],
    icon: "sun",
  },
  traffic: {
    id: "traffic",
    name: "East road congestion",
    description:
      "Roadworks increase North and Innovation travel times by 45%. Demand stays fixed.",
    factor: [1.45, 1.45, 1],
    demand: [1, 1, 1],
    unavailable: [],
    icon: "traffic",
  },
  event: {
    id: "event",
    name: "Campus festival",
    description:
      "A sports event increases Innovation-route demand by 80%. No additional fleet is available.",
    factor: [1, 1, 1],
    demand: [1, 1.8, 1],
    unavailable: [],
    icon: "sparkles",
  },
  breakdown: {
    id: "breakdown",
    name: "Vehicle unavailable",
    description:
      "RP-04 is unavailable for the entire window. The accessible reserve is available at the depot.",
    factor: [1, 1, 1],
    demand: [1, 1, 1],
    unavailable: ["RP-04"],
    icon: "bus",
  },
};
const DEFAULT_MODEL = structuredClone({
  stops: STOPS,
  routes: ROUTES,
  vehicles: VEHICLES,
  scenarios: SCENARIOS,
  constraints: CONSTRAINTS,
});
export function activateDataset(model = null) {
  const data = structuredClone(model || DEFAULT_MODEL);
  STOPS = data.stops;
  ROUTES = data.routes;
  VEHICLES = data.vehicles;
  SCENARIOS = data.scenarios;
  CONSTRAINTS = data.constraints;
  HORIZON = model?.window.minutes || 120;
  START_MINUTE = model
    ? Number(model.window.start.slice(0, 2)) * 60 +
      Number(model.window.start.slice(3))
    : 450;
  DATASET_NAME = model?.name || "Greenfield Campus";
  DATASET_IMPORTED = !!model;
}
export const stopById = (id) => STOPS.find((s) => s.id === id);
export const vehicleById = (id) => VEHICLES.find((v) => v.id === id);
export const time = (minute) => {
  const m = START_MINUTE + Math.round(minute);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};
export function rng(seed) {
  let a = seed | 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (v) => Math.round(v * 100) / 100;
export const nominalCycle = (route) =>
  route.edges.reduce((a, b) => a + b, 0) +
  route.stops.length * CONSTRAINTS.dwell;
export const cycleBound = (route, scenario) =>
  route.edges.reduce((s, x) => s + x, 0) *
    scenario.factor[ROUTES.indexOf(route)] *
    CONSTRAINTS.travelEnvelope +
  route.stops.length * CONSTRAINTS.dwell +
  CONSTRAINTS.recovery;
export function baseline(scenario) {
  return {
    label: "Fixed baseline v1",
    routes: ROUTES.map((r) => ({
      route: r.id,
      vehicles: r.vehicles.filter((v) => !scenario.unavailable.includes(v)),
      headway: r.headway,
      shift: r.shift,
    })),
  };
}
export function demand(scenario, seed = SEED) {
  if (scenario.passengers) return structuredClone(scenario.passengers);
  const random = rng(seed),
    people = [];
  ROUTES.forEach((r, ri) => {
    for (let m = 0; m < HORIZON; m++) {
      const peak = Math.exp(-(((m - 37) / 19) ** 2)),
        second = 0.4 * Math.exp(-(((m - 88) / 17) ** 2));
      r.stops.forEach((stop, si) => {
        const weights =
          ri === 0
            ? [0.85, 1.55, 0.55, 0.6, 0.65]
            : ri === 1
              ? [0.65, 0.9, 0.6, 0.85, 0.6]
              : [0.5, 0.5, 0.5, 0.6, 1.0, 0.65];
        const lambda =
          (0.085 + 0.85 * peak + 0.19 * second) *
          weights[si] *
          scenario.demand[ri];
        // Poisson draws preserve the same random stream for every scenario.
        const u = random();
        let p = Math.exp(-lambda),
          cdf = p,
          n = 0;
        while (u > cdf && n < 15) {
          n++;
          p *= lambda / n;
          cdf += p;
        }
        for (let k = 0; k < n; k++) {
          const destinations = [
            ...r.stops.slice(si + 1),
            ...(si > 0 ? [r.stops[0]] : []),
          ];
          const destination =
            destinations[Math.floor(random() * destinations.length)];
          const arrival = m + random();
          people.push({
            id: people.length,
            route: r.id,
            origin: stop,
            destination,
            arrival,
            deadline: arrival + 25 + (ri === 0 ? 0 : 5),
            accessible: random() < 0.04,
          });
        }
      });
    }
  });
  return people.sort((a, b) => a.arrival - b.arrival);
}
// Road time is a common deterministic environment, indexed by route, edge and wall-clock time.
export function edgeTime(route, edge, minute, scenario) {
  const ri = ROUTES.indexOf(route),
    phase =
      Math.sin(minute * 0.11 + edge * 1.7 + ri) * 0.055 +
      Math.sin(minute * 0.043 + edge) * 0.025;
  return route.edges[edge] * scenario.factor[ri] * (1 + phase);
}
export function schedule(plan, scenario) {
  const events = [],
    trips = [];
  plan.routes.forEach((p) => {
    const r = ROUTES.find((r) => r.id === p.route);
    if (!p.vehicles.length) return;
    const ready = Object.fromEntries(p.vehicles.map((v) => [v, -Infinity]));
    for (let d = p.shift, n = 0; d < HORIZON; d += p.headway, n++) {
      const vehicle = p.vehicles[n % p.vehicles.length];
      const start = Math.max(d, ready[vehicle]);
      let t = start;
      const visits = [];
      // One complete loop; origin is visited once more for alighting only.
      for (let i = 0; i <= r.stops.length; i++) {
        const stop = r.stops[i % r.stops.length];
        const visit = {
          route: r.id,
          vehicle,
          trip: `${r.id}-${n}`,
          stop,
          time: t,
          index: i,
          board: i < r.stops.length,
        };
        visits.push(visit);
        events.push(visit);
        if (i < r.stops.length)
          t += CONSTRAINTS.dwell + edgeTime(r, i, t, scenario);
      }
      ready[vehicle] = t + CONSTRAINTS.recovery;
      trips.push({
        id: `${r.id}-${n}`,
        route: r.id,
        vehicle,
        planned: d,
        start,
        end: t,
        late: start - d,
        visits,
      });
    }
  });
  return { events: events.sort((a, b) => a.time - b.time), trips };
}
export function validate(plan, scenario) {
  const errors = [],
    used = new Set();
  if (
    plan.routes.length !== ROUTES.length ||
    new Set(plan.routes.map((r) => r.route)).size !== ROUTES.length
  )
    errors.push("Every route must have exactly one allocation.");
  plan.routes.forEach((p) => {
    const r = ROUTES.find((r) => r.id === p.route);
    if (!r) {
      errors.push("Unknown route.");
      return;
    }
    if (
      !Number.isFinite(p.headway) ||
      p.headway < CONSTRAINTS.minHeadway ||
      p.headway > CONSTRAINTS.maxHeadway
    )
      errors.push(
        `${p.route}: headway must be ${CONSTRAINTS.minHeadway}–${CONSTRAINTS.maxHeadway} minutes.`,
      );
    if (
      !Number.isInteger(p.shift) ||
      p.shift < 0 ||
      p.shift > CONSTRAINTS.firstDepartureMax
    )
      errors.push(
        `${p.route}: first departure must be ${time(0)}–${time(CONSTRAINTS.firstDepartureMax)}.`,
      );
    if (!p.vehicles.length) errors.push(`${p.route}: no service vehicle.`);
    p.vehicles.forEach((id) => {
      if (!vehicleById(id)) errors.push(`${id}: unknown vehicle.`);
      if (used.has(id)) errors.push(`${id}: duplicate vehicle allocation.`);
      used.add(id);
      if (scenario.unavailable.includes(id))
        errors.push(`${id}: vehicle unavailable.`);
    });
    if (p.vehicles.length * p.headway + 1e-8 < cycleBound(r, scenario))
      errors.push(
        `${p.route}: rotation needs ${round(cycleBound(r, scenario))} min; ${p.vehicles.length * p.headway} min provided.`,
      );
    if (!p.vehicles.some((id) => vehicleById(id)?.accessible))
      errors.push(`${p.route}: accessible service required.`);
  });
  return {
    ok: !errors.length,
    errors,
    checks: [
      {
        name: "Vehicle availability & unique assignment",
        ok: !errors.some((e) => /vehicle|allocation/.test(e)),
      },
      {
        name: `Travel envelope + ${CONSTRAINTS.recovery} min recovery`,
        ok: !errors.some((e) => /rotation/.test(e)),
      },
      {
        name: `${CONSTRAINTS.minHeadway}–${CONSTRAINTS.maxHeadway} min service headway`,
        ok: !errors.some((e) => /headway|no service/.test(e)),
      },
      {
        name: "First departure within published window",
        ok: !errors.some((e) => /departure/.test(e)),
      },
      {
        name: "Accessible vehicle on every route",
        ok: !errors.some((e) => /accessible/.test(e)),
      },
      { name: "Boarding never exceeds seat capacity", ok: true },
    ],
  };
}
export function simulate(plan, scenario, passengers = demand(scenario)) {
  const { events, trips } = schedule(plan, scenario);
  const queue = new Map(),
    loads = new Map(),
    results = new Map(),
    records = [],
    blocked = new Set();
  ROUTES.forEach((r) => r.stops.forEach((s) => queue.set(`${r.id}:${s}`, [])));
  let cursor = 0,
    denied = 0,
    maxLoad = 0,
    totalWait = 0,
    boarded = 0,
    missed = 0,
    completed = 0;
  for (const e of events) {
    if (e.time > HORIZON) continue;
    while (cursor < passengers.length && passengers[cursor].arrival <= e.time) {
      const p = passengers[cursor++];
      queue.get(`${p.route}:${p.origin}`).push(p);
    }
    const vehicle = vehicleById(e.vehicle);
    const occupants = loads.get(e.trip) || [];
    const keep = [];
    for (const p of occupants) {
      if (p.destination === e.stop) {
        completed++;
        if (e.time > p.deadline) missed++;
        results.get(p.id).arrival = e.time;
      } else keep.push(p);
    }
    if (e.board) {
      const q = queue.get(`${e.route}:${e.stop}`),
        remain = [];
      for (const p of q) {
        if (
          keep.length < vehicle.capacity &&
          (!p.accessible || vehicle.accessible)
        ) {
          const wait = e.time - p.arrival;
          totalWait += wait;
          boarded++;
          keep.push(p);
          results.set(p.id, {
            id: p.id,
            wait,
            boardTime: e.time,
            vehicle: e.vehicle,
            trip: e.trip,
            arrival: null,
          });
        } else {
          remain.push(p);
          denied++;
          blocked.add(p.id);
        }
      }
      queue.set(`${e.route}:${e.stop}`, remain);
    }
    loads.set(e.trip, keep);
    maxLoad = Math.max(maxLoad, keep.length / vehicle.capacity);
    records.push({
      ...e,
      load: keep.length,
      capacity: vehicle.capacity,
      queue: queue.get(`${e.route}:${e.stop}`).length,
    });
  }
  // Right-censored riders contribute their elapsed wait at the fixed horizon.
  let unmet = 0;
  for (const p of passengers)
    if (!results.has(p.id)) {
      unmet++;
      totalWait += HORIZON - p.arrival;
    }
  const unfinished = boarded - completed;
  const minutes = trips.reduce(
    (s, t) => s + Math.max(0, Math.min(HORIZON, t.end) - t.start),
    0,
  );
  const fleetUsed = new Set(trips.map((t) => t.vehicle)).size;
  const conflicts = trips.filter((t) => t.late > 0.1).length;
  const avgWait = totalWait / Math.max(1, passengers.length);
  const late =
    missed +
    passengers.filter(
      (p) =>
        p.deadline <= HORIZON &&
        (!results.has(p.id) || results.get(p.id).arrival === null),
    ).length;
  return {
    avgWait: round(avgWait),
    unmet,
    boarded,
    completed,
    missed,
    unfinished,
    late,
    denied,
    blocked: blocked.size,
    maxLoad: round(maxLoad * 100),
    utilization: round((minutes / (Math.max(1, fleetUsed) * HORIZON)) * 100),
    fleetUsed,
    vehicleMinutes: round(minutes),
    conflicts,
    total: passengers.length,
    records,
    trips,
    results: [...results.values()],
    objectiveComponents: {
      wait: avgWait,
      unservedFraction: unmet / Math.max(1, passengers.length),
      lateFraction: late / Math.max(1, passengers.length),
      operatingMinutes: minutes,
    },
    score:
      avgWait +
      (unmet / Math.max(1, passengers.length)) * 35 +
      (late / Math.max(1, passengers.length)) * 10 +
      minutes * 0.0006,
  };
}
export function forecast(scenario, seed = SEED) {
  if (scenario.forecastPassengers)
    return structuredClone(scenario.forecastPassengers);
  // Independent prior weekday sample: the optimizer never sees evaluation passengers.
  return demand(scenario, seed + 89);
}
export function optimize(scenario, seed = SEED) {
  const predicted = forecast(scenario, seed),
    original = baseline(scenario);
  const available = VEHICLES.filter(
    (v) => !scenario.unavailable.includes(v.id),
  );
  const base = original.routes.map((p) => [...p.vehicles]);
  const spare = available
    .filter((v) => !base.flat().includes(v.id))
    .map((v) => v.id);
  const allocations = [];
  function assign(i, lists) {
    if (i === spare.length) {
      allocations.push(lists);
      return;
    }
    assign(
      i + 1,
      lists.map((v) => [...v]),
    );
    for (let r = 0; r < ROUTES.length; r++) {
      const next = lists.map((v) => [...v]);
      next[r].push(spare[i]);
      assign(i + 1, next);
    }
  }
  assign(0, base);
  const routeOptions = allocations.map((lists) =>
    lists.map((vehicles, ri) => {
      const options = [];
      for (const headway of CONSTRAINTS.headways)
        for (const shift of CONSTRAINTS.shifts) {
          if (
            vehicles.length * headway >= cycleBound(ROUTES[ri], scenario) &&
            vehicles.some((id) => vehicleById(id).accessible)
          )
            options.push({ route: ROUTES[ri].id, vehicles, headway, shift });
        }
      return options;
    }),
  );
  let best = null,
    bestScore = Infinity,
    candidates = 0;
  // Route costs are separable. Evaluate each route option once, then compose feasible plans.
  const cache = new Map();
  const cost = (p) => {
    const key = JSON.stringify(p);
    if (!cache.has(key))
      cache.set(
        key,
        simulate(
          { routes: [p] },
          scenario,
          predicted.filter((x) => x.route === p.route),
        ),
      );
    return cache.get(key);
  };
  for (const options of routeOptions) {
    if (options.some((a) => !a.length)) continue;
    // Costs and route constraints are separable once vehicles are assigned.
    // Selecting each route minimum is equivalent to enumerating the Cartesian product.
    let score = 0;
    const chosen = [];
    for (const routeOptions of options) {
      let winning = null,
        min = Infinity;
      for (const p of routeOptions) {
        const x = cost(p),
          weight = x.total / Math.max(1, predicted.length);
        const c = x.objectiveComponents;
        const value =
          (c.wait + c.unservedFraction * 35 + c.lateFraction * 10) * weight +
          c.operatingMinutes * 0.0006;
        if (value < min) {
          min = value;
          winning = p;
        }
      }
      score += min;
      chosen.push(winning);
    }
    const plan = { label: "RoutePulse proposed plan", routes: chosen };
    if (!validate(plan, scenario).ok) continue;
    candidates += options.reduce((n, o) => n * o.length, 1);
    if (score < bestScore) {
      bestScore = score;
      best = plan;
    }
  }
  const people = demand(scenario, seed),
    baseResult = simulate(original, scenario, people);
  if (!best)
    return {
      plan: null,
      baseline: original,
      baseResult,
      proposed: null,
      candidates,
      validation: {
        ok: false,
        errors: ["No feasible plan found within the candidate set."],
        checks: [],
      },
    };
  const proposed = simulate(best, scenario, people);
  return {
    plan: best,
    baseline: original,
    baseResult,
    proposed,
    candidates,
    validation: validate(best, scenario),
    forecastSeed: seed + 89,
    evaluationSeed: seed,
    improvement: round(
      baseResult.avgWait
        ? ((baseResult.avgWait - proposed.avgWait) / baseResult.avgWait) * 100
        : 0,
    ),
  };
}
export function gpsDataset(scenario, seed = SEED) {
  if (scenario.gpsTraces) return evaluateGPSTraces(scenario.gpsTraces);
  const random = rng(seed + 707),
    traces = [];
  for (let n = 0; n < 180; n++) {
    const route = ROUTES[n % ROUTES.length],
      edge = Math.floor(random() * route.stops.length),
      a = stopById(route.stops[edge]),
      b = stopById(route.stops[(edge + 1) % route.stops.length]);
    const start = Math.floor(random() * 90),
      duration = edgeTime(route, edge, start, scenario),
      progress = 0.2 + random() * 0.45;
    const observedAt = start + duration * progress;
    const speedFactor = 1 + (random() - 0.5) * 0.28;
    const samples = [-0.5, -0.25, 0].map((offset, i) => {
      const fraction = Math.max(
        0,
        progress + (offset / duration) * speedFactor,
      );
      return {
        minute: round(observedAt + offset),
        lat: a.lat + (b.lat - a.lat) * fraction + (random() - 0.5) * 0.00002,
        lng: a.lng + (b.lng - a.lng) * fraction + (random() - 0.5) * 0.00002,
      };
    });
    const prediction = estimateGPS(samples, a, b);
    const actualRemaining =
      duration * (1 - progress) * (1 + (random() - 0.5) * 0.16);
    traces.push({
      id: `GPS-${n + 1}`,
      route: route.id,
      from: a.id,
      to: b.id,
      samples,
      observedAt: round(observedAt),
      predicted: prediction,
      actual: actualRemaining,
      error: Math.abs(prediction - actualRemaining),
    });
  }
  return evaluateGPSTraces(traces, 60);
}
export function evaluateGPSTraces(
  input,
  calibrationCount = Math.floor(input.length / 3),
) {
  const traces = input.map((t) => {
    const samples = t.samples.slice(-3);
    const predicted = estimateGPS(samples, stopById(t.from), stopById(t.to));
    return {
      ...t,
      samples,
      observedAt: t.samples.at(-1).minute,
      predicted,
      error: Math.abs(predicted - t.actual),
    };
  });
  const calibration = traces
    .slice(0, calibrationCount)
    .map((t) => t.error)
    .sort((a, b) => a - b);
  const margin = calibration[Math.ceil(0.9 * (calibration.length + 1)) - 1];
  const holdout = traces.slice(calibrationCount);
  return {
    traces: traces.map((t) => ({
      ...t,
      window: [Math.max(0, t.predicted - margin), t.predicted + margin],
    })),
    margin: round(margin),
    marginMinutes: margin,
    maeSeconds: round(
      (holdout.reduce((s, t) => s + t.error, 0) / holdout.length) * 60,
    ),
    coverage: round(
      (holdout.filter((t) => t.error <= margin).length / holdout.length) * 100,
    ),
    testCount: holdout.length,
    calibrationCount,
  };
}
export function estimateGPS(samples, from, to) {
  if (!from || !to || samples.length < 2) return Infinity;
  // Local equirectangular map matching: project latitude/longitude onto the current road edge.
  // Only observed samples and the known route geometry enter the estimator.
  const cos = Math.cos((from.lat * Math.PI) / 180),
    dx = (to.lng - from.lng) * cos,
    dy = to.lat - from.lat;
  const project = (s) =>
    Math.max(
      0,
      Math.min(
        1,
        ((s.lng - from.lng) * cos * dx + (s.lat - from.lat) * dy) /
          (dx * dx + dy * dy),
      ),
    );
  const last = samples.at(-1),
    first = samples[0];
  const progress = project(last),
    speed = (project(last) - project(first)) / (last.minute - first.minute);
  if (!Number.isFinite(speed) || speed <= 0 || last.minute <= first.minute)
    return Infinity;
  return (1 - progress) / speed;
}
export function liveVehicles(result, minute, scenario) {
  const active = result.trips.filter(
    (t) => t.start <= minute && t.end > minute,
  );
  return active.map((t) => {
    let i = t.visits.findIndex(
      (v, k) =>
        k < t.visits.length - 1 &&
        v.time <= minute &&
        t.visits[k + 1].time > minute,
    );
    i = Math.max(0, i);
    const a = t.visits[i],
      b = t.visits[i + 1],
      from = stopById(a.stop),
      to = stopById(b.stop);
    const progress = Math.max(
      0,
      Math.min(1, (minute - a.time - 0.5) / (b.time - a.time - 0.5)),
    );
    const records = result.records.filter(
        (r) => r.trip === t.id && r.time <= minute,
      ),
      last = records.at(-1);
    const predictedTime = b.time; // Replay interpolation is labeled as simulation, not a live feed.
    return {
      id: t.vehicle,
      route: t.route,
      x: from.x + (to.x - from.x) * progress,
      y: from.y + (to.y - from.y) * progress,
      load: last?.load || 0,
      capacity: vehicleById(t.vehicle).capacity,
      next: b.stop,
      eta: Math.max(0, predictedTime - minute),
      trip: t.id,
    };
  });
}
export function alternatives(
  origin,
  destination,
  minute,
  plan,
  scenario,
  accessible = false,
) {
  const { events } = schedule(plan, scenario),
    all = [];
  for (const r of ROUTES) {
    if (!r.stops.includes(origin) || !r.stops.includes(destination)) continue;
    for (const e of events.filter(
      (e) =>
        e.route === r.id && e.stop === origin && e.time >= minute && e.board,
    )) {
      if (accessible && !vehicleById(e.vehicle).accessible) continue;
      const arrival = events.find(
        (x) => x.trip === e.trip && x.stop === destination && x.time > e.time,
      );
      if (arrival && arrival.time <= HORIZON)
        all.push({
          routes: [r.id],
          depart: e.time,
          arrive: arrival.time,
          vehicle: e.vehicle,
          transfer: null,
        });
    }
  }
  // Timetable-feasible single transfers with a two-minute transfer buffer.
  for (const a of ROUTES)
    for (const b of ROUTES) {
      if (
        a.id === b.id ||
        !a.stops.includes(origin) ||
        !b.stops.includes(destination)
      )
        continue;
      for (const shared of a.stops.filter(
        (s) => b.stops.includes(s) && s !== origin && s !== destination,
      )) {
        for (const first of events.filter(
          (e) =>
            e.route === a.id &&
            e.stop === origin &&
            e.time >= minute &&
            e.board,
        )) {
          if (accessible && !vehicleById(first.vehicle).accessible) continue;
          const middle = events.find(
            (e) =>
              e.trip === first.trip && e.stop === shared && e.time > first.time,
          );
          if (!middle) continue;
          const second = events.find(
            (e) =>
              e.route === b.id &&
              e.stop === shared &&
              e.board &&
              e.time >= middle.time + 2 &&
              (!accessible || vehicleById(e.vehicle).accessible),
          );
          if (!second) continue;
          const last = events.find(
            (e) =>
              e.trip === second.trip &&
              e.stop === destination &&
              e.time > second.time,
          );
          if (last && last.time <= HORIZON)
            all.push({
              routes: [a.id, b.id],
              depart: first.time,
              arrive: last.time,
              vehicle: `${first.vehicle} → ${second.vehicle}`,
              transfer: shared,
              transferWait: second.time - middle.time,
            });
        }
      }
    }
  return all.sort((a, b) => a.arrive - b.arrive).slice(0, 3);
}
