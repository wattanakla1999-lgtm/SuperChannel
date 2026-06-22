import type { ReactNode } from "react";
import { classNames } from "@/lib/class-names";

type AlertProps = {
  children: ReactNode;
  tone?: "error" | "info" | "success";
};

const toneClasses = {
  error: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300",
  info: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function Alert({ children, tone = "info" }: AlertProps) {
  return (
    <div
      className={classNames(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        toneClasses[tone],
      )}
    >
      {children}
    </div>
  );
}
