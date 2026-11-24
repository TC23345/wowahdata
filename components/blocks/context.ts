import type { CashFlowRow, LoadedData } from "@/lib/csv";
import type { HeatmapTz } from "@/lib/heatmap";
import { displayName } from "@/lib/items";
import {
  allConversions,
  bucketAxis,
  buildLedger,
  computeRoles,
  ownCharacters,
  type BucketAxis,
  type DateRange,
  type LedgerRow,
  type PipelineSummary,
  type Role,
  type TradeSet,
} from "@/lib/insights";
import { filterForItem, type ItemFilteredData } from "@/lib/transform";
import type { WorkspaceDefinition } from "@/lib/workspaces";
import { LISTING_HOURS } from "@/lib/edition";

/** Everything a block may read. Blocks receive this and nothing else. */
export type BlockCtx = {
  data: LoadedData;
  workspace: WorkspaceDefinition;
  item: string;
  range: DateRange;
  axis: BucketAxis;
  tz: HeatmapTz;
  /** The active item, in range, all sources (blocks pick auction rows). */
  itemSet: ItemFilteredData;
  /** Every item, in range. */
  rangeSet: TradeSet & { income: CashFlowRow[]; expenses: CashFlowRow[] };
  /** The workspace's scope in range: the active item on Item, pipeline members on Pipeline, all items on Portfolio. */
  scopeSet: TradeSet;
  ledger: LedgerRow[];
  scopeLedger: LedgerRow[];
  pipeline: PipelineSummary;
  roles: Map<string, Role>;
  ownChars: Set<string>;
  listingHours: number[];
  selectItem: (name: string) => void;
};

function inRange<T extends { time: number }>(rows: T[], range: DateRange): T[] {
  const a = range.start.getTime() / 1000;
  const b = range.end.getTime() / 1000;
  return rows.filter((r) => r.time >= a && r.time <= b);
}

/** Work that depends only on the dataset, not on item, range or zone. */
export type DatasetDerived = { roles: Map<string, Role>; ownChars: Set<string> };

export function deriveDataset(data: LoadedData): DatasetDerived {
  return { roles: computeRoles(data), ownChars: ownCharacters(data) };
}

export function buildBlockContext(args: {
  data: LoadedData;
  derived: DatasetDerived;
  workspace: WorkspaceDefinition;
  item: string;
  range: DateRange;
  tz: HeatmapTz;
  selectItem: (name: string) => void;
}): BlockCtx {
  const { data, derived, workspace, item, range, tz, selectItem } = args;
  const rangeSet = {
    purchases: inRange(data.purchases, range),
    sales: inRange(data.sales, range),
    expired: inRange(data.expired, range),
    canceled: inRange(data.canceled, range),
    income: inRange(data.income, range),
    expenses: inRange(data.expenses, range),
  };
  const ledger = buildLedger(rangeSet, derived.roles);
  const member = (r: { itemName: string }) => (derived.roles.get(displayName(r)) ?? "flip") !== "flip";
  const itemSet = filterForItem(data, item, range);
  const scopeSet: TradeSet =
    workspace.id === "item"
      ? itemSet
      : workspace.id === "pipeline"
      ? {
          purchases: rangeSet.purchases.filter(member),
          sales: rangeSet.sales.filter(member),
          expired: rangeSet.expired.filter(member),
          canceled: rangeSet.canceled.filter(member),
        }
      : rangeSet;
  return {
    data,
    workspace,
    item,
    range,
    axis: bucketAxis(range),
    tz,
    itemSet,
    rangeSet,
    scopeSet,
    ledger,
    scopeLedger: workspace.id === "pipeline" ? ledger.filter((r) => r.role !== "flip") : ledger,
    pipeline: allConversions(ledger),
    roles: derived.roles,
    ownChars: derived.ownChars,
    listingHours: LISTING_HOURS,
    selectItem,
  };
}
