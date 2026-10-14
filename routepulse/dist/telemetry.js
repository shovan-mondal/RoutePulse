import {
  ROUTES,
  STOPS,
  HORIZON,
  CONSTRAINTS,
  stopById,
  vehicleById,
  nominalCycle,
  estimateGPS,
  rng,
} from "./engine.js";

// This is the sensor simulator. Ground-truth visits generate positions ONLY at past timestamps.
// Prediction below never reads future visit times or ground-truth arrival times.
export function simulatedGPS(result, minute, seed = 2026) {
  return result.trips
    .filter((t) => t.start <= minute && t.end > minute)
    .map((t) => {
      const random = rng(
        seed +
          Math.round(minute * 100) * 13 +
          t.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0),
      );
      const samples = [minute - 0.5, minute - 0.25, minute]
        .filter((m) => m >= t.start)
        .map((m) => {
          let i = t.visits.findIndex(
            (v, k) =>
              k < t.visits.length - 1 &&
              v.time <= m &&
              t.visits[k + 1].time > m,
          );
          i = Math.max(0, i);
          const a = t.visits[i],
            b = t.visits[i + 1],
            from = stopById(a.stop),
            to = stopById(b.stop);
          const progress = Math.max(
            0,
            Math.min(
              1,
              (m - a.time - CONSTRAINTS.dwell) /
                (b.time - a.time - CONSTRAINTS.dwell),
            ),
          );
          return {
            vehicle: t.vehicle,
            route: t.route,
            trip: t.id,
            minute: m,
            lat:
              from.lat +
              (to.lat - from.lat) * progress +
              (random() - 0.5) * 0.00002,
            lng:
              from.lng +
              (to.lng - from.lng) * progress +
              (random() - 0.5) * 0.00002,
          };
        });
      return {
        trip: t.id,
        vehicle: t.vehicle,
        route: t.route,
        samples,
        source: "Simulated GPS",
      };
    });
}
export function recordGPSReplay(result, seed = 2026) {
  const samples = [];
  for (let m = 0; m < HORIZON; m += 0.25)
    for (const track of simulatedGPS(result, m, seed))
      samples.push(track.samples.at(-1));
  return samples;
}

export function mapMatch(samples, route) {
  if (!samples.length) return null;
  const last = samples.at(-1);
  let best = null;
  route.stops.forEach((id, edge) => {
    const from = stopById(id),
      to = stopById(route.stops[(edge + 1) % route.stops.length]),
      cos = Math.cos((from.lat * Math.PI) / 180),
      dx = (to.lng - from.lng) * cos,
      dy = to.lat - from.lat,
      den = dx * dx + dy * dy;
    if (!den) return;
    const project = (s) =>
      ((s.lng - from.lng) * cos * dx + (s.lat - from.lat) * dy) / den;
    const progress = project(last);
    if (progress < -0.08 || progress > 1.08) return;
    const px =
        from.lng + (to.lng - from.lng) * Math.max(0, Math.min(1, progress)),
      py = from.lat + (to.lat - from.lat) * Math.max(0, Math.min(1, progress));
    const distance = Math.hypot((last.lng - px) * cos, last.lat - py) * 111320;
    const delta = project(last) - project(samples[0]);
    if (distance > 100 || delta < -0.03) return;
    const score = distance + (delta < 0.001 ? 2 : 0);
    if (!best || score < best.score)
      best = {
        edge,
        from,
        to,
        progress: Math.max(0, Math.min(1, progress)),
        distance,
        score,
      };
  });
  return best;
}

