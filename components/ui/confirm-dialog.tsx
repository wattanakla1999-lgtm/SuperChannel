import { Button } from "./button";

type ConfirmDialogProps = {
  isOpen: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  isOpen,
  title = "คุณต้องการลบหรือไม่",
  description,
  confirmLabel = "ลบ",
  cancelLabel = "ยกเลิก",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.4)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_30px_90px_-40px_rgba(8,47,73,0.65)]"
      >
        <div className="px-6 pb-6 pt-6">
          <h2
            id="confirm-dialog-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            {title}
          </h2>

          {description && (
            <p
              id="confirm-dialog-desc"
              className="mt-2 text-sm text-slate-500 dark:text-slate-400"
            >
              {description}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={loading}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
