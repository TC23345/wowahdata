"use client";

type Option<T extends string> = { value: T; label: string; disabled?: boolean };

type Props<T extends string> = {
  options: Option<T>[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
};

/** A single-line segmented control. Fixed height; never wraps. */
export function Segmented<T extends string>({ options, value, onChange, label, disabled, className }: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex h-7 flex-none items-center rounded-md border border-[#333] bg-[#1a1a1a] p-0.5 ${
        disabled ? "opacity-50" : ""
      } ${className ?? ""}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`h-6 whitespace-nowrap rounded px-2.5 text-xs transition-colors ${
              on ? "bg-[#3a3a3a] text-[#e0e0e0]" : "text-[#999] hover:text-[#e0e0e0]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
