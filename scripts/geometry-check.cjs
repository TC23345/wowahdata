/* eslint-disable @typescript-eslint/no-require-imports -- run with Node against a running dev server */
// Geometry invariance check (docs/forever/04-layout-system.md §8).
//
// Browser CLS reports ~0 for the shifts this app used to have, because each
// followed a click. So this asserts geometry directly: it snapshots the
// bounding box of every shell region ([data-region]) and block
// ([data-block-id]), plus the document height, performs an interaction, and
// fails if anything moved by more than 0.5px.
//
//   npm run dev            # in another terminal
//   BASE_URL=http://localhost:3000 node scripts/geometry-check.cjs
//
// Uses Playwright's Chromium (require("playwright")).

const { chromium } = require("playwright");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const TOL = 0.5;
const VIEWPORTS = (process.env.GEOMETRY_VIEWPORTS || "1440x900,1100x800,820x1180,390x844")
  .split(",")
  .map((v) => {
    const [width, height] = v.split("x").map(Number);
    return { width, height };
  });

async function snapshot(page) {
  // Measure layout, not scroll position: Playwright scrolls to reach controls
  // below the fold, which legitimately moves sticky bars within the viewport.
  // The scrolled case is checked separately (see "sticky bars" below).
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(50);
  return page.evaluate(() => {
    const out = {};
    const take = (el, key) => {
      const r = el.getBoundingClientRect();
      out[key] = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    };
    document.querySelectorAll("[data-region]").forEach((el) => take(el, `region:${el.dataset.region}`));
    document.querySelectorAll("[data-block-id]").forEach((el) => take(el, `block:${el.dataset.blockId}`));
    out["doc"] = { x: 0, y: 0, w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight };
    out["hscroll"] = { x: 0, y: 0, w: document.documentElement.scrollWidth - document.documentElement.clientWidth, h: 0 };
    return out;
  });
}

function diff(a, b) {
  const problems = [];
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!a[key] || !b[key]) {
      problems.push(`${key}: ${a[key] ? "disappeared" : "appeared"}`);
      continue;
    }
    for (const k of ["x", "y", "w", "h"]) {
      const d = Math.abs(a[key][k] - b[key][k]);
      if (d > TOL) problems.push(`${key}.${k} moved ${d.toFixed(1)}px (${a[key][k].toFixed(1)} → ${b[key][k].toFixed(1)})`);
    }
  }
  return problems;
}

async function settle(page) {
  await page.waitForTimeout(350);
}

