"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Toast } from "@/components/ui/toast";
import { Dropdown } from "@/components/ui/dropdown";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import {
  addCustomerNote,
  getCustomer,
  getCustomers,
} from "../services/customer-service";
import type {
  CustomerDetail,
  CustomerListFilters,
  CustomerQuery,
  CustomerSummary,
} from "../types/customers";
import { CustomerDrawer } from "./customer-drawer";
import type { InboxChannel, ThreadStatus } from "@/features/inbox/types/inbox";
import { TagPicker } from "@/features/tags/components/tag-picker";
import { createTag } from "@/features/tags/services/tags-api-client";

const PAGE_SIZE = 8;

const channelClasses = {
  Facebook: "bg-blue-100 text-blue-700",
  Instagram: "bg-pink-100 text-pink-700",
  LINE: "bg-emerald-100 text-emerald-700",
  Telegram: "bg-sky-100 text-sky-700",
};

export function CustomersWorkspace() {
  const format = useFormatter();
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const formatDateTime = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filters, setFilters] = useState<CustomerListFilters>({
    agents: [],
    channels: [],
    statuses: [],
    tags: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<InboxChannel | "all">("all");
  const [tagFilter, setTagFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ThreadStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"error" | "success">("success");

  const query = useMemo<CustomerQuery>(
    () => ({
      assignedAgent: agentFilter || undefined,
      channel: channelFilter === "all" ? "all" : channelFilter,
      page,
      pageSize: PAGE_SIZE,
      search: searchTerm || undefined,
      status: statusFilter === "all" ? "all" : statusFilter,
      tags: tagFilter ? [tagFilter] : undefined,
    }),
    [agentFilter, channelFilter, page, searchTerm, statusFilter, tagFilter],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCustomers() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await getCustomers(query);

        if (!isMounted) {
          return;
        }

        setCustomers(result.customers);
        setFilters(result.filters);
        setPage(result.pagination.page);
        setTotalCustomers(result.totalCustomers);
        setTotalPages(result.pagination.totalPages);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : tCommon("error"),
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      isMounted = false;
    };
  }, [query, tCommon]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    channelFilter !== "all" ||
    Boolean(tagFilter) ||
    Boolean(agentFilter) ||
    statusFilter !== "all";

  const openCustomer = async (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomer(null);
    setDrawerError(null);
    setIsDrawerLoading(true);

    try {
      const detail = await getCustomer(customerId);
      setSelectedCustomer(detail);
      setNoteDraft("");
    } catch (error) {
      setDrawerError(
        error instanceof ApiError ? error.message : "Unable to load customer details.",
      );
    } finally {
      setIsDrawerLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer) {
      return;
    }

    setIsSaving(true);

    try {
      let nextCustomer = selectedCustomer;

      if (noteDraft.trim()) {
        nextCustomer = await addCustomerNote(selectedCustomer.id, {
          body: noteDraft.trim(),
        });
      }

      setSelectedCustomer(nextCustomer);
      setNoteDraft("");
      setToastTone("success");
      setToastMessage(t("updated"));
      setCustomers((current) =>
        current.map((customer) =>
          customer.id === nextCustomer.id
            ? {
                ...customer,
                lastInteractionAt: nextCustomer.lastInteractionAt,
                tags: nextCustomer.tags,
              }
            : customer,
        ),
      );
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError ? error.message : "Unable to save customer.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenConversation = () => {
    if (!selectedCustomer?.primaryConversationId) {
      return;
    }

    window.location.assign(
      `/inbox?conversation=${selectedCustomer.primaryConversationId}`,
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setChannelFilter("all");
    setTagFilter("");
    setAgentFilter("");
    setStatusFilter("all");
    setPage(1);
  };

  const handleToggleCustomerSelection = (customerId: string) => {
    setSelectedCustomerIds((current) =>
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId],
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomerIds.length === customers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(customers.map((c) => c.id));
    }
  };

  const handleBulkAssignTag = async (tagId: string) => {
    if (selectedCustomerIds.length === 0) return;
    setIsSaving(true);
    try {
      await fetch('/api/customers/tags/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedCustomerIds, tagIds: [tagId] }),
      });
      setToastTone("success");
      setToastMessage(t("updated"));
      // Refresh list
      setSearchTerm(searchTerm);
    } catch (err) {
      const e = err as { message?: string };
      setToastTone("error");
      setToastMessage(e.message || "Failed to assign tag");
    } finally {
      setIsSaving(false);
      setSelectedCustomerIds([]);
    }
  };

  const handleBulkRemoveTag = async (tagId: string) => {
    if (selectedCustomerIds.length === 0) return;
    setIsSaving(true);
    try {
      await fetch('/api/customers/tags/bulk-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds: selectedCustomerIds, tagIds: [tagId] }),
      });
      setToastTone("success");
      setToastMessage(t("updated"));
      // Refresh list
      setSearchTerm(searchTerm);
    } catch (err) {
      const e = err as { message?: string };
      setToastTone("error");
      setToastMessage(e.message || "Failed to remove tag");
    } finally {
      setIsSaving(false);
      setSelectedCustomerIds([]);
    }
  };

  const handleBulkCreateTag = async (name: string) => {
    if (selectedCustomerIds.length === 0) return;
    setIsSaving(true);
    try {
      const tag = await createTag({ name, target: "CUSTOMER" });
      await handleBulkAssignTag(tag.id);
    } catch (err) {
      const e = err as { message?: string };
      setToastTone("error");
      setToastMessage(e.message || "Failed to create and assign tag");
      setIsSaving(false);
    }
  };

  const handleAssignDrawerTag = async (tagId: string) => {
    if (!selectedCustomer) return;
    try {
      await fetch(`/api/customers/${selectedCustomer.id}/tags/${tagId}`, { method: "POST" });
      const newTag = filters.tags.find(t => t.id === tagId);
      if (newTag) {
        setSelectedCustomer({ ...selectedCustomer, tags: [...selectedCustomer.tags, newTag] });
        setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, tags: [...c.tags, newTag] } : c));
      }
    } catch {
      setToastTone("error");
      setToastMessage("Failed to assign tag");
    }
  };

  const handleRemoveDrawerTag = async (tagId: string) => {
    if (!selectedCustomer) return;
    try {
      await fetch(`/api/customers/${selectedCustomer.id}/tags/${tagId}`, { method: "DELETE" });
      setSelectedCustomer({ ...selectedCustomer, tags: selectedCustomer.tags.filter(t => t.id !== tagId) });
      setCustomers(customers.map(c => c.id === selectedCustomer.id ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c));
    } catch {
      setToastTone("error");
      setToastMessage("Failed to remove tag");
    }
  };

  const handleCreateDrawerTag = async (name: string) => {
    if (!selectedCustomer) return;
    try {
      const tag = await createTag({ name, target: "CUSTOMER" });
      await handleAssignDrawerTag(tag.id);
    } catch (err) {
      const e = err as { message?: string };
      setToastTone("error");
      setToastMessage(e.message || "Failed to create tag");
    }
  };

  return (
    <>
      <main
        data-testid="customers-page"
        className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  {t("title")}
                </h2>
                <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                  {t("description")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <span className="font-semibold text-slate-950 dark:text-slate-100">{totalCustomers}</span>{" "}
                  {t("count", { count: totalCustomers })}
                </div>
                <Button
                  className="w-auto"
                  disabled={!hasActiveFilters}
                  onClick={clearFilters}
                  variant="secondary"
                >
                  {tCommon("clearFilters")}
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
              <Input
                data-testid="customer-search"
                placeholder={t("search")}
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
              <FilterSelect
                label={t("channel")}
                value={channelFilter}
                onChange={(value) => {
                  setChannelFilter(value as InboxChannel | "all");
                  setPage(1);
                }}
                options={filters.channels.map((channel) => ({
                  label: channel,
                  value: channel,
                }))}
              />
              <FilterSelect
                label={t("tag")}
                value={tagFilter || "all"}
                onChange={(value) => {
                  setTagFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
                options={filters.tags.map((tag) => ({ label: tag.name, value: tag.name }))}
              />
              <FilterSelect
                label={t("agent")}
                value={agentFilter || "all"}
                onChange={(value) => {
                  setAgentFilter(value === "all" ? "" : value);
                  setPage(1);
                }}
                options={filters.agents}
              />
              <FilterSelect
                label={t("status")}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as ThreadStatus | "all");
                  setPage(1);
                }}
                options={filters.statuses.map((status) => ({
                  label: status,
                  value: status,
                }))}
              />
            </div>
          </section>

          <section className="min-h-[24rem] rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {isLoading ? (
              <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                {t("loading")}
              </div>
            ) : errorMessage ? (
              <div className="p-6">
                <ErrorState
                  actionLabel={tCommon("retry")}
                  description={errorMessage}
                  onAction={() => setPage((current) => current)}
                  title={t("noResultsTitle")}
                />
              </div>
            ) : customers.length === 0 && hasActiveFilters ? (
              <div className="p-6">
                <EmptyState
                  description={t("noResults")}
                  title={t("noResultsTitle")}
                />
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  description={t("empty")}
                  title={t("emptyTitle")}
                />
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-5">
                {selectedCustomerIds.length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl bg-cyan-50 px-4 py-3 border border-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800/30">
                    <span className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                      {selectedCustomerIds.length} selected
                    </span>
                    <div className="h-4 w-px bg-cyan-200 dark:bg-cyan-800" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cyan-700 dark:text-cyan-300 mr-2">Tags:</span>
                      <TagPicker
                        target="CUSTOMER"
                        selectedTagIds={[]} // In bulk mode, we don't show pre-selected tags since they vary by customer
                        onAssign={handleBulkAssignTag}
                        onRemove={handleBulkRemoveTag}
                        onCreateInline={handleBulkCreateTag}
                      />
                    </div>
                  </div>
                )}
                <div data-testid="customer-list" className="hidden overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800 lg:block">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3 font-semibold w-10">
                          <input
                            type="checkbox"
                            checked={customers.length > 0 && selectedCustomerIds.length === customers.length}
                            onChange={handleSelectAll}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:checked:bg-cyan-500"
                          />
                        </th>
                        <th className="px-4 py-3 font-semibold">{t("title")}</th>
                        <th className="px-4 py-3 font-semibold">{t("channels")}</th>
                        <th className="px-4 py-3 font-semibold">{t("agent")}</th>
                        <th className="px-4 py-3 font-semibold">{t("status")}</th>
                        <th className="px-4 py-3 font-semibold">{t("lastInteraction", { date: "" })}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                      {customers.map((customer) => (
                        <tr key={customer.id} className={selectedCustomerIds.includes(customer.id) ? "bg-slate-50 dark:bg-slate-900/50" : ""}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCustomerIds.includes(customer.id)}
                              onChange={() => handleToggleCustomerSelection(customer.id)}
                              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:checked:bg-cyan-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              data-testid={`customer-row-${customer.id}`}
                              className="flex w-full items-start gap-3 text-left"
                              onClick={() => void openCustomer(customer.id)}
                            >
                              {customer.avatarImageUrl ? (
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                  <Image
                                    alt={customer.name}
                                    className="object-cover"
                                    fill
                                    sizes="48px"
                                    src={customer.avatarImageUrl}
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                                  {customer.avatarFallback}
                                </div>
                              )}
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                                  {customer.name}
                                </p>
                                <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                                  {customer.email || customer.phone}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {customer.tags.map((tag) => (
                                      <span
                                        key={tag.id}
                                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                      >
                                        {tag.name}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {customer.connectedChannels.map((channel) => (
                                <span
                                  key={`${customer.id}-${channel.externalId}`}
                                  className={classNames(
                                    "rounded-full px-2 py-1 text-[11px] font-semibold",
                                    channelClasses[channel.channel],
                                  )}
                                >
                                  {channel.channel}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            <p>{customer.assignedAgent}</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {t("unread", { count: customer.unreadCount })}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge tone={customer.status}>
                              {customer.status}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                            {formatDateTime(customer.lastInteractionAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950"
                      onClick={() => void openCustomer(customer.id)}
                    >
                      <div className="flex items-start gap-3">
                        {customer.avatarImageUrl ? (
                          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                            <Image
                              alt={customer.name}
                              className="object-cover"
                              fill
                              sizes="48px"
                              src={customer.avatarImageUrl}
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                            {customer.avatarFallback}
                          </div>
                        )}
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {customer.name}
                            </p>
                            <StatusBadge tone={customer.status}>
                              {customer.status}
                            </StatusBadge>
                          </div>
                          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
                            {customer.email || customer.phone}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {customer.connectedChannels.map((channel) => (
                              <span
                                key={`${customer.id}-${channel.externalId}`}
                                className={classNames(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  channelClasses[channel.channel],
                                )}
                              >
                                {channel.channel}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {customer.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{customer.assignedAgent}</span>
                            <span>{formatDateTime(customer.lastInteractionAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tCommon("pageOf", { page, total: totalPages })}
                  </p>
                  <Pagination
                    onPageChange={setPage}
                    page={page}
                    testId="customer-pagination"
                    totalPages={totalPages}
                  />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={Boolean(selectedCustomerId)}
        isSaving={isSaving}
        noteDraft={noteDraft}
        onClose={() => {
          setSelectedCustomerId(null);
          setSelectedCustomer(null);
          setDrawerError(null);
          setNoteDraft("");
        }}
        onNoteDraftChange={setNoteDraft}
        onOpenConversation={handleOpenConversation}
        onSave={() => void handleSaveCustomer()}
        onAssignTag={handleAssignDrawerTag}
        onRemoveTag={handleRemoveDrawerTag}
        onCreateTag={handleCreateDrawerTag}
      />

      {selectedCustomerId && isDrawerLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
          <div className="rounded-2xl bg-white px-5 py-4 text-sm text-slate-600 shadow-lg dark:bg-slate-950 dark:text-slate-300">
            <Spinner className="mr-2 inline-flex text-slate-400" />
            {t("loading")}
          </div>
        </div>
      ) : null}

      {selectedCustomerId && drawerError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-lg dark:bg-slate-950">
            <ErrorState
              actionLabel={tCommon("retry")}
              description={drawerError}
              onAction={() => void openCustomer(selectedCustomerId)}
              title="Customer details unavailable"
            />
          </div>
        </div>
      ) : null}

      <Toast message={toastMessage} tone={toastTone} />
    </>
  );
}

type FilterSelectProps = {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
};

function FilterSelect({ label, onChange, options, value }: FilterSelectProps) {
  const id = useId();
  const t = useTranslations("common");

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Dropdown
        id={id}
        ariaLabel={label}
        value={value}
        onChange={onChange}
        options={[{ label: t("all"), value: "all" }, ...options]}
      />
    </div>
  );
}
