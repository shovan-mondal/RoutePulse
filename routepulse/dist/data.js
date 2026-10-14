import {
  STOPS,
  ROUTES,
  VEHICLES,
  SCENARIOS,
  CONSTRAINTS,
  HORIZON,
  DATASET_NAME,
  SEED,
  time,
  demand,
  forecast,
  gpsDataset,
  baseline,
  schedule,
  estimateGPS,
  activateDataset,
} from "./engine.js";
import { recordGPSReplay, mapMatch } from "./telemetry.js";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
// Versioned JSON contract. Every error has a path; validation never changes the active model.
export function validateDataset(input) {
  const errors = [];
  const fail = (path, message) => {
    if (errors.length < 100) errors.push({ path, message });
  };
  const object = (v, p) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      fail(p, "Expected an object.");
      return {};
    }
    return v;
  };
  const array = (v, p, min, max) => {
    if (!Array.isArray(v)) {
      fail(p, "Expected an array.");
      return [];
    }
    if (v.length < min || v.length > max) {
      fail(p, `Expected ${min}–${max} entries.`);
      return v.slice(0, max);
    }
    return v;
  };
  const number = (v, p, min, max, integer = false) => {
    if (
      typeof v !== "number" ||
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (integer && !Number.isInteger(v))
    ) {
      fail(
        p,
        `Expected ${integer ? "an integer" : "a number"} in ${min}–${max}.`,
      );
      return min;
    }
    return v;
  };
  const text = (v, p, fallback = "") => {
    if (
      typeof v !== "string" ||
      !v.trim() ||
      v.length > 180 ||
      /[<>"`]/.test(v)
    ) {
      fail(
        p,
        "Expected plain text, 1–180 characters, without HTML or double quotes.",
      );
      return fallback;
    }
    return v.trim();
  };
  const id = (v, p) => {
    if (
      typeof v !== "string" ||
      !/^[A-Za-z0-9_-]{1,40}$/.test(v) ||
      ["__proto__", "constructor", "prototype"].includes(v)
    ) {
      fail(p, "Use a unique ID with letters, digits, underscores or hyphens.");
      return "invalid";
    }
    return v;
  };
  const bool = (v, p, fallback = false) => {
    if (v === undefined) return fallback;
    if (typeof v !== "boolean") {
      fail(p, "Expected true or false.");
      return fallback;
    }
    return v;
  };
  const unique = (items, p) => {
    const seen = new Set();
    items.forEach((x, i) => {
      if (seen.has(x.id)) fail(`${p}[${i}].id`, "Duplicate ID.");
      seen.add(x.id);
    });
  };
  input = object(input, "dataset");
  if (input.schemaVersion !== 1)
    fail(
      "schemaVersion",
      "Expected version 1. Download the sample for the supported contract.",
    );
  const name = text(input.name, "name", "Imported campus"),
    seed = number(input.seed ?? SEED, "seed", 1, 999999, true);
  const win = object(input.window, "window");
  const start =
    typeof win.start === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(win.start)
      ? win.start
      : "07:30";
  if (start !== win.start) fail("window.start", "Use HH:MM in 24-hour time.");
  const minutes = number(win.minutes, "window.minutes", 30, 240, true);
  if (Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + minutes >= 1440)
    fail("window", "The evaluation window must end before midnight.");
  const raw = object(input.constraints ?? {}, "constraints");
  const constraints = {
    minHeadway: number(raw.minHeadway ?? 10, "constraints.minHeadway", 5, 60),
    maxHeadway: number(raw.maxHeadway ?? 20, "constraints.maxHeadway", 5, 60),
    firstDepartureMax: number(
      raw.firstDepartureMax ?? 6,
      "constraints.firstDepartureMax",
      0,
      Math.min(30, minutes - 1),
      true,
    ),
    dwell: number(raw.dwell ?? 0.5, "constraints.dwell", 0, 5),
    recovery: number(raw.recovery ?? 2, "constraints.recovery", 0, 15),
    travelEnvelope: number(
      raw.travelEnvelope ?? 1.1,
      "constraints.travelEnvelope",
      1.08,
      2,
    ),
    transferBuffer: number(
      raw.transferBuffer ?? 2,
      "constraints.transferBuffer",
      2,
      15,
    ),
  };
  if (constraints.minHeadway > constraints.maxHeadway)
    fail("constraints", "Minimum headway must not exceed maximum headway.");
  constraints.headways = array(
    raw.headways ??
      [10, 12, 15, 18, 20].filter(
        (h) => h >= constraints.minHeadway && h <= constraints.maxHeadway,
      ),
    "constraints.headways",
    1,
    12,
  ).map((h, i) =>
    number(
      h,
      `constraints.headways[${i}]`,
      constraints.minHeadway,
      constraints.maxHeadway,
    ),
  );
  constraints.shifts = array(
    raw.shifts ?? [0, 3, 6].filter((s) => s <= constraints.firstDepartureMax),
    "constraints.shifts",
    1,
    12,
  ).map((s, i) =>
    number(
      s,
      `constraints.shifts[${i}]`,
      0,
      constraints.firstDepartureMax,
      true,
    ),
  );
  const stops = array(input.stops, "stops", 2, 100).map((v, i) => {
    v = object(v, `stops[${i}]`);
    return {
      id: id(v.id, `stops[${i}].id`),
      name: text(v.name, `stops[${i}].name`),
      lat: number(v.lat, `stops[${i}].lat`, -85, 85),
      lng: number(v.lng, `stops[${i}].lng`, -180, 180),
      ...(v.x !== undefined && v.y !== undefined
        ? {
            x: number(v.x, `stops[${i}].x`, 30, 870),
            y: number(v.y, `stops[${i}].y`, 30, 570),
          }
        : {}),
    };
  });
  unique(stops, "stops");
  const stopIds = new Set(stops.map((s) => s.id));
  const lats = stops.map((s) => s.lat),
    lngs = stops.map((s) => s.lng),
    minLat = Math.min(...lats),
    minLng = Math.min(...lngs),
    latSpan = Math.max(...lats) - minLat,
    lngSpan = Math.max(...lngs) - minLng;
  stops.forEach((s) => {
    s.x ??= 80 + ((s.lng - minLng) / Math.max(0.000001, lngSpan)) * 740;
    s.y ??= 530 - ((s.lat - minLat) / Math.max(0.000001, latSpan)) * 460;
  });
  const vehicles = array(input.vehicles, "vehicles", 1, 64).map((v, i) => {
    v = object(v, `vehicles[${i}]`);
    return {
      id: id(v.id, `vehicles[${i}].id`),
      capacity: number(v.capacity, `vehicles[${i}].capacity`, 1, 200, true),
      accessible: bool(v.accessible, `vehicles[${i}].accessible`),
      reserve: bool(v.reserve, `vehicles[${i}].reserve`),
    };
  });
  unique(vehicles, "vehicles");
  const vehicleIds = new Set(vehicles.map((v) => v.id));
  const assigned = new Set();
  const routes = array(input.routes, "routes", 1, 8).map((v, i) => {
    const p = `routes[${i}]`;
    v = object(v, p);
    const list = array(v.stops, `${p}.stops`, 2, 30).map((s, j) => {
      if (!stopIds.has(s)) fail(`${p}.stops[${j}]`, "Unknown stop ID.");
      return s;
    });
    if (new Set(list).size !== list.length)
      fail(
        `${p}.stops`,
        "List each stop once; the terminal return is implicit.",
      );
    list.forEach((s, j) => {
      const a = stops.find((x) => x.id === s),
        b = stops.find((x) => x.id === list[(j + 1) % list.length]);
      if (a && b && a.lat === b.lat && a.lng === b.lng)
        fail(
          `${p}.stops[${j}]`,
          "Consecutive stops need distinct coordinates for GPS map matching.",
        );
    });
    const edges = array(v.edges, `${p}.edges`, list.length, list.length).map(
      (n, j) => number(n, `${p}.edges[${j}]`, 0.25, 45),
    );
    const fleet = array(v.vehicles, `${p}.vehicles`, 1, 16).map((x, j) => {
      if (!vehicleIds.has(x))
        fail(`${p}.vehicles[${j}]`, "Unknown vehicle ID.");
      if (assigned.has(x))
        fail(
          `${p}.vehicles[${j}]`,
          "Vehicle is already assigned in the baseline.",
        );
      assigned.add(x);
      return x;
    });
    const color =
      typeof v.color === "string" && /^#[0-9a-fA-F]{6}$/.test(v.color)
        ? v.color
        : ["#2563eb", "#06a3a8", "#ee9e1a", "#9060c8"][i % 4];
    return {
      id: id(v.id, `${p}.id`),
      name: text(v.name, `${p}.name`),
      color,
      stops: list,
      edges,
      vehicles: fleet,
      headway: number(
        v.headway,
        `${p}.headway`,
        constraints.minHeadway,
        constraints.maxHeadway,
      ),
      shift: number(
        v.shift,
        `${p}.shift`,
        0,
        constraints.firstDepartureMax,
        true,
      ),
    };
  });
  unique(routes, "routes");
  const routeIds = new Set(routes.map((r) => r.id));
  stops.forEach((s) => {
    if (!routes.some((r) => r.stops.includes(s.id)))
      fail(`stops.${s.id}`, "Every published stop must be served by a route.");
  });
  const reserves = vehicles.filter((v) => !assigned.has(v.id));
  if (reserves.length > 2)
    fail(
      "vehicles",
      "This search supports at most two unassigned reserve vehicles.",
    );
  const normalizePeople = (rows, path) => {
    const result = [];
    array(rows, path, 0, 10000).forEach((v, i) => {
      const p = `${path}[${i}]`;
      v = object(v, p);
      const route = routes.find((r) => r.id === v.route);
      if (!route) fail(`${p}.route`, "Unknown route ID.");
      if (!route?.stops.includes(v.origin))
        fail(`${p}.origin`, "Origin must belong to the passenger route.");
      if (!route?.stops.includes(v.destination) || v.origin === v.destination)
        fail(
          `${p}.destination`,
          "Choose a different destination on the passenger route.",
        );
      if (
        route &&
        route.stops.includes(v.origin) &&
        route.stops.includes(v.destination) &&
        route.stops.indexOf(v.destination) <= route.stops.indexOf(v.origin) &&
        v.destination !== route.stops[0]
      )
        fail(
          `${p}.destination`,
          "Journeys must end downstream or at the loop terminal.",
        );
      const arrival = number(v.arrival, `${p}.arrival`, 0, minutes - 0.000001),
        deadline = number(
          v.deadline ?? arrival + 30,
          `${p}.deadline`,
          arrival,
          minutes + 240,
        ),
        count = number(v.count ?? 1, `${p}.count`, 1, 10000, true),
        accessible = bool(v.accessible, `${p}.accessible`);
      if (result.length + count > 10000) {
        fail(path, "Expanded passenger demand exceeds 10,000 riders.");
        return;
      }
      for (let n = 0; n < count; n++)
        result.push({
          id: result.length,
          route: v.route,
          origin: v.origin,
          destination: v.destination,
          arrival,
          deadline,
          accessible,
        });
    });
    return result.sort((a, b) => a.arrival - b.arrival);
  };
  const rawScenarios = Array.isArray(input.scenarios)
    ? input.scenarios
    : Object.values(object(input.scenarios, "scenarios"));
  const scenarios = Object.create(null),
    scenarioList = array(rawScenarios, "scenarios", 1, 8).map((v, i) => {
      const p = `scenarios[${i}]`;
      v = object(v, p);
      const sid = id(v.id, `${p}.id`);
      const factor = array(
        v.factor,
        `${p}.factor`,
        routes.length,
        routes.length,
      ).map((n, j) => number(n, `${p}.factor[${j}]`, 0.5, 3));
      const unavailable = array(
        v.unavailable ?? [],
        `${p}.unavailable`,
        0,
        vehicles.length,
      ).map((x, j) => {
        if (!vehicleIds.has(x))
          fail(`${p}.unavailable[${j}]`, "Unknown vehicle ID.");
        return x;
      });
      const passengers = normalizePeople(v.passengers, `${p}.passengers`),
        forecastPassengers = normalizePeople(
          v.forecastPassengers,
          `${p}.forecastPassengers`,
        );
      if (!passengers.length)
        fail(`${p}.passengers`, "Supply at least one evaluation passenger.");
      if (!forecastPassengers.length)
        fail(
          `${p}.forecastPassengers`,
          "Supply an independent forecast sample, separate from evaluation demand.",
        );
      const gpsTraces = array(
        v.gpsTraces ?? v.gps?.traces,
        `${p}.gpsTraces`,
        30,
        3000,
      ).map((t, j) => {
        const q = `${p}.gpsTraces[${j}]`;
        t = object(t, q);
        const route = routes.find((r) => r.id === t.route),
          a = stops.find((s) => s.id === t.from),
          b = stops.find((s) => s.id === t.to);
        if (
          !route ||
          !a ||
          !b ||
          route.stops[
            (route.stops.indexOf(t.from) + 1) % route.stops.length
          ] !== t.to
        )
          fail(q, "GPS trace must match a directed edge of its route.");
        const samples = array(t.samples, `${q}.samples`, 3, 30).map((s, k) => {
          s = object(s, `${q}.samples[${k}]`);
          return {
            minute: number(s.minute, `${q}.samples[${k}].minute`, -10, minutes),
            lat: number(s.lat, `${q}.samples[${k}].lat`, -85, 85),
            lng: number(s.lng, `${q}.samples[${k}].lng`, -180, 180),
          };
        });
        for (let k = 1; k < samples.length; k++)
          if (samples[k].minute <= samples[k - 1].minute)
            fail(`${q}.samples`, "GPS timestamps must increase strictly.");
        if (
          a &&
          b &&
          samples.length >= 3 &&
          !Number.isFinite(estimateGPS(samples.slice(-3), a, b))
        )
          fail(
            q,
            "Calibration traces must contain measurable forward motion. Stationary live observations are allowed separately.",
          );
        return {
          id: t.id || `GPS-${j + 1}`,
          route: t.route,
          from: t.from,
          to: t.to,
          samples,
          actual: number(t.actual ?? t.actualRemaining, `${q}.actual`, 0, 90),
        };
      });
      const gpsObservations = array(
        v.gpsObservations ?? [],
        `${p}.gpsObservations`,
        0,
        15000,
      )
        .map((s, j) => {
          const q = `${p}.gpsObservations[${j}]`;
          s = object(s, q);
          if (!vehicleIds.has(s.vehicle))
            fail(`${q}.vehicle`, "Unknown vehicle ID.");
          if (!routeIds.has(s.route)) fail(`${q}.route`, "Unknown route ID.");
          if (unavailable.includes(s.vehicle))
            fail(
              `${q}.vehicle`,
              "An unavailable vehicle cannot supply GPS observations.",
            );
          if (
            !routes.find((r) => r.id === s.route)?.vehicles.includes(s.vehicle)
          )
            fail(
              `${q}.route`,
              "GPS vehicle must match its baseline route assignment.",
            );
          const observation = {
            vehicle: s.vehicle,
            route: s.route,
            ...(s.trip ? { trip: id(s.trip, `${q}.trip`) } : {}),
            minute: number(s.minute, `${q}.minute`, -10, minutes),
            lat: number(s.lat, `${q}.lat`, -85, 85),
            lng: number(s.lng, `${q}.lng`, -180, 180),
          };
          // Validate against the incoming geometry without touching the active model.
          const route = routes.find((r) => r.id === s.route);
          if (route) {
            const near = route.stops.some((id, k) => {
              const a = stops.find((x) => x.id === id),
                b = stops.find(
                  (x) => x.id === route.stops[(k + 1) % route.stops.length],
                );
              if (!a || !b) return false;
              const cos = Math.cos((a.lat * Math.PI) / 180),
                dx = (b.lng - a.lng) * cos,
                dy = b.lat - a.lat,
                den = dx * dx + dy * dy;
              if (!den) return false;
              const progress = Math.max(
                0,
                Math.min(
                  1,
                  ((observation.lng - a.lng) * cos * dx +
                    (observation.lat - a.lat) * dy) /
                    den,
                ),
              );
              return (
                Math.hypot(
                  (observation.lng - a.lng - (b.lng - a.lng) * progress) * cos,
                  observation.lat - a.lat - (b.lat - a.lat) * progress,
                ) *
                  111320 <=
                100
              );
            });
            if (!near)
              fail(
                q,
                "GPS position is more than 100 m from the assigned route.",
              );
          }
          return observation;
        })
        .sort((a, b) => a.minute - b.minute);
      const seenTimes = new Set();
      gpsObservations.forEach((s, j) => {
        const key = `${s.vehicle}:${s.minute}`;
        if (seenTimes.has(key))
          fail(`${p}.gpsObservations[${j}]`, "Duplicate vehicle timestamp.");
        seenTimes.add(key);
      });
      // Operational preflight: every scenario must admit the declared fixed-route reserve search.
      const spare = reserves.filter((x) => !unavailable.includes(x.id));
      let needed = 0,
        accessibleNeeded = 0;
      routes.forEach((r, j) => {
        const fleet = r.vehicles.filter((x) => !unavailable.includes(x)),
          cycle =
            r.edges.reduce((s, x) => s + x, 0) *
              factor[j] *
              constraints.travelEnvelope +
            r.stops.length * constraints.dwell +
            constraints.recovery;
        const hasAccessible = fleet.some(
          (x) => vehicles.find((v) => v.id === x)?.accessible,
        );
        needed += Math.max(
          Math.ceil(cycle / Math.max(...constraints.headways)) - fleet.length,
          hasAccessible ? 0 : 1,
          0,
        );
        if (!hasAccessible) accessibleNeeded++;
      });
      if (
        needed > spare.length ||
        accessibleNeeded > spare.filter((v) => v.accessible).length
      )
        fail(
          p,
          "No feasible allocation in the published candidate set: add available reserve capacity, relax a constraint, or revise this scenario.",
        );
      const scenario = {
        id: sid,
        name: text(v.name, `${p}.name`),
        description: text(
          v.description ?? "Organizer-supplied scenario",
          `${p}.description`,
        ),
        factor,
        demand: Array(routes.length).fill(1),
        unavailable,
        icon: "flask",
        passengers,
        forecastPassengers,
        gpsTraces,
        gpsObservations,
      };
      scenarios[sid] = scenario;
      return scenario;
    });
  unique(scenarioList, "scenarios");
  const model = {
    schemaVersion: 1,
    name,
    seed,
    window: { start, minutes },
    constraints,
    stops,
    routes,
    vehicles,
    scenarios,
  };
  return {
    ok: errors.length === 0,
    errors,
    model: errors.length ? null : model,
    summary: {
      name,
      routes: routes.length,
      stops: stops.length,
      vehicles: vehicles.length,
      scenarios: scenarioList.length,
      minutes,
      passengers: scenarioList.reduce((n, s) => n + s.passengers.length, 0),
      gps: scenarioList.reduce(
        (n, s) => n + s.gpsTraces.length + s.gpsObservations.length,
        0,
      ),
    },
  };
}

