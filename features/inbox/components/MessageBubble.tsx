"use client";

import { Modal } from "@/components/ui/modal";
import { classNames } from "@/lib/class-names";
import { FileAudio2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { ConversationMessage } from "../types/inbox";

type MessageBubbleProps = {
  isFirstOfDay?: boolean;
  message: ConversationMessage;
  customerAvatarUrl?: string | null;
  customerAvatarFallback?: string;
  isLatestOutbound?: boolean;
};

function isPlaceholder(message: ConversationMessage) {
  return (
    (message.type === "image" && message.body === "LINE image message") ||
    (message.type === "sticker" && message.body === "LINE sticker") ||
    (message.type === "audio" && message.body === "LINE audio message")
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "SC";
}

export default function MessageBubble({
  isFirstOfDay = false,
  message,
  customerAvatarUrl,
  customerAvatarFallback,
  isLatestOutbound = false,
}: MessageBubbleProps) {
  const format = useFormatter();
  const t = useTranslations("inbox");
  const isOutbound = message.direction === "outbound";
  const shouldShowCaption = Boolean(message.body) && !isPlaceholder(message);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isTemp = message.id.startsWith("temp-");
  const shouldShowStatus = isOutbound && (isTemp || isLatestOutbound);

  return (
    <>
      {isFirstOfDay ? (
        <div className="flex justify-center py-1">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            {format.dateTime(new Date(message.createdAt), {
              day: "numeric",
              month: "long",
              timeZone: "Asia/Bangkok",
              year: "numeric",
            })}
          </span>
        </div>
      ) : null}

      <div className={classNames("flex items-end gap-3", isOutbound ? "justify-end" : "justify-start")}>
        {!isOutbound ? (
          customerAvatarUrl ? (
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-slate-100">
              <Image
                alt={message.senderName}
                className="object-cover"
                fill
                sizes="32px"
                src={customerAvatarUrl}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100">
              {customerAvatarFallback || getInitials(message.senderName)}
            </div>
          )
        ) : null}

        <div className={classNames("flex flex-col max-w-[78%] sm:max-w-[70%]", isOutbound ? "order-1 items-end" : "items-start")}>
          <div className={classNames("mb-1 flex items-center gap-2 px-1 text-[11px] text-slate-400 dark:text-slate-500", isOutbound && "justify-end")}>
            {message.senderName ? <span className="truncate">{message.senderName}</span> : null}
            <span>
              {format.dateTime(new Date(message.createdAt), {
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                month: "short",
                timeZone: "Asia/Bangkok",
              })}
            </span>
            {shouldShowStatus && (
              <span className={classNames(
                "ml-1 font-semibold",
                isTemp ? "text-slate-400 animate-pulse" : "text-emerald-500 dark:text-emerald-400"
              )}>
                • {isTemp ? "กำลังส่ง..." : "ส่งแล้ว"}
              </span>
            )}
          </div>

          {message.type === "image" || message.type === "sticker" ? (
            <div className={classNames("space-y-2", isOutbound && "items-end")}>
              {message.imageUrl ? (
                <button
                  type="button"
                  className="block cursor-zoom-in overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm transition hover:opacity-95 dark:border-slate-700 dark:bg-slate-900"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Image
                    alt={message.body || (message.type === "sticker" ? t("stickerPreview") : t("imagePreview"))}
                    className={classNames(
                      "h-auto w-full object-contain",
                      message.type === "sticker" ? "max-h-[190px] max-w-[190px] p-2" : "max-h-[320px] max-w-[300px]",
                    )}
                    height={320}
                    src={message.imageUrl}
                    unoptimized
                    width={300}
                  />
                </button>
              ) : null}
              {shouldShowCaption ? (
                <div className={classNames(
                  "rounded-2xl px-4 py-3 text-sm shadow-sm",
                  isOutbound
                    ? "bg-cyan-50 text-slate-950 dark:bg-cyan-950/50 dark:text-slate-50"
                    : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                )}>
                  {message.body}
                </div>
              ) : null}
            </div>
          ) : message.type === "audio" ? (
            <div
              className={classNames(
                "rounded-[1.35rem] border px-3 py-3 shadow-sm",
                isOutbound
                  ? "border-cyan-100 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/40"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  <FileAudio2 className="h-4.5 w-4.5" />
                </div>
                {message.audioUrl ? (
                  <audio className="h-10 min-w-[200px] max-w-[260px]" controls preload="none" src={message.audioUrl} />
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t("audioPreview")}</p>
                )}
              </div>
              {message.audioDurationMs ? (
                <p className="mt-2 pl-12 text-[11px] text-slate-400 dark:text-slate-500">
                  {Math.max(1, Math.round(message.audioDurationMs / 1000))}s
                </p>
              ) : null}
            </div>
          ) : (
            <div
              className={classNames(
                "rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm",
                isOutbound
                  ? "bg-cyan-50 text-slate-950 dark:bg-cyan-950/50 dark:text-slate-50"
                  : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              )}
            >
              {message.body}
            </div>
          )}
        </div>

        {isOutbound ? (
          <div className="order-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
            {getInitials(message.senderName)}
          </div>
        ) : null}
      </div>

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={message.body || (message.type === "sticker" ? t("stickerPreview") : t("imagePreview"))}
      >
        {message.imageUrl ? (
          <div className="flex justify-center">
            <Image
              alt={message.body || t("imagePreview")}
              className="h-auto max-h-[78vh] w-full max-w-[min(90vw,980px)] rounded-2xl object-contain"
              height={960}
              src={message.imageUrl}
              unoptimized
              width={960}
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
