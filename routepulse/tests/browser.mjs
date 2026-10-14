// Uses an installed Playwright package; no browser download is needed.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1120 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:4173", { waitUntil: "networkidle" });
await page.screenshot({
  path: "artifacts/overview-desktop.png",
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "Optimize plan", exact: true }).click();
await page.getByRole("dialog").waitFor();
await page.screenshot({ path: "artifacts/plan-review.png" });
await page.getByRole("button", { name: "Apply to simulation" }).click();
await page
  .getByText("Proposed plan active in simulation", { exact: false })
  .waitFor();
assert.equal(await page.locator("dialog").isVisible(), false);
await page.getByRole("button", { name: "Passenger view", exact: true }).click();
await page.locator(".trip-result").first().waitFor();
await page.locator("#trip-access").check();
assert.ok((await page.locator(".trip-result").count()) > 0);
await page.screenshot({ path: "artifacts/passenger-connections.png" });
await page.getByRole("button", { name: "Close dialog" }).click();
await page.locator("#scenario-select").selectOption("traffic");
await page.getByRole("button", { name: "Optimize plan", exact: true }).click();
assert.ok((await page.locator("dialog").innerText()).includes("18 min"));
await page.getByRole("button", { name: "Close dialog" }).click();
for (const name of [
  "Network & fleet",
  "Demand forecast",
  "Scenario lab",
  "Impact report",
]) {
  await page
    .locator("nav")
    .getByRole("button", { name, exact: name !== "Scenario lab" })
    .click();
  assert.ok(await page.locator("h1").isVisible());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
}
await page.getByRole("button", { name: /Evaluate all .* scenarios/ }).click();
assert.equal(await page.locator("#robustness tbody tr").count(), 4);
await page.screenshot({
  path: "artifacts/impact-report.png",
  fullPage: true,
  animations: "disabled",
});
await page
  .locator("nav")
  .getByRole("button", { name: "Overview", exact: true })
  .click();
await page.locator("#scenario-select").selectOption("normal");
await page.getByRole("button", { name: "Demand layer" }).click();
assert.ok((await page.locator(".heat-circle").count()) > 0);
await page.locator('[data-stop="hostels"]').click();
assert.ok(
  (await page.locator("dialog").innerText()).includes("North Residences"),
);
await page.getByRole("button", { name: "Close dialog" }).click();
await page.locator("#timeline").fill("55");
assert.equal(await page.locator("#play-time").innerText(), "08:25");
await page.getByRole("button", { name: "Export", exact: true }).click();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Comparison · CSV" }).click();
const download = await downloadPromise;
assert.ok(download.suggestedFilename().endsWith(".csv"));
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({
  path: "artifacts/overview-mobile.png",
  fullPage: true,
  animations: "disabled",
});
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
await page.getByRole("button", { name: "Open navigation" }).click();
await page.locator("nav").getByRole("button", { name: "Scenario lab" }).click();
await page.locator('[data-scenario="breakdown"]').click();
await page.getByRole("button", { name: "Review feasible plan" }).click();
assert.ok((await page.locator("dialog").innerText()).includes("RP-07"));
await page.screenshot({
  path: "artifacts/scenario-mobile.png",
  fullPage: true,
  animations: "disabled",
});
await page.getByRole("button", { name: "Close dialog" }).click();
await page.setViewportSize({ width: 1440, height: 1120 });
await page.getByRole("button", { name: "Student", exact: true }).click();
await page.locator("#trip-results .trip-result").first().waitFor();
assert.ok((await page.locator(".arrival-card").count()) > 0);
assert.ok(
  (await page.locator(".student-service-banner").innerText()).includes("RP-04"),
);
await page.locator("#scenario-select").selectOption("normal");
await page.locator("#trip-access").check();
assert.ok(
  (await page.locator("#trip-results").innerText()).includes(
    "Step-free journey",
  ),
);
await page.locator("#student-stop").selectOption("engineering");
assert.ok(
  (await page.locator("#student-arrivals").innerText()).includes(
    "Innovation express",
  ),
);
await page.locator("#trip-deadline").fill("08:10");
await page.locator("#trip-deadline").dispatchEvent("change");
assert.ok(
  (await page.locator("#trip-results").innerText()).includes(
    "No feasible connection before 08:10",
  ),
);
await page.locator("#trip-deadline").fill("09:30");
await page.locator("#trip-deadline").dispatchEvent("change");
await page.locator("#trip-departure").fill("08:00");
await page.locator("#trip-departure").dispatchEvent("change");
assert.equal(await page.locator("#student-clock").innerText(), "08:00");
assert.ok((await page.locator("#trip-results .trip-result").count()) > 0);
await page.screenshot({
  path: "artifacts/student-desktop.png",
  fullPage: true,
  animations: "disabled",
  style: "#toast{visibility:hidden!important}",
});
await page.getByRole("button", { name: "Explore campus", exact: true }).click();
await page.locator("dialog .map-svg").waitFor();
await page.getByRole("button", { name: "Close dialog" }).click();
await page.setViewportSize({ width: 390, height: 844 });
assert.ok(
  (await page.locator(".journey-option-copy").first().boundingBox()).width >
    230,
);
assert.ok(
  (await page.locator("#trip-results .trip-result").first().boundingBox())
    .height < 450,
);
await page.screenshot({
  path: "artifacts/student-mobile.png",
  fullPage: true,
  animations: "disabled",
  style: "#toast{visibility:hidden!important}",
});
assert.equal(
  await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  ),
  false,
);
assert.ok((await page.locator("#trip-results .trip-result").count()) > 0);
assert.deepEqual(errors, []);
console.log(
  "Browser checks passed: operator pages, plan application, disruptions, accessible transfers, map stops, demand layer, CSV, Student dashboard, arrival boards, arrival deadlines, departure times, and desktop/mobile layouts.",
);
await browser.close();
