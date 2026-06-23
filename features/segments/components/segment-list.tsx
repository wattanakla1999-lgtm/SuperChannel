"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Segment } from "../types/segments";
import { segmentsApiClient } from "../services/segments-api-client";
import { Button } from "@/components/ui/button";
import { Copy, Archive, Pen, Users } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";

interface SegmentListProps {
  onEdit: (segmentId: string) => void;
}

export function SegmentList({ onEdit }: SegmentListProps) {
  const t = useTranslations("segments");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveSegmentId, setArchiveSegmentId] = useState<string | null>(null);

  const fetchSegments = async (currentPage = 1) => {
    setIsLoading(true);
    try {
      const res = await segmentsApiClient.getSegments({ page: currentPage, limit: 20 });
      setSegments(res.data);
      setTotal(res.total);
    } catch (error) {
      alert(t("errorLoadingSegments"));
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSegments(page);
  }, [page]);

  const handleDuplicate = async (id: string) => {
    try {
      await segmentsApiClient.duplicateSegment(id);
      fetchSegments(page);
    } catch (error) {
      alert(t("errorDuplicatingSegment"));
    }
  };

  const handleArchive = async () => {
    if (!archiveSegmentId) return;
    try {
      await segmentsApiClient.archiveSegment(archiveSegmentId);
      fetchSegments(page);
    } catch (error) {
      alert(t("errorArchivingSegment"));
    } finally {
      setArchiveSegmentId(null);
    }
  };

  if (isLoading && segments.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-md border border-slate-200 border-dashed bg-white text-center dark:border-slate-800 dark:bg-slate-900">
        <Users className="mb-4 h-10 w-10 text-slate-400" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          {t("emptyStateTitle")}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {t("emptyStateDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">{t("name")}</th>
              <th className="px-6 py-3 font-medium">{t("description")}</th>
              <th className="px-6 py-3 font-medium">{t("lastCalculated")}</th>
              <th className="px-6 py-3 font-medium text-right">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {segments.map((segment) => (
              <tr key={segment.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-6 py-4">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {segment.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {segment.description || "-"}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {segment.lastCalculatedAt
                    ? new Date(segment.lastCalculatedAt).toLocaleString()
                    : t("pendingCalculation")}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => onEdit(segment.id)}>
                      <Pen className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleDuplicate(segment.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50" onClick={() => setArchiveSegmentId(segment.id)}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
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
            <Button className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white" onClick={handleArchive}>
              {t("archive")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
