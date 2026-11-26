import { describe, it, expect } from "vitest";
import { ACCEPTED_FILENAME_PATTERN, realmFromFilename } from "../realm";

describe("realmFromFilename (TSM desktop Data Export only)", () => {
  const cases: [string, string][] = [
    ["TSM_PvP_Sales_2026-11-25.csv", "sales"],
    ["TSM_PvP_Buys_2026-11-25.csv", "purchases"],
    ["TSM_PvP_Cancelled_2026-11-25.csv", "canceled"],
    ["TSM_PvP_Expired_2026-11-25.csv", "expired"],
    ["TSM_PvP_Income_2026-11-25.csv", "income"],
    ["TSM_PvP_Expense_2026-11-25.csv", "expenses"],
  ];
  for (const [name, kind] of cases) {
    it(`maps ${name} to ${kind}`, () => {
      expect(realmFromFilename(name)).toEqual({ realm: "PvP", kind });
    });
  }

  it("takes the realm from the filename", () => {
    expect(realmFromFilename("TSM_Mal'Ganis_Buys_2026-04-20.csv")?.realm).toBe(
      "Mal'Ganis",
    );
    expect(realmFromFilename("TSM_Earthen Ring_Sales_2026-04-20.csv")?.realm).toBe(
      "Earthen Ring",
    );
    expect(realmFromFilename("TSM_Area-52_Sales_2026-04-20.csv")?.realm).toBe(
      "Area-52",
    );
  });

  it("rejects TSM addon Accounting_* exports", () => {
    for (const kind of ["purchases", "sales", "expired", "canceled", "income", "expenses"]) {
      expect(realmFromFilename(`Accounting_PvP_${kind}.csv`)).toBeNull();
    }
  });

  it("rejects names with a missing/bad date, unknown kind or wrong case", () => {
    expect(realmFromFilename("TSM_PvP_Sales.csv")).toBeNull();
    expect(realmFromFilename("TSM_PvP_Sales_2026-1-25.csv")).toBeNull();
    expect(realmFromFilename("TSM_PvP_Purchases_2026-11-25.csv")).toBeNull();
    expect(realmFromFilename("TSM_PvP_sales_2026-11-25.csv")).toBeNull();
    expect(realmFromFilename("TSM__Sales_2026-11-25.csv")).toBeNull();
    expect(realmFromFilename("TSM_PvP_Sales_2026-11-25.zip")).toBeNull();
    expect(realmFromFilename("foo.csv")).toBeNull();
  });

  it("names the accepted pattern", () => {
    expect(ACCEPTED_FILENAME_PATTERN).toBe("TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv");
  });
});
