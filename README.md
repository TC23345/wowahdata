# wowahdata

A public, client-side dashboard for WoW auction-house traders. Drop your **TradeSkillMaster Accounting CSVs** in and see when your AH actually clears.

**Your data never leaves your browser.** Parsing happens in-page with PapaParse, parsed rows persist to IndexedDB, and the only network request the app ever makes is loading its own JS and the optional sample dataset. Nothing posts anywhere.

## What you get

Three workspaces, each a fixed arrangement of blocks. Switching item, range or time zone changes the data inside the blocks, never their size or position.

- **Item** — *when does this item move, and at what price?* The hero is a day-of-week × hour **sale heatmap** (Tue → Mon rows to match the WoW reset) with per-day and per-hour marginals and a *Consistency* mode that separates repeat demand from one-off sales. Below it: **price over time** (buys left, sells right, area ∝ units), **best listing windows** for each auction duration, the weekly **buy vs sell spread**, and **listing outcomes** (sold / canceled / expired, by units).
- **Pipeline** — *does turning these inputs into those outputs make money?* A generated "All conversions" pipeline puts what you bought (gear, cloth) against what you sold (dust, essences, shards, bolts, bags), with spend vs revenue over time and outcomes by item.
- **Portfolio** — *which items carry the business?* A sortable **item ledger** of everything you traded, revenue concentration, fees and upkeep (transfers to your own characters kept out of the total), and a by-auction-house block that fills in on Forever datasets.

A six-card KPI strip heads each workspace. Revenue is never taxed twice: TSM sale prices are already net of the AH cut. Figures count auction rows only.

URL search params (`?ws=`, `?item=`, `?range=`, `?start=`, `?end=`, `?tz=`) make every view shareable.

### Layout

Geometry depends only on the workspace and the container width (`lib/layout.ts`, `app/globals.css`). Blocks pick one of five sizes and every state — loading, empty, error, unavailable, stale — paints the same box. `npm run check:geometry` drives the app in Chromium at four widths and fails if any bar or block moves by more than 0.5px. The design is in [`docs/forever/`](docs/forever/00-overview.md).

The auction-house components in `components/ah/` (results table, money display, item search) are original code whose structure follows the WoW: Forever auction house interface. No Blizzard code or art is included.

## Getting your data

In TSM Accounting → Export → CSV. You'll get six files:

```
Accounting_<Realm>_purchases.csv
Accounting_<Realm>_sales.csv
Accounting_<Realm>_expired.csv
Accounting_<Realm>_canceled.csv
Accounting_<Realm>_income.csv
Accounting_<Realm>_expenses.csv
```

Drop any subset into the upload zone. Realm is detected from the filename — multi-realm sessions are supported via a switcher.

## Sample data

Don't have a TSM export handy? Click **Load sample data** to load a scrubbed Nightslayer export covering Jan 21 → May 6, 2026 (~21k rows across all six files). Counterparty names are anonymized; the rest is genuine trading data.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest, currently 76 cases
npm run check:geometry   # with `npm run dev` running; BASE_URL defaults to http://localhost:3000
npm run build    # production build (Turbopack)
npm run typecheck
```

The fixture under `__fixtures__/nightslayer/` is the test data. `scripts/scrub-fixtures.mjs` re-derives it from a real export if you need to refresh — it deterministically maps every counterparty name to `Anon<N>` so the fixtures can be committed.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (CSS-first via `@theme`)
- visx for the heatmap, Chart.js for the rest
- PapaParse + idb-keyval
- Vitest + Testing Library

## License

MIT.
