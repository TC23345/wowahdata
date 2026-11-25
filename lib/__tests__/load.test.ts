import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadFiles } from "../load";

const FIX = "__fixtures__/nightslayer";

function readFixture(kind: string) {
  return {
    name: `Accounting_Nightslayer_${kind}.csv`,
    text: readFileSync(join(FIX, `Accounting_Nightslayer_${kind}.csv`), "utf8"),
  };
}

describe("loadFiles (Web Worker entry point)", () => {
  it("loads the full six-file Nightslayer fixture into LoadedData", () => {
    const result = loadFiles([
      readFixture("purchases"),
      readFixture("sales"),
      readFixture("expired"),
      readFixture("canceled"),
      readFixture("income"),
      readFixture("expenses"),
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.realm).toBe("Nightslayer");
    expect(result.data.purchases.length).toBe(11526);
    expect(result.data.sales.length).toBe(8511);
    expect(result.data.expired.length).toBe(327);
    expect(result.data.canceled.length).toBe(242);
    expect(result.data.income.length).toBe(17);
    expect(result.data.expenses.length).toBe(279);
  });

  it("loads a partial subset (just purchases + sales)", () => {
    const result = loadFiles([readFixture("purchases"), readFixture("sales")]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.expired).toEqual([]);
    expect(result.data.canceled).toEqual([]);
    expect(result.data.income).toEqual([]);
    expect(result.data.expenses).toEqual([]);
  });

  it("rejects multi-realm input", () => {
    const r = loadFiles([
      readFixture("sales"),
      { name: "Accounting_Mal'Ganis_purchases.csv", text: "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source\n" },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Multiple realms/);
  });

  it("rejects unrecognized filenames", () => {
    const r = loadFiles([{ name: "junk.csv", text: "" }]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Unrecognized/);
    expect(r.error).toContain("Accounting_<Realm>_<kind>.csv");
    expect(r.error).toContain("TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv");
  });

  describe("TSM desktop app Data Export files", () => {
    const BOM = "\uFEFF";
    const PS_HEADER =
      "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source";
    const EC_HEADER = "itemString,itemName,stackSize,quantity,player,time";
    const CF_HEADER = "type,amount,otherPlayer,player,time";
    const desktopFiles = [
      {
        name: "TSM_PvP_Sales_2026-11-25.csv",
        text: `${BOM}${PS_HEADER}\ni:22446,Greater Planar Essence,1,3,57807,Ånon,Clåude Code,1774928269,Auction\n`,
      },
      {
        name: "TSM_PvP_Buys_2026-11-25.csv",
        text: `${BOM}${PS_HEADER}\ni:22446,Greater Planar Essence,1,10,50000,Seller,Clåude Code,1774900000,Auction\ni:22446,Greater Planar Essence,1,2,51000,Seller,Clåude Code,1774900100,Auction\n`,
      },
      {
        name: "TSM_PvP_Cancelled_2026-11-25.csv",
        text: `${BOM}${EC_HEADER}\ni:22446,Greater Planar Essence,1,5,Clåude Code,1774928000\n`,
      },
      {
        name: "TSM_PvP_Expired_2026-11-25.csv",
        text: `${BOM}${EC_HEADER}\ni:22446,Greater Planar Essence,1,4,Clåude Code,1774928100\n`,
      },
      {
        name: "TSM_PvP_Income_2026-11-25.csv",
        text: `${BOM}${CF_HEADER}\nMoney Transfer,1500000,Ånon,Clåude Code,1774928269\n`,
      },
      {
        name: "TSM_PvP_Expense_2026-11-25.csv",
        text: `${BOM}${CF_HEADER}\nPostage,30,,Clåude Code,1774928269\n`,
      },
    ];

    it("loads all six BOM-prefixed files into the internal kinds", () => {
      const r = loadFiles(desktopFiles);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.data.realm).toBe("PvP");
      expect(r.data.sales).toHaveLength(1);
      expect(r.data.purchases).toHaveLength(2);
      expect(r.data.canceled).toHaveLength(1);
      expect(r.data.expired).toHaveLength(1);
      expect(r.data.income).toHaveLength(1);
      expect(r.data.expenses).toHaveLength(1);
      expect(r.data.sales[0]).toMatchObject({
        itemString: "i:22446",
        player: "Clåude Code",
        price: 57807,
        quantity: 3,
        time: 1774928269,
      });
      expect(r.data.canceled[0].quantity).toBe(5);
      expect(r.data.income[0].type).toBe("Money Transfer");
      expect(r.data.expenses[0].amount).toBe(30);
    });

    it("treats an addon file and a desktop file of the same kind as duplicates", () => {
      const r = loadFiles([
        { name: "Accounting_PvP_sales.csv", text: `${PS_HEADER}\n` },
        desktopFiles[0],
      ]);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toMatch(/Duplicate file for kind: sales/);
    });

    it("rejects desktop files from different realms in one batch", () => {
      const r = loadFiles([
        desktopFiles[0],
        { name: "TSM_Nightslayer_Buys_2026-11-25.csv", text: `${BOM}${PS_HEADER}\n` },
      ]);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error).toMatch(/Multiple realms/);
    });
  });
});
