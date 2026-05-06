import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export const metadata = {
  title: "wowahdata — TSM accounting dashboard",
  description:
    "Drop your TradeSkillMaster CSVs and see when your AH actually clears. Per-item sale heatmap, P&L, sell-through. Your data never leaves your browser.",
};

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#e0e0e0]">
            wowahdata
          </h1>
          <span className="rounded-full bg-[#1f2a26] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#5dcaa5]">
            client-side only
          </span>
        </div>
        <p className="text-sm text-[#999]">
          When does your AH actually clear? Drop your TSM Accounting CSVs to find out.{" "}
          <span className="text-[#5dcaa5]">Your data never leaves your browser.</span>
        </p>
      </header>

      <Suspense fallback={<p className="text-sm text-[#666]">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
