"use client";

import { Segmented } from "@/components/shell/Segmented";
import { SCOPE_LABEL, type Scope, type ViewId } from "@/lib/pages";

export type ViewOption = { value: ViewId; label: string };

/**
 * A segmented control when the block is wide enough, a select when it is not
 * (decided by the block's own width, never by data), followed by a divider.
 */
function CompactChoice<T extends string>({
  label,
  options,
  value,
  onChange,
  variant,
  attr,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  variant: "view" | "option";
  attr: Record<string, string>;
}) {
  return (
    <div className="flex flex-none items-center gap-2" {...attr}>
      <span className="view-seg">
        <Segmented label={label} value={value} onChange={onChange} options={options} variant={variant} />
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`view-select h-7 rounded-md border px-2 text-xs font-medium outline-none ${
          variant === "view" ? "border-[#3a4d44] bg-[#1f2a26] text-[#5dcaa5]" : "border-[#333] bg-[#1a1a1a] text-[#e0e0e0]"
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="toolbar-divider" aria-hidden="true" />
    </div>
  );
}

/**
 * The first control in a primary chart's toolbar. Switching views swaps the
 * block body inside the same box; the block's size, header and zones stay put.
 */
export function ViewSwitch({ views, value, onChange, title }: { views: ViewOption[]; value: ViewId; onChange: (v: ViewId) => void; title: string }) {
  return <CompactChoice label={`${title} view`} options={views} value={value} onChange={onChange} variant="view" attr={{ "data-view-switch": "" }} />;
}

/** On pages that can show more than one scope: this item, all conversions, or all items. */
export function ScopeSwitch({ scopes, value, onChange }: { scopes: Scope[]; value: Scope; onChange: (s: Scope) => void }) {
  return (
    <CompactChoice
      label="Scope"
      options={scopes.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
      value={value}
      onChange={onChange}
      variant="option"
      attr={{ "data-scope-switch": "" }}
    />
  );
}
