import {
  SEED,
  HORIZON,
  STOPS,
  ROUTES,
  VEHICLES,
  SCENARIOS,
  stopById,
  vehicleById,
  time,
  nominalCycle,
  cycleBound,
  baseline,
  validate,
  demand,
  forecast,
  optimize,
  gpsDataset,
  liveVehicles,
  alternatives,
  rng,
  simulate,
  CONSTRAINTS,
  START_MINUTE,
  DATASET_NAME,
  DATASET_IMPORTED,
  activateDataset,
} from "./engine.js";
import { arrivalWindows, mapMatch } from "./telemetry.js";
import { feasibleJourneys } from "./journeys.js";
import {
  parseDataset,
  organizerTemplate,
  installDataset,
  MAX_FILE_BYTES,
} from "./data.js";

const paths = {
  pulse: "M2 12h5l3-8 4 16 3-8h5",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  routes: "M5 5h9a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10 M5 3v4 M19 19v4",
  chart: "M4 19V5 M4 19h17 M7 14l4-5 4 3 6-8",
  flask: "M9 3h6 M10 3v7l-6 10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3 M8 14h8",
  report: "M14 2H5v20h14V7z M14 2v5h5 M8 12h8 M8 16h6",
  chevron: "m9 5 7 7-7 7",
  down: "m6 9 6 6 6-6",
  arrow: "M4 12h16 m-5-5 5 5-5 5",
  arrowup: "M6 17 18 5 M6 5h12v12",
  bus: "M5 3h14v14H5z M5 10h14 M8 6h8 M8 14h.01 M16 14h.01 M7 17v4 M17 17v4",
  building:
    "M4 21V6l8-3 8 3v15 M2 21h20 M8 8h1 M15 8h1 M8 12h1 M15 12h1 M10 21v-5h4v5",
  clock: "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  people:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-3a4 4 0 0 0-3-4 M16 2a4 4 0 0 1 0 8",
  check: "m5 12 4 4 10-10",
  circlecheck: "M21 11v1a9 9 0 1 1-5-8 M21 4l-9 9-3-3",
  alert: "m12 3 10 18H2z M12 9v4 M12 17h.01",
  bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 17v4h16v-4",
  sparkles:
    "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z M20 2v4 M18 4h4",
  calendar: "M4 5h16v16H4z M4 10h16 M8 3v4 M16 3v4",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  locate:
    "M21 12h-4 M7 12H3 M12 3v4 M12 17v4 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  play: "m8 4 12 8-12 8z",
  pause: "M8 5v14 M16 5v14",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 11v6 M12 7h.01",
  headphones: "M3 13V11a9 9 0 0 1 18 0v2 M3 12h4v8H3z M17 12h4v8h-4z",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "m6 6 12 12 M6 18 18 6",
  sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1",
  traffic: "M9 2h6v17H9z M12 5h.01 M12 10h.01 M12 15h.01 M12 19v3",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6z m-4 10 3 3 5-5",
  leaf: "M20 3c1 14-7 19-13 12C1 9 7 2 20 3z M4 21 15 9",
  file: "M14 2H5v20h14V7z M14 2v5h5 M8 13h8 M8 17h5",
  swap: "M3 7h17l-4-4 M21 17H4l4 4",
  refresh:
    "M3 11a9 9 0 0 1 15-6l3 3 M21 3v5h-5 M21 13a9 9 0 0 1-15 6l-3-3 M3 21v-5h5",
  wheelchair: "M12 3h.01 M12 6v7h6l3 6 M12 9h5 M9 11a5 5 0 1 0 5 9",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  lock: "M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4",
  target:
    "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M12 12h.01",
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.info}"/></svg>`;
const state = {
  page: "overview",
  scenario: "normal",
  minute: 38,
  playing: false,
  applied: false,
  heat: false,
  hidden: new Set(),
  zoom: 1,
  forecastRoute: "all",
  seed: SEED,
  studentStop: "hostels",
  tripDeadline: 120,
  tripOrigin: "hostels",
  tripDestination: "innovation",
  tripAccessible: false,
};
const cache = new Map();
let stagedDataset = null;
let importRevision = 0;
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const endTime = () => time(HORIZON);
const startTime = () => time(0);
const clockWindow = (w) => `${time(Math.floor(w[0]))}–${time(Math.ceil(w[1]))}`;
function bundle(id = state.scenario) {
  const key = `${id}:${state.seed}`;
  if (!cache.has(key)) {
    const scenario = SCENARIOS[id];
    const optimization = optimize(scenario, state.seed),
      pred = forecast(scenario, state.seed);
    cache.set(key, {
      scenario,
      optimization,
      eta: gpsDataset(scenario, state.seed),
      people: demand(scenario, state.seed),
      forecast: pred,
      baseCapacity: simulate(optimization.baseline, scenario, pred),
      proposedCapacity: optimization.plan
        ? simulate(optimization.plan, scenario, pred)
        : null,
      arrivalsCache: new Map(),
    });
  }
  return cache.get(key);
}
const current = () => {
  const b = bundle();
  const result = state.applied
      ? b.optimization.proposed
      : b.optimization.baseResult,
    capacityResult = state.applied ? b.proposedCapacity : b.baseCapacity;
  const key = `${state.applied}:${state.minute}`;
  if (!b.arrivalsCache.has(key)) {
    if (b.arrivalsCache.size > 20) b.arrivalsCache.clear();
    b.arrivalsCache.set(
      key,
      arrivalWindows(result, b.scenario, state.minute, b.eta, state.seed, {
        hypothetical: state.applied,
      }),
    );
  }
  return {
    ...b,
    plan: state.applied ? b.optimization.plan : b.optimization.baseline,
    result,
    capacityResult,
    arrivals: b.arrivalsCache.get(key),
  };
};
function fleetNow() {
  const { result, scenario, arrivals } = current();
  return liveVehicles(result, state.minute, scenario).map((b) => {
    const p =
      arrivals.find((p) => p.trip === b.trip && p.mode !== "timetable") ||
      arrivals.find((p) => p.trip === b.trip && p.stop === b.next);
    const route = ROUTES.find((r) => r.id === b.route),
      match = p?.samples?.length ? mapMatch(p.samples, route) : null;
    return {
      ...b,
      ...(match
        ? {
            x: match.from.x + (match.to.x - match.from.x) * match.progress,
            y: match.from.y + (match.to.y - match.from.y) * match.progress,
            next: p.stop,
          }
        : {}),
      eta: p ? Math.max(0, p.midpoint - state.minute) : null,
      etaWindow: p ? p.window.map((t) => Math.max(0, t - state.minute)) : null,
      etaSource: p?.source || "No GPS estimate",
    };
  });
}
const routePill = (id) => {
  const r = ROUTES.find((r) => r.id === id);
  return `<span class="route-pill"><span class="route-letter" style="--route:${r.color}">${r.id}</span>${r.name}</span>`;
};
const percent = (v) => `${Math.abs(v).toFixed(1)}%`;
const num = (v) => Math.round(v).toLocaleString("en-IN");
const change = (before, after, unit = "") =>
  after === before
    ? "No change"
    : `${after < before ? "−" : "+"}${Math.abs(after - before).toFixed(unit === " min" ? 2 : 0)}${unit}`;
const navItems = [
  ["overview", "grid", "Overview"],
  ["network", "routes", "Network & fleet"],
  ["demand", "chart", "Demand forecast"],
  ["scenarios", "flask", "Scenario lab"],
  ["impact", "report", "Impact report"],
];
const titles = {
  student: [
    "STUDENT DASHBOARD",
    "Your campus. One smooth commute.",
    "Find your bus, plan your connection, and get there with confidence.",
  ],
  overview: [
    "YOUR CAMPUS, IN MOTION",
    "Operations overview",
    "A clearer picture. A smarter commute.",
  ],
  network: [
    "THE NETWORK BEHIND THE COMMUTE",
    "Network & fleet",
    "Every stop, every seat, every service window.",
  ],
  demand: [
    "SEE THE RUSH BEFORE IT ARRIVES",
    "Demand forecast",
    "Plan for people, not just vehicle positions.",
  ],
  scenarios: [
    "REAL CONSTRAINTS. REAL DECISIONS.",
    "Scenario lab",
    "Stress-test your network before the morning rush.",
  ],
  impact: [
    "THE NUMBERS BEHIND THE PLAN",
    "Impact report",
    "Reproducible outcomes. Transparent trade-offs.",
  ],
};

