import { describe, expect, it } from "vitest";
import { MAX_PINS, nextSort, togglePinIn } from "../prefs";

describe("nextSort", () => {
  it("makes the clicked column primary and keeps the previous primary as tie-breaker", () => {
    expect(nextSort([{ id: "revenue", dir: "desc" }], "sold")).toEqual([
      { id: "sold", dir: "desc" },
      { id: "revenue", dir: "desc" },
    ]);
  });
  it("flips direction when the primary is clicked again, keeping the tie-breaker", () => {
    expect(nextSort([{ id: "sold", dir: "desc" }, { id: "revenue", dir: "desc" }], "sold")).toEqual([
      { id: "sold", dir: "asc" },
      { id: "revenue", dir: "desc" },
    ]);
  });
  it("never keeps more than two keys and never repeats one", () => {
    const s = nextSort([{ id: "a", dir: "desc" }, { id: "b", dir: "desc" }], "b");
    expect(s).toEqual([{ id: "b", dir: "desc" }, { id: "a", dir: "desc" }]);
    expect(nextSort(s, "c")).toHaveLength(2);
  });
});

describe("togglePinIn", () => {
  it("adds, removes, and respects the cap", () => {
    expect(togglePinIn([], "Arcane Dust")).toEqual(["Arcane Dust"]);
    expect(togglePinIn(["Arcane Dust"], "Arcane Dust")).toEqual([]);
    const full = Array.from({ length: MAX_PINS }, (_, i) => `item ${i}`);
    expect(togglePinIn(full, "one more")).toBe(full);
  });
});
