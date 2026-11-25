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

    // Every view of every primary chart on the page, through whichever switcher
    // is showing (segmented when the block is wide, a select when it is narrow),
    // then back to the first view.
    const cycleViews = async (wsName, baseline) => {
      const blocks = await page.$$eval("[data-view-switch]", (els) => [...new Set(els.map((el) => el.closest("[data-block-id]").dataset.blockId))]);
      for (const id of blocks) {
        const sw = page.locator(`[data-block-id="${id}"] [data-view-switch]`);
        const select = sw.locator("select");
        const useSelect = await select.isVisible();
        const labels = useSelect
          ? await select.locator("option").allTextContents()
          : await sw.getByRole("radio").allTextContents();
        for (const label of [...labels.slice(1), labels[0]]) {
          await step(`${wsName}: ${id} view ${label}`, baseline, async () => {
            if (useSelect) await select.selectOption({ label });
            else await sw.getByRole("radio", { name: label, exact: true }).click();
          });
        }
      }
    };

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
      await page.waitForSelector('[data-block-id="timing"] [role=gridcell]', { timeout: 30000 });
    });

    const openPage = async (path, waitFor) => {
      await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
      await page.waitForSelector(waitFor, { timeout: 30000 });
      await settle(page);
      return snapshot(page);
    };

    // Same mechanism as cycleViews, for the scope switch on Outcomes and Flow.
    const cycleScopes = async (name, baseline) => {
      const sw = page.locator("[data-scope-switch]");
      if ((await sw.count()) === 0) return;
      const select = sw.locator("select");
      const useSelect = await select.isVisible();
      const labels = useSelect ? await select.locator("option").allTextContents() : await sw.getByRole("radio").allTextContents();
      for (const l of [...labels.slice(1), labels[0]]) {
        await step(`${name}: scope ${l}`, baseline, async () => {
          if (useSelect) await select.selectOption({ label: l });
          else await sw.getByRole("radio", { name: l, exact: true }).click();
        });
      }
    };

    // Timing page (also the root route)
    const timing = await snapshot(page);
    const quick = page.locator('[aria-label="Pinned items"] button');
    const nQuick = await quick.count();
    for (let i = 0; i < nQuick; i++) {
      const name = await quick.nth(i).getAttribute("title");
      await step(`quick slot: ${name}`, timing, () => quick.nth(i).click());
    }
    const combo = page.getByRole("combobox", { name: "Item" }).first();
    const visibleCombo = (await combo.isVisible()) ? combo : page.getByRole("combobox", { name: "Item" }).nth(1);
    await step("search a long item name", timing, async () => {
      await visibleCombo.click();
      await visibleCombo.fill("Pattern: Comfortable");
      await page.keyboard.press("Enter");
    });
    await step("open item list without choosing", timing, async () => {
      await visibleCombo.click();
      await settle(page);
      await page.keyboard.press("Escape");
    });
    for (const mode of ["Revenue", "Consistency", "Units"]) {
      await step(`heatmap mode ${mode}`, timing, () => page.getByRole("radio", { name: mode, exact: true }).first().click());
    }
    await step("hover heatmap cells", timing, async () => {
      const cells = page.locator('[data-block-id="timing"] [role=gridcell]');
      for (const i of [0, 30, 99, 167]) await cells.nth(i).hover({ force: true });
    });
    if (vp.width >= 600) {
      for (const r of ["7d", "30d", "90d", "This week", "All"]) {
        await step(`range ${r}`, timing, () => page.getByRole("radio", { name: r, exact: true }).first().click());
      }
      await step("open and close custom range", timing, async () => {
        const btn = page.getByRole("button", { name: /^Custom/ }).filter({ visible: true }).first();
        await btn.click();
        await settle(page);
        await page.keyboard.press("Escape");
      });
    }
    await step("range with no data for this item", timing, async () => {
      await page.goto(`${BASE}/timing?item=Mountain+Silversage&range=custom&start=2026-05-01&end=2026-05-06`, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-block-id="timing"]');
    });
    await cycleViews("timing", await openPage("/timing", '[data-block-id="timing"] [role=gridcell]'));

    // Price
    const price = await openPage("/price", '[data-block-id="price"] canvas');
    for (const w of ["Middle 90%", "Full", "Fit"]) {
      await step(`price window ${w}`, price, () => page.getByRole("radio", { name: w, exact: true }).first().click());
    }
    await cycleViews("price", price);

    // Outcomes: views, scopes, and the by-item sort
    const outcomes = await openPage("/outcomes", '[data-block-id="outcomes"]');
    await cycleViews("outcomes", outcomes);
    await cycleScopes("outcomes", outcomes);
    await openPage("/outcomes?view=by-item&scope=all", '[data-block-id="outcomes"] li');
    for (const sortBy of ["Canceled", "Expired", "Revenue"]) {
      await step(`outcomes sort ${sortBy}`, outcomes, () => page.getByRole("radio", { name: sortBy, exact: true }).first().click());
    }

    // Flow
    const flow = await openPage("/flow", '[data-block-id="flow"] canvas');
    await cycleViews("flow", flow);
    await cycleScopes("flow", flow);

    // Pipeline, Costs
    await cycleViews("pipeline", await openPage("/pipeline", '[data-block-id="pipeline"]'));
    await cycleViews("costs", await openPage("/costs", '[data-block-id="costs"]'));

    // Items: the auction-house style table
    const items = await openPage("/items", '[data-block-id="items"] [role=row]');
    for (const r of ["Outputs", "Inputs", "Flips", "All"]) {
      await step(`items role ${r}`, items, () => page.getByRole("radio", { name: r, exact: true }).first().click());
    }
    await step("items filter with no match", items, () => page.getByPlaceholder("Filter items").fill("zzzz"));
    await step("items filter cleared", items, () => page.getByPlaceholder("Filter items").fill(""));
    await step("items two-key sort and row click", items, async () => {
      await page.getByRole("button", { name: /^Sold/ }).first().click();
      await page.getByRole("button", { name: /^Role/ }).first().click();
      await page.locator('[data-block-id="items"] [role=row][aria-rowindex="3"]').click();
    });
    await step("items pin by star and by right-click", items, async () => {
      await page.locator('[data-block-id="items"] [role=row][aria-rowindex="4"] button[aria-pressed]').click();
      await page.locator('[data-block-id="items"] [role=row][aria-rowindex="5"]').click({ button: "right" });
    });
    await cycleViews("items", items);

    // Page switching: every page uses the same boxes, and the bars never move.
    const norm = (snap) =>
      Object.fromEntries(
        Object.entries(snap)
          .filter(([k]) => k !== "doc")
          .map(([k, v]) => [k.startsWith("block:") && !k.startsWith("block:kpi-") ? "block:chart" : k, v]),
      );
    const home = norm(await openPage("/timing", '[data-block-id="timing"] [role=gridcell]'));
    for (const label2 of ["Price", "Outcomes", "Flow", "Pipeline", "Items", "Costs", "Timing"]) {
      await page.getByRole("link", { name: label2, exact: true }).click();
      await page.waitForURL(new RegExp(`/${label2.toLowerCase()}`));
      await settle(page);
      const problems = diff(home, norm(await snapshot(page)));
      checks += 1;
      if (problems.length) {
        failures += 1;
        console.log(`FAIL ${label} switch to ${label2}\n  ${problems.slice(0, 6).join("\n  ")}`);
      } else console.log(`ok   ${label} switch to ${label2} page (same boxes)`);
    }

    // Each page remembers its last view.
    {
      await openPage("/timing", '[data-block-id="timing"] [role=gridcell]');
      const sw = page.locator('[data-block-id="timing"] [data-view-switch]');
      const select = sw.locator("select");
      if (await select.isVisible()) await select.selectOption({ label: "Hour profile" });
      else await sw.getByRole("radio", { name: "Hour profile", exact: true }).click();
      await settle(page);
      await page.getByRole("link", { name: "Price", exact: true }).click();
      await page.waitForURL(/\/price/);
      await page.getByRole("link", { name: "Timing", exact: true }).click();
      await page.waitForURL(/\/timing/);
      await settle(page);
      const remembered = (await select.isVisible())
        ? (await select.inputValue()) === "hours"
        : (await sw.getByRole("radio", { name: "Hour profile", exact: true }).getAttribute("aria-checked")) === "true";
      checks += 1;
      if (!remembered) {
        failures += 1;
        console.log(`FAIL ${label} Timing did not remember its view`);
      } else console.log(`ok   ${label} Timing remembers its view across pages`);
    }

    // Sticky bars: switching from a scrolled page must not pull the static bar back in.
    {
      await openPage("/timing?view=heatmap", '[data-block-id="timing"] [role=gridcell]');
      await page.evaluate(() => window.scrollTo(0, 600));
      await settle(page);
      const before = await page.evaluate(() => document.querySelector('[data-region="context-bar"]').getBoundingClientRect().top);
      // Click from inside the page: Playwright's own click scrolls a sticky
      // element into view by its unstuck position first, which would scroll the
      // page itself and hide what this checks.
      await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Charts"] a')].find((a) => a.textContent === "Costs").click());
      await page.waitForURL(/\/costs/);
      await settle(page);
      const after = await page.evaluate(() => document.querySelector('[data-region="context-bar"]').getBoundingClientRect().top);
      checks += 1;
      if (Math.abs(before - after) > TOL) {
        failures += 1;
        console.log(`FAIL ${label} scrolled switch moved sticky bars ${before} → ${after}`);
      } else console.log(`ok   ${label} scrolled switch to Costs (sticky bars stay at ${after}px)`);
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
