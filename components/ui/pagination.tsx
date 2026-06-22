import { Button } from "./button";
import { classNames } from "@/lib/class-names";
import { useTranslations } from "next-intl";

type PaginationProps = {
  className?: string;
  onPageChange: (page: number) => void;
  page: number;
  testId?: string;
  totalPages: number;
};

function getVisiblePages(page: number, totalPages: number) {
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  const pages = [];

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return Array.from(new Set(pages));
}

export function Pagination({
  className,
  onPageChange,
  page,
  testId,
  totalPages,
}: PaginationProps) {
  const t = useTranslations("common");
  if (totalPages <= 1) {
    return null;
  }

  const pages = getVisiblePages(page, totalPages);

  return (
    <nav
      aria-label={t("pageOf", { page, total: totalPages })}
      className={classNames("flex flex-wrap items-center gap-2", className)}
      data-testid={testId}
    >
      <Button
        className="w-auto min-w-24"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        variant="secondary"
      >
        {t("previousPage")}
      </Button>
      <div className="flex items-center gap-2">
        {pages.map((currentPage, index) => {
          const previousPage = pages[index - 1];
          const shouldShowGap =
            typeof previousPage === "number" && currentPage - previousPage > 1;

          return (
            <div key={currentPage} className="flex items-center gap-2">
              {shouldShowGap ? (
                <span className="px-1 text-sm text-slate-400">...</span>
              ) : null}
              <button
                type="button"
                aria-current={currentPage === page ? "page" : undefined}
                className={classNames(
                  "flex h-11 min-w-11 items-center justify-center rounded-2xl border px-3 text-sm font-semibold transition",
                  currentPage === page
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
                onClick={() => onPageChange(currentPage)}
              >
                {currentPage}
              </button>
            </div>
          );
        })}
      </div>
      <Button
        className="w-auto min-w-24"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        variant="secondary"
      >
        {t("nextPage")}
      </Button>
    </nav>
  );
}
