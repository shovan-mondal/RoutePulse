import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { organizerTemplate, validateDataset } from "../dist/data.js";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_PATH || "playwright",
);
await mkdir("artifacts", { recursive: true });
const template = organizerTemplate();
template.name = "Organizer Test Campus";
template.window = { start: "09:00", minutes: 90 };
template.routes = template.routes.slice(0, 2);
const ids = new Set(template.routes.flatMap((r) => r.stops));
template.stops = template.stops.filter((s) => ids.has(s.id));
template.vehicles = template.vehicles.filter(
  (v) => !["RP-05", "RP-06"].includes(v.id),
);
const scenario = template.scenarios[0];
scenario.factor = scenario.factor.slice(0, 2);
scenario.passengers = scenario.passengers.filter(
  (p) => p.route !== "C" && p.arrival < 90,
);
scenario.forecastPassengers = scenario.forecastPassengers.filter(
  (p) => p.route !== "C" && p.arrival < 90,
);
scenario.gpsTraces = scenario.gpsTraces.filter(
  (g) => g.route !== "C" && g.samples.at(-1).minute <= 90,
);
scenario.gpsObservations = scenario.gpsObservations.filter(
  (g) => g.route !== "C" && g.minute <= 90,
);
assert.ok(validateDataset(template).ok);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1120 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4173", { waitUntil: "networkidle" });
  const baseline = await page.locator(".metric-value").first().innerText();
  await page.getByRole("button", { name: "Manage data", exact: true }).click();
  await page
    .locator("#dataset-file")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"schemaVersion":99}'),
    });
  await page
    .getByText("Dataset rejected — current data preserved", { exact: true })
    .waitFor();
  assert.ok(await page.locator("#activate-data-button").isDisabled());
  await page.screenshot({
    path: "artifacts/import-validation.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Close dialog" }).click();
  assert.equal(
    await page.locator(".metric-value").first().innerText(),
    baseline,
  );
  await page.getByRole("button", { name: "Manage data", exact: true }).click();
  await page
    .locator("#dataset-file")
    .setInputFiles({
      name: "organizer.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(template)),
    });
  await page.getByText("Validated organizer.json", { exact: true }).waitFor();
  assert.ok(await page.locator("#activate-data-button").isEnabled());
  await page.screenshot({
    path: "artifacts/import-review.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Activate dataset", exact: true })
    .click();
  await page.locator(".data-source-banner").waitFor();
  assert.ok(
    (await page.locator(".data-source-banner").innerText()).includes(
      "09:00–10:30",
    ),
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Network & fleet", exact: true })
    .click();
  assert.equal(await page.locator(".route-card").count(), 2);
  await page.getByRole("button", { name: "Student", exact: true }).click();
  assert.equal(await page.locator("#trip-departure").inputValue(), "09:38");
  assert.equal(await page.locator("#trip-deadline").inputValue(), "10:30");
  await page.locator("#student-stop").selectOption("engineering");
  assert.ok(
    (await page.locator("#student-arrivals").innerText()).includes("Timetable"),
  );
  await page.locator("#student-stop").selectOption("library");
  assert.ok(
    (await page.locator("#student-arrivals").innerText()).includes(
      "Imported GPS",
    ),
  );
  assert.ok(
    (await page.locator(".trip-result").count()) > 0,
    JSON.stringify({
      errors,
      origin: await page.locator("#trip-origin").inputValue(),
      destination: await page.locator("#trip-dest").inputValue(),
      deadline: await page.locator("#trip-deadline").inputValue(),
      results: await page.locator("#trip-results").innerText(),
    }),
  );
  await page.locator(".journey-proof summary").first().click();
  assert.ok(
    (await page.locator(".journey-proof").first().innerText()).includes(
      "minimum seats over",
    ),
  );
  await page.screenshot({
    path: "artifacts/imported-student.png",
    fullPage: true,
    animations: "disabled",
    style: "#toast{visibility:hidden!important}",
  });
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(
    (await page.locator(".data-source-banner").innerText()).includes(
      "Organizer Test Campus",
    ),
  );
  await page.getByRole("button", { name: "Operator", exact: true }).click();
  await page
    .getByRole("button", { name: "Optimize plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Apply to simulation", exact: true })
    .click();
  await page.getByRole("button", { name: "Student", exact: true }).click();
  assert.ok((await page.locator(".trip-result").count()) > 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Operator", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore demo data", exact: true })
    .click();
  assert.equal(await page.locator(".data-source-banner").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Import browser checks passed: invalid data isolation, review/activation, custom route count/window, imported GPS arrivals, capacity proofs, persistence, proposed-plan propagation, mobile layout, and demo restoration.",
  );
} finally {
  await browser.close();
}