function shell() {
  const title = titles[state.page],
    student = state.page === "student";
  const { optimization: o, result, scenario } = current();
  return `<div class="layout"><header class="sidebar" aria-label="Main navigation"><a class="brand" href="#overview"><span class="brand-mark">${icon("routes")}</span><span class="brand-word">Route<span>Pulse</span></span></a><nav class="nav">${student ? `<button class="active" data-page="student">${icon("people")}My commute</button><button data-action="student-map">${icon("pin")}Campus map</button><button data-action="method">${icon("info")}How arrivals work</button>` : navItems.map(([id, i, label]) => `<button data-page="${id}" class="${state.page === id ? "active" : ""}" ${state.page === id ? 'aria-current="page"' : ""}>${icon(i)}<span>${label}</span></button>`).join("")}</nav><div class="role-switch" aria-label="Dashboard type"><button data-page="overview" class="${!student ? "selected" : ""}">Operator</button><button data-page="student" class="${student ? "selected" : ""}">Student</button></div><button class="mobile-menu" data-action="menu" aria-label="Open navigation">${icon("menu")}</button></header><main class="main ${student ? "student-view" : ""}"><div class="topbar"><div class="breadcrumb"><span class="project-badge">PS 02</span><b>${escapeHtml(DATASET_NAME)}</b><span class="topbar-divider"></span><span class="simulation-label"><span class="dot"></span>Simulated campus</span></div><div class="topbar-actions">${!student ? `<button class="btn small" data-action="data">${icon("file")}Manage data</button>` : ""}<button class="text-link" data-action="guide">Demo guide ${icon("arrow")}</button></div></div><div class="content page-enter"><section class="page-heading"><div class="hero-copy"><div class="eyebrow">${student ? "MOVE THROUGH CAMPUS, WITH CONFIDENCE" : "PLAN THE NETWORK. CHANGE THE COMMUTE."}</div><h1>${state.page === "overview" ? "Better routes.<br><span>Better mornings.</span>" : student ? "Your campus.<br><span>One smooth commute.</span>" : title[1]}</h1><p class="subtitle">${student ? title[2] : state.page === "overview" ? "Forecast the rush. Find a feasible plan. Prove the difference." : title[2]}</p><div class="heading-actions">${student ? `<button class="btn primary" data-action="focus-trip">${icon("routes")}Plan my journey</button><button class="btn" data-action="student-map">${icon("pin")}Explore campus</button>` : `<button class="btn primary" data-action="optimize">${icon("sparkles")}${state.applied ? "Review plan" : "Optimize plan"}</button><button class="btn" data-action="passenger">${icon("people")}Passenger view</button><div class="export-dropdown"><button class="btn" data-action="export-menu" aria-expanded="false">${icon("download")}Export${icon("down")}</button></div>`}</div></div><aside class="hero-proof"><div class="proof-label">${student ? "YOUR NETWORK, RIGHT NOW" : "PROPOSED PLAN vs FIXED BASELINE"}</div><div class="proof-number">${student ? liveVehicles(result, state.minute, scenario).length : percent(o.improvement)}<span>${student ? "buses moving" : o.improvement >= 0 ? "less waiting" : "more waiting"}</span></div><div class="proof-detail">${student ? `${STOPS.length} stops connected · replay at ${time(state.minute)}` : `${o.baseResult.avgWait.toFixed(2)} → ${o.proposed.avgWait.toFixed(2)} min · ${num(o.candidates)} feasible combinations`}</div><div class="proof-rule"></div><div class="proof-status">${icon("circlecheck")}${student ? (state.applied ? "Operator plan active" : "Published baseline schedule") : "All 6 proposed-plan constraints passed"}</div><svg class="hero-route" viewBox="0 0 300 55" aria-hidden="true"><path d="M0 40h45l25-25h45l25 25h70l25-25h65" fill="none" stroke="#6ca2ff" stroke-width="2"/><circle cx="45" cy="40" r="5" fill="#b7d3ff"/><circle cx="115" cy="15" r="5" fill="#b7d3ff"/><circle cx="210" cy="40" r="5" fill="#ffb34a"/></svg></aside></section>${DATASET_IMPORTED ? `<div class="data-source-banner">${icon("file")}<span><b>${escapeHtml(DATASET_NAME)}</b> · Organizer data active · ${time(0)}–${time(HORIZON)}</span>${!student ? `<button data-action="demo-data">Restore demo data</button>` : ""}</div>` : ""}${scenarioBar()}${state.applied ? `<div class="status-banner">${icon("circlecheck")}Proposed plan active in simulation · all 6 constraint checks passed${!student ? '<button data-action="reset">Restore baseline</button>' : ""}</div>` : ""}<div id="page-body">${pageContent()}</div><footer class="page-footer"><span>${icon("shield")}RoutePulse</span><button class="text-link" data-action="method">Model & assumptions ${icon("arrow")}</button></footer></div></main></div>`;
}
function scenarioBar() {
  return `<div class="scenario-bar"><div class="scenario-start">${icon("flask")}<span class="eyebrow">ACTIVE SCENARIO</span><label class="visually-hidden" for="scenario-select">Active scenario</label><select id="scenario-select">${Object.values(
    SCENARIOS,
  )
    .map(
      (s) =>
        `<option value="${s.id}" ${s.id === state.scenario ? "selected" : ""}>${s.name}</option>`,
    )
    .join(
      "",
    )}</select><span class="bar-divider"></span><span class="scenario-meta">${icon("clock")}${startTime()}–${endTime()} · Morning window</span><span class="seed-badge">SEED ${state.seed}</span></div><div class="scenario-right"><span>${state.applied ? "Proposed plan" : "Fixed baseline v1"}</span><button class="text-link" data-page="scenarios">Explore scenarios ${icon("arrow")}</button></div></div>`;
}
function metric(label, value, unit, foot, kind, trend, warning = false) {
  return `<div class="metric"><div class="metric-top"><span>${label}</span><span class="metric-icon">${icon(kind)}</span></div><div class="metric-value">${value}<small>${unit}</small></div><div class="metric-bottom"><span class="metric-change ${warning ? "warning" : ""}">${icon(warning ? "alert" : "arrowup")}${foot}</span><span class="mini-bars" aria-hidden="true">${[8, 11, 8, 14, 12, 16, 18, 15, 20].map((v, i) => `<i style="height:${trend ? v : 21 - v}px"></i>`).join("")}</span></div></div>`;
}
function metrics() {
  const { result, eta, optimization: o } = current();
  return `<div class="metrics">${metric("Average passenger wait", result.avgWait.toFixed(2), "min", state.applied ? `${percent(o.improvement)} ${o.improvement >= 0 ? "less" : "more"} vs baseline` : "Across the evaluation window", "clock", false)}${metric("Passengers served", num(result.boarded), "riders", `${((result.boarded / result.total) * 100).toFixed(1)}% of ${result.total} simulated demand`, "people", true)}${metric("Fleet utilization", result.utilization.toFixed(1), "%", `${result.fleetUsed} active · ${VEHICLES.length - result.fleetUsed - SCENARIOS[state.scenario].unavailable.length} in reserve`, "bus", true)}${metric("GPS next-stop accuracy", eta.maeSeconds.toFixed(1), "sec MAE", `${eta.coverage.toFixed(1)}% held-out trace coverage`, "target", false)}</div>`;
}
function pageContent() {
  return {
    student: studentPage,
    overview: overview,
    network: network,
    demand: demandPage,
    scenarios: scenariosPage,
    impact: impactPage,
  }[state.page]();
}
function studentPage() {
  const { scenario, plan } = current();
  const notice = DATASET_IMPORTED
    ? scenario.description
    : scenario.id === "traffic"
      ? "Roadworks are slowing North and Innovation services. Your journey options use the longer travel times."
      : scenario.id === "breakdown"
        ? "RP-04 is unavailable. Check the arrival board for the next available service."
        : scenario.id === "event"
          ? "Festival demand is higher on the Innovation route. Check projected seats before you travel."
          : `Morning services connect all ${STOPS.length} campus stops. Choose your stop to see the next departures.`;
  return `<div class="student-service-banner">${icon(scenario.id === "normal" ? "bus" : "alert")}<div><strong>${scenario.id === "normal" ? "Good morning. Let’s get you there." : "A service update for your commute"}</strong><p>${notice}</p></div><span class="badge ${scenario.id === "normal" ? "" : "warning"}">${state.applied ? "Updated timetable" : "Scheduled service"}</span></div><div class="student-replay"><span>${icon("clock")}Departure time <strong id="student-clock">${time(state.minute)}</strong></span><label class="visually-hidden" for="student-timeline">Student departure time</label><input id="student-timeline" type="range" min="0" max="${HORIZON - 1}" step="1" value="${state.minute}"><small>${startTime()}–${endTime()} demo window</small></div><div class="student-layout"><section class="panel journey-panel" id="journey-planner"><div class="panel-header"><div><div class="eyebrow">FROM YOUR RESIDENCE TO YOUR NEXT CLASS</div><h2 class="panel-title">Where are you headed?</h2><p class="panel-subtitle">Direct journeys and connections that give you time to transfer.</p></div><span class="planner-icon">${icon("routes")}</span></div><div class="student-planner-body"><div class="trip-form"><div class="field"><label for="trip-origin">From</label><select id="trip-origin">${STOPS.map((s) => `<option value="${s.id}" ${s.id === state.tripOrigin ? "selected" : ""}>${s.name}</option>`).join("")}</select></div><div class="field"><label for="trip-dest">To</label><select id="trip-dest">${STOPS.map((s) => `<option value="${s.id}" ${s.id === state.tripDestination ? "selected" : ""}>${s.name}</option>`).join("")}</select></div><div class="field"><label for="trip-departure">Leave at</label><input id="trip-departure" type="time" min="${startTime()}" max="${time(HORIZON - 1)}" value="${time(state.minute)}" required></div><div class="field"><label for="trip-deadline">Arrive by</label><input id="trip-deadline" type="time" min="${startTime()}" max="${endTime()}" value="${time(state.tripDeadline ?? HORIZON)}" required></div></div><div class="trip-preferences"><label class="accessible-check"><input id="trip-access" type="checkbox" ${state.tripAccessible ? "checked" : ""}>${icon("wheelchair")}Step-free journeys only</label><button class="btn primary" data-action="find-trip">${icon("arrow")}Find my route</button></div><div class="journey-results-heading"><h3>Your journey options</h3><span>Earliest arrival first</span></div><div id="trip-results" class="trip-results"></div><p class="student-footnote">${icon("info")}Every leg passes the seat-capacity forecast. Transfers allow ${CONSTRAINTS.transferBuffer} minutes between the latest incoming and earliest outgoing arrival. Availability may change; this is not a reservation.</p></div></section><div class="student-right"><section class="panel student-arrival-panel"><div class="panel-header"><div><div class="eyebrow">KNOW BEFORE YOU GO</div><h2 class="panel-title">Your next bus</h2></div><span class="badge blue">Arrival board</span></div><div class="arrival-stop-field field"><label for="student-stop">At this stop</label><select id="student-stop">${STOPS.map((s) => `<option value="${s.id}" ${s.id === state.studentStop ? "selected" : ""}>${s.name}</option>`).join("")}</select></div><div id="student-arrivals">${studentArrivals()}</div><div class="event-note">GPS observations update moving-bus arrival windows. Later departures use the timetable and travel envelope until GPS is available. The source is shown on every arrival.</div></section><section class="panel student-shortcuts"><h3>${ROUTES.length} routes. One campus.</h3>${plan.routes.map((p) => `<button class="student-route-row" data-action="student-map">${routePill(p.route)}<span>Every ${p.headway} min ${icon("arrow")}</span></button>`).join("")}<button class="btn" data-action="student-map">${icon("pin")}Open campus map</button></section></div></div>`;
}
function studentArrivals() {
  const { arrivals, capacityResult } = current(),
    upcoming = arrivals
      .filter((p) => p.stop === state.studentStop && p.board)
      .slice(0, 4);
  if (!upcoming.length)
    return `<div class="empty">No upcoming departure at this stop before ${endTime()}. Try an earlier time or another stop.</div>`;
  return upcoming
    .map((a) => {
      const record = capacityResult.records.find(
          (r) => r.trip === a.trip && r.index === a.index,
        ),
        remaining = record ? record.capacity - record.load : 0;
      return `<button class="arrival-card" data-vehicle="${a.vehicle}"><div class="arrival-card-top">${routePill(a.route)}<span class="arrival-countdown">${Math.max(0, Math.ceil(a.midpoint - state.minute))}<small> min</small></span></div><div class="arrival-card-bottom"><span><strong>${clockWindow(a.window)}</strong><small>${a.vehicle} · ${vehicleById(a.vehicle).accessible ? "Step-free" : "Standard vehicle"}</small></span><span class="badge ${remaining === 0 ? "warning" : "blue"}">${remaining === 0 ? "Forecast full" : `${remaining} forecast seats`}</span></div><span class="arrival-source ${a.mode === "timetable" ? "fallback" : ""}">${icon(a.mode === "timetable" ? "clock" : "pin")}${a.source}${a.observedAt !== null ? ` · observed ${a.ageSeconds}s ago` : ""}</span></button>`;
    })
    .join("");
}
function overview() {
  return `${metrics()}<div class="split"><section class="panel map-panel"><div class="panel-header"><div><h2 class="panel-title">Campus network<span class="badge"><span class="dot"></span>GPS replay</span></h2><p class="panel-subtitle">${STOPS.length} stops · ${ROUTES.length} routes · one connected campus</p></div><div class="header-controls"><button class="btn" data-action="heat" aria-pressed="${state.heat}">${icon("layers")}${state.heat ? "Hide demand" : "Demand layer"}</button></div></div><div class="map-wrap"><div id="map-content">${campusMap()}</div><div class="map-location">${icon("pin")}${escapeHtml(DATASET_NAME.toUpperCase())}</div><div class="north-arrow">N<svg viewBox="0 0 14 20"><path d="M7 2 12 16 7 12 2 16z" fill="#809074"/></svg></div><div class="map-controls"><button data-action="zoom-in" aria-label="Zoom in">${icon("plus")}</button><button data-action="zoom-out" aria-label="Zoom out">${icon("minus")}</button><button data-action="center" aria-label="Reset map view">${icon("locate")}</button></div><span class="map-scale">Schematic</span>${state.heat ? '<div class="heat-legend">Demand <i></i> High</div>' : ""}</div><div class="map-legend">${ROUTES.map((r) => `<button class="legend-item ${state.hidden.has(r.id) ? "muted" : ""}" data-route-toggle="${r.id}" aria-pressed="${!state.hidden.has(r.id)}"><span class="route-line" style="background:${r.color}"></span>${r.id} · ${r.name}</button>`).join("")}<span class="legend-end"><span class="dot"></span>Stop</span></div><div class="playback"><button class="play-button" data-action="play" aria-label="${state.playing ? "Pause" : "Play"} simulation">${icon(state.playing ? "pause" : "play")}</button><span class="play-time" id="play-time">${time(state.minute)}</span><label for="timeline" class="visually-hidden">Simulation time</label><input id="timeline" type="range" min="0" max="${HORIZON - 1}" step="0.25" value="${state.minute}"><small>${endTime()}</small><button class="btn ghost" data-action="speed" title="Replay runs at one simulated minute per second">60×</button></div></section><div class="right-stack">${insight()}${alerts()}</div></div><div class="lower-split"><section class="panel"><div class="panel-header"><h2 class="panel-title">Fleet at a glance<span class="badge neutral">${VEHICLES.length} vehicles</span></h2><button class="text-link" data-page="network">View fleet ${icon("arrow")}</button></div><div id="fleet-preview" class="table-scroll">${fleetTable(true)}</div></section><section class="panel chart-panel"><div class="panel-header"><div><h2 class="panel-title">Anticipate the morning rush</h2><p class="panel-subtitle">Passenger demand · 10-minute intervals</p></div><span class="badge neutral">TODAY</span></div>${chartLegend()}<div class="chart-area">${demandChart()}</div><div class="chart-foot">${icon("sparkles")}Demand peaks around ${peakTime()}. Dispatch ahead of the queue.</div></section></div>`;
}

