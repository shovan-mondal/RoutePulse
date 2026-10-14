import {
  ROUTES,
  CONSTRAINTS,
  HORIZON,
  vehicleById,
  simulate,
  forecast,
} from "./engine.js";
import { arrivalWindows } from "./telemetry.js";

// Minimum spare seats over EVERY segment of the leg, after forecast riders have boarded.
// Inserting one additional passenger then preserves every forecast boarding cap.
export function checkLegCapacity(
  result,
  tripId,
  fromIndex,
  toIndex,
  accessible = false,
) {
  const trip = result.trips.find((t) => t.id === tripId);
  if (!trip || toIndex <= fromIndex)
    return { ok: false, minSeats: 0, reason: "Invalid trip leg" };
  const vehicle = vehicleById(trip.vehicle);
  if (accessible && !vehicle.accessible)
    return { ok: false, minSeats: 0, reason: "Vehicle is not accessible" };
  const records = result.records.filter(
    (r) => r.trip === tripId && r.index >= fromIndex && r.index < toIndex,
  );
  if (records.length !== toIndex - fromIndex)
    return {
      ok: false,
      minSeats: 0,
      reason: "Capacity forecast does not cover the complete leg",
    };
  const minSeats = Math.min(...records.map((r) => r.capacity - r.load));
  return {
    ok: minSeats >= 1,
    minSeats,
    reason:
      minSeats >= 1
        ? "Seat available on every segment"
        : "A segment is forecast full",
    vehicle: vehicle.id,
    segments: records.map((r) => ({
      stop: r.stop,
      index: r.index,
      load: r.load,
      capacity: r.capacity,
      seats: r.capacity - r.load,
    })),
  };
}

export function feasibleJourneys(
  origin,
  destination,
  minute,
  plan,
  scenario,
  options = {},
) {
  const accessible = options.accessible || false,
    deadline = options.deadline ?? HORIZON;
  const capacity =
    options.capacityResult ||
    simulate(plan, scenario, forecast(scenario, options.seed || 2026));
  const windows =
    options.windows ||
    arrivalWindows(
      capacity,
      scenario,
      minute,
      options.calibration,
      options.seed || 2026,
      { hypothetical: options.hypothetical },
    );
  const trips = new Map();
  for (const p of windows) {
    if (!trips.has(p.trip)) trips.set(p.trip, []);
    trips.get(p.trip).push(p);
  }
  const departures = windows.filter(
    (p) =>
      p.board && p.stop === origin && (p.earliest ?? p.window[0]) >= minute,
  );
  const choices = [],
    rejected = { capacity: 0, transfer: 0, deadline: 0, accessibility: 0 };
  const leg = (departure, arrival) => ({
    trip: departure.trip,
    vehicle: departure.vehicle,
    route: departure.route,
    origin: departure.stop,
    destination: arrival.stop,
    depart: departure.midpoint,
    arrive: arrival.midpoint,
    departureWindow: departure.window,
    arrivalWindow: arrival.window,
    fromIndex: departure.index,
    toIndex: arrival.index,
    source: departure.source,
    capacity: checkLegCapacity(
      capacity,
      departure.trip,
      departure.index,
      arrival.index,
      accessible,
    ),
  });
  const consider = (legs, transfer = null) => {
    if (legs.some((l) => !l.capacity.ok)) {
      rejected[
        legs.some((l) => accessible && !vehicleById(l.vehicle).accessible)
          ? "accessibility"
          : "capacity"
      ]++;
      return;
    }
    const first = legs[0],
      last = legs.at(-1);
    if (last.arrivalWindow[1] > deadline) {
      rejected.deadline++;
      return;
    }
    if (
      legs.length === 2 &&
      legs[1].departureWindow[0] - legs[0].arrivalWindow[1] <
        CONSTRAINTS.transferBuffer
    ) {
      rejected.transfer++;
      return;
    }
    choices.push({
      routes: legs.map((l) => l.route),
      vehicle: legs.map((l) => l.vehicle).join(" → "),
      depart: first.depart,
      arrive: last.arrive,
      arrivalWindow: last.arrivalWindow,
      departureWindow: first.departureWindow,
      transfer,
      transferWait: legs.length === 2 ? legs[1].depart - legs[0].arrive : null,
      guaranteedTransferBuffer:
        legs.length === 2
          ? legs[1].departureWindow[0] - legs[0].arrivalWindow[1]
          : null,
      minSeats: Math.min(...legs.map((l) => l.capacity.minSeats)),
      legs,
    });
  };
  for (const dep of departures) {
    const visits = (trips.get(dep.trip) || []).filter(
      (p) => p.index > dep.index,
    );
    for (const arr of visits.filter((p) => p.stop === destination))
      consider([leg(dep, arr)]);
    for (const middle of visits.filter(
      (p) => p.stop !== destination && p.stop !== origin,
    )) {
      for (const second of windows.filter(
        (p) =>
          p.board &&
          p.stop === middle.stop &&
          p.route !== dep.route &&
          p.window[1] >= middle.window[0] + CONSTRAINTS.transferBuffer,
      )) {
        for (const last of (trips.get(second.trip) || []).filter(
          (p) => p.index > second.index && p.stop === destination,
        ))
          consider([leg(dep, middle), leg(second, last)], middle.stop);
      }
    }
  }
  choices.sort(
    (a, b) =>
      a.arrivalWindow[1] - b.arrivalWindow[1] ||
      a.arrive - b.arrive ||
      b.minSeats - a.minSeats ||
      a.depart - b.depart,
  );
  return {
    choices: choices.slice(0, options.limit ?? 3),
    rejected,
    checked:
      choices.length + Object.values(rejected).reduce((s, n) => s + n, 0),
    capacitySource: "Independent demand forecast",
    transferBuffer: CONSTRAINTS.transferBuffer,
  };
}
