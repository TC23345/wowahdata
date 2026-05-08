"use client";

type Props = {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  title?: string;
  emphasize?: boolean;
  size?: "sm" | "md";
};

export function Card({
  label,
  value,
  sub,
  valueClass,
  title,
  emphasize,
  size = "md",
}: Props) {
  const valueSize = size === "sm" ? "text-base" : "text-lg";
  return (
    <div
      title={title}
      className={`rounded-md border p-3 transition-colors ${
        emphasize
          ? "border-accent bg-accent-soft"
          : "border-border bg-surface"
      } ${title ? "cursor-help" : ""}`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p
        className={`mt-1 ${valueSize} font-semibold tabular-nums ${
          valueClass ?? "text-text-primary"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-text-muted">{sub}</p>}
    </div>
  );
}
