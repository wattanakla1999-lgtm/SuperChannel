import { classNames } from "@/lib/class-names";

type StatusBadgeProps = {
  children: string;
  tone:
    | "coming_soon"
    | "connected"
    | "disconnected"
    | "draft"
    | "error"
    | "expired"
    | "failed"
    | "open"
    | "pending"
    | "published"
    | "resolved"
    | "scheduled";
};

const toneClasses = {
  coming_soon: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  connected: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  disconnected: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  draft: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  error: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  expired: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  open: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  published: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  resolved: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  scheduled: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
};

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize",
        toneClasses[tone],
      )}
    >
      {children}
    </span>
  );
}
