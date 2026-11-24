# wowahdata

A public, client-side dashboard for WoW auction-house traders. Drop your **TradeSkillMaster Accounting CSVs** in and see when your AH actually clears.

**Your data never leaves your browser.** Parsing happens in-page with PapaParse, parsed rows persist to IndexedDB, and the only network request the app ever makes is loading its own JS and the optional sample dataset. Nothing posts anywhere.

## What you get

Seven primary charts, each with a view switcher, arranged into three workspaces. Switching item, range, time zone or view changes what a chart shows, never its size or position.

| Chart | Views |
| --- | --- |
| **Timing** | Heatmap (day × hour, Tue → Mon rows, with a *Consistency* mode) · Listing windows (the week as 168 hourly bars, best window per auction duration) · Hour profile (the average day; all days, weekdays or weekend) |
| **Price** | Trades (buys left, sells right, area ∝ units) · Spread (median buy → median sell per period) · Range (middle half of prices per period) |
| **Listing outcomes** | Over time · By item (sold / canceled / expired, by units) |
| **Spend vs revenue** | Cumulative · Per period · Net (with running total) |
| **Pipeline** | Balance (what went in against what came out) · Roles (inputs, outputs, flips) |
| **Items** | Table (sortable ledger of everything you traded) · Concentration (how few items carry 80%) |
| **Costs** | Fees (transfers to your own characters kept out) · By auction house (fills in on Forever datasets) |

- **Item** — *when does this item move, and at what price?* Timing and Price, then Outcomes and Net flow for the item.
- **Pipeline** — *does turning these inputs into those outputs make money?* Pipeline, then cumulative flow and outcomes by item for the member items.
- **Portfolio** — *which items carry the business?* Items, then flow, costs and outcomes by item across everything.

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
