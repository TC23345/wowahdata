"use client";

import type { ComponentType } from "react";
import type { BlockId, ViewId } from "@/lib/pages";
import {
  OutcomesItemView,
  OutcomesTimeView,
  PriceRangeView,
  PriceSpreadView,
  PriceTradesView,
  TimingHeatmapView,
  TimingHoursView,
  TimingWindowsView,
} from "./ItemBlocks";
import {
  CostsFeesView,
  CostsHousesView,
  FlowBucketView,
  FlowCumulativeView,
  FlowNetView,
  ItemsConcentrationView,
  ItemsTableView,
  PipelineBalanceView,
  PipelineRolesView,
} from "./PortfolioBlocks";
import type { ViewProps } from "./types";

export type ViewDefinition = { value: ViewId; label: string; Component: ComponentType<ViewProps> };

export type PrimaryChartDefinition = {
  title: string;
  /** The question the chart answers; views answer it from different angles. */
  question: string;
  views: ViewDefinition[];
};

/**
 * The seven primary charts. A chart's size comes from the page that places
 * it; its title, zones and views come from here. Adding breadth means adding a
 * view to a chart, which costs no layout.
 */
export const BLOCKS: Record<BlockId, PrimaryChartDefinition> = {
  timing: {
    title: "Timing",
    question: "When do this item's sales clear?",
    views: [
      { value: "heatmap", label: "Heatmap", Component: TimingHeatmapView },
      { value: "windows", label: "Listing windows", Component: TimingWindowsView },
      { value: "hours", label: "Hour profile", Component: TimingHoursView },
    ],
  },
  price: {
    title: "Price",
    question: "What did I pay, what did I get, and how did both move?",
    views: [
      { value: "trades", label: "Trades", Component: PriceTradesView },
      { value: "spread", label: "Spread", Component: PriceSpreadView },
      { value: "range", label: "Range", Component: PriceRangeView },
    ],
  },
  outcomes: {
    title: "Listing outcomes",
    question: "Of what I listed, how much sold, expired or got pulled?",
    views: [
      { value: "time", label: "Over time", Component: OutcomesTimeView },
      { value: "by-item", label: "By item", Component: OutcomesItemView },
    ],
  },
  flow: {
    title: "Spend vs revenue",
    question: "Is revenue keeping ahead of spend?",
    views: [
      { value: "cumulative", label: "Cumulative", Component: FlowCumulativeView },
      { value: "bucket", label: "Per period", Component: FlowBucketView },
      { value: "net", label: "Net", Component: FlowNetView },
    ],
  },
  pipeline: {
    title: "Pipeline",
    question: "What goes in, what comes out, and what is left?",
    views: [
      { value: "balance", label: "Balance", Component: PipelineBalanceView },
      { value: "roles", label: "Roles", Component: PipelineRolesView },
    ],
  },
  items: {
    title: "Items",
    question: "Which items carry the business?",
    views: [
      { value: "table", label: "Table", Component: ItemsTableView },
      { value: "concentration", label: "Concentration", Component: ItemsConcentrationView },
    ],
  },
  costs: {
    title: "Costs",
    question: "What did trading cost besides the goods?",
    views: [
      { value: "fees", label: "Fees", Component: CostsFeesView },
      { value: "houses", label: "By auction house", Component: CostsHousesView },
    ],
  },
};
