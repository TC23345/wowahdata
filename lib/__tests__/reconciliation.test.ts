import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parsePurchaseSale } from "../parse";
import { copperToGold } from "../csv";

const FIX = "__fixtures__/nightslayer";

// Reconciliation: total Auction sale gold for Greater Planar Essence over the
// full fixture must equal what awk produces from the source CSV. The expected
// value below was computed at fixture-build time:
//   awk -F',' 'NR>1 && $2=="Greater Planar Essence" && $9=="Auction" {s+=$5*$4} END{printf "%.4f\n", s/10000}'
const EXPECTED_GPE_AUCTION_GOLD = 33712.2605;

describe("end-to-end reconciliation against awk", () => {
  it("GPE auction sale gold matches awk to 4 decimals", () => {
    const txt = readFileSync(
      join(FIX, "Accounting_Nightslayer_sales.csv"),
      "utf8",
    );
    const rows = parsePurchaseSale(txt);
    const sumGold = rows
      .filter((r) => r.itemName === "Greater Planar Essence" && r.source === "Auction")
      .reduce((s, r) => s + copperToGold(r.price * r.quantity), 0);
    expect(sumGold).toBeCloseTo(EXPECTED_GPE_AUCTION_GOLD, 4);
  });
});
