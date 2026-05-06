# wowahdata

A public, client-side dashboard for WoW auction-house traders. Drop your **TradeSkillMaster Accounting CSVs** in and see when your AH actually clears.

**Your data never leaves your browser.** Parsing happens in-page with PapaParse, parsed rows persist to IndexedDB, and the only network request the app ever makes is loading its own JS and the optional sample dataset. Nothing posts anywhere.

## What you get

- **Per-item sale heatmap** (the hero) — day-of-week × hour-of-day grid showing when units actually move. Tue → Mon row order to match WoW reset.
- **Buys vs sells scatter** — bubble chart with quantity-scaled radii and seeded jitter, ported from the GPE Python reference.
- **Daily P&L** — bars (green/red) plus a cumulative line on a secondary axis. No double 5% deduction; TSM sale price is already net of the AH cut.
- **Price distribution** — buys vs sells overlaid in 0.25 g buckets.
- **Cash flow** — weekly stacked breakdown of Postage / Repairs / Money Transfers with a net line.
- **Sell-through** — per-item sold rows / (sold rows + expired rows). Slow movers (< 50% with ≥ 3 events) are flagged red.
- **Stat cards** — bought, sold (with avg received), expired, canceled, implied DE-sourced, net P&L.

URL search params (`?item=`, `?range=`, `?start=`, `?end=`, `?tab=`) make every view shareable.

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
npm test         # vitest, currently 37 cases
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
