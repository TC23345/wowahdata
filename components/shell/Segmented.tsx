"use client";

type Option<T extends string> = { value: T; label: string; disabled?: boolean; /** Why it is disabled, shown on hover. */ reason?: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
  /** "view" marks a view switcher: it changes what the block shows, not how. */
  variant?: "option" | "view";
  /** Why the whole control is disabled, shown on hover. */
  disabledReason?: string;
};

/** A single-line segmented control. Fixed height; never wraps. */
export function Segmented<T extends string>({ options, value, onChange, label, disabled, className, variant = "option", disabledReason }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      title={disabled ? disabledReason : undefined}
      className={`inline-flex h-7 flex-none items-center rounded-md border border-[#333] bg-[#1a1a1a] p-0.5 ${
        disabled ? "opacity-50" : ""
      } ${className ?? ""}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <span key={o.value} className="inline-flex" title={o.disabled ? o.reason : undefined}>
          <button
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`h-6 whitespace-nowrap rounded px-2.5 text-xs transition-colors ${
              on
                ? variant === "view"
                  ? "bg-[#1f2a26] font-medium text-[#5dcaa5] shadow-[inset_0_0_0_1px_#3a4d44]"
                  : "bg-[#3a3a3a] text-[#e0e0e0]"
                : "text-[#999] hover:text-[#e0e0e0]"
            }`}
          >
            {o.label}
          </button>
          </span>
        );
      })}
    </div>
  );
}
