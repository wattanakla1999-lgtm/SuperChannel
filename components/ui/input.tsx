import type { InputHTMLAttributes } from "react";
import { classNames } from "@/lib/class-names";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
};

export function Input({ className, error, ...props }: InputProps) {
  return (
    <input
      className={classNames(
        "h-11 w-full rounded-2xl border bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:ring-slate-800",
        error
          ? "border-rose-300 focus-visible:border-rose-400 dark:border-rose-700 dark:focus-visible:border-rose-500"
          : "border-slate-200 focus-visible:border-slate-400 dark:border-slate-700 dark:focus-visible:border-cyan-500",
        className,
      )}
      {...props}
    />
  );
}
