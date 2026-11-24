import { Suspense } from "react";
import { Dashboard, DashboardFallback } from "@/components/Dashboard";

export const metadata = {
  title: "wowahdata — TSM accounting dashboard",
  description:
    "Drop your TradeSkillMaster CSVs and see when your AH actually clears. Per-item sale heatmap, P&L, sell-through. Your data never leaves your browser.",
};

export default function Home() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}