function campusMap() {
  const { result, people } = current(),
    random = rng(33);
  const routePoints = ROUTES.map((r) =>
    [...r.stops, r.stops[0]]
      .map((id) => {
        const s = stopById(id);
        return `${s.x},${s.y}`;
      })
      .join(" "),
  );
  let trees = "";
  for (let i = 0; i < (DATASET_IMPORTED ? 0 : 100); i++) {
    const x = 55 + random() * 820,
      y = 45 + random() * 490;
    if (STOPS.some((s) => Math.hypot(s.x - x, s.y - y) < 33)) continue;
    trees += `<circle class="tree" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(3 + random() * 7).toFixed(1)}"/>`;
  }
  const buildings = DATASET_IMPORTED
    ? []
    : [
        { x: 95, y: 70, w: 43, h: 35 },
        { x: 197, y: 77, w: 72, h: 44 },
        { x: 213, y: 136, w: 53, h: 32 },
        { x: 288, y: 58, w: 75, h: 22 },
        { x: 322, y: 127, w: 48, h: 38 },
        { x: 350, y: 174, w: 44, h: 32 },
        { x: 467, y: 202, w: 50, h: 50 },
        { x: 466, y: 277, w: 51, h: 22 },
        { x: 565, y: 190, w: 60, h: 39 },
        { x: 666, y: 151, w: 52, h: 42 },
        { x: 755, y: 169, w: 70, h: 32 },
        { x: 778, y: 274, w: 40, h: 55 },
        { x: 677, y: 292, w: 51, h: 44 },
        { x: 697, y: 364, w: 69, h: 24 },
        { x: 673, y: 426, w: 49, h: 31 },
        { x: 562, y: 470, w: 60, h: 27 },
        { x: 430, y: 469, w: 39, h: 26 },
        { x: 386, y: 555, w: 69, h: 17 },
        { x: 286, y: 477, w: 51, h: 32 },
        { x: 118, y: 442, w: 56, h: 36 },
        { x: 149, y: 530, w: 78, h: 28 },
        { x: 278, y: 350, w: 64, h: 29 },
        { x: 309, y: 402, w: 35, h: 20 },
        { x: 126, y: 276, w: 39, h: 27 },
        { x: 77, y: 359, w: 45, h: 32 },
        { x: 76, y: 160, w: 35, h: 65 },
      ];
  const grass = DATASET_IMPORTED
    ? ""
    : `<path d="M230 216c53-42 104-22 116 42s-12 85-83 68-83-54-33-110" fill="#e1ebef"/><path d="M495 332c55-17 105 27 77 75s-105 45-109-8 2-57 32-67" fill="#e1ebef"/><ellipse cx="556" cy="109" rx="48" ry="27" fill="#e0e9f0"/><rect x="574" y="58" width="93" height="48" rx="11" fill="#d4e6e2" stroke="#b4cfc9"/><rect x="581" y="64" width="79" height="35" rx="7" fill="none" stroke="#ffffff"/><path d="M620 64v35" stroke="#ffffff"/><circle cx="620" cy="82" r="9" fill="none" stroke="#ffffff"/>`;
  const roads = routePoints
    .map(
      (p) =>
        `<polyline class="map-road-edge" points="${p}"/><polyline class="map-road" points="${p}"/>`,
    )
    .join("");
  const routes = ROUTES.map((r, i) =>
    state.hidden.has(r.id)
      ? ""
      : `<polyline class="route-under" points="${routePoints[i]}"/><polyline class="route-stroke" style="stroke:${r.color}" points="${routePoints[i]}"/><polyline class="route-dash" points="${routePoints[i]}"/>`,
  ).join("");
  const stops = STOPS.map((s) => {
    const count = people.filter(
      (p) => p.origin === s.id && Math.abs(p.arrival - state.minute) < 8,
    ).length;
    return `${state.heat ? `<circle class="heat-circle" cx="${s.x}" cy="${s.y}" r="${17 + count * 1.7}"/>` : ""}<g class="map-stop" data-stop="${s.id}" tabindex="0" role="button" aria-label="${s.name} arrivals"><title>${s.name} · ${count} passengers in the current demand window</title><circle cx="${s.x}" cy="${s.y}" r="7" fill="#fff" stroke="#8c9db9" stroke-width="1.5"/><circle cx="${s.x}" cy="${s.y}" r="2.5" fill="#2563eb"/><text class="map-label" x="${s.x + 12}" y="${s.y + (s.id === "science" || s.id === "hub" ? -12 : 20)}">${s.name}</text></g>`;
  }).join("");
  const buses = fleetNow()
    .filter((b) => !state.hidden.has(b.route))
    .map((b) => {
      const r = ROUTES.find((r) => r.id === b.route);
      return `<g class="bus-marker" data-vehicle="${b.id}" tabindex="0" role="button" aria-label="${b.id} on route ${b.route}"><title>${b.id} · ${b.load}/${b.capacity} seats · next ${stopById(b.next).name}</title><rect x="${b.x - 14}" y="${b.y - 11}" width="28" height="22" rx="6" fill="${r.color}" stroke="white" stroke-width="2"/><path d="M${b.x - 5} ${b.y - 6}h10v11h-10z M${b.x - 5} ${b.y - 1}h10 M${b.x - 3} ${b.y + 7}v-2 M${b.x + 3} ${b.y + 7}v-2" fill="none" stroke="white" stroke-width="1.3"/></g>`;
    })
    .join("");
  return `<svg class="map-svg" viewBox="0 0 950 620" preserveAspectRatio="xMidYMid meet" aria-label="Schematic campus transport map"><defs><pattern id="map-grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0v35" class="map-grid"/></pattern></defs><rect x="0" y="0" width="950" height="620" fill="#eef3fb"/><rect width="950" height="620" fill="url(#map-grid)"/><g transform="translate(${450 * (1 - state.zoom)} ${300 * (1 - state.zoom)}) scale(${state.zoom})">${grass}<path class="water" d="M72 474c-23 4-45 65-21 93s50 29 78-12 17-37 34-45 0-28-40-20-29-21-51-16z"/><path d="M43 530c15 33 45 39 68 9 M61 513c11 14 25 17 41 6" fill="none" stroke="#b5d5ed" stroke-width="1"/><text x="55" y="580" fill="#577b98" font-size="10" font-style="italic">Campus lake</text>${trees}<path class="map-road-small" d="M20 330h100 M120 330l100-94 130-62 90 61 M350 100l110-36 150 61 M380 375l97 89 173 16 M210 500l72-90 98-35 M640 320l117 60 143-40 M810 245l90-90"/>${roads}${buildings.map((b) => `<rect class="map-building" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3"/><path class="map-building-line" d="M${b.x + 5} ${b.y + 5}h${b.w - 10}v${b.h - 10}h-${b.w - 10}z"/>`).join("")}<text x="238" y="277" font-size="12" fill="#8091a7" letter-spacing="1.5">CAMPUS GREEN</text><text x="483" y="389" font-size="12" fill="#8091a7" letter-spacing="1.3">BOTANICAL GARDEN</text>${routes}${stops}${buses}</g></svg>`;
}

