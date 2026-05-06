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
  });
});