export function predictTripArrivals(
  trip,
  route,
  scenario,
  minute,
  samples,
  margin,
  source = "GPS",
  estimatedStart = trip.planned,
) {
  const recent = samples
    .filter((s) => s.minute <= minute && s.minute >= minute - 2)
    .sort((a, b) => a.minute - b.minute)
    .slice(-3);
  const matched = recent.length >= 3 ? mapMatch(recent, route) : null;
  const factor = scenario.factor[ROUTES.findIndex((r) => r.id === route.id)],
    predictions = [];
  const nominal = route.edges.map((v) => v * factor),
    last = recent.at(-1);
  if (matched) {
    const edge = matched.edge,
      observed = estimateGPS(recent, matched.from, matched.to),
      remainingPrior = nominal[edge] * (1 - matched.progress);
    const cos = Math.cos((matched.from.lat * Math.PI) / 180),
      dx = (matched.to.lng - matched.from.lng) * cos,
      dy = matched.to.lat - matched.from.lat,
      den = dx * dx + dy * dy;
    const projected = recent.map(
      (p) =>
        ((p.lng - matched.from.lng) * cos * dx +
          (p.lat - matched.from.lat) * dy) /
        den,
    );
    const speeds = projected
      .slice(1)
      .map(
        (p, i) =>
          (p - projected[i]) / (recent[i + 1].minute - recent[i].minute),
      );
    const steadyMotion =
      speeds.every((v) => v > 0) &&
      Math.max(...speeds) / Math.min(...speeds) < 4 &&
      projected
        .slice(1)
        .every((p, i) => (p - projected[i]) * Math.sqrt(den) * 111320 >= 2);
    const moving =
      steadyMotion &&
      Number.isFinite(observed) &&
      observed > 0 &&
      observed < nominal[edge] * 3 &&
      observed >= remainingPrior * 0.35;
    let midpoint =
      last.minute + (moving ? observed : remainingPrior + CONSTRAINTS.dwell);
    let futureTravel = 0;
    for (let index = edge + 1; index <= route.stops.length; index++) {
      const extra =
        margin * Math.sqrt(index - edge) +
        futureTravel * (CONSTRAINTS.travelEnvelope - 1) +
        (moving ? 0 : nominal[edge] * (CONSTRAINTS.travelEnvelope - 1));
      predictions.push({
        trip: trip.id,
        vehicle: trip.vehicle,
        route: route.id,
        index,
        stop: route.stops[index % route.stops.length],
        board: index < route.stops.length,
        midpoint,
        earliest: midpoint - extra,
        latest: midpoint + extra,
        window: [
          Math.max(minute, midpoint - extra),
          Math.max(minute, midpoint + extra),
        ],
        mode: moving ? "gps" : "gps-prior",
        source: moving ? source : `${source} position + route speed`,
        observedAt: last.minute,
        ageSeconds: Math.round((minute - last.minute) * 60),
        samples: recent,
      });
      if (index < route.stops.length) {
        midpoint += CONSTRAINTS.dwell + nominal[index];
        futureTravel += nominal[index];
      }
    }
  } else {
    let midpoint = estimatedStart,
      travel = 0;
    for (let index = 0; index <= route.stops.length; index++) {
      const extra =
        margin * Math.sqrt(index + 1) +
        travel * (CONSTRAINTS.travelEnvelope - 1);
      if (midpoint + extra >= minute)
        predictions.push({
          trip: trip.id,
          vehicle: trip.vehicle,
          route: route.id,
          index,
          stop: route.stops[index % route.stops.length],
          board: index < route.stops.length,
          midpoint,
          earliest: midpoint - extra,
          window: [
            Math.max(minute, midpoint - extra),
            Math.max(minute, midpoint + extra),
          ],
          mode: "timetable",
          source: samples.length
            ? "Timetable · GPS stale or insufficient"
            : "Timetable · awaiting GPS",
          observedAt: null,
          ageSeconds: null,
          samples: [],
        });
      if (index < route.stops.length) {
        midpoint += CONSTRAINTS.dwell + nominal[index];
        travel += nominal[index];
      }
    }
  }
  return predictions.filter(
    (p) => (p.latest ?? p.window[1]) >= minute && p.midpoint <= HORIZON,
  );
}

export function arrivalWindows(
  result,
  scenario,
  minute,
  calibration,
  seed = 2026,
  options = {},
) {
  const imported = scenario.gpsObservations?.length && !options.hypothetical;
  const tracks = imported ? null : simulatedGPS(result, minute, seed);
  const ready = new Map(),
    predictions = [];
  for (const trip of result.trips) {
    const route = ROUTES.find((r) => r.id === trip.route),
      cycle =
        route.edges.reduce((s, x) => s + x, 0) *
          scenario.factor[ROUTES.indexOf(route)] +
        route.stops.length * CONSTRAINTS.dwell;
    const start = Math.max(trip.planned, ready.get(trip.vehicle) ?? -Infinity);
    ready.set(trip.vehicle, start + cycle + CONSTRAINTS.recovery);
    let samples = [],
      source = "Simulated GPS";
    if (imported) {
      samples = scenario.gpsObservations
        .filter(
          (s) =>
            s.vehicle === trip.vehicle &&
            s.route === trip.route &&
            s.minute <= minute &&
            s.minute >= trip.planned &&
            (!s.trip || s.trip === trip.id),
        )
        .slice(-3);
      source = "Imported GPS";
    } else samples = tracks.find((t) => t.trip === trip.id)?.samples || [];
    predictions.push(
      ...predictTripArrivals(
        trip,
        route,
        scenario,
        minute,
        samples,
        calibration.marginMinutes ?? calibration.margin,
        source,
        start,
      ),
    );
  }
  return predictions.sort((a, b) => a.midpoint - b.midpoint);
}

export function nextStopGPS(
  result,
  scenario,
  minute,
  calibration,
  seed = 2026,
  options = {},
) {
  return arrivalWindows(result, scenario, minute, calibration, seed, options)
    .filter((p) => p.mode !== "timetable")
    .reduce((m, p) => {
      if (!m.has(p.vehicle)) m.set(p.vehicle, p);
      return m;
    }, new Map());
}