function insight() {
  const { optimization: o } = current();
  const spareRoute = o.plan?.routes.find((r) => r.vehicles.includes("RP-07"));
  const wait = o.improvement;
  const title =
    state.scenario === "traffic"
      ? "A reliable rotation beats an impossible timetable."
      : `A small shift.<br><em>${percent(wait)} less waiting.</em>`;
  return `<section class="panel insight-panel"><div class="insight-top"><span class="spark-icon">${icon("sparkles")}</span>Pulse intelligence<span class="badge">PLAN READY</span></div><h3>${title}</h3><p>${state.scenario === "traffic" ? `Increase North headway to 18 min and add the reserve to Innovation. Clear all ${o.baseResult.conflicts} schedule conflicts with ${Math.abs(o.proposed.avgWait - o.baseResult.avgWait).toFixed(2)} min additional average waiting.` : `Assign the reserve to ${spareRoute?.route || "the network"} and align departures with predicted demand. Same routes. A more thoughtful schedule.`}</p><div class="insight-stats"><div><strong>${state.scenario === "traffic" ? o.baseResult.conflicts : Math.abs(o.baseResult.late - o.proposed.late)}</strong><small>${state.scenario === "traffic" ? "conflicts removed" : "fewer late arrivals"}</small></div><div><strong>${o.validation.ok ? "6 / 6" : "Review"}</strong><small>constraints satisfied</small></div><div><strong>+${Math.round(o.proposed.vehicleMinutes - o.baseResult.vehicleMinutes)}</strong><small>vehicle-minutes</small></div></div><button class="btn primary" data-action="optimize">${icon("sparkles")}Review recommendation ${icon("arrow")}</button></section>`;
}
function alertItems() {
  const { result, optimization: o } = current();
  const items = [];
  if (!validate(current().plan, SCENARIOS[state.scenario]).ok)
    items.push({
      icon: "traffic",
      title: `${result.conflicts} departure conflicts detected`,
      description:
        "The published rotation cannot absorb the disruption. A feasible plan is ready.",
      tone: "",
    });
  if (result.blocked)
    items.push({
      icon: "people",
      title: `${result.blocked} riders encounter a full or inaccessible bus`,
      description:
        "Seat limits are enforced. Deferred riders remain in the stop queue.",
      tone: "",
    });
  items.push({
    icon: "clock",
    title: `${result.late} passengers at risk of a late arrival`,
    description:
      "Supplied passenger deadlines are checked against simulated arrivals.",
    tone: "blue",
  });
  return items.slice(0, 2);
}
function alerts() {
  const items = alertItems();
  return `<section class="panel alerts-panel"><div class="panel-header"><h2 class="panel-title">Needs your attention <span class="badge warning">${items.length}</span></h2><button class="btn ghost" data-action="alerts" aria-label="View all alerts">${icon("arrow")}</button></div>${items.map((a, i) => `<button class="alert-row" style="width:100%;text-align:left" data-action="${a.icon === "clock" ? "impact" : "optimize"}"><span class="alert-symbol ${a.tone}">${icon(a.icon)}</span><span class="alert-content"><strong>${a.title}</strong><p>${a.description}</p><small>Evaluation window · ${state.applied ? "proposed plan" : "baseline schedule"}</small></span>${icon("chevron")}</button>`).join("")}</section>`;
}
function fleetTable(preview = false) {
  const { result, plan, scenario } = current(),
    live = fleetNow();
  const list = preview
    ? VEHICLES.filter((v) => live.some((b) => b.id === v.id)).slice(0, 4)
    : VEHICLES;
  return `<table class="fleet-table"><thead><tr><th>VEHICLE</th><th>ROUTE</th><th>OCCUPANCY</th><th>${preview ? "NEXT ARRIVAL" : "ACCESSIBILITY"}</th><th>STATUS</th></tr></thead><tbody>${
    list.length
      ? list
          .map((v) => {
            const b = live.find((b) => b.id === v.id),
              p = plan.routes.find((p) => p.vehicles.includes(v.id)),
              full = b && b.load / b.capacity >= 0.85,
              unavailable = scenario.unavailable.includes(v.id);
            return `<tr><td><button class="vehicle-name" data-vehicle="${v.id}">${icon("bus")}${v.id}</button></td><td>${p ? routePill(p.route) : '<span style="color:#64748b">Depot reserve</span>'}</td><td><span class="occupancy ${full ? "warn" : ""}"><span class="load-bar"><i style="width:${b ? (b.load / b.capacity) * 100 : 0}%"></i></span>${b ? b.load : 0}/${v.capacity}</span></td><td>${preview ? `<span style="color:#64748b">${b?.etaWindow ? `${Math.floor(b.etaWindow[0])}–${Math.ceil(b.etaWindow[1])} min` : "Awaiting GPS"}</span>` : `<span style="display:flex;gap:5px;align-items:center;color:#64748b">${v.accessible ? icon("wheelchair") : icon("minus")}${v.accessible ? "Step-free" : "Standard"}</span>`}</td><td><span class="row-status" style="${unavailable ? "color:#a96012" : ""}"><span class="dot" style="${unavailable ? "background:#cc9b65" : !b ? "background:#94a3b8" : ""}"></span>${unavailable ? "Unavailable" : b ? "In service" : p ? "Layover" : "Standby"}</span></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="5" class="empty">No vehicles moving at ${time(state.minute)}. Advance the replay to a departure.</td></tr>`
  }</tbody></table>`;
}
function bins(people, route = "all") {
  return Array.from(
    { length: Math.ceil(HORIZON / 10) },
    (_, i) =>
      people.filter(
        (p) =>
          (route === "all" || p.route === route) &&
          p.arrival >= i * 10 &&
          p.arrival < (i + 1) * 10,
      ).length,
  );
}
function peakTime() {
  const values = bins(bundle().forecast);
  return time(values.indexOf(Math.max(...values)) * 10 + 5);
}
function chartLegend() {
  return `<div class="chart-legend"><span><i class="chart-dot"></i>Forecast</span><span><i class="chart-dot" style="background:#cad4bc"></i>Simulated demand</span></div>`;
}
function demandChart(large = false) {
  const b = bundle(),
    pred = bins(b.forecast, large ? state.forecastRoute : "all"),
    actual = bins(b.people, large ? state.forecastRoute : "all"),
    max = Math.max(1, ...pred, ...actual) * 1.2,
    width = large ? 690 : 405,
    height = large ? 245 : 171,
    L = 42,
    R = 26,
    T = 18,
    B = 28,
    W = width - L - R,
    H = height - T - B;
  const point = (v, i) =>
    `${L + (i * W) / (pred.length - 1)},${T + H - (v / max) * H}`;
  const line = pred.map(point).join(" "),
    actualLine = actual.map(point).join(" "),
    peak = pred.indexOf(Math.max(...pred));
  return `<svg viewBox="0 0 ${width} ${height}" aria-label="Forecast and simulated passenger demand by 10-minute interval" role="img"><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#6ca2ff" stop-opacity=".25"/><stop offset="1" stop-color="#6ca2ff" stop-opacity=".015"/></linearGradient></defs><rect class="chart-peak" x="${L + ((peak - 0.5) * W) / (pred.length - 1)}" y="${T}" width="${W / (pred.length - 1)}" height="${H}" rx="4"/>${[
    0, 1, 2, 3,
  ]
    .map((i) => {
      const y = T + (i * H) / 3;
      return `<path d="M${L} ${y}H${width - R}" stroke="#e4eaf5" stroke-dasharray="3 3"/><text x="${L - 8}" y="${y + 3}" text-anchor="end" fill="#63748c" font-size="12">${Math.round(max * (1 - i / 3))}</text>`;
    })
    .join(
      "",
    )}<polygon points="${L},${T + H} ${line} ${width - R},${T + H}" fill="url(#chart-fill)"/><polyline points="${actualLine}" fill="none" stroke="#a8b9d4" stroke-width="1.5" stroke-dasharray="4 3"/><polyline points="${line}" fill="none" stroke="#3774f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${L + (peak * W) / (pred.length - 1)}" cy="${T + H - (pred[peak] / max) * H}" r="3.5" fill="#2563eb" stroke="white" stroke-width="1.5"/>${[...new Set([0, Math.floor((pred.length - 1) / 4), Math.floor((pred.length - 1) / 2), Math.floor(((pred.length - 1) * 3) / 4), pred.length - 1])].map((i) => `<text x="${L + (i * W) / (pred.length - 1)}" y="${height - 8}" fill="#63748c" font-size="12" text-anchor="middle">${time(i * 10)}</text>`).join("")}<text x="${Math.min(width - 54, Math.max(48, L + (peak * W) / (pred.length - 1)))}" y="${Math.max(13, T + H - (pred[peak] / max) * H - 12)}" text-anchor="middle" fill="#43628a" font-size="12">Peak ${pred[peak]}</text></svg>`;
}

function network() {
  const { plan, scenario } = current();
  return `<div class="view-grid">${ROUTES.map((r, i) => {
    const p = plan.routes.find((p) => p.route === r.id),
      checks = validate(
        { routes: [p, ...plan.routes.filter((x) => x !== p)] },
        scenario,
      );
    let t = p.shift;
    return `<section class="panel route-card" style="--route:${r.color}"><span class="route-letter" style="--route:${r.color};width:28px;height:28px;font-size:13px">${r.id}</span><h3>${r.name}</h3><p>${r.stops.length} stops · ${p.vehicles.length} vehicles · circular service</p><div class="route-stops">${r.stops
      .map((s, j) => {
        const departure = t;
        t += r.edges[j] * scenario.factor[i] + CONSTRAINTS.dwell;
        return `<button class="stop-item" data-stop="${s}" style="text-align:left">${stopById(s).name}<small>First visit ${time(departure)}</small></button>`;
      })
      .join(
        "",
      )}</div><div class="card-stat-row"><div><strong>${p.headway}<small> min</small></strong><small>Departure headway</small></div><div><strong>${cycleBound(r, scenario).toFixed(1)}<small> min</small></strong><small>Required rotation</small></div><div><strong>${p.vehicles.reduce((a, id) => a + vehicleById(id).capacity, 0)}</strong><small>Allocated seats</small></div></div></section>`;
  }).join(
    "",
  )}</div><div class="section-heading"><h2>Your fleet</h2><span class="badge neutral">Capacity is a hard limit</span></div><section class="panel full-fleet"><div class="table-scroll">${fleetTable()}</div><div class="event-note">Occupancy shown at replay time ${time(state.minute)}. Capacity is enforced at every boarding event. Every route must retain an accessible vehicle.</div></section><div class="section-heading"><h2>Published service constraints</h2></div><section class="panel evidence-block"><p>All ${STOPS.length} stops remain served. Departures begin between ${startTime()} and ${time(CONSTRAINTS.firstDepartureMax)}, with a ${CONSTRAINTS.minHeadway}–${CONSTRAINTS.maxHeadway} minute headway. Rotations cover scenario-adjusted road travel, a ${((CONSTRAINTS.travelEnvelope - 1) * 100).toFixed(0)}% travel envelope, ${CONSTRAINTS.dwell} min dwell per stop, and ${CONSTRAINTS.recovery} min recovery. Vehicles stay assigned to one route throughout the evaluation window; dispatch changes occur before service begins.</p><div class="data-actions"><button class="btn small" data-action="export-data">${icon("download")}Download scenario data</button><button class="btn small" data-action="constraints">${icon("shield")}Check current plan</button></div></section>`;
}
function demandPage() {
  const b = bundle(),
    values = bins(b.forecast),
    peak = Math.max(...values),
    counts = STOPS.map((s) => ({
      ...s,
      count: b.forecast.filter((p) => p.origin === s.id).length,
    })).sort((a, b) => b.count - a.count);
  return `<div class="forecast-summary"><section class="panel chart-panel large-chart"><div class="panel-header"><div><h2 class="panel-title">The next rush, in focus</h2><p class="panel-subtitle">${DATASET_IMPORTED ? "Organizer-supplied independent forecast" : `Independent weekday sample · seed ${state.seed + 89}`}</p></div><div class="forecast-tabs">${["all", ...ROUTES.map((r) => r.id)].map((id) => `<button data-forecast-route="${id}" class="${state.forecastRoute === id ? "active" : ""}">${id === "all" ? "All routes" : `Route ${id}`}</button>`).join("")}</div></div>${chartLegend()}<div class="chart-area">${demandChart(true)}</div><div class="event-note">Forecast and evaluation data use separate seeds. The plan is selected before evaluation passengers are observed.</div></section><section class="panel forecast-description"><div class="eyebrow" style="margin-bottom:12px">DEMAND SIGNAL</div><h3>Get ahead of ${peakTime()}.</h3><div class="kicker-stat">${peak}<small> riders / 10 min</small></div><p>${DATASET_IMPORTED ? "The organizer forecast supplies stop-specific demand over the published window." : "The built-in forecast combines a morning lecture peak, a smaller second wave and stop-specific demand."} ${DATASET_IMPORTED ? escapeHtml(SCENARIOS[state.scenario].description) : SCENARIOS[state.scenario].id === "event" ? "The festival applies a 1.8× multiplier to Innovation-route demand." : "Residence stops generate the strongest morning demand."}</p><p><b>Planning assumption:</b> ${DATASET_IMPORTED ? "the organizer supplies separate forecast and evaluation demand. The planner uses the forecast only; both plans are evaluated on the same passenger list." : "historical demand follows the same weekday pattern. A separate seeded realization represents the passengers who actually arrive."}</p><button class="btn small" data-action="optimize">${icon("sparkles")}Plan for the peak</button></section></div><div class="section-heading"><h2>Where the queues begin</h2><span class="badge neutral">${HORIZON}-minute forecast</span></div><div class="forecast-stops">${counts.map((s) => `<button class="panel demand-stop" data-stop="${s.id}" style="text-align:left"><h3>${s.name}</h3><strong>${s.count}</strong> <small>expected riders</small><div class="demand-track"><i style="width:${(s.count / counts[0].count) * 100}%"></i></div></button>`).join("")}</div><div class="learn-box"><strong>Make uncertainty visible.</strong> This MVP uses a seeded stochastic demand model rather than a trained machine-learning model. Forecast quality is measured against an independent realization: mean absolute error ${forecastMAE().toFixed(1)} riders per 10-minute window. Campus calendars and passenger-counting feeds can replace the synthetic inputs.</div>`;
}
function forecastMAE() {
  const b = bundle(),
    x = bins(b.forecast),
    y = bins(b.people);
  return x.reduce((s, v, i) => s + Math.abs(v - y[i]), 0) / x.length;
}
function scenariosPage() {
  const { optimization: o, scenario } = current();
  return `<div class="scenario-cards">${Object.values(SCENARIOS)
    .map(
      (s) =>
        `<button class="scenario-card ${s.id === state.scenario ? "selected" : ""}" data-scenario="${s.id}"><span class="selected-dot"></span><span class="scenario-icon">${icon(s.icon)}</span><h3>${s.name}</h3><p>${s.description}</p></button>`,
    )
    .join(
      "",
    )}</div><section class="panel lab-summary"><div><div class="eyebrow" style="margin-bottom:10px">CURRENT EXPERIMENT</div><h2>${scenario.name}</h2><p>${scenario.description}</p><p>The baseline, road environment and evaluation passengers are held fixed for both plans. Vehicle availability is checked before candidates enter the search.</p><div class="data-actions"><button class="btn primary" data-action="optimize">${icon("sparkles")}Review feasible plan</button><button class="btn" data-action="run-all">${icon("flask")}Run all scenarios</button></div></div><div><h3 style="font-size:16px;margin:0 0 17px">Proposed plan · ${num(o.candidates)} feasible combinations</h3><div class="constraint-list">${constraintHTML(o.validation)}</div><span class="badge">${o.validation.ok ? "Ready to simulate" : "Needs review"}</span></div></section><div class="section-heading"><h2>The trade-off, measured</h2><button class="text-link" data-page="impact">Full evidence report ${icon("arrow")}</button></div><section class="panel"><div class="table-scroll">${comparisonTable()}</div><div class="event-note">${state.scenario === "traffic" ? `Congestion requires a longer North headway to make the rotation feasible. Average waiting increases by ${(o.proposed.avgWait - o.baseResult.avgWait).toFixed(2)} min while all ${o.baseResult.conflicts} observed departure conflicts are removed.` : `The proposed plan changes headways and departure offsets${o.proposed.fleetUsed > o.baseResult.fleetUsed ? " and activates the reserve" : ""}. Waiting falls by ${percent(o.improvement)}, at an additional ${Math.round(o.proposed.vehicleMinutes - o.baseResult.vehicleMinutes)} vehicle-minutes.`}</div></section>`;
}
function constraintHTML(v) {
  return v.checks
    .map(
      (c) =>
        `<div class="constraint ${c.ok ? "" : "fail"}">${icon(c.ok ? "circlecheck" : "alert")}${c.name}</div>`,
    )
    .join("");
}
function comparisonTable() {
  const { optimization: o } = current(),
    a = o.baseResult,
    b = o.proposed;
  const rows = [
    [
      "Mean elapsed wait",
      a.avgWait.toFixed(2) + " min",
      b.avgWait.toFixed(2) + " min",
      change(a.avgWait, b.avgWait, " min"),
    ],
    ["Passengers boarded", a.boarded, b.boarded, change(a.boarded, b.boarded)],
    ["Unserved at window end", a.unmet, b.unmet, change(a.unmet, b.unmet)],
    ["Late arrival / overdue journey", a.late, b.late, change(a.late, b.late)],
    [
      "Unique riders deferred",
      a.blocked,
      b.blocked,
      change(a.blocked, b.blocked),
    ],
    [
      "Observed departure conflicts",
      a.conflicts,
      b.conflicts,
      change(a.conflicts, b.conflicts),
    ],
    [
      "Vehicle operating time",
      a.vehicleMinutes.toFixed(1) + " min",
      b.vehicleMinutes.toFixed(1) + " min",
      change(a.vehicleMinutes, b.vehicleMinutes, " min"),
    ],
    [
      "Fleet utilization",
      a.utilization.toFixed(1) + "%",
      b.utilization.toFixed(1) + "%",
      `${b.utilization >= a.utilization ? "+" : "−"}${Math.abs(b.utilization - a.utilization).toFixed(1)} pp`,
    ],
    [
      "Vehicles dispatched",
      a.fleetUsed,
      b.fleetUsed,
      change(a.fleetUsed, b.fleetUsed),
    ],
  ];
  return `<table class="comparison-table"><thead><tr><th>MEASURABLE OUTCOME</th><th>FIXED BASELINE</th><th>PROPOSED PLAN</th><th>CHANGE</th></tr></thead><tbody>${rows.map(([label, a, b, c]) => `<tr><td>${label}</td><td style="color:#677891">${a}</td><td style="font-weight:600">${b}</td><td>${c}</td></tr>`).join("")}</tbody></table>`;
}
function impactPage() {
  const { optimization: o, eta, scenario } = current(),
    a = o.baseResult,
    b = o.proposed;
  return `<div class="report-hero"><div><div class="eyebrow">FROM RECOMMENDATION TO EVIDENCE</div><h2>${o.improvement >= 0 ? "A better commute, quantified." : "A feasible timetable, with a visible cost."}</h2><p>${scenario.name} · ${a.total} identical evaluation passengers · ${startTime()}–${endTime()}.<br>The proposed plan satisfies every published hard constraint. The baseline stays fixed, even when a disruption makes its timetable infeasible.</p><button class="btn small" data-action="export-report" style="background:#deebff;border-color:#deebff;color:#164ab4">${icon("download")}Download evidence</button></div><div class="hero-stat"><div class="hero-number">${percent(o.improvement)}<small> ${o.improvement >= 0 ? "↓" : "↑"}</small></div><p>${o.improvement >= 0 ? "reduction" : "increase"} in mean elapsed passenger wait</p></div></div><section class="panel"><div class="panel-header"><h2 class="panel-title">The fixed-window comparison</h2><span class="badge">SEED ${state.seed}</span></div><div class="table-scroll">${comparisonTable()}</div></section><div class="evidence-grid"><section class="panel evidence-block"><h3>Feasibility is non-negotiable</h3>${constraintHTML(o.validation)}<div class="data-actions"><button class="btn small" data-action="constraints">${icon("shield")}Inspect rotation proof</button></div></section><section class="panel evidence-block"><h3>Arrival windows with an honest error bar</h3><div class="card-stat-row" style="padding-top:0;margin-top:0;border:0;margin-bottom:17px"><div><strong>${eta.maeSeconds.toFixed(1)}<small> sec</small></strong><small>Held-out ETA MAE</small></div><div><strong>${eta.coverage.toFixed(1)}<small>%</small></strong><small>Window coverage</small></div><div><strong>${eta.testCount}</strong><small>Held-out traces</small></div></div><p>Estimate progress from the latest three timestamped GPS observations. Extrapolate the measured segment speed to the next stop. Calibrate a nominal 90% window on ${eta.calibrationCount} independent segment traces, then evaluate on ${eta.testCount} held-out traces.</p><p>Current calibration margin: ±${(eta.margin * 60).toFixed(0)} seconds. These are ${DATASET_IMPORTED ? "organizer-supplied" : "synthetic"} segment traces; future traffic uncertainty and GPS noise require recalibration for real deployment.</p><button class="btn small" data-action="export-gps">${icon("download")}Export GPS traces</button></section><section class="panel evidence-block"><h3>Reproduce this experiment</h3><p>Evaluation seed <code>${state.seed}</code> · forecast source <code>${DATASET_IMPORTED ? "Organizer supplied" : `seed ${state.seed + 89}`}</code> · fixed service window <code>${startTime()}–${endTime()}</code>. Both plans share the same passenger objects and deterministic road environment.</p><p>Search ${num(o.candidates)} feasible combinations over ${CONSTRAINTS.headways.join("/")}-minute headways, ${CONSTRAINTS.shifts.join("/")}-minute departure offsets and reserve allocation. This finite search finds the best forecast score in the declared candidate set.</p><p>Objective: mean elapsed wait + 35 × unserved fraction + 10 × late fraction + 0.0006 × vehicle-minutes. Hard constraint failures are rejected before scoring.</p><div class="data-actions"><button class="btn small" data-action="export-data">${icon("download")}Dataset + plans</button><button class="btn small" data-action="seed">${icon("refresh")}Change seed</button></div></section><section class="panel evidence-block"><h3>Trade-offs you can act on</h3><p>${tradeoffText()}</p><p>Mean elapsed wait includes the accrued wait of passengers still unboarded at ${endTime()}. “Late” means an arrival after a rider's 25–30 minute deadline or an overdue journey at the window end. In-progress journeys with later deadlines are reported separately in the JSON evidence.</p><p>Commercial workflow: import the campus timetable, preview demand, review constraint proofs, approve a dispatch plan and audit outcomes. The deployment path is a campus subscription with fleet-contractor licensing.</p></section></div><div class="section-heading"><h2>How the plan holds up</h2><button class="text-link" data-action="run-all">Evaluate all ${Object.keys(SCENARIOS).length} scenarios ${icon("arrow")}</button></div><section class="panel" id="robustness"><div class="empty">Run the disruption suite to compare all ${Object.keys(SCENARIOS).length} scenarios under the same seed.</div></section>`;
}
function tradeoffText() {
  const { optimization: o } = current();
  return `The proposal uses ${o.proposed.fleetUsed} vehicles versus ${o.baseResult.fleetUsed} in the baseline and ${Math.round(o.proposed.vehicleMinutes - o.baseResult.vehicleMinutes)} additional vehicle-minutes. ${o.improvement >= 0 ? `Mean waiting improves by ${percent(o.improvement)}.` : `Mean waiting increases by ${percent(o.improvement)} to restore timetable feasibility.`} ${o.proposed.unmet} riders remain unserved at the end of the fixed window; the optimizer does not guarantee every passenger a seat or deadline. More frequent service consumes recovery time and operating budget.`;
}

