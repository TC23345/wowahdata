import { describe, it, expect } from "vitest";
import { realmFromFilename } from "../realm";

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
});
