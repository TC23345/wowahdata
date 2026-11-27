# wowahdata

A public, client-side dashboard for **WoW Forever** auction-house traders. Drop your **TradeSkillMaster desktop Data Export** in and see when your AH actually clears.

**Your data never leaves your browser.** Parsing happens in-page with PapaParse, parsed rows persist to IndexedDB, and the only network requests the app ever makes are for its own JS and CSS. Nothing posts anywhere.

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

wowahdata reads only the **TSM desktop app's Data Export** for Game Mode **Forever**. The in-game addon's `Accounting_<Realm>_<kind>.csv` files are not accepted.

1. In the TSM desktop app, open **Data Export**.
2. Choose Game Mode **Forever** and your realm, then export. TSM writes six files, often as a zip:

   ```
   TSM_<Realm>_Sales_<YYYY-MM-DD>.csv
   TSM_<Realm>_Buys_<YYYY-MM-DD>.csv
   TSM_<Realm>_Cancelled_<YYYY-MM-DD>.csv
   TSM_<Realm>_Expired_<YYYY-MM-DD>.csv
   TSM_<Realm>_Income_<YYYY-MM-DD>.csv
   TSM_<Realm>_Expense_<YYYY-MM-DD>.csv
   ```

3. Load it, either way:
   - **Detect TSM export** (Chrome / Edge): opens a folder picker that starts on your Desktop (Windows, macOS, Linux). Confirm the folder once; later clicks rescan it and load the newest export set, loose CSVs or a `TSM*.zip`. The folder is remembered in your browser (forgotten by *Clear all data*) and files are only read locally.
   - **Drag and drop** (any browser): drop the `.zip` or any subset of the CSVs.

   The realm comes from the filename; multiple realms are supported via a switcher, one realm per upload.

The files start with a UTF-8 byte-order mark, which the parser strips. The dashboard opens on whichever item sold the most units in your data.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # vitest
npm run build    # production build (Turbopack)
npm run typecheck
```

The test data in `__fixtures__/forever/` is a synthetic Forever Data Export (realm `PvP`, four Tue–Mon weeks ending 2026-11-23, BOM-prefixed like the real files). It is made up, not real trading data. `node scripts/make-forever-fixture.mjs` regenerates it deterministically.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS v4 (CSS-first via `@theme`)
- visx for the heatmap, Chart.js for the rest
- PapaParse + idb-keyval, fflate for zipped exports
- Vitest + Testing Library

## License

MIT.
