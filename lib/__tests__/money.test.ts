import { describe, expect, it } from "vitest";
import { axisUnitFor, formatMoney, moneyParts } from "../money";

describe("formatMoney", () => {
  it("shows copper only under one silver", () => {
    expect(formatMoney(47)).toBe("47c");
    expect(formatMoney(0)).toBe("0c");
  });
  it("shows silver and copper under one gold", () => {
    expect(formatMoney(840)).toBe("8s 40c");
    expect(formatMoney(805)).toBe("8s 05c");
  });
  it("shows gold and silver under 100 gold", () => {
    expect(formatMoney(65_200)).toBe("6g 52s");
    expect(formatMoney(65_299)).toBe("6g 52s");
  });
  it("shows whole gold with separators from 100 gold", () => {
    expect(formatMoney(12_340_000)).toBe("1,234g");
  });
  it("shows thousands of gold from 10,000 gold, with a spaced unit", () => {
    expect(formatMoney(337_122_605)).toBe("33.7k g");
  });
  it("signs negatives with a minus sign, and positives only when asked", () => {
    expect(formatMoney(-96_910_000)).toBe("−9,691g");
    expect(formatMoney(4_550_000, "always")).toBe("+455g");
    expect(formatMoney(0, "always")).toBe("0c");
  });
  it("never emits more than two parts", () => {
    for (const c of [1, 99, 100, 9_999, 10_000, 999_999, 1_000_000, 99_999_999, 100_000_000]) {
      expect(moneyParts(c).length).toBeLessThanOrEqual(2);
    }
  });
});

describe("axisUnitFor", () => {
  it("picks the largest unit the axis maximum reaches", () => {
    expect(axisUnitFor(240_000).unit).toBe("g");
    expect(axisUnitFor(1_800).unit).toBe("s");
    expect(axisUnitFor(60).unit).toBe("c");
  });
});
