import { describe, it, expect } from "vitest";
import { strToU8, zipSync } from "fflate";
import { extractExportCsvs, isZipName, pickLatestExport } from "../export-files";
import { loadFiles } from "../load";
import { parseExportFilename } from "../realm";
import { readAllFixtures } from "./fixture";

const KINDS = ["Sales", "Buys", "Cancelled", "Expired", "Income", "Expense"];
// Vitest runs under jsdom, whose Uint8Array differs from Node's; fflate's
// instanceof check needs the jsdom one.
const u8 = (text: string) => new Uint8Array(strToU8(text));

const set = (realm: string, date: string, t: number, kinds = KINDS) =>
  kinds.map((k) => ({ name: `TSM_${realm}_${k}_${date}.csv`, lastModified: t }));

describe("parseExportFilename", () => {
  it("returns realm, internal kind and the export date", () => {
    expect(parseExportFilename("TSM_PvP_Buys_2026-11-25.csv")).toEqual({
      realm: "PvP",
      kind: "purchases",
      date: "2026-11-25",
    });
    expect(parseExportFilename("Accounting_PvP_sales.csv")).toBeNull();
  });
});

describe("pickLatestExport (what Detect loads from a folder)", () => {
  it("returns null when the folder has no Data Export files", () => {
    expect(pickLatestExport([])).toBeNull();
    expect(
      pickLatestExport([
        { name: "notes.txt", lastModified: 1 },
        { name: "Accounting_PvP_sales.csv", lastModified: 1 },
      ]),
    ).toBeNull();
  });

  it("picks the newest export date and ignores older exports", () => {
    const pick = pickLatestExport([
      ...set("PvP", "2026-11-18", 100),
      ...set("PvP", "2026-11-25", 50),
      { name: "screenshot.png", lastModified: 999 },
    ]);
    expect(pick).toEqual({
      realm: "PvP",
      date: "2026-11-25",
      names: set("PvP", "2026-11-25", 0).map((f) => f.name).sort(),
    });
  });

  it("on the same date, prefers the realm with more of the six files", () => {
    const pick = pickLatestExport([
      ...set("PvP", "2026-11-25", 10, ["Sales", "Buys"]),
      ...set("Stormrage", "2026-11-25", 5),
    ]);
    expect(pick?.realm).toBe("Stormrage");
    expect(pick?.names).toHaveLength(6);
  });

  it("then prefers the most recently written set", () => {
    const pick = pickLatestExport([
      ...set("PvP", "2026-11-25", 10),
      ...set("Stormrage", "2026-11-25", 20),
    ]);
    expect(pick?.realm).toBe("Stormrage");
  });

  it("keeps one file per kind, so the result always loads", () => {
    const pick = pickLatestExport([
      { name: "TSM_PvP_Sales_2026-11-25.csv", lastModified: 1 },
      { name: "TSM_PvP_Sales_2026-11-25.csv", lastModified: 2 },
    ]);
    expect(pick?.names).toEqual(["TSM_PvP_Sales_2026-11-25.csv"]);
  });
});

describe("zipped exports", () => {
  it("isZipName matches .zip case-insensitively", () => {
    expect(isZipName("TSM_Export.ZIP")).toBe(true);
    expect(isZipName("TSM_PvP_Sales_2026-11-25.csv")).toBe(false);
  });

  it("extracts the six CSVs from a zip (any folder depth), BOM and all", () => {
    const fixtures = readAllFixtures();
    const zip = zipSync({
      "TSM Export/": {},
      ...Object.fromEntries(
        fixtures.map((f) => [`TSM Export/${f.name}`, u8(f.text)]),
      ),
      "TSM Export/readme.txt": u8("not an export"),
    });
    const inputs = extractExportCsvs(zip);
    expect(inputs.map((i) => i.name).sort()).toEqual(
      fixtures.map((f) => f.name).sort(),
    );
    const r = loadFiles(inputs);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.realm).toBe("PvP");
    expect(r.data.sales).toHaveLength(305);
    expect(r.data.sales.some((s) => s.player === "Clåude Code")).toBe(true);
  });

  it("returns nothing for a zip without Data Export files", () => {
    expect(extractExportCsvs(zipSync({ "a.txt": u8("x") }))).toEqual([]);
  });
});
