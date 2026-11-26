import { describe, it, expect } from "vitest";
import {
  aggregateItems,
  defaultItem,
  displayName,
  filterByDisplayName,
  searchItems,
  topItemChips,
  type ItemSummary,
} from "../items";
import { buildLoadedData } from "../parse";
import { loadFiles } from "../load";
import { SYNTHETIC_DE_GEAR, type LoadedData } from "../csv";
import { readAllFixtures } from "./fixture";

function loadFixtures(): LoadedData {
  const r = loadFiles(readAllFixtures());
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

function summary(p: Partial<ItemSummary> & { name: string }): ItemSummary {
  return { txnCount: 1, soldUnits: 0, isSynthetic: false, ...p };
}

describe("item aggregation + DE Gear synthetic bucket", () => {
  it("displayName collapses '?' into the synthetic name", () => {
    expect(displayName({ itemName: "?" })).toBe(SYNTHETIC_DE_GEAR);
    expect(displayName({ itemName: "Strange Dust" })).toBe("Strange Dust");
  });

  it("aggregateItems folds every '?' row under DE Gear", () => {
    const items = aggregateItems(loadFixtures());
    const synth = items.find((i) => i.name === SYNTHETIC_DE_GEAR);
    expect(synth).toBeTruthy();
    expect(synth!.isSynthetic).toBe(true);
    expect(synth!.txnCount).toBe(40);
    expect(items.some((i) => i.name === "?")).toBe(false);
  });

  it("aggregateItems sorts by txnCount descending", () => {
    const items = aggregateItems(loadFixtures());
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].txnCount).toBeGreaterThanOrEqual(items[i].txnCount);
    }
  });

  it("aggregateItems sums units sold per item", () => {
    const items = aggregateItems(loadFixtures());
    const byName = Object.fromEntries(items.map((i) => [i.name, i.soldUnits]));
    expect(byName["Strange Dust"]).toBe(1011);
    expect(byName["Linen Cloth"]).toBe(507);
    expect(byName[SYNTHETIC_DE_GEAR]).toBe(0);
  });

  it("searchItems excludes the synthetic DE Gear entry from text search", () => {
    const items = aggregateItems(loadFixtures());
    expect(searchItems(items, "?").some((i) => i.isSynthetic)).toBe(false);
    expect(searchItems(items, "dust").map((i) => i.name)).toEqual([
      "Strange Dust",
      "Illusion Dust",
    ]);
  });

  it("filterByDisplayName(SYNTHETIC) matches all '?' rows", () => {
    const filtered = filterByDisplayName(loadFixtures().purchases, SYNTHETIC_DE_GEAR);
    expect(filtered.length).toBe(40);
    expect(filtered.every((r) => r.itemName === "?")).toBe(true);
  });
});

describe("defaultItem (data-driven, no hardcoded item list)", () => {
  it("picks the top seller by units in the Forever fixture", () => {
    expect(defaultItem(aggregateItems(loadFixtures()))).toBe("Strange Dust");
  });

  it("is always an item that exists in the loaded data", () => {
    const loaded = buildLoadedData("PvP", {
      sales: [
        {
          itemString: "i:2589",
          itemName: "Linen Cloth",
          stackSize: 20,
          quantity: 3,
          price: 1200,
          otherPlayer: "Anon1",
          player: "Clåude Code",
          time: 1793065822,
          source: "Auction",
        },
      ],
    });
    expect(defaultItem(aggregateItems(loaded))).toBe("Linen Cloth");
  });

  it("prefers units sold over transaction count", () => {
    const items = [
      summary({ name: "Busy", txnCount: 50, soldUnits: 10 }),
      summary({ name: "Big", txnCount: 5, soldUnits: 200 }),
    ];
    expect(defaultItem(items)).toBe("Big");
  });

  it("falls back to the most-traded item when nothing sold", () => {
    const items = [
      summary({ name: "Bought A lot", txnCount: 9 }),
      summary({ name: "Bought less", txnCount: 2 }),
    ];
    expect(defaultItem(items)).toBe("Bought A lot");
  });

  it("returns null when there are no item rows", () => {
    expect(defaultItem([])).toBeNull();
    expect(defaultItem(aggregateItems(buildLoadedData("PvP", {})))).toBeNull();
  });
});

describe("topItemChips", () => {
  it("shows the top N items and always keeps DE Gear reachable", () => {
    const items = aggregateItems(loadFixtures());
    const chips = topItemChips(items, 3).map((i) => i.name);
    expect(chips.slice(0, 3)).toEqual(items.slice(0, 3).map((i) => i.name));
    expect(chips).toContain(SYNTHETIC_DE_GEAR);
  });

  it("does not duplicate DE Gear when it is already in the top N", () => {
    const items = [
      summary({ name: SYNTHETIC_DE_GEAR, txnCount: 9, isSynthetic: true }),
      summary({ name: "Other", txnCount: 1 }),
    ];
    expect(topItemChips(items, 5).map((i) => i.name)).toEqual([
      SYNTHETIC_DE_GEAR,
      "Other",
    ]);
  });
});
