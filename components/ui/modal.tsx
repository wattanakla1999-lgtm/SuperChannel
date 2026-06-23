import type { ReactNode } from "react";
import { classNames } from "@/lib/class-names";
import { useTranslations } from "next-intl";

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
};

export function Modal({ children, isOpen, onClose, title }: ModalProps) {
  const t = useTranslations("common");
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-4xl items-end justify-center sm:items-center">
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="modal-title"
          className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_30px_90px_-40px_rgba(8,47,73,0.65)]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
            <h2 id="modal-title" className="text-lg font-semibold text-slate-950 dark:text-slate-100">{title}</h2>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onClose}
            >
              {t("close")}
            </button>
          </div>
          <div
            className={classNames(
              "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
