"use client";

import { Component, type ReactNode } from "react";
import { BLOCKS } from "@/components/blocks/registry";
import { kpiValue, KPI_LABELS } from "@/components/blocks/kpis";
import type { BlockCtx } from "@/components/blocks/context";
import type { WorkspaceDefinition } from "@/lib/workspaces";
import { BlockShell, KpiCard, type BlockSlot } from "./BlockShell";

type Props = {
  workspace: WorkspaceDefinition;
  /** null while booting or when no data is loaded: the same grid renders. */
  ctx: BlockCtx | null;
  mode: "boot" | "empty" | "ready";
  stale: boolean;
};

/**
 * One grid for every state. With no data the workspace still renders every
 * block in place — loading while booting, unavailable when empty — so loading
 * or clearing data never changes the block list or the document height.
 */
export function Workspace({ workspace, ctx, mode, stale }: Props) {
  return (
    <div className="ws-grid" data-region="canvas-grid">
      {workspace.kpis.map((id, i) => {
        const slotId = `${id}-${i}`;
        if (!ctx || mode !== "ready") {
          return <KpiCard key={slotId} slotId={slotId} label={KPI_LABELS[id]} value="—" sub={mode === "empty" ? "no data loaded" : ""} loading={mode === "boot"} />;
        }
        const v = kpiValue(id, ctx);
        return <KpiCard key={slotId} slotId={slotId} label={v.label} value={v.value} sub={v.sub} />;
      })}
      {workspace.blocks.map((b) => {
        const def = BLOCKS[b.id];
        const slot: BlockSlot = { id: b.id, size: b.size };
        if (!ctx || mode !== "ready") {
          return (
            <BlockShell
              key={b.id}
              slot={slot}
              title={def.title}
              chrome={def.chrome}
              status={mode === "boot" ? { kind: "loading" } : { kind: "unavailable", message: "No data loaded. Drop your TSM Accounting export, or load the sample, from Manage data." }}
            />
          );
        }
        return (
          <BlockBoundary key={b.id} slot={slot} title={def.title} resetKey={`${ctx.item}|${ctx.range.start.getTime()}|${ctx.range.end.getTime()}`}>
            <def.Component slot={slot} ctx={ctx} stale={stale} />
          </BlockBoundary>
        );
      })}
    </div>
  );
}

/** A block that throws renders its error state in place; the rest keep working. */
class BlockBoundary extends Component<
  { slot: BlockSlot; title: string; resetKey: string; children: ReactNode },
  { failed: string | null; key: string }
> {
  state = { failed: null as string | null, key: this.props.resetKey };

  static getDerivedStateFromError(err: unknown) {
    return { failed: err instanceof Error ? err.message : "Unknown error" };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: string | null; key: string }) {
    return props.resetKey !== state.key ? { failed: null, key: props.resetKey } : null;
  }

  render() {
    if (this.state.failed) {
      const def = BLOCKS[this.props.slot.id as keyof typeof BLOCKS];
      return (
        <BlockShell
          slot={this.props.slot}
          title={this.props.title}
          chrome={def.chrome}
          status={{ kind: "error", message: `This block could not be computed: ${this.state.failed}` }}
        />
      );
    }
    return this.props.children;
  }
}
