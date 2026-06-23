import { Spinner } from "./spinner";

type LoadingOverlayProps = {
  isOpen: boolean;
  message?: string;
};

export function LoadingOverlay({ isOpen, message = "กำลังโหลด...." }: LoadingOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/50 backdrop-blur-sm">
      <Spinner className="h-10 w-10 text-white" />
      {message && (
        <p className="text-sm font-medium text-white/90">{message}</p>
      )}
    </div>
  );
}
