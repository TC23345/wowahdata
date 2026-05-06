import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";

export const metadata = {
  title: "wowahdata — TSM accounting dashboard",
  description:
    "Drop your TradeSkillMaster CSVs and see when your AH actually clears. Per-item sale heatmap, P&L, sell-through. Your data never leaves your browser.",
};

export default function Home() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#e0e0e0]">
          wowahdata
        </h1>
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
