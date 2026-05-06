import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { getSampleData } from "@/lib/sample-data";
import { aggregateItems } from "@/lib/items";

export const dynamic = "force-static";

export default function Home() {
  const data = getSampleData();
  const items = aggregateItems(data);

  // Date range is computed from the sales rows alone — heatmap is sales-only.
  let minTime = Infinity;
  let maxTime = -Infinity;
  for (const r of data.sales) {
    if (r.time < minTime) minTime = r.time;
    if (r.time > maxTime) maxTime = r.time;
  }
  const fullStart = new Date(minTime * 1000);
  const fullEnd = new Date(maxTime * 1000);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#e0e0e0]">
          wowahdata
        </h1>
        <p className="text-sm text-[#999]">
          When does your AH actually clear? Sample: {data.realm} ·{" "}
          {data.sales.length.toLocaleString()} sales rows ·{" "}
          {fullStart.toLocaleDateString()} – {fullEnd.toLocaleDateString()}
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-[#666]">Loading…</p>}>
        <Dashboard
          sales={data.sales}
          items={items}
          fullStartIso={fullStart.toISOString()}
          fullEndIso={fullEnd.toISOString()}
          realm={data.realm}
        />
      </Suspense>

      <p className="text-xs text-[#666]">
        Upload zone, IndexedDB persistence, and secondary charts arrive in
        subsequent phases.
      </p>
    </main>
  );
}
