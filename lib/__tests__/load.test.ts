import { describe, it, expect } from "vitest";
import { loadFiles } from "../load";
import { readAllFixtures, readFixture } from "./fixture";

const BOM = "\uFEFF";
const PS_HEADER =
  "itemString,itemName,stackSize,quantity,price,otherPlayer,player,time,source";

describe("loadFiles (Web Worker entry point)", () => {
  it("loads the full six-file Forever fixture into LoadedData", () => {
    const result = loadFiles(readAllFixtures());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.realm).toBe("PvP");
    expect(result.data.sales.length).toBe(305);
    expect(result.data.purchases.length).toBe(220);
    expect(result.data.canceled.length).toBe(32);
    expect(result.data.expired.length).toBe(32);
    expect(result.data.income.length).toBe(6);
    expect(result.data.expenses.length).toBe(20);
  });

  it("parses past the BOM and keeps non-ASCII character names", () => {
    const result = loadFiles([readFixture("Sales")]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.data.sales[0];
    expect(first.itemString).toMatch(/^i:/);
    expect(result.data.sales.some((r) => r.player === "Clåude Code")).toBe(true);
    expect(result.data.sales.some((r) => r.player === "Bankälter")).toBe(true);
  });

  it("loads a partial subset (just Buys + Sales)", () => {
    const result = loadFiles([readFixture("Buys"), readFixture("Sales")]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.expired).toEqual([]);
    expect(result.data.canceled).toEqual([]);
    expect(result.data.income).toEqual([]);
    expect(result.data.expenses).toEqual([]);
  });

  it("rejects multi-realm input", () => {
    const r = loadFiles([
      readFixture("Sales"),
      { name: "TSM_Stormrage_Buys_2026-11-25.csv", text: `${BOM}${PS_HEADER}\n` },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Multiple realms/);
  });

  it("rejects two exports of the same kind", () => {
    const r = loadFiles([
      readFixture("Sales"),
      { name: "TSM_PvP_Sales_2026-11-18.csv", text: `${BOM}${PS_HEADER}\n` },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Duplicate file for kind: sales/);
  });

  it("rejects unrecognized filenames and names the expected pattern", () => {
    const r = loadFiles([{ name: "junk.csv", text: "" }]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Unrecognized/);
    expect(r.error).toContain("TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv");
  });

  it("rejects TSM addon Accounting_* files", () => {
    const r = loadFiles([
      { name: "Accounting_PvP_sales.csv", text: `${PS_HEADER}\n` },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Unrecognized filename: Accounting_PvP_sales\.csv/);
  });
});
