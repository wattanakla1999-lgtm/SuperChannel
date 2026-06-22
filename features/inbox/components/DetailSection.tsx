import { classNames } from "@/lib/class-names";
import { ThreadStatus } from "../types/inbox";
import { useTranslations } from "next-intl";

const statusClasses: Record<ThreadStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  resolved: "bg-slate-200 text-slate-700",
};

export default function DetailSection({
  badge = false,
  label,
  value,
}: {
  badge?: boolean;
  label: string;
  value: string;
}) {
  const t = useTranslations("inbox.filters");
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
        {label}
      </p>
      {badge ? (
        <span
          className={classNames(
            "inline-flex rounded-full px-3 py-2 text-sm font-semibold",
            statusClasses[value as ThreadStatus],
          )}
        >
          {t(value as ThreadStatus)}
        </span>
      ) : (
        <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{value}</p>
      )}
    </div>
  );
}
