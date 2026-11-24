"use client";

import type { ComponentType } from "react";
import type { Chrome } from "@/components/shell/BlockShell";
import type { BlockId } from "@/lib/workspaces";
import {
  HEATMAP_CHROME,
  OUTCOMES_TREND_CHROME,
  PRICE_CHROME,
  PostWindowsBlock,
  PriceTimelineBlock,
  SPREAD_CHROME,
  SpreadBlock,
  TimingHeatmapBlock,
  OutcomesTrendBlock,
  WINDOWS_CHROME,
} from "./ItemBlocks";
import {
  CONCENTRATION_CHROME,
  ConcentrationBlock,
  CumulativeFlowBlock,
  FEES_CHROME,
  FLOW_CHROME,
  FeesBlock,
  HOUSE_CHROME,
  HouseSplitBlock,
  ItemLedgerBlock,
  LEDGER_CHROME,
  OUTCOMES_ITEM_CHROME,
  OutcomesByItemBlock,
  PIPELINE_CHROME,
  PipelineBalanceBlock,
} from "./PortfolioBlocks";
import type { BlockProps } from "./types";

export type BlockDefinition = {
  title: string;
  chrome: Chrome;
  Component: ComponentType<BlockProps>;
};

/**
 * Adding a block is one entry here, one component, and one line in a
 * workspace definition (lib/workspaces.ts). Size is declared by the workspace;
 * title and chrome by the block, so the shell can paint the right box before
 * there is any data.
 */
export const BLOCKS: Record<BlockId, BlockDefinition> = {
  "timing-heatmap": { title: "When your sales cleared", chrome: HEATMAP_CHROME, Component: TimingHeatmapBlock },
  "price-timeline": { title: "Price over time", chrome: PRICE_CHROME, Component: PriceTimelineBlock },
  "post-windows": { title: "Best listing windows", chrome: WINDOWS_CHROME, Component: PostWindowsBlock },
  spread: { title: "Buy vs sell spread", chrome: SPREAD_CHROME, Component: SpreadBlock },
  "outcomes-trend": { title: "Listing outcomes", chrome: OUTCOMES_TREND_CHROME, Component: OutcomesTrendBlock },
  "pipeline-balance": { title: "Inputs and outputs", chrome: PIPELINE_CHROME, Component: PipelineBalanceBlock },
  "cumulative-flow": { title: "Spend vs revenue", chrome: FLOW_CHROME, Component: CumulativeFlowBlock },
  "outcomes-by-item": { title: "Outcomes by item", chrome: OUTCOMES_ITEM_CHROME, Component: OutcomesByItemBlock },
  "item-ledger": { title: "Items", chrome: LEDGER_CHROME, Component: ItemLedgerBlock },
  concentration: { title: "Revenue concentration", chrome: CONCENTRATION_CHROME, Component: ConcentrationBlock },
  "house-split": { title: "By auction house", chrome: HOUSE_CHROME, Component: HouseSplitBlock },
  fees: { title: "Fees and upkeep", chrome: FEES_CHROME, Component: FeesBlock },
};
