"use client";

import { Component, type ReactNode } from "react";
import { BLOCKS } from "@/components/blocks/registry";
import { kpiValue, KPI_LABELS } from "@/components/blocks/kpis";
import type { BlockCtx } from "@/components/blocks/context";
import { PRIMARY_CHROME } from "@/components/blocks/types";
import { ScopeSwitch, ViewSwitch } from "@/components/blocks/ViewSwitch";
import { KPIS_BY_SCOPE, type PageDefinition, type Scope, type ViewId } from "@/lib/pages";
import { BlockShell, KpiCard, type BlockSlot } from "./BlockShell";

type Props = {
  page: PageDefinition;
  scope: Scope;
  view: ViewId;
  onView: (v: ViewId) => void;
  onScope: (s: Scope) => void;
  /** null while booting or when no data is loaded: the same grid renders. */
  ctx: BlockCtx | null;
  mode: "boot" | "empty" | "ready";
  stale: boolean;
};

/**
 * A page is the KPI strip plus one chart in one page-sized box. The same grid
 * renders in every state — loading while booting, unavailable when empty — so
 * loading or clearing data never changes the boxes or the document height.
 */
export function PageView({ page, scope, view, onView, onScope, ctx, mode, stale }: Props) {
  const def = BLOCKS[page.chart];
  const slot: BlockSlot = { id: page.chart, size: page.size };
  const current = def.views.find((v) => v.value === view) ?? def.views[0];
  const lead = (
    <>
      <ViewSwitch views={def.views} value={current.value} onChange={onView} title={def.title} />
      {page.scopes.length > 1 && <ScopeSwitch scopes={page.scopes} value={scope} onChange={onScope} />}
    </>
  );
  const View = current.Component;

  return (
    <div className="ws-grid" data-region="canvas-grid">
      {KPIS_BY_SCOPE[scope].map((id, i) => {
        const slotId = `kpi-${i}`;
        if (!ctx || mode !== "ready") {
          return <KpiCard key={slotId} slotId={slotId} label={KPI_LABELS[id]} value="—" sub={mode === "empty" ? "no data loaded" : ""} loading={mode === "boot"} />;
        }
        const v = kpiValue(id, ctx);
        return <KpiCard key={slotId} slotId={slotId} label={v.label} value={v.value} sub={v.sub} />;
      })}
      {!ctx || mode !== "ready" ? (
        <BlockShell
          slot={slot}
          title={def.title}
          chrome={PRIMARY_CHROME}
          toolbarLead={lead}
          status={mode === "boot" ? { kind: "loading" } : { kind: "unavailable", message: "No data loaded. Drop your TSM Accounting export, or load the sample, from Manage data." }}
        />
      ) : (
        <BlockBoundary slot={slot} title={def.title} lead={lead} resetKey={`${page.id}|${current.value}|${scope}|${ctx.item}|${ctx.range.start.getTime()}|${ctx.range.end.getTime()}`}>
          <View key={`${page.id}:${current.value}`} slot={slot} ctx={ctx} stale={stale} viewSwitch={lead} title={def.title} />
        </BlockBoundary>
      )}
    </div>
  );
}

/** A view that throws renders its error state in place; the switchers keep working. */
class BlockBoundary extends Component<
  { slot: BlockSlot; title: string; lead: ReactNode; resetKey: string; children: ReactNode },
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
          toolbarLead={this.props.lead}
          status={{ kind: "error", message: `This view could not be computed: ${this.state.failed}` }}
        />
      );
    }
    return this.props.children;
  }
}
