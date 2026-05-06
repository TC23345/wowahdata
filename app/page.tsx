import { SaleHeatmap } from "@/components/heatmap/SaleHeatmap";
import { getSampleData } from "@/lib/sample-data";
import { filterByDisplayName } from "@/lib/items";

export const dynamic = "force-static";

const HARDCODED_ITEM = "Arcane Dust";

export default function Home() {
  const data = getSampleData();
  const itemSales = filterByDisplayName(data.sales, HARDCODED_ITEM);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#e0e0e0]">
          wowahdata
        </h1>
        <p className="text-sm text-[#999]">
          When does your AH actually clear? Sample data: Nightslayer ·{" "}
          {data.sales.length.toLocaleString()} sales rows ·{" "}
          {new Date(data.sales[0].time * 1000).toLocaleDateString()}–
          {new Date(
            data.sales[data.sales.length - 1].time * 1000,
          ).toLocaleDateString()}
        </p>
      </header>

      <SaleHeatmap rows={itemSales} itemName={HARDCODED_ITEM} />

      <p className="text-xs text-[#666]">
        Hero view: per-item sale heatmap. Item selector, date-range tabs,
        upload zone, and secondary charts arrive in subsequent phases.
      </p>
    </main>
  );
}
