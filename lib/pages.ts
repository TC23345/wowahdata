// Page definitions. Each primary chart is its own page (docs/forever/00-overview.md).
//
// A page is data, not JSX: one chart in one `page`-sized box under the KPI
// strip. There is nowhere to write `{cond && <Block/>}`, so a page's geometry
// cannot depend on the item, range or data. lib/__tests__/layout.test.ts checks
// that every page packs into full rows at every arrangement.

import type { SizeToken } from "./layout";

/** The seven primary charts. Breadth comes from each chart's views, not from more boxes. */
export type BlockId = "timing" | "price" | "outcomes" | "flow" | "pipeline" | "items" | "costs";

export type PageId = BlockId;

export type ViewId =
  | "heatmap"
  | "windows"
  | "hours"
  | "trades"
  | "spread"
  | "range"
  | "time"
  | "by-item"
  | "cumulative"
  | "bucket"
  | "net"
  | "balance"
  | "roles"
  | "table"
  | "concentration"
  | "fees"
  | "houses";

/**
 * What a page's numbers are about: the active item, the generated "All
 * conversions" pipeline, or every item. The KPI strip and the chart both follow it.
 */
export type Scope = "item" | "pipeline" | "all";

export const SCOPE_LABEL: Record<Scope, string> = {
  item: "This item",
  pipeline: "All conversions",
  all: "All items",
};

export type KpiId =
  | "kpi-revenue"
  | "kpi-spend"
  | "kpi-flip-margin"
  | "kpi-off-ah-supply"
  | "kpi-listing-success"
  | "kpi-peak-hours"
  | "kpi-pipeline-sold"
  | "kpi-pipeline-bought"
  | "kpi-pipeline-margin"
  | "kpi-pipeline-margin-pct"
  | "kpi-top-output"
  | "kpi-net-flow"
  | "kpi-concentration"
  | "kpi-fees";

type Six = [KpiId, KpiId, KpiId, KpiId, KpiId, KpiId];

/** The KPI strip follows the scope, so a page's six cards always describe what its chart shows. */
export const KPIS_BY_SCOPE: Record<Scope, Six> = {
  item: ["kpi-revenue", "kpi-spend", "kpi-flip-margin", "kpi-off-ah-supply", "kpi-listing-success", "kpi-peak-hours"],
  pipeline: ["kpi-pipeline-sold", "kpi-pipeline-bought", "kpi-pipeline-margin", "kpi-pipeline-margin-pct", "kpi-listing-success", "kpi-top-output"],
  all: ["kpi-revenue", "kpi-spend", "kpi-net-flow", "kpi-concentration", "kpi-listing-success", "kpi-fees"],
};

export type PageDefinition = {
  id: PageId;
  /** Short label for the page tabs. */
  label: string;
  question: string;
  chart: BlockId;
  size: SizeToken;
  defaultView: ViewId;
  /** Scopes this page can show, default first. One entry means the scope is fixed. */
  scopes: Scope[];
};

export const PAGES: PageDefinition[] = [
  { id: "timing", label: "Timing", question: "When do this item's sales clear?", chart: "timing", size: "page", defaultView: "heatmap", scopes: ["item"] },
  { id: "price", label: "Price", question: "What did I pay, what did I get, and how did both move?", chart: "price", size: "page", defaultView: "trades", scopes: ["item"] },
  { id: "outcomes", label: "Outcomes", question: "Of what I listed, how much sold, expired or got pulled?", chart: "outcomes", size: "page", defaultView: "time", scopes: ["item", "pipeline", "all"] },
  { id: "flow", label: "Flow", question: "Is revenue keeping ahead of spend?", chart: "flow", size: "page", defaultView: "net", scopes: ["all", "pipeline", "item"] },
  { id: "pipeline", label: "Pipeline", question: "Does turning these inputs into those outputs make money?", chart: "pipeline", size: "page", defaultView: "balance", scopes: ["pipeline"] },
  { id: "items", label: "Items", question: "Which items carry the business?", chart: "items", size: "page", defaultView: "table", scopes: ["all"] },
  { id: "costs", label: "Costs", question: "What did trading cost besides the goods?", chart: "costs", size: "page", defaultView: "fees", scopes: ["all"] },
];

export function pageById(id: string | null | undefined): PageDefinition {
  return PAGES.find((p) => p.id === id) ?? PAGES[0];
}

export function scopeFor(page: PageDefinition, requested: string | null): Scope {
  return page.scopes.includes(requested as Scope) ? (requested as Scope) : page.scopes[0];
}

/** Map the old workspace (`?ws=`) and one-chart-per-tab (`?tab=`) URLs onto pages. */
export function pageForLegacyParams(ws: string | null, tab: string | null): PageId | null {
  if (ws === "pipeline") return "pipeline";
  if (ws === "portfolio") return "items";
  if (ws === "item") return "timing";
  switch (tab) {
    case "heatmap":
      return "timing";
    case "scatter":
    case "histogram":
      return "price";
    case "pnl":
      return "flow";
    case "cashflow":
      return "costs";
    case "sellthrough":
      return "outcomes";
    default:
      return null;
  }
}