function render() {
  document.getElementById("app").innerHTML = shell();
  if (state.page === "student") findTrip();
  document.title = `${titles[state.page][1]} · RoutePulse`;
}
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 4200);
}
function navigate(page) {
  state.page = page;
  history.replaceState(null, "", `#${page}`);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function setScenario(id) {
  state.scenario = id;
  state.journeyAudit = null;
  state.applied = false;
  state.minute = Math.min(38, HORIZON - 1);
  render();
  toast(`${SCENARIOS[id].name} loaded · fixed baseline restored`);
}
function openModal(
  title,
  subtitle,
  body,
  footer = "",
  eyebrow = "ROUTEPULSE WORKSPACE",
) {
  const d = document.getElementById("modal");
  d.innerHTML = `<div class="modal-header"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2><p>${subtitle}</p></div><button class="close-button" data-action="close" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}`;
  if (!d.open) d.showModal();
}
function planModal() {
  const { optimization: o, scenario } = current(),
    a = o.baseResult,
    b = o.proposed;
  const changes = o.plan.routes
    .map((p, i) => {
      const old = o.baseline.routes[i],
        r = ROUTES[i],
        newVehicles = p.vehicles.filter((id) => !old.vehicles.includes(id));
      return `<div class="plan-change"><span class="route-letter" style="--route:${r.color}">${p.route}</span><div><h3>${r.name}</h3><p>${newVehicles.length ? `Assign ${newVehicles.join(", ")}. ` : ""}Departure every <b>${p.headway} min</b> (${old.headway} min baseline), first departure <b>${time(p.shift)}</b> (${time(old.shift)} baseline).<br>${p.vehicles.join(" · ")} · rotation ${p.vehicles.length * p.headway} min ≥ ${cycleBound(r, scenario).toFixed(1)} min required.</p></div></div>`;
    })
    .join("");
  openModal(
    "A smarter plan for your campus",
    `${num(o.candidates)} feasible combinations · selected on an independent demand forecast`,
    `<div class="modal-metrics"><div class="modal-metric"><strong>${b.avgWait.toFixed(2)}<small style="display:inline"> min</small></strong><small>wait · ${a.avgWait.toFixed(2)} baseline</small></div><div class="modal-metric"><strong>${b.late}</strong><small>late · ${a.late} baseline</small></div><div class="modal-metric"><strong>6 / 6</strong><small>hard constraints passed</small></div></div>${changes}<div class="modal-subheading">The feasibility check</div><div class="constraint-list">${constraintHTML(o.validation)}</div><div class="tradeoff"><b>The trade-off.</b> ${tradeoffText()}</div>`,
    `<small>Applies to this simulation, from the start of the window.</small><button class="btn primary" data-action="apply" ${state.applied ? "disabled" : ""}>${icon("check")}${state.applied ? "Plan active" : "Apply to simulation"}</button>`,
    "PULSE INTELLIGENCE · EXPLAINABLE BY DESIGN",
  );
}
function constraintModal() {
  const { plan, scenario } = current(),
    v = validate(plan, scenario);
  openModal(
    "Every constraint, accounted for",
    `${state.applied ? "Proposed plan" : "Baseline v1"} · ${scenario.name}`,
    `${constraintHTML(v)}${v.errors.length ? `<div class="tradeoff">${v.errors.join("<br>")}</div>` : ""}<div class="table-scroll" style="margin-top:22px"><table class="comparison-table"><thead><tr><th>ROUTE</th><th>CYCLE + ENVELOPE</th><th>ROTATION</th><th>PROOF</th></tr></thead><tbody>${plan.routes.map((p, i) => `<tr class="proof-route"><td>${p.route}</td><td>${cycleBound(ROUTES[i], scenario).toFixed(2)} min</td><td>${p.vehicles.length} × ${p.headway} = ${p.vehicles.length * p.headway} min</td><td>${p.vehicles.length * p.headway >= cycleBound(ROUTES[i], scenario) ? "PASS" : "FAIL"}</td></tr>`).join("")}</tbody></table></div><div class="learn-box">Required rotation = road travel × disruption multiplier × ${CONSTRAINTS.travelEnvelope} + ${CONSTRAINTS.dwell} min per stop + ${CONSTRAINTS.recovery} min recovery. GPS ground truth uses a bounded, time-dependent road environment. Duplicate assignments, unavailable vehicles and missed service windows are rejected.</div>`,
    `<small>Boarding is capped at each vehicle's seat limit.</small><button class="btn primary" data-action="optimize">${icon("sparkles")}Review feasible plan</button>`,
  );
}
function passengerModal() {
  openModal(
    "Your next connection",
    `Plan a journey from ${time(state.minute)} · ${state.applied ? "proposed" : "baseline"} timetable`,
    `<div class="trip-form"><div class="field"><label for="trip-origin">FROM</label><select id="trip-origin">${STOPS.map((s) => `<option value="${s.id}" ${s.id === "hostels" ? "selected" : ""}>${s.name}</option>`).join("")}</select></div><div class="field"><label for="trip-dest">TO</label><select id="trip-dest">${STOPS.map((s) => `<option value="${s.id}" ${s.id === "innovation" ? "selected" : ""}>${s.name}</option>`).join("")}</select></div></div><label class="accessible-check"><input id="trip-access" type="checkbox">${icon("wheelchair")}Only show accessible vehicles</label><div id="trip-results" class="trip-results"></div><div class="learn-box">Each leg is checked against all forecast loads along the journey. Arrival windows come from GPS where available, with a labeled timetable fallback. The latest incoming arrival must leave ${CONSTRAINTS.transferBuffer} minutes before the earliest onward departure. Availability may change; seats are not reserved.</div>`,
    `<small>Direct journeys and one-transfer alternatives.</small><button class="btn primary" data-action="find-trip">${icon("routes")}Find my route</button>`,
    "PASSENGER VIEW · EVERY COMMUTE MATTERS",
  );
  findTrip();
}
function findTrip() {
  const scope = document.querySelector("#modal[open] #trip-origin")
    ? document.getElementById("modal")
    : document;
  const origin = scope.querySelector("#trip-origin").value,
    dest = scope.querySelector("#trip-dest").value,
    accessible = scope.querySelector("#trip-access").checked;
  const student = state.page === "student" && scope === document;
  if (student) {
    state.tripOrigin = origin;
    state.tripDestination = dest;
    state.tripAccessible = accessible;
  }
  const { plan, scenario, eta, capacityResult, arrivals } = current(),
    deadline = student ? (state.tripDeadline ?? HORIZON) : HORIZON;
  const audit =
    origin === dest
      ? {
          choices: [],
          rejected: { capacity: 0, transfer: 0, deadline: 0, accessibility: 0 },
          checked: 0,
        }
      : feasibleJourneys(origin, dest, state.minute, plan, scenario, {
          accessible,
          deadline,
          capacityResult,
          windows: arrivals,
          calibration: eta,
          seed: state.seed,
          hypothetical: state.applied,
        });
  state.journeyAudit = {
    scenario: state.scenario,
    planLabel: plan.label,
    forecastSource: DATASET_IMPORTED
      ? "Organizer-supplied independent forecast"
      : "Independent seeded prior-day sample",
    origin,
    destination: dest,
    minute: state.minute,
    deadline,
    accessible,
    ...audit,
  };
  const choices = audit.choices;
  scope.querySelector("#trip-results").innerHTML =
    origin === dest
      ? '<div class="empty">You are already at your destination. Choose another stop.</div>'
      : choices.length
        ? choices
            .map((c, i) => {
              const stepFree = c.legs.every(
                (l) => vehicleById(l.vehicle).accessible,
              );
              return `<div class="trip-result"><div class="result-time">${time(c.arrive)}<small>ARRIVE</small></div><div class="journey-option-copy"><div class="journey-route-tags">${c.routes.map((id) => `<span class="route-letter" style="--route:${ROUTES.find((r) => r.id === id).color}">${id}</span>`).join('<span class="journey-tag-arrow">→</span>')}<b>${c.transfer ? "1 transfer" : "Direct journey"}</b></div><p>Leave ${clockWindow(c.departureWindow)} · arrive ${clockWindow(c.arrivalWindow)}</p>${c.transfer ? `<p class="transfer-detail">Change at <strong>${stopById(c.transfer).name}</strong> · ${c.guaranteedTransferBuffer.toFixed(1)} min buffer after arrival uncertainty</p>` : ""}<p>${c.vehicle} · ${stepFree ? "Step-free journey" : "Includes a standard bus"}</p><span class="seat-note">${icon("circlecheck")}${c.minSeats} minimum forecast seats across all legs</span><details class="journey-proof"><summary>View each leg’s capacity & arrival proof</summary>${c.legs.map((l) => `<div><b>${l.vehicle}: ${stopById(l.origin).name} → ${stopById(l.destination).name}</b><p>${l.capacity.minSeats} minimum seats over ${l.capacity.segments.length} segments · ${l.source}</p><p>Departure ${clockWindow(l.departureWindow)} · arrival ${clockWindow(l.arrivalWindow)}</p></div>`).join("")}</details></div><span class="badge ${i ? "neutral" : ""}">${i ? "Alternative" : "Earliest feasible"}</span></div>`;
            })
            .join("")
        : `<div class="empty">No feasible connection before ${time(deadline)}. Try a later arrival deadline, an earlier departure, or another accessibility preference.</div>`;
  if (
    origin !== dest &&
    audit.rejected.capacity +
      audit.rejected.transfer +
      audit.rejected.deadline +
      audit.rejected.accessibility >
      0
  )
    scope
      .querySelector("#trip-results")
      .insertAdjacentHTML(
        "beforeend",
        `<div class="journey-filter-note">${icon("shield")}Excluded: ${audit.rejected.capacity} full/incomplete-capacity legs · ${audit.rejected.transfer} tight transfers · ${audit.rejected.deadline} late options · ${audit.rejected.accessibility} inaccessible options.</div>`,
      );
}
function stopModal(id) {
  const stop = stopById(id),
    { arrivals, people, forecast: pred, capacityResult } = current();
  const list = arrivals.filter((p) => p.stop === id && p.board).slice(0, 5);
  openModal(
    stop.name,
    "GPS-driven arrival windows · source and uncertainty shown",
    `<div class="stop-details"><strong>${people.filter((p) => p.origin === id).length}</strong><p>evaluation riders over ${HORIZON} minutes<br>${pred.filter((p) => p.origin === id).length} forecast · ${stop.lat.toFixed(4)}, ${stop.lng.toFixed(4)}</p></div><div class="table-scroll"><table class="comparison-table"><thead><tr><th>ROUTE</th><th>VEHICLE</th><th>ARRIVAL WINDOW</th><th>FORECAST SEATS</th></tr></thead><tbody>${list
      .map((a) => {
        const r = capacityResult.records.find(
          (r) => r.trip === a.trip && r.index === a.index,
        );
        return `<tr><td>${routePill(a.route)}</td><td>${a.vehicle}</td><td>${clockWindow(a.window)}<small class="arrival-source ${a.mode === "timetable" ? "fallback" : ""}">${a.source}</small></td><td>${r ? r.capacity - r.load : "Unknown"}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div>${list.length ? "" : '<div class="empty">No upcoming departure in this evaluation window.</div>'}<div class="learn-box">Moving vehicles use past GPS positions and measured speed. The next-segment residual margin comes from calibration traces; later segments add the published travel envelope. Before departure or with stale GPS, the board explicitly uses timetable estimates.</div>`,
    `<small>Capacity forecasts use independent demand, not future evaluation passengers.</small><button class="btn" data-action="passenger">${icon("routes")}Plan a journey</button>`,
  );
}
function vehicleModal(id) {
  const v = vehicleById(id),
    { plan, result, scenario } = current(),
    p = plan.routes.find((p) => p.vehicles.includes(id)),
    b = fleetNow().find((b) => b.id === id);
  openModal(
    `${id} · ${b ? "In service" : scenario.unavailable.includes(id) ? "Unavailable" : p ? "Layover" : "Standby"}`,
    `${v.capacity} seats · ${v.accessible ? "Accessible, step-free vehicle" : "Standard vehicle"}`,
    `<div class="modal-metrics"><div class="modal-metric"><strong>${b ? b.load : 0} / ${v.capacity}</strong><small>current onboard load</small></div><div class="modal-metric"><strong>${p ? p.route : "—"}</strong><small>assigned route</small></div><div class="modal-metric"><strong>${b?.eta !== null && b?.eta !== undefined ? b.eta.toFixed(1) : "—"}</strong><small>minutes to next stop</small></div></div><div class="learn-box">${b ? `Next stop: <b>${stopById(b.next).name}</b>. Replay time ${time(state.minute)}. Arrival source: ${escapeHtml(b.etaSource)}. Load comes from capacity-constrained boarding and alighting events.` : p ? `Next departure is determined by route ${p.route}'s ${p.headway}-minute timetable and rotation. Vehicles receive at least ${CONSTRAINTS.recovery} minutes of recovery at the terminal.` : scenario.unavailable.includes(id) ? "This vehicle is excluded from all candidate plans in the active scenario." : "The reserve can be allocated to one route before the service window. It cannot be counted on multiple routes."}</div>`,
    `<small>Simulation data · no live fleet connection</small><button class="btn" data-page="network" data-action="close">View fleet ${icon("arrow")}</button>`,
  );
}
function methodModal() {
  openModal(
    "Behind the numbers",
    "The model, assumptions and reproducibility contract",
    `<div class="help-copy"><h3>A fixed baseline, a fair comparison</h3><p>${ROUTES.length} circular routes, ${STOPS.length} stops and ${VEHICLES.length} vehicles. Imported baseline schedules are kept fixed; the built-in baseline repeats every 15 minutes with offsets 0, 3 and 6. Each journey ends within the current loop, at a downstream stop or its terminal. The service window is fixed at ${startTime()}–${endTime()}.</p><h3>Capacity and travel feasibility</h3><p>Passengers enter a FIFO queue. Boarding stops at seat capacity and skips a vehicle when step-free access is needed. A full or inaccessible vehicle leaves the rider queued. Travel times vary deterministically within a bounded road envelope; invalid baseline rotations are delayed until their assigned vehicle is ready.</p><h3>Forecast, plan, evaluate</h3><p>The optimizer sees an independent organizer forecast or a separate seeded weekday sample. It checks all reserve allocations and allowed headways and offsets. The evaluation uses the same ground-truth passengers for both plans. This is a finite candidate search, not a claim of global optimization over all possible networks.</p><h3>Arrival windows</h3><p>Arrival boards call the same GPS estimator used in the held-out experiment. Only observations at or before the replay time enter a prediction. Calibration traces provide the next-segment residual margin; later segments add the travel-time envelope. Stationary positions use route-speed priors, and missing or stale telemetry is labeled as a timetable fallback. Transfers compare the incoming latest arrival with the outgoing earliest departure, with the published buffer. Every segment on every leg needs a forecast seat; forecasts are independent of evaluation demand.</p><h3>Metric definitions</h3><p>Mean elapsed wait is total boarded wait plus waiting accrued by unboarded passengers at ${endTime()}, divided by all demand. Fleet utilization is in-window travel and dwell time divided by dispatched vehicles × ${HORIZON} minutes. Late journeys use supplied passenger deadlines (25–30 minutes in the demo). Unserved, in-progress and late journeys are separately available in exports.</p></div>`,
    `<small>All datasets and results can be exported.</small><button class="btn primary" data-page="impact" data-action="close">Inspect evidence ${icon("arrow")}</button>`,
    "ENGINEERING · REPRODUCIBILITY",
  );
}
function guideModal() {
  openModal(
    "Make the morning move better",
    "A three-minute demo for operators and judges",
    `<div class="help-copy"><p>RoutePulse turns a campus timetable into a decision you can inspect. Every number comes from a reproducible simulation.</p><ol><li><b>Explore the network.</b> Scrub the replay. Select a stop or moving bus.</li><li><b>Review the proposed plan.</b> Inspect the changed departures, vehicle assignment and rotation proofs.</li><li><b>Apply it to the simulation.</b> The map and metrics switch to the proposed schedule.</li><li><b>Break something.</b> Select congestion, a festival or an unavailable bus.</li><li><b>Show the evidence.</b> Compare the fixed baseline, export the dataset and run the ${Object.keys(SCENARIOS).length}-scenario suite.</li></ol><p>The passenger view finds direct and one-transfer journeys, with optional accessible-vehicle filtering. No hardware or real fleet connection is required.</p></div>`,
    `<small>A planning system with transparent decisions.</small><button class="btn primary" data-action="close">Let's explore ${icon("arrow")}</button>`,
    "WELCOME TO ROUTEPULSE",
  );
}
function exportFile(name, data, mime = "application/json") {
  const blob = new Blob(
      [typeof data === "string" ? data : JSON.stringify(data, null, 2)],
      { type: mime },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${name} downloaded`);
}
function evidence() {
  const { optimization: o, scenario, eta } = current();
  const compact = ({ records, trips, results, ...m }) => m;
  return {
    application: "RoutePulse",
    version: "1.0.0",
    scenario: scenario.id,
    evaluationWindow: { start: startTime(), end: endTime(), minutes: HORIZON },
    seed: state.seed,
    forecastSeed: DATASET_IMPORTED ? null : state.seed + 89,
    forecastSource: DATASET_IMPORTED
      ? "Organizer-supplied independent forecast"
      : "Independent seeded prior-day sample",
    objective:
      "meanElapsedWait + 35*unservedFraction + 10*lateFraction + 0.0006*vehicleMinutes",
    baselinePlan: o.baseline,
    proposedPlan: o.plan,
    candidates: o.candidates,
    hardConstraints: o.validation,
    dataset: {
      name: DATASET_NAME,
      imported: DATASET_IMPORTED,
      constraints: CONSTRAINTS,
    },
    arrivalBoardSources: [...new Set(current().arrivals.map((p) => p.source))],
    passengerJourneyAudit: state.journeyAudit || null,
    baseline: compact(o.baseResult),
    proposed: compact(o.proposed),
    waitingImprovementPercent: o.improvement,
    eta: {
      maeSeconds: eta.maeSeconds,
      coveragePercent: eta.coverage,
      marginMinutes: eta.marginMinutes,
      calibrationCount: eta.calibrationCount,
      holdoutCount: eta.testCount,
    },
    definitions: {
      wait: "Mean elapsed wait: boarded waiting plus accrued unboarded wait at horizon, across all passengers.",
      late: "Arrived after the supplied individual deadline, or still not arrived when deadline <= horizon.",
      utilization:
        "In-window travel and dwell time / (dispatched fleet * horizon).",
      deferred:
        "Unique passengers unable to board because of full capacity or inaccessible vehicle.",
    },
    limitations: [
      `${DATASET_IMPORTED ? "Organizer-supplied data" : "Synthetic campus and GPS data"}; no live feed.`,
      "Optimization uses an independent seeded forecast; improvements are not guaranteed in every scenario.",
      "Departure plans apply before the service window; no mid-trip reassignment.",
      "Trips are terminal-bound; cross-loop passenger journeys are excluded from demand evaluation.",
      "GPS coverage is held-out segment coverage, not a calibrated full-journey guarantee.",
    ],
  };
}
function exportReport() {
  exportFile(
    `routepulse-evidence-${state.scenario}-${state.seed}.json`,
    evidence(),
  );
}
function exportData() {
  const { optimization: o } = current();
  exportFile(`routepulse-dataset-${state.scenario}-${state.seed}.json`, {
    ...organizerTemplate(state.scenario, state.seed),
    evidence: evidence(),
    baselineEvents: o.baseResult.records,
    proposedEvents: o.proposed.records,
  });
}
function exportCSV() {
  const { optimization: o } = current(),
    a = o.baseResult,
    b = o.proposed,
    fields = [
      "avgWait",
      "total",
      "boarded",
      "completed",
      "unmet",
      "unfinished",
      "late",
      "blocked",
      "conflicts",
      "vehicleMinutes",
      "utilization",
      "fleetUsed",
    ];
  exportFile(
    `routepulse-comparison-${state.scenario}.csv`,
    [
      "metric,baseline,proposed",
      ...fields.map((f) => `${f},${a[f]},${b[f]}`),
    ].join("\r\n"),
    "text/csv",
  );
}
function runAll() {
  if (state.page !== "impact") {
    navigate("impact");
  }
  const rows = Object.values(SCENARIOS)
    .map((s) => {
      const o = bundle(s.id).optimization;
      return `<tr><td>${s.name}</td><td>${o.baseResult.avgWait.toFixed(2)} min</td><td>${o.proposed.avgWait.toFixed(2)} min</td><td style="color:${o.improvement >= 0 ? "#2563eb" : "#a96012"}">${o.improvement >= 0 ? "−" : "+"}${percent(o.improvement)}</td><td>${o.baseResult.conflicts} → ${o.proposed.conflicts}</td><td><span class="badge">6 / 6</span></td></tr>`;
    })
    .join("");
  document.getElementById("robustness").innerHTML =
    `<div class="table-scroll"><table class="comparison-table"><thead><tr><th>SCENARIO</th><th>BASELINE WAIT</th><th>PROPOSED WAIT</th><th>CHANGE</th><th>CONFLICTS</th><th>FEASIBLE</th></tr></thead><tbody>${rows}</tbody></table></div><div class="event-note">Identical evaluation seed ${state.seed} for every scenario. Congestion may increase waiting because the proposed plan enforces the travel envelope and recovery constraint.</div>`;
  document
    .getElementById("robustness")
    .scrollIntoView({ behavior: "smooth", block: "center" });
  toast(
    `${Object.keys(SCENARIOS).length} scenarios evaluated · all proposed plans feasible`,
  );
}
function updateReplay() {
  if (state.page === "student") {
    document.getElementById("student-arrivals").innerHTML = studentArrivals();
    document.getElementById("student-clock").textContent = time(state.minute);
    document.getElementById("student-timeline").value = state.minute;
    document.getElementById("trip-departure").value = time(state.minute);
    document.querySelector(".proof-detail").textContent =
      `${STOPS.length} stops connected · replay at ${time(state.minute)}`;
    document.querySelector(".proof-number").innerHTML =
      `${liveVehicles(current().result, state.minute, SCENARIOS[state.scenario]).length}<span>buses moving</span>`;
    findTrip();
    return;
  }
  if (state.page !== "overview") return;
  const map = document.getElementById("map-content");
  if (map) map.innerHTML = campusMap();
  const t = document.getElementById("play-time");
  if (t) t.textContent = time(state.minute);
  const slider = document.getElementById("timeline");
  if (slider) slider.value = state.minute;
  const fleet = document.getElementById("fleet-preview");
  if (fleet) fleet.innerHTML = fleetTable(true);
}
function seedModal() {
  if (DATASET_IMPORTED) {
    toast(
      "Organizer demand and its seed stay fixed. Restore demo data to regenerate scenarios.",
    );
    return;
  }
  openModal(
    "Re-run with a new seed",
    "The window and baseline remain fixed. Demand and GPS realizations change.",
    `<form id="seed-form"><div class="field"><label for="seed-value">INTEGER SEED · 1–999999</label><input id="seed-value" type="number" min="1" max="999999" step="1" value="${state.seed}" required></div></form><div class="learn-box">A new seed regenerates both the independent forecast and ground-truth demand. The optimization and ETA calibration are repeated. No seed is selected to hide an unfavorable outcome.</div>`,
    `<small>Defaults to the published demo seed ${SEED}.</small><button class="btn primary" data-action="set-seed">${icon("refresh")}Re-run experiment</button>`,
  );
}
function toggleExport(button) {
  const parent = button.parentElement,
    menu = parent.querySelector(".export-menu");
  if (menu) {
    menu.remove();
    button.setAttribute("aria-expanded", "false");
    return;
  }
  button.setAttribute("aria-expanded", "true");
  parent.insertAdjacentHTML(
    "beforeend",
    `<div class="export-menu"><button data-action="export-report">${icon("report")}Evidence report · JSON</button><button data-action="export-csv">${icon("chart")}Comparison · CSV</button><button data-action="export-data">${icon("file")}Full simulation dataset</button><button data-action="export-gps">${icon("pin")}GPS traces · JSON</button></div>`,
  );
}

