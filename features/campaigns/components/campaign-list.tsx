"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";
import { fetchCampaignsAction, cancelCampaignAction } from "../actions/campaign-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pen, Eye, XCircle, MoreHorizontal, Clock, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { classNames } from "@/lib/class-names";

function ActionMenu({
  campaignId,
  status,
  onCancel,
}: {
  campaignId: string;
  status: string;
  onCancel: () => void;
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
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={classNames(
          "flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white shadow-sm transition-all",
          "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200",
          open && "bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-200"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {status === "DRAFT" ? (
            <Link
              href={`/campaigns/${campaignId}/edit`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
            >
              <Pen className="h-3.5 w-3.5 text-slate-400" />
              แก้ไข
            </Link>
          ) : (
            <Link
              href={`/campaigns/${campaignId}/view`}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/60"
            >
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              ดูรายละเอียด
            </Link>
          )}

          {status === "SCHEDULED" && (
            <>
              <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
              <button
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                onClick={() => { onCancel(); setOpen(false); }}
              >
                <XCircle className="h-3.5 w-3.5" />
                ยกเลิกการส่ง
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function CampaignList() {
  const t = useTranslations("campaigns");
  const tCommon = useTranslations("common");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelCampaignId, setCancelCampaignId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input by 350ms
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const fetchCampaigns = async (currentPage = 1, search = debouncedSearch) => {
    setIsLoading(true);
    try {
      const res = await fetchCampaignsAction(currentPage, search);
      setCampaigns(res.items);
      setTotal(res.total);
    } catch {
      alert(t("errorLoadingCampaigns"));
    } finally {
      setIsLoading(false);
    }
  };

  // Refetch when page or debounced search changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCampaigns(page, debouncedSearch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  const handleCancel = async () => {
    if (!cancelCampaignId) return;
    try {
      await cancelCampaignAction(cancelCampaignId);
      fetchCampaigns(page, debouncedSearch);
    } catch {
      alert(t("errorCancellingCampaign"));
    } finally {
      setCancelCampaignId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      case "SCHEDULED": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300";
      case "SENDING": return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300";
      case "PARTIAL_FAILED": return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
      case "FAILED": return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
      case "CANCELLED": return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 line-through";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  if (isLoading && campaigns.length === 0) {
    return (
      <div className="flex min-h-[24rem] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
        {tCommon("loading")}
      </div>
    );
  }

  if (campaigns.length === 0 && debouncedSearch) {
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

  if (campaigns.length === 0) {
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
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
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
                {t("channel")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("targetType")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("reach")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("status")}
              </th>
              <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("scheduledAt")}
              </th>
              <th className="w-[120px] whitespace-nowrap rounded-tr-[1.5rem] px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-950">
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                <td className="px-5 py-4">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {campaign.name}
                  </div>
                  {campaign.description && (
                    <div className="mt-1 max-w-[200px] truncate text-xs text-slate-500 dark:text-slate-400">
                      {campaign.description}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                  <span className="font-medium">{campaign.channel}</span>
                </td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                  {campaign.targetType === "BROADCAST" ? t("broadcast") : t("targeted")}
                </td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                  {campaign._count?.recipients ?? 0}
                </td>
                <td className="px-5 py-4">
                  <span className={classNames("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", getStatusColor(campaign.status))}>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {t(`status_${campaign.status}` as any)}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                  {campaign.scheduledAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(campaign.scheduledAt).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  <ActionMenu
                    campaignId={campaign.id}
                    status={campaign.status}
                    onCancel={() => setCancelCampaignId(campaign.id)}
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
        isOpen={!!cancelCampaignId}
        onClose={() => setCancelCampaignId(null)}
        title={t("cancelCampaignTitle")}
      >
        <div className="space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("cancelCampaignDesc")}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelCampaignId(null)}>
              {t("close")}
            </Button>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel}>
              {t("confirmCancel")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
