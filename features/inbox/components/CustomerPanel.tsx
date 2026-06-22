"use client";

import Image from "next/image";
import { CustomerOrdersPanel } from "@/features/orders/components/customer-orders-panel";
import { classNames } from "@/lib/class-names";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConversationDetail, ConversationSummary } from "../types/inbox";
import DetailSection from "./DetailSection";

type CustomerPanelProps = {
  activeConversation: ConversationSummary | null;
  activeCustomer: ConversationDetail["customer"] | null;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
};

export default function CustomerPanel({
  activeConversation,
  activeCustomer,
  isDrawerOpen,
  onCloseDrawer,
}: CustomerPanelProps) {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const [activeTab, setActiveTab] = useState<"customer" | "orders">("customer");

  const panelBody = (
    <div
      data-testid="customer-panel"
      key={activeCustomer?.id ?? "empty"}
      className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{t("customer")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("customerContext")}
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 lg:hidden"
            onClick={onCloseDrawer}
          >
            {tCommon("close")}
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={classNames(
              "rounded-2xl px-3 py-2 text-sm font-semibold transition",
              activeTab === "customer"
                ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
            onClick={() => setActiveTab("customer")}
          >
            {t("customerTab")}
          </button>
          <button
            type="button"
            data-testid="customer-orders-tab"
            className={classNames(
              "rounded-2xl px-3 py-2 text-sm font-semibold transition",
              activeTab === "orders"
                ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
            )}
            onClick={() => setActiveTab("orders")}
          >
            {t("ordersTab")}
          </button>
        </div>
      </div>

      {!activeConversation || !activeCustomer ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("customerEmpty")}
        </div>
      ) : activeTab === "orders" ? (
        <div className="min-h-0 flex-1 overflow-hidden p-4">
          <CustomerOrdersPanel
            key={activeConversation.customerId}
            customerId={activeConversation.customerId}
            customerName={activeCustomer.name}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <div className="flex items-center gap-3">
            {activeCustomer.avatarImageUrl ? (
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-slate-100">
                <Image
                  alt={activeCustomer.name}
                  className="object-cover"
                  fill
                  sizes="56px"
                  src={activeCustomer.avatarImageUrl}
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                {activeCustomer.avatarFallback}
              </div>
            )}
            <div>
              <p className="text-base font-semibold text-slate-950 dark:text-slate-100">
                {activeCustomer.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeCustomer.location}</p>
            </div>
          </div>

          <DetailSection label={t("assignedAgent")} value={activeConversation.assignedAgent} />
          <DetailSection label={tCommon("status")} value={activeConversation.status} badge />
          <DetailSection
            label={t("tags")}
            value={activeConversation.tags.join(", ")}
          />
          <DetailSection label={t("email")} value={activeCustomer.email} />
          <DetailSection label={t("phone")} value={activeCustomer.phone} />
          <DetailSection label={t("notes")} value={activeCustomer.notes} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <section
        data-testid="customer-panel-column"
        className="hidden h-full min-h-0 min-w-0 xl:block"
      >
        {panelBody}
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-950/40 px-4 py-6 xl:hidden">
          <div className="ml-auto h-full w-full max-w-sm overflow-hidden">{panelBody}</div>
        </div>
      ) : null}
    </>
  );
}