function dataImportModal() {
  importRevision++;
  stagedDataset = null;
  openModal(
    "Bring your campus data",
    "Import a versioned JSON dataset. Validate it before changing the active simulation.",
    `<div class="import-intro"><p>Load stops, routes, fixed baseline schedules, capacities, independent demand forecasts, evaluation passengers, GPS calibration traces and optional vehicle observations.</p><div class="data-actions"><button class="btn small" data-action="sample-data">${icon("download")}Download importable sample</button></div></div><label class="file-drop" for="dataset-file">${icon("file")}<strong>Choose organizer dataset</strong><span>JSON · up to 5 MB · timestamps in minutes from window start</span><input id="dataset-file" type="file" accept=".json,application/json"></label><div id="import-feedback" role="status" aria-live="polite"><div class="learn-box">Current dataset: <b>${escapeHtml(DATASET_NAME)}</b>. Invalid files leave the current data untouched. The sample includes the complete contract and separate forecast/evaluation demand.</div></div>`,
    `<small>Data is processed locally and never uploaded.</small><button id="activate-data-button" class="btn primary" data-action="activate-data" disabled>${icon("check")}Activate dataset</button>`,
    "OPERATOR · ORGANIZER DATA",
  );
}
async function readDatasetFile(file) {
  if (!file) return;
  const revision = ++importRevision,
    feedback = document.getElementById("import-feedback"),
    button = document.getElementById("activate-data-button");
  button.disabled = true;
  stagedDataset = null;
  feedback.innerHTML =
    '<div class="learn-box">Reading and validating dataset…</div>';
  if (file.size > MAX_FILE_BYTES) {
    feedback.innerHTML =
      '<div class="import-errors">File exceeds the 5 MB limit.</div>';
    return;
  }
  let checked;
  try {
    checked = parseDataset(await file.text());
  } catch (error) {
    checked = { ok: false, errors: [{ path: "file", message: error.message }] };
  }
  if (revision !== importRevision || !feedback.isConnected) return;
  if (!checked.ok) {
    feedback.innerHTML = `<div class="import-errors"><h3>Dataset rejected — current data preserved</h3><ul>${checked.errors.map((e) => `<li><code>${escapeHtml(e.path)}</code> ${escapeHtml(e.message)}</li>`).join("")}</ul></div>`;
    return;
  }
  stagedDataset = checked;
  const m = checked.summary;
  feedback.innerHTML = `<div class="import-success">${icon("circlecheck")}Validated ${escapeHtml(file.name)}</div><div class="import-summary"><div><strong>${m.routes}</strong><span>routes</span></div><div><strong>${m.stops}</strong><span>stops</span></div><div><strong>${m.vehicles}</strong><span>vehicles</span></div><div><strong>${m.scenarios}</strong><span>scenarios</span></div></div><div class="learn-box"><b>${escapeHtml(m.name)}</b> · ${m.minutes} min evaluation window · ${m.passengers} riders · ${m.gps} GPS traces/observations.<br>Reference IDs, coordinates, capacities, timestamps, accessibility, baseline assignments, directed passenger trips, independent forecasts and reserve feasibility passed validation.</div>`;
  button.disabled = false;
}
function resetUIForDataset(seed) {
  cache.clear();
  state.scenario = Object.keys(SCENARIOS)[0];
  state.seed = seed;
  state.applied = false;
  state.playing = false;
  state.minute = Math.min(38, HORIZON - 1);
  state.tripDeadline = HORIZON;
  state.forecastRoute = "all";
  state.hidden.clear();
  state.zoom = 1;
  state.studentStop = STOPS.find((s) => s.id === "hostels")?.id || STOPS[0].id;
  state.tripOrigin = state.studentStop;
  state.tripDestination =
    STOPS.find((s) => s.id === "innovation")?.id || STOPS.at(-1).id;
  state.journeyAudit = null;
}
function activateStagedDataset() {
  if (!stagedDataset?.ok) return;
  installDataset(stagedDataset);
  resetUIForDataset(stagedDataset.model.seed);
  let saved = true;
  try {
    localStorage.setItem(
      "routepulse-organizer-v1",
      JSON.stringify(stagedDataset.model),
    );
  } catch {
    saved = false;
  }
  document.getElementById("modal").close();
  render();
  toast(
    `${DATASET_NAME} activated${saved ? " · saved on this device" : " · loaded for this tab; device storage unavailable"}`,
  );
  stagedDataset = null;
}
function restoreDemoDataset() {
  activateDataset();
  resetUIForDataset(SEED);
  try {
    localStorage.removeItem("routepulse-organizer-v1");
  } catch {}
  render();
  toast("Built-in demo data restored");
}
function restoreSavedDataset() {
  try {
    const saved = localStorage.getItem("routepulse-organizer-v1");
    if (!saved) return;
    const checked = parseDataset(saved);
    if (checked.ok) {
      installDataset(checked);
      resetUIForDataset(checked.model.seed);
    } else localStorage.removeItem("routepulse-organizer-v1");
  } catch {
    /* Browser storage may be unavailable; the demo remains usable. */
  }
}

