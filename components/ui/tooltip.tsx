import * as React from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
}

export function Tooltip({ content, children, align = "center" }: TooltipProps) {
  const alignClasses = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0"
  };

  const arrowClasses = {
    left: "left-2",
    center: "left-1/2 -translate-x-1/2",
    right: "right-2"
  };

  return (
    <div className="group relative inline-flex items-center justify-center">
      {children || (
        <HelpCircle className="h-3.5 w-3.5 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
      )}
      <div className={`pointer-events-none absolute bottom-full z-50 mb-2 w-max max-w-[240px] opacity-0 transition-opacity group-hover:opacity-100 ${alignClasses[align]}`}>
        <div className="rounded bg-slate-900 px-2.5 py-1.5 text-xs leading-snug text-white shadow-md dark:bg-slate-100 dark:text-slate-900 whitespace-normal text-left">
          {content}
        </div>
        <div className={`absolute top-full -mt-[1px] border-4 border-transparent border-t-slate-900 dark:border-t-slate-100 ${arrowClasses[align]}`} />
      </div>
    </div>
  );
}
