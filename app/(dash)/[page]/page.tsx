import { notFound } from "next/navigation";
import { PAGES } from "@/lib/pages";

// One route per chart: /timing, /price, /outcomes, /flow, /pipeline, /items,
// /costs. All are prerendered. The dashboard is rendered by the shared layout
// and reads the active page from this segment.
export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((p) => ({ page: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = PAGES.find((p) => p.id === page);
  return { title: def ? `${def.label} — wowahdata` : "wowahdata" };
}

export default async function ChartPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGES.some((p) => p.id === page)) notFound();
  return null;
}
