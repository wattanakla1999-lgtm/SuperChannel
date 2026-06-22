import { Alert } from "./alert";

type ToastProps = {
  message: string | null;
  tone?: "error" | "info" | "success";
};

export function Toast({ message, tone = "success" }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert tone={tone}>{message}</Alert>
    </div>
  );
}