async function main() {
  const browser = await chromium.launch();
  let failures = 0;
  let checks = 0;

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const label = `${vp.width}×${vp.height}`;

    const step = async (name, baseline, action) => {
      await action();
      await settle(page);
      const problems = diff(baseline, await snapshot(page));
      checks += 1;
      if (problems.length) {
        failures += 1;
        console.log(`FAIL ${label} ${name}\n  ${problems.slice(0, 6).join("\n  ")}`);
      } else {
        console.log(`ok   ${label} ${name}`);
      }
    };

    // Lifecycle: the empty grid and the loaded grid are the same boxes.
    await page.goto(BASE, { waitUntil: "networkidle" });
    await settle(page);
    await page.keyboard.press("Escape"); // the data dialog opens on first visit
    await settle(page);
    const empty = await snapshot(page);
    await step("load sample data (empty → loaded)", empty, async () => {
      await page.evaluate(() => document.querySelector("dialog.data-dialog") && null);
      await page.getByRole("button", { name: "More" }).click();
      await page.getByRole("button", { name: /Manage data/ }).click();
      await page.getByRole("button", { name: /sample/i }).click();
      await page.waitForSelector('[data-block-id="timing-heatmap"] [role=gridcell]', { timeout: 30000 });
    });

    // Item workspace
    const item = await snapshot(page);
    const quick = page.locator('[aria-label="Pinned items"] button');
    const nQuick = await quick.count();
    for (let i = 0; i < nQuick; i++) {
      const name = await quick.nth(i).getAttribute("title");
      await step(`quick slot: ${name}`, item, () => quick.nth(i).click());
    }
    const combo = page.getByRole("combobox", { name: "Item" }).first();
    const visibleCombo = (await combo.isVisible()) ? combo : page.getByRole("combobox", { name: "Item" }).nth(1);
    await step("search a long item name", item, async () => {
      await visibleCombo.click();
      await visibleCombo.fill("Pattern: Comfortable");
      await page.keyboard.press("Enter");
    });
    await step("open item list without choosing", item, async () => {
      await visibleCombo.click();
      await settle(page);
      await page.keyboard.press("Escape");
    });
    for (const mode of ["Revenue", "Consistency", "Units"]) {
      await step(`heatmap mode ${mode}`, item, () => page.getByRole("radio", { name: mode, exact: true }).first().click());
    }
    await step("hover heatmap cells", item, async () => {
      const cells = page.locator('[data-block-id="timing-heatmap"] [role=gridcell]');
      for (const i of [0, 30, 99, 167]) await cells.nth(i).hover({ force: true });
    });
    for (const w of ["Middle 90%", "Full", "Fit"]) {
      await step(`price window ${w}`, item, () => page.getByRole("radio", { name: w, exact: true }).first().click());
    }
    if (vp.width >= 600) {
      for (const r of ["7d", "30d", "90d", "This week", "All"]) {
        await step(`range ${r}`, item, () => page.getByRole("radio", { name: r, exact: true }).first().click());
      }
      await step("open and close custom range", item, async () => {
        const btn = page.getByRole("button", { name: /^Custom/ }).filter({ visible: true }).first();
        await btn.click();
        await settle(page);
        await page.keyboard.press("Escape");
      });
    }
    await step("range with no data for this item", item, async () => {
      await page.goto(`${BASE}/?item=Mountain+Silversage&range=custom&start=2026-05-01&end=2026-05-06`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-block-id="timing-heatmap"]');
    });

    // Portfolio
    await page.goto(`${BASE}/?ws=portfolio`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-block-id="item-ledger"] [role=row]');
    await settle(page);
    const portfolio = await snapshot(page);
    for (const r of ["Outputs", "Inputs", "Flips", "All"]) {
      await step(`ledger role ${r}`, portfolio, () => page.getByRole("radio", { name: r, exact: true }).first().click());
    }
    await step("ledger filter with no match", portfolio, () => page.getByPlaceholder("item name").fill("zzzz"));
    await step("ledger filter cleared", portfolio, () => page.getByPlaceholder("item name").fill(""));
    await step("ledger sort and row click", portfolio, async () => {
      await page.getByRole("button", { name: /Sold/ }).first().click();
      await page.locator('[data-block-id="item-ledger"] [role=row][aria-rowindex="3"]').click();
    });
    await step("concentration spend", portfolio, () => page.getByRole("radio", { name: "Spend", exact: true }).first().click());

    // Pipeline
    await page.goto(`${BASE}/?ws=pipeline`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-block-id="pipeline-balance"]');
    await settle(page);
    const pipeline = await snapshot(page);
    for (const s of ["Canceled", "Expired", "Revenue"]) {
      await step(`outcomes sort ${s}`, pipeline, () => page.getByRole("radio", { name: s, exact: true }).first().click());
    }

    // Workspace switch: persistent bars stay put.
    const pick = (s) => Object.fromEntries(Object.entries(s).filter(([k]) => /region:(scope-bar|context-bar|workspace-nav)/.test(k)));
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await settle(page);
    const bars = pick(await snapshot(page));
    for (const ws of ["Portfolio", "Pipeline", "Item"]) {
      await page.getByRole("button", { name: ws, exact: true }).click();
      await settle(page);
      const problems = diff(bars, pick(await snapshot(page)));
      checks += 1;
      if (problems.length) {
        failures += 1;
        console.log(`FAIL ${label} switch to ${ws}\n  ${problems.join("\n  ")}`);
      } else console.log(`ok   ${label} switch to ${ws} (bars unchanged)`);
    }

    // Sticky bars: switching from a scrolled long workspace to a short one must
    // not pull the static bar back in (the canvas min-height guarantees it).
    {
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-block-id="timing-heatmap"] [role=gridcell]');
      await page.evaluate(() => window.scrollTo(0, 600));
      await settle(page);
      const before = await page.evaluate(() => document.querySelector('[data-region="context-bar"]').getBoundingClientRect().top);
      await page.getByRole("button", { name: "Pipeline", exact: true }).click();
      await settle(page);
      const after = await page.evaluate(() => document.querySelector('[data-region="context-bar"]').getBoundingClientRect().top);
      checks += 1;
      if (Math.abs(before - after) > TOL) {
        failures += 1;
        console.log(`FAIL ${label} scrolled switch moved sticky bars ${before} → ${after}`);
      } else console.log(`ok   ${label} scrolled switch to Pipeline (sticky bars stay at ${after}px)`);
    }

    if (errors.length) {
      failures += 1;
      console.log(`FAIL ${label} page errors:\n  ${errors.join("\n  ")}`);
    }
    await page.close();
  }

  await browser.close();
  console.log(`\n${checks - failures} of ${checks} checks passed`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