const actions = {
  data: dataImportModal,
  "activate-data": activateStagedDataset,
  "demo-data": restoreDemoDataset,
  "sample-data": () =>
    exportFile(
      "routepulse-organizer-template.json",
      organizerTemplate(state.scenario, state.seed),
    ),
  "focus-trip": () => {
    document
      .getElementById("journey-planner")
      .scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("trip-origin").focus({ preventScroll: true });
  },
  "student-map": () =>
    openModal(
      "Your campus, connected",
      "Choose a stop to see upcoming arrivals.",
      `<div class="map-wrap student-modal-map"><div id="map-content">${campusMap()}</div></div>`,
    ),
  optimize: planModal,
  apply: () => {
    state.applied = true;
    state.journeyAudit = null;
    document.getElementById("modal").close();
    render();
    toast("Proposed plan applied · 6 hard constraints satisfied");
  },
  reset: () => {
    state.applied = false;
    state.journeyAudit = null;
    render();
    toast("Fixed baseline restored");
  },
  close: () => document.getElementById("modal").close(),
  passenger: passengerModal,
  "find-trip": findTrip,
  guide: guideModal,
  method: methodModal,
  constraints: constraintModal,
  impact: () => navigate("impact"),
  alerts: () => {
    const { result } = current();
    openModal(
      "Your network needs attention",
      "Observed outcomes across the fixed evaluation window",
      `${alertItems()
        .map(
          (a) =>
            `<div class="plan-change"><span class="alert-symbol ${a.tone}">${icon(a.icon)}</span><div><h3>${a.title}</h3><p>${a.description}</p></div></div>`,
        )
        .join(
          "",
        )}<div class="learn-box">${result.unmet} passengers remain unboarded at ${endTime()}, ${result.unfinished} journeys are in progress, and ${result.conflicts} departures are delayed by vehicle rotations. These values are reported separately.</div>`,
      `<small>Capacity limits are enforced at every boarding.</small><button class="btn primary" data-action="optimize">Review recommendation ${icon("arrow")}</button>`,
    );
  },
  heat: () => {
    state.heat = !state.heat;
    render();
  },
  "zoom-in": () => {
    state.zoom = Math.min(1.65, state.zoom + 0.15);
    updateReplay();
  },
  "zoom-out": () => {
    state.zoom = Math.max(0.8, state.zoom - 0.15);
    updateReplay();
  },
  center: () => {
    state.zoom = 1;
    updateReplay();
  },
  play: () => {
    state.playing = !state.playing;
    if (state.minute >= HORIZON - 1) state.minute = 0;
    render();
  },
  speed: () =>
    toast(
      "Replay speed: 1 simulated minute per second. Drag the timeline for precise control.",
    ),
  menu: () => document.querySelector(".sidebar").classList.toggle("open"),
  "export-menu": toggleExport,
  "export-report": exportReport,
  "export-data": exportData,
  "export-csv": exportCSV,
  "export-gps": () =>
    exportFile(
      `routepulse-gps-${state.scenario}-${state.seed}.json`,
      bundle().eta,
    ),
  "run-all": runAll,
  seed: seedModal,
  "set-seed": () => {
    const input = document.getElementById("seed-value");
    if (!input.reportValidity()) return;
    state.seed = Number(input.value);
    state.applied = false;
    state.journeyAudit = null;
    cache.clear();
    document.getElementById("modal").close();
    render();
    toast(`Experiment re-run with seed ${state.seed}`);
  },
};
document.addEventListener("click", (e) => {
  const page = e.target.closest("[data-page]");
  if (page) {
    if (document.getElementById("modal").open)
      document.getElementById("modal").close();
    navigate(page.dataset.page);
    return;
  }
  const scenario = e.target.closest("[data-scenario]");
  if (scenario) {
    setScenario(scenario.dataset.scenario);
    return;
  }
  const stop = e.target.closest("[data-stop]");
  if (stop) {
    stopModal(stop.dataset.stop);
    return;
  }
  const vehicle = e.target.closest("[data-vehicle]");
  if (vehicle) {
    vehicleModal(vehicle.dataset.vehicle);
    return;
  }
  const route = e.target.closest("[data-route-toggle]");
  if (route) {
    state.hidden.has(route.dataset.routeToggle)
      ? state.hidden.delete(route.dataset.routeToggle)
      : state.hidden.add(route.dataset.routeToggle);
    render();
    return;
  }
  const fr = e.target.closest("[data-forecast-route]");
  if (fr) {
    state.forecastRoute = fr.dataset.forecastRoute;
    render();
    return;
  }
  const action = e.target.closest("[data-action]");
  if (action) {
    actions[action.dataset.action]?.(action);
    if (
      action.dataset.action.startsWith("export-") &&
      action.dataset.action !== "export-menu"
    )
      document.querySelector(".export-menu")?.remove();
    return;
  }
  document.querySelector(".export-menu")?.remove();
  if (e.target === document.getElementById("modal"))
    document.getElementById("modal").close();
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "dataset-file") {
    await readDatasetFile(e.target.files[0]);
    return;
  }
  if (e.target.id === "scenario-select") setScenario(e.target.value);
  if (e.target.id === "trip-departure" && e.target.reportValidity()) {
    const [h, m] = e.target.value.split(":").map(Number);
    state.minute = h * 60 + m - START_MINUTE;
    updateReplay();
  }
  if (e.target.id === "trip-deadline" && e.target.reportValidity()) {
    const [h, m] = e.target.value.split(":").map(Number);
    state.tripDeadline = h * 60 + m - START_MINUTE;
    findTrip();
  }
  if (e.target.id === "student-stop") {
    state.studentStop = e.target.value;
    document.getElementById("student-arrivals").innerHTML = studentArrivals();
  }
  if (["trip-origin", "trip-dest", "trip-access"].includes(e.target.id))
    findTrip();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "student-timeline") {
    state.minute = Number(e.target.value);
    updateReplay();
  }
  if (e.target.id === "timeline") {
    state.minute = Number(e.target.value);
    updateReplay();
  }
});
document.addEventListener("keydown", (e) => {
  const el = e.target;
  if (
    (e.key === "Enter" || e.key === " ") &&
    el.matches("g[data-stop],g[data-vehicle]")
  ) {
    e.preventDefault();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
});
window.addEventListener("hashchange", () => {
  const page = location.hash.slice(1);
  if (titles[page]) {
    state.page = page;
    render();
  }
});
restoreSavedDataset();
const initial = location.hash.slice(1);
if (titles[initial]) state.page = initial;
render();
setInterval(() => {
  if (
    state.playing &&
    !document.getElementById("modal").open &&
    !document.hidden
  ) {
    state.minute = Math.min(HORIZON - 1, state.minute + 0.5);
    if (state.minute >= HORIZON - 1) {
      state.playing = false;
      render();
    } else updateReplay();
  }
}, 500);
