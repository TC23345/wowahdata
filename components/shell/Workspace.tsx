"use client";

import { Component, useState, type ReactNode } from "react";
import { BLOCKS } from "@/components/blocks/registry";
import { kpiValue, KPI_LABELS } from "@/components/blocks/kpis";
import type { BlockCtx } from "@/components/blocks/context";
import { PRIMARY_CHROME } from "@/components/blocks/types";
import { ViewSwitch } from "@/components/blocks/ViewSwitch";
import type { Placement, ViewId, WorkspaceDefinition } from "@/lib/workspaces";
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
 * chart in place — loading while booting, unavailable when empty — so loading
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
      {workspace.blocks.map((p) => {
        const def = BLOCKS[p.id];
        const slot: BlockSlot = { id: p.id, size: p.size };
        if (!ctx || mode !== "ready") {
          return (
            <BlockShell
              key={p.id}
              slot={slot}
              title={def.title}
              chrome={PRIMARY_CHROME}
              status={mode === "boot" ? { kind: "loading" } : { kind: "unavailable", message: "No data loaded. Drop your TSM Accounting export, or load the sample, from Manage data." }}
            />
          );
        }
        return <PrimaryChart key={`${workspace.id}:${p.id}`} placement={p} slot={slot} ctx={ctx} stale={stale} />;
      })}
    </div>
  );
}

/**
 * Holds a primary chart's current view. The view survives item, range and zone
 * changes; it resets to the placement's default when the workspace changes.
 */
function PrimaryChart({ placement, slot, ctx, stale }: { placement: Placement; slot: BlockSlot; ctx: BlockCtx; stale: boolean }) {
  const def = BLOCKS[placement.id];
  const [view, setView] = useState<ViewId>(placement.view ?? def.views[0].value);
  const current = def.views.find((v) => v.value === view) ?? def.views[0];
  const viewSwitch = <ViewSwitch views={def.views} value={current.value} onChange={setView} title={def.title} />;
  const View = current.Component;
  return (
    <BlockBoundary
      slot={slot}
      title={def.title}
      viewSwitch={viewSwitch}
      resetKey={`${current.value}|${ctx.item}|${ctx.range.start.getTime()}|${ctx.range.end.getTime()}`}
    >
      <View key={current.value} slot={slot} ctx={ctx} stale={stale} viewSwitch={viewSwitch} title={def.title} />
    </BlockBoundary>
  );
}

/** A view that throws renders its error state in place; the view switcher and every other chart keep working. */
class BlockBoundary extends Component<
  { slot: BlockSlot; title: string; viewSwitch: ReactNode; resetKey: string; children: ReactNode },
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
      return (
        <BlockShell
          slot={this.props.slot}
          title={this.props.title}
          chrome={PRIMARY_CHROME}
          toolbarLead={this.props.viewSwitch}
          status={{ kind: "error", message: `This view could not be computed: ${this.state.failed}` }}
        />
      );
    }
    return this.props.children;
  }
}
