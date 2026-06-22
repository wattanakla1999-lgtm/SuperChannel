import { Button } from "./button";
import { Alert } from "./alert";
import { useTranslations } from "next-intl";

type ErrorStateProps = {
  actionLabel?: string;
  description?: string;
  message?: string;
  onAction?: () => void;
  testId?: string;
  title?: string;
};

export function ErrorState({
  actionLabel,
  description,
  message,
  onAction,
  testId,
  title,
}: ErrorStateProps) {
  const t = useTranslations("common");
  if (message && !title && !description && !actionLabel) {
    return <Alert tone="error">{message}</Alert>;
  }

  return (
    <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 py-6">
      <h3 className="text-lg font-semibold text-rose-950">
        {title ?? t("error")}
      </h3>
      <p className="mt-2 text-sm leading-6 text-rose-800">
        {description ?? message}
      </p>
      {actionLabel && onAction ? (
        <div className="mt-5">
          <Button className="w-full sm:w-auto" data-testid={testId} onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
