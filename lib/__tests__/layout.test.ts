import { describe, expect, it } from "vitest";
import { arrangementFor, blockHeight, layoutWorkspace, type SizeToken } from "../layout";
import { WORKSPACES } from "../workspaces";

const KPIS: SizeToken[] = ["kpi", "kpi", "kpi", "kpi", "kpi", "kpi"];

describe("arrangementFor", () => {
  it("switches on canvas width", () => {
    expect(arrangementFor(1393)).toBe("wide");
    expect(arrangementFor(960)).toBe("wide");
    expect(arrangementFor(959)).toBe("medium");
    expect(arrangementFor(600)).toBe("medium");
    expect(arrangementFor(599)).toBe("narrow");
  });
});

describe("blockHeight", () => {
  it("matches the size table in 04-layout-system.md", () => {
    expect(blockHeight("kpi", "wide")).toBe(88);
    expect(blockHeight("S", "wide")).toBe(388);
    expect(blockHeight("XL", "wide")).toBe(588);
    expect(blockHeight("kpi", "narrow")).toBe(80);
    expect(blockHeight("S", "narrow")).toBe(356);
    expect(blockHeight("XL", "narrow")).toBe(448);
  });
});

describe("layoutWorkspace", () => {
  it("reports a hole when a row does not fill", () => {
    expect(layoutWorkspace(["S", "S"], 1393).holes).toEqual([{ row: 0, emptyColumns: 4 }]);
  });

  for (const ws of WORKSPACES) {
    for (const width of [1393, 1053, 913, 773, 343]) {
      it(`${ws.id} packs into full rows at canvas width ${width}`, () => {
        const tokens = [...KPIS, ...ws.blocks.map((b) => b.size)];
        expect(layoutWorkspace(tokens, width).holes).toEqual([]);
      });
    }
  }

  it("places an XL block under the KPI strip at full width", () => {
    const { rects } = layoutWorkspace([...KPIS, "XL"], 1393);
    expect(rects[6]).toEqual({ x: 0, y: 100, w: 1393, h: 588 });
  });
});
