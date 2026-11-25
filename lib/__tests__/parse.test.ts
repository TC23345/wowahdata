import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseCashFlow,
  parseExpiredCanceled,
  parsePurchaseSale,
  stripBom,
} from "../parse";
import { copperToGold } from "../csv";

const FIX = "__fixtures__/nightslayer";

describe("CSV parsing", () => {
  it("parses purchases with 9 columns and produces 11526 data rows", () => {
    const txt = readFileSync(join(FIX, "Accounting_Nightslayer_purchases.csv"), "utf8");
    const rows = parsePurchaseSale(txt);
    expect(rows.length).toBe(11526);
    expect(rows[0].itemString).toMatch(/^i:/);
    expect(typeof rows[0].time).toBe("number");
  });

  it("parses sales and produces 8511 data rows", () => {
    const txt = readFileSync(join(FIX, "Accounting_Nightslayer_sales.csv"), "utf8");
    const rows = parsePurchaseSale(txt);
    expect(rows.length).toBe(8511);
  });

  it("parses expired (327) and canceled (242)", () => {
    const exp = parseExpiredCanceled(
      readFileSync(join(FIX, "Accounting_Nightslayer_expired.csv"), "utf8"),
    );
    const can = parseExpiredCanceled(
      readFileSync(join(FIX, "Accounting_Nightslayer_canceled.csv"), "utf8"),
    );
    expect(exp.length).toBe(327);
    expect(can.length).toBe(242);
  });

  it("parses income (17) and expenses (279)", () => {
    const inc = parseCashFlow(
      readFileSync(join(FIX, "Accounting_Nightslayer_income.csv"), "utf8"),
    );
    const exp = parseCashFlow(
      readFileSync(join(FIX, "Accounting_Nightslayer_expenses.csv"), "utf8"),
    );
    expect(inc.length).toBe(17);
    expect(exp.length).toBe(279);
  });

  it("price is copper per unit — 64092 copper → 6.4092 gold", () => {
    const sample =
      "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source\n" +
      "i:22446,Greater Planar Essence,1,1,64092,Anon1,Bluemage,1775016038,Auction\n";
    const rows = parsePurchaseSale(sample);
    expect(rows[0].price).toBe(64092);
    expect(copperToGold(rows[0].price)).toBeCloseTo(6.4092, 4);
  });

  it("sale revenue = price × quantity / 10000 (no extra 5% deduction)", () => {
    const sample =
      "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source\n" +
      "i:22446,Greater Planar Essence,1,3,57807,Anon1,Bluemage,1774928269,Auction\n";
    const [row] = parsePurchaseSale(sample);
    const revenue = copperToGold(row.price * row.quantity);
    expect(revenue).toBeCloseTo(17.3421, 4);
  });

  it("source=COD parses without throwing", () => {
    const sample =
      "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source\n" +
      "i:22446,Greater Planar Essence,1,1,60000,Anon1,Bluemage,1775000000,COD\n";
    const [row] = parsePurchaseSale(sample);
    expect(row.source).toBe("COD");
  });

  it("header-only income CSV parses to []", () => {
    const txt = "type,amount,otherPlayer,player,time\n";
    expect(parseCashFlow(txt)).toEqual([]);
  });

  describe("UTF-8 byte-order mark (TSM desktop Data Export)", () => {
    const BOM = "\uFEFF";

    it("stripBom removes only a single leading BOM", () => {
      expect(stripBom(`${BOM}itemString,itemName`)).toBe("itemString,itemName");
      expect(stripBom("itemString,itemName")).toBe("itemString,itemName");
      expect(stripBom(`a${BOM}b`)).toBe(`a${BOM}b`);
    });

    it("parses a BOM-prefixed sales file with non-ASCII character names", () => {
      const txt =
        BOM +
        "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source\n" +
        "i:22446,Greater Planar Essence,1,3,57807,Ånon,Clåude Code,1774928269,Auction\n";
      const [row] = parsePurchaseSale(txt);
      expect(row.itemString).toBe("i:22446");
      expect(Object.keys(row)[0]).toBe("itemString");
      expect(row.player).toBe("Clåude Code");
      expect(row.otherPlayer).toBe("Ånon");
      expect(row.time).toBe(1774928269);
      // Price stays as exported: already net of the AH cut, copper per unit.
      expect(row.price).toBe(57807);
    });

    it("parses a BOM-prefixed cancelled file", () => {
      const txt =
        BOM +
        "itemString,itemName,stackSize,quantity,player,time\n" +
        "i:22446,Greater Planar Essence,1,5,Clåude Code,1774928269\n";
      const [row] = parseExpiredCanceled(txt);
      expect(row).toEqual({
        itemString: "i:22446",
        itemName: "Greater Planar Essence",
        stackSize: 1,
        quantity: 5,
        player: "Clåude Code",
        time: 1774928269,
      });
    });

    it("parses a BOM-prefixed income file (first column is `type`)", () => {
      const txt =
        BOM +
        "type,amount,otherPlayer,player,time\n" +
        "Money Transfer,1500000,Ånon,Clåude Code,1774928269\n";
      const [row] = parseCashFlow(txt);
      expect(row.type).toBe("Money Transfer");
      expect(row.amount).toBe(1500000);
    });
  });
});
