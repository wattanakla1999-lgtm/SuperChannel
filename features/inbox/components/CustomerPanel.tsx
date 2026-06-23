"use client";

import Image from "next/image";
import { FileImage, FileText, Images, Package2, Paperclip, UserRound } from "lucide-react";
import { useState } from "react";
import { CustomerOrdersPanel } from "@/features/orders/components/customer-orders-panel";
import { classNames } from "@/lib/class-names";
import { useFormatter, useTranslations } from "next-intl";
import { ConversationDetail, ConversationMessage, ConversationSummary } from "../types/inbox";
import DetailSection from "./DetailSection";

type CustomerPanelProps = {
  activeConversation: ConversationSummary | null;
  activeCustomer: ConversationDetail["customer"] | null;
  activeMessages: ConversationMessage[];
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
};

type ContextTab = "customer" | "orders" | "photos" | "files";

function getMessageFileLabel(message: ConversationMessage) {
  if (message.type === "audio") {
    return "Voice message";
  }

  if (message.type === "image") {
    return "Image attachment";
  }

  if (message.type === "sticker") {
    return "Sticker";
  }

  return "Attachment";
}

export default function CustomerPanel({
  activeConversation,
  activeCustomer,
  activeMessages,
  isDrawerOpen,
  onCloseDrawer,
}: CustomerPanelProps) {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [activeTab, setActiveTab] = useState<ContextTab>("customer");

  const photoMessages = activeMessages.filter(
    (message) => (message.type === "image" || message.type === "sticker") && message.imageUrl,
  );
  const fileMessages = activeMessages.filter(
    (message) => message.type === "audio" || message.type === "image" || message.type === "sticker",
  );

  const tabButtonClass = (isActive: boolean) =>
    classNames(
      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
      isActive
        ? "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900",
    );

  const panelBody = (
    <div
      data-testid="customer-panel"
      key={activeCustomer?.id ?? "empty"}
      className="flex h-full min-h-0 flex-col overflow-hidden border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
    >
      <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{t("customer")}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("customerContext")}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 xl:hidden"
            onClick={onCloseDrawer}
          >
            {tCommon("close")}
          </button>
        </div>
      </header>

      {!activeConversation || !activeCustomer ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("customerEmpty")}
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              {activeCustomer.avatarImageUrl ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full bg-slate-100">
                  <Image
                    alt={activeCustomer.name}
                    className="object-cover"
                    fill
                    sizes="80px"
                    src={activeCustomer.avatarImageUrl}
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white dark:bg-slate-800">
                  {activeCustomer.avatarFallback}
                </div>
              )}
              <p className="mt-4 max-w-full truncate text-base font-semibold text-slate-950 dark:text-slate-100">
                {activeCustomer.name}
              </p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {activeConversation.channel} · {activeCustomer.location || tCommon("unknown")}
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                {format.dateTime(new Date(), {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Bangkok",
                })}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" className={tabButtonClass(activeTab === "customer")} onClick={() => setActiveTab("customer")}>
                <UserRound className="h-3.5 w-3.5" />
                <span>{t("customerTab")}</span>
              </button>
              <button type="button" data-testid="customer-orders-tab" className={tabButtonClass(activeTab === "orders")} onClick={() => setActiveTab("orders")}>
                <Package2 className="h-3.5 w-3.5" />
                <span>{t("ordersTab")}</span>
              </button>
              <button type="button" data-testid="customer-photos-tab" className={tabButtonClass(activeTab === "photos")} onClick={() => setActiveTab("photos")}>
                <Images className="h-3.5 w-3.5" />
                <span>{t("photosTab")}</span>
              </button>
              <button type="button" data-testid="customer-files-tab" className={tabButtonClass(activeTab === "files")} onClick={() => setActiveTab("files")}>
                <Paperclip className="h-3.5 w-3.5" />
                <span>{t("filesTab")}</span>
              </button>
            </div>
          </div>

          {activeTab === "orders" ? (
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <CustomerOrdersPanel
                key={activeConversation.customerId}
                customerId={activeConversation.customerId}
                customerName={activeCustomer.name}
              />
            </div>
          ) : activeTab === "photos" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {photoMessages.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {t("photosEmpty")}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {photoMessages.map((message) => (
                    <a
                      key={message.id}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
                      href={message.imageUrl ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {message.imageUrl ? (
                        <Image
                          alt={message.body || t("imagePreview")}
                          className="object-cover transition duration-200 group-hover:scale-[1.02]"
                          fill
                          sizes="(max-width: 1279px) 45vw, 160px"
                          src={message.imageUrl}
                          unoptimized
                        />
                      ) : null}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "files" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {fileMessages.length === 0 ? (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {t("filesEmpty")}
                </div>
              ) : (
                <div className="space-y-3">
                  {fileMessages.map((message) => (
                    <a
                      key={message.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                      href={message.audioUrl ?? message.imageUrl ?? "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {message.type === "audio" ? <FileText className="h-4 w-4" /> : <FileImage className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {getMessageFileLabel(message)}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {format.dateTime(new Date(message.createdAt), {
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            month: "short",
                            timeZone: "Asia/Bangkok",
                          })}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <DetailSection label={t("assignedAgent")} value={activeConversation.assignedAgent} />
                <DetailSection label={tCommon("status")} value={activeConversation.status} badge />
                <DetailSection label={t("tags")} value={activeConversation.tags.join(", ")} />
                <DetailSection label={t("email")} value={activeCustomer.email} />
                <DetailSection label={t("phone")} value={activeCustomer.phone} />
                <DetailSection label={t("notes")} value={activeCustomer.notes} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <section data-testid="customer-panel-column" className="hidden h-full min-h-0 min-w-0 xl:block">
        {panelBody}
      </section>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-30 bg-slate-950/45 xl:hidden">
          <div className="ml-auto h-full w-full max-w-md overflow-hidden bg-white shadow-2xl dark:bg-slate-950">
            {panelBody}
          </div>
        </div>
      ) : null}
    </>
  );
}
