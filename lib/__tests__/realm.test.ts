import { describe, it, expect } from "vitest";
import { ACCEPTED_FILENAME_PATTERNS, realmFromFilename } from "../realm";

describe("realmFromFilename", () => {
  it("parses Nightslayer sales filename", () => {
    expect(realmFromFilename("Accounting_Nightslayer_sales.csv")).toEqual({
      realm: "Nightslayer",
      kind: "sales",
    });
  });

  it("parses each of the six kinds", () => {
    for (const kind of [
      "purchases",
      "sales",
      "expired",
      "canceled",
      "income",
      "expenses",
    ]) {
      expect(realmFromFilename(`Accounting_Foo_${kind}.csv`)?.kind).toBe(kind);
    }
  });

  it("accepts realm names with apostrophes (Mal'Ganis)", () => {
    expect(realmFromFilename("Accounting_Mal'Ganis_purchases.csv")).toEqual({
      realm: "Mal'Ganis",
      kind: "purchases",
    });
  });

  it("accepts realm names with spaces (Earthen Ring)", () => {
    expect(realmFromFilename("Accounting_Earthen Ring_sales.csv")?.realm).toBe(
      "Earthen Ring",
    );
  });

  it("accepts realm names with hyphens (Area-52)", () => {
    expect(realmFromFilename("Accounting_Area-52_sales.csv")?.realm).toBe(
      "Area-52",
    );
  });

  it("rejects malformed filenames", () => {
    expect(realmFromFilename("foo.csv")).toBeNull();
    expect(realmFromFilename("Accounting__sales.csv")).toBeNull();
    expect(realmFromFilename("Accounting_Foo_unknown.csv")).toBeNull();
  });

  describe("TSM desktop app Data Export names", () => {
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
      expect(realmFromFilename("TSM_Nightslayer_Sales_2026-04-20.csv")).toEqual({
        realm: "Nightslayer",
        kind: "sales",
      });
      expect(realmFromFilename("TSM_Mal'Ganis_Buys_2026-04-20.csv")?.realm).toBe(
        "Mal'Ganis",
      );
    });

    it("rejects desktop names with a missing/bad date or unknown kind", () => {
      expect(realmFromFilename("TSM_PvP_Sales.csv")).toBeNull();
      expect(realmFromFilename("TSM_PvP_Sales_2026-1-25.csv")).toBeNull();
      expect(realmFromFilename("TSM_PvP_Purchases_2026-11-25.csv")).toBeNull();
      // Desktop kinds are capitalised; addon kinds are lowercase. No mixing.
      expect(realmFromFilename("TSM_PvP_sales_2026-11-25.csv")).toBeNull();
      expect(realmFromFilename("Accounting_PvP_Sales.csv")).toBeNull();
      expect(realmFromFilename("TSM__Sales_2026-11-25.csv")).toBeNull();
    });
  });

  it("lists both accepted patterns", () => {
    expect(ACCEPTED_FILENAME_PATTERNS).toEqual([
      "Accounting_<Realm>_<kind>.csv",
      "TSM_<Realm>_<Kind>_<YYYY-MM-DD>.csv",
    ]);
  });
});
