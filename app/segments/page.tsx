import { SegmentsWorkspace } from "@/features/segments/components/segments-workspace";

export default function SegmentsPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white dark:bg-slate-900">
      <SegmentsWorkspace />
    </div>
  );
}
