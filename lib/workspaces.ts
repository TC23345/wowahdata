// Workspace definitions (docs/forever/05-block-catalog.md §3).
//
// A workspace is data, not JSX: an ordered list of block ids and their size
// tokens. There is nowhere to write `{cond && <Block/>}`, so a workspace's
// geometry cannot depend on the item, range or data. Rows must pack fully at
// every arrangement; lib/__tests__/layout.test.ts enforces it.

import type { SizeToken } from "./layout";

export type WorkspaceId = "item" | "pipeline" | "portfolio";

/**
 * The seven primary charts. Each has a view switcher that changes what it
 * shows inside the same box, so breadth comes from views, not from more boxes.
 */
export type BlockId = "timing" | "price" | "outcomes" | "flow" | "pipeline" | "items" | "costs";

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

export type Placement = { id: BlockId; size: SizeToken; view?: ViewId };

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

export type WorkspaceDefinition = {
  id: WorkspaceId;
  label: string;
  question: string;
  /** What the subject combobox selects on this workspace. */
  subject: "item" | "pipeline" | "none";
  kpis: [KpiId, KpiId, KpiId, KpiId, KpiId, KpiId];
  /** Each placement can open on a different default view. */
  blocks: Placement[];
};

export const WORKSPACES: WorkspaceDefinition[] = [
  {
    id: "item",
    label: "Item",
    question: "When does this item move, and at what price?",
    subject: "item",
    kpis: [
      "kpi-revenue",
      "kpi-spend",
      "kpi-flip-margin",
      "kpi-off-ah-supply",
      "kpi-listing-success",
      "kpi-peak-hours",
    ],
    blocks: [
      { id: "timing", size: "XL", view: "heatmap" },
      { id: "price", size: "XL", view: "trades" },
      { id: "outcomes", size: "M", view: "time" },
      { id: "flow", size: "M", view: "net" },
    ],
  },
  {
    id: "pipeline",
    label: "Pipeline",
    question: "Does turning these inputs into those outputs make money?",
    subject: "pipeline",
    kpis: [
      "kpi-pipeline-sold",
      "kpi-pipeline-bought",
      "kpi-pipeline-margin",
      "kpi-pipeline-margin-pct",
      "kpi-listing-success",
      "kpi-top-output",
    ],
    blocks: [
      { id: "pipeline", size: "L", view: "balance" },
      { id: "flow", size: "M", view: "cumulative" },
      { id: "outcomes", size: "M", view: "by-item" },
    ],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    question: "Which items carry the business, and where does gold leak?",
    subject: "none",
    kpis: [
      "kpi-revenue",
      "kpi-spend",
      "kpi-net-flow",
      "kpi-concentration",
      "kpi-listing-success",
      "kpi-fees",
    ],
    blocks: [
      { id: "items", size: "XL", view: "table" },
      { id: "flow", size: "M", view: "cumulative" },
      { id: "costs", size: "M", view: "fees" },
      { id: "outcomes", size: "L", view: "by-item" },
    ],
  },
];

export function workspaceById(id: string | null): WorkspaceDefinition {
  return WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[0];
}

/** Map the old one-chart-per-tab URLs onto workspaces. */
export function workspaceForLegacyTab(tab: string | null): WorkspaceId | null {
  if (!tab) return null;
  if (tab === "cashflow" || tab === "sellthrough") return "portfolio";
  return "item";
}
