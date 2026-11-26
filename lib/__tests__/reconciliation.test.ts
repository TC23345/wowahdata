import { describe, it, expect } from "vitest";
import { parsePurchaseSale } from "../parse";
import { copperToGold } from "../csv";
import { readFixture } from "./fixture";

// Reconciliation: total Auction sale gold for Strange Dust over the full
// Forever fixture must equal what awk produces from the source CSV:
//   awk -F',' 'NR>1 && $2=="Strange Dust" && $9=="Auction" {s+=$5*$4} END{printf "%.4f\n", s/10000}' \
//     __fixtures__/forever/TSM_PvP_Sales_2026-11-25.csv
// Sale price is already net of the AH cut, so there is no extra 5% deduction.
const EXPECTED_STRANGE_DUST_AUCTION_GOLD = 975.2018;

describe("end-to-end reconciliation against awk", () => {
  it("Strange Dust auction sale gold matches awk to 4 decimals", () => {
    const rows = parsePurchaseSale(readFixture("Sales").text);
    const sumGold = rows
      .filter((r) => r.itemName === "Strange Dust" && r.source === "Auction")
      .reduce((s, r) => s + copperToGold(r.price * r.quantity), 0);
    expect(sumGold).toBeCloseTo(EXPECTED_STRANGE_DUST_AUCTION_GOLD, 4);
  });
});
