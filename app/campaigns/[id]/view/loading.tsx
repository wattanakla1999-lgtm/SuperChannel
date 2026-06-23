import { Spinner } from "@/components/ui/spinner";

export default function CampaignViewLoading() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center border-b border-slate-200/80 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="h-7 w-48 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
      </header>
      <main className="flex flex-1 items-center justify-center bg-slate-50 p-6 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">กำลังโหลดข้อมูลแคมเปญ...</span>
        </div>
      </main>
    </div>
  );
}
