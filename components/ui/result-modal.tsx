import { classNames } from "@/lib/class-names";
import { CheckCircle, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";

type ResultModalProps = {
  isOpen: boolean;
  tone: "success" | "error";
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  onClose: () => void;
};

const config = {
  success: {
    icon: CheckCircle,
    iconClass: "text-emerald-500 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    titleClass: "text-emerald-800 dark:text-emerald-200",
  },
  error: {
    icon: XCircle,
    iconClass: "text-rose-500 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    titleClass: "text-rose-800 dark:text-rose-200",
  },
};

export function ResultModal({
  isOpen,
  tone,
  title,
  description,
  children,
  confirmLabel = "ตกลง",
  onClose,
}: ResultModalProps) {
  if (!isOpen) return null;

  const { icon: Icon, iconClass, iconBg, titleClass } = config[tone];

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-modal-title"
        className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_30px_90px_-40px_rgba(8,47,73,0.65)]"
      >
        <div className="px-6 pb-6 pt-8 text-center">
          {/* Icon */}
          <div className={classNames("mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full", iconBg)}>
            <Icon className={classNames("h-8 w-8", iconClass)} />
          </div>

          {/* Title */}
          <h2
            id="result-modal-title"
            className={classNames("mb-2 text-lg font-semibold", titleClass)}
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}

          {/* Custom children */}
          {children && (
            <div className="mt-4 text-left">{children}</div>
          )}

          {/* Action */}
          <div className="mt-6">
            <Button variant="primary" className="w-full" onClick={onClose}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
