"use client";

import { Segmented } from "@/components/shell/Segmented";
import type { ViewId } from "@/lib/workspaces";

export type ViewOption = { value: ViewId; label: string };

/**
 * The first control in a primary chart's toolbar. Switching views swaps the
 * block body inside the same box; the block's size, header and zones stay put.
 */
export function ViewSwitch({ views, value, onChange, title }: { views: ViewOption[]; value: ViewId; onChange: (v: ViewId) => void; title: string }) {
  return (
    <div className="flex flex-none items-center gap-2" data-view-switch>
      <span className="view-seg">
        <Segmented label={`${title} view`} value={value} onChange={onChange} options={views} variant="view" />
      </span>
      <select
        aria-label={`${title} view`}
        value={value}
        onChange={(e) => onChange(e.target.value as ViewId)}
        className="view-select h-7 rounded-md border border-[#3a4d44] bg-[#1f2a26] px-2 text-xs font-medium text-[#5dcaa5] outline-none"
      >
        {views.map((v) => (
          <option key={v.value} value={v.value}>
            {v.label}
          </option>
        ))}
      </select>
      <span className="toolbar-divider" aria-hidden="true" />
    </div>
  );
}
