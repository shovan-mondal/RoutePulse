import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SEED,
  HORIZON,
  STOPS,
  ROUTES,
  VEHICLES,
  SCENARIOS,
  demand,
  forecast,
  optimize,
  gpsDataset,
  time,
  DATASET_IMPORTED,
  DATASET_NAME,
  CONSTRAINTS,
} from "../dist/engine.js";
import {
  parseDataset,
  installDataset,
  organizerTemplate,
} from "../dist/data.js";
const args = process.argv.slice(2),
  datasetPath =
    args[0] === "--dataset" ? resolve(process.cwd(), args[1] || "") : null;
process.chdir(fileURLToPath(new URL("../", import.meta.url)));
let seed = Number(args[0] || SEED);
if (datasetPath) {
  if (!args[1] || args.length !== 2)
    throw new Error(
      "Usage: node scripts/evaluate.mjs --dataset path/to/organizer.json",
    );
  const validation = parseDataset(await readFile(datasetPath, "utf8"));
  if (!validation.ok)
    throw new Error(
      validation.errors.map((e) => `${e.path}: ${e.message}`).join("\n"),
    );
  installDataset(validation);
  seed = validation.model.seed;
}
if (!Number.isInteger(seed) || seed < 1 || seed > 999999)
  throw new Error("Seed must be an integer from 1 to 999999.");
const outputDirectory = DATASET_IMPORTED ? "data/imported" : "data";
await mkdir(outputDirectory, { recursive: true });
const results = [];
const compact = ({ records, trips, results, ...metrics }) => metrics;
for (const scenario of Object.values(SCENARIOS)) {
  const o = optimize(scenario, seed),
    eta = gpsDataset(scenario, seed);
  const record = {
    scenario: scenario.id,
    seed,
    forecastSeed: DATASET_IMPORTED ? null : seed + 89,
    forecastSource: DATASET_IMPORTED
      ? "Organizer-supplied independent forecast"
      : "Independent seeded prior-day sample",
    datasetName: DATASET_NAME,
    evaluationWindow: { start: time(0), end: time(HORIZON), minutes: HORIZON },
    baselinePlan: o.baseline,
    proposedPlan: o.plan,
    baseline: compact(o.baseResult),
    proposed: compact(o.proposed),
    constraints: o.validation,
    candidates: o.candidates,
    waitImprovementPercent: o.improvement,
    eta: {
      maeSeconds: eta.maeSeconds,
      coveragePercent: eta.coverage,
      marginMinutes: eta.marginMinutes,
      calibrationCount: eta.calibrationCount,
      holdoutCount: eta.testCount,
    },
  };
  results.push(record);
  await writeFile(
    `${outputDirectory}/${scenario.id}.json`,
    JSON.stringify(
      {
        ...organizerTemplate(scenario.id, seed),
        evaluation: record,
        gps: eta,
        baselineEvents: o.baseResult.records,
        proposedEvents: o.proposed.records,
      },
      null,
      2,
    ),
  );
  console.log(
    `${scenario.name.padEnd(23)} wait ${o.baseResult.avgWait.toFixed(2)} → ${o.proposed.avgWait.toFixed(2)} min | change ${o.improvement.toFixed(2)}% | conflicts ${o.baseResult.conflicts} → ${o.proposed.conflicts} | feasible ${o.validation.ok} | ETA MAE ${eta.maeSeconds.toFixed(2)} s`,
  );
}
await writeFile(
  `${outputDirectory}/evaluation.json`,
  JSON.stringify(results, null, 2),
);
if (!DATASET_IMPORTED)
  await writeFile(
    "data/organizer-template.json",
    JSON.stringify(organizerTemplate("normal", seed), null, 2),
  );
console.log(
  `Saved common datasets and results in ${outputDirectory}/ · seed ${seed}`,
);
