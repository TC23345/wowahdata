// Workspace definitions (docs/forever/05-block-catalog.md §3).
//
// A workspace is data, not JSX: an ordered list of block ids and their size
// tokens. There is nowhere to write `{cond && <Block/>}`, so a workspace's
// geometry cannot depend on the item, range or data. Rows must pack fully at
// every arrangement; lib/__tests__/layout.test.ts enforces it.

import type { SizeToken } from "./layout";

export type WorkspaceId = "item" | "pipeline" | "portfolio";

export type BlockId =
  | "timing-heatmap"
  | "price-timeline"
  | "post-windows"
  | "spread"
  | "outcomes-trend"
  | "pipeline-balance"
  | "cumulative-flow"
  | "outcomes-by-item"
  | "item-ledger"
  | "concentration"
  | "house-split"
  | "fees";

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
  blocks: { id: BlockId; size: SizeToken }[];
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
      { id: "timing-heatmap", size: "XL" },
      { id: "price-timeline", size: "XL" },
      { id: "post-windows", size: "S" },
      { id: "spread", size: "S" },
      { id: "outcomes-trend", size: "S" },
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
      { id: "pipeline-balance", size: "L" },
      { id: "cumulative-flow", size: "M" },
      { id: "outcomes-by-item", size: "M" },
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
      { id: "item-ledger", size: "XL" },
      { id: "cumulative-flow", size: "M" },
      { id: "outcomes-by-item", size: "M" },
      { id: "concentration", size: "S" },
      { id: "house-split", size: "S" },
      { id: "fees", size: "S" },
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