export function parseDataset(text) {
  if (new TextEncoder().encode(text).byteLength > MAX_FILE_BYTES)
    return {
      ok: false,
      errors: [
        { path: "file", message: "File exceeds the 5 MB import limit." },
      ],
    };
  try {
    return validateDataset(JSON.parse(text));
  } catch (error) {
    return {
      ok: false,
      errors: [{ path: "file", message: `Invalid JSON: ${error.message}` }],
    };
  }
}
export function organizerTemplate(
  scenarioId = Object.keys(SCENARIOS)[0],
  seed = SEED,
) {
  const s = SCENARIOS[scenarioId],
    gps = gpsDataset(s, seed);
  return {
    schemaVersion: 1,
    name: DATASET_NAME,
    seed,
    window: { start: time(0), minutes: HORIZON },
    constraints: structuredClone(CONSTRAINTS),
    stops: structuredClone(STOPS),
    routes: structuredClone(ROUTES),
    vehicles: structuredClone(VEHICLES),
    scenarios: [
      {
        id: s.id,
        name: s.name,
        description: s.description,
        factor: s.factor,
        unavailable: s.unavailable,
        passengers: demand(s, seed),
        forecastPassengers: forecast(s, seed),
        gpsTraces: gps.traces.map(
          ({ id, route, from, to, samples, actual }) => ({
            id,
            route,
            from,
            to,
            samples,
            actual,
          }),
        ),
        gpsObservations: s.gpsObservations?.length
          ? s.gpsObservations
          : recordGPSReplay(schedule(baseline(s), s), seed),
      },
    ],
  };
}
export function installDataset(validation) {
  if (!validation.ok || !validation.model)
    throw new Error("Validate the dataset before activation.");
  activateDataset(validation.model);
}
