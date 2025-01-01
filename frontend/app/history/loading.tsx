import { HistorySkeleton } from "@/components/history-skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto py-8">
      <HistorySkeleton />
    </div>
  );
}
