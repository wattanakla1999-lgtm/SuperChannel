"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import { Segment } from "../types/segments";
import { segmentsApiClient } from "../services/segments-api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Archive, Pen, Clock, MoreHorizontal, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { classNames } from "@/lib/class-names";

interface SegmentListProps {
  onEdit: (segmentId: string) => void;
}

function ActionMenu({
  onEdit,
  onDuplicate,
  onArchive,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          "flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white transition-all shadow-sm",
          "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200",
          open && "bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-200"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
            onClick={() => { onEdit(); setOpen(false); }}
          >
            <Pen className="h-3.5 w-3.5 text-slate-400" />
            แก้ไขเงื่อนไข
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
            onClick={() => { onDuplicate(); setOpen(false); }}
          >
            <Copy className="h-3.5 w-3.5 text-slate-400" />
            ทำสำเนา
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <button
            type="button"
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => { onArchive(); setOpen(false); }}
          >
            <Archive className="h-3.5 w-3.5" />
            เก็บถาวร
          </button>
        </div>
      )}
    </div>
  );
}

export function SegmentList({ onEdit }: SegmentListProps) {
  const t = useTranslations("segments");
  const tCommon = useTranslations("common");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveSegmentId, setArchiveSegmentId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const fetchSegments = async (currentPage = 1, search = debouncedSearch) => {
    setIsLoading(true);
    try {
      const res = await segmentsApiClient.getSegments({ page: currentPage, limit: 20, search });
      setSegments(res.data);
      setTotal(res.total);
    } catch {
      alert(t("errorLoadingSegments"));
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when page or debounced search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSegments(page, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const handleDuplicate = async (id: string) => {
    try {
      await segmentsApiClient.duplicateSegment(id);
      fetchSegments(page, debouncedSearch);
    } catch {
      alert(t("errorDuplicatingSegment"));
    }
  };

  const handleArchive = async () => {
    if (!archiveSegmentId) return;
    try {
      await segmentsApiClient.archiveSegment(archiveSegmentId);
      fetchSegments(page, debouncedSearch);
    } catch {
      alert(t("errorArchivingSegment"));
    } finally {
      setArchiveSegmentId(null);
    }
  };

  if (isLoading && segments.length === 0) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
        {tCommon("loading")}
      </div>
    );
  }

  if (segments.length === 0 && debouncedSearch) {
    return (
      <div className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="p-2">
          <EmptyState
            title={t("noResultsTitle")}
            description={t("noResultsDesc")}
          />
        </div>
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title={t("emptyStateTitle")}
          description={t("emptyStateDesc")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>
      <div className="rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
            <tr>
              <th className="rounded-tl-[1.5rem] px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("name")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("description")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("lastCalculated")}
              </th>
              <th className="w-[120px] whitespace-nowrap rounded-tr-[1.5rem] px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {segments.map((segment) => (
              <tr
                key={segment.id}
                className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
              >
                <td className="px-5 py-4">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {segment.name}
                  </span>
                </td>
                <td className="max-w-xs truncate px-5 py-4 text-slate-500 dark:text-slate-400">
                  {segment.description || (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-5 py-4">
                  {segment.lastCalculatedAt ? (
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(segment.lastCalculatedAt).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      {t("pendingCalculation")}
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    onEdit={() => onEdit(segment.id)}
                    onDuplicate={() => handleDuplicate(segment.id)}
                    onArchive={() => setArchiveSegmentId(segment.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / 20)}
          onPageChange={setPage}
        />
      )}

      <Modal
        isOpen={!!archiveSegmentId}
        onClose={() => setArchiveSegmentId(null)}
        title={t("archiveSegmentTitle")}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("archiveSegmentDesc")}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setArchiveSegmentId(null)}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white"
              onClick={handleArchive}
            >
              {t("archive")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
