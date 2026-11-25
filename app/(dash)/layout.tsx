import { Suspense, type ReactNode } from "react";
import { Dashboard, DashboardFallback } from "@/components/Dashboard";

// The dashboard lives in a layout shared by every chart route, so moving
// between /timing, /price, … keeps the loaded data, the shell and the scroll
// position: only the chart inside the page box changes. The route pages
// themselves render nothing; the active page comes from the URL segment.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={<DashboardFallback />}>
        <Dashboard />
      </Suspense>
      {children}
    </>
  );
}
