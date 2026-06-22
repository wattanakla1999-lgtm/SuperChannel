"use client";

import Image from "next/image";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { classNames } from "@/lib/class-names";
import { ConversationMessage } from "../types/inbox";
import { useFormatter, useTranslations } from "next-intl";

function isMediaPlaceholderBody(message: ConversationMessage) {
  return (
    (message.type === "image" && message.body === "LINE image message") ||
    (message.type === "sticker" && message.body === "LINE sticker") ||
    (message.type === "audio" && message.body === "LINE audio message")
  );
}

export default function MessageBubble({ message }: { message: ConversationMessage }) {
  const format = useFormatter();
  const t = useTranslations("inbox");
  const isOutbound = message.direction === "outbound";
  const isMediaMessage = message.type === "image" || message.type === "sticker";
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const shouldShowMediaCaption = Boolean(message.body) && !isMediaPlaceholderBody(message);

  return (
    <>
      <div className={classNames("flex", isOutbound ? "justify-end" : "justify-start")}>
        <div
          className={classNames(
            "max-w-[85%]",
            isMediaMessage
              ? "bg-transparent px-0 py-0 shadow-none"
              : "rounded-[1.5rem] px-4 py-3 shadow-sm",
            !isMediaMessage &&
              (isOutbound
                ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                : "border border-slate-200 bg-white text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"),
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
            <span>{message.senderName}</span>
            <span>{format.dateTime(new Date(message.createdAt), { day: "numeric", hour: "numeric", minute: "2-digit", month: "short", timeZone: "Asia/Bangkok" })}</span>
          </div>
          {message.type === "image" || message.type === "sticker" ? (
            <div className="space-y-3">
              {message.imageUrl ? (
                <button
                  type="button"
                  className="block max-w-[220px] cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 transition hover:opacity-95 dark:border-slate-700 dark:bg-slate-800 sm:max-w-[280px]"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  <Image
                    alt={
                      message.body ||
                      (message.type === "sticker" ? t("stickerPreview") : t("imagePreview"))
                    }
                    className={classNames(
                      "h-auto w-full object-contain",
                      message.type === "sticker" ? "max-h-[180px] p-3 sm:max-h-[220px]" : "max-h-[280px]",
                    )}
                    height={280}
                    src={message.imageUrl}
                    unoptimized
                    width={280}
                  />
                </button>
              ) : (
                <div className="rounded-2xl bg-gradient-to-br from-pink-200 via-orange-100 to-amber-100 p-6 text-sm font-medium text-slate-800">
                  {message.type === "sticker" ? t("stickerPreview") : t("imagePreview")}
                </div>
              )}
              {shouldShowMediaCaption ? <p>{message.body}</p> : null}
            </div>
          ) : message.type === "audio" ? (
            <div className="space-y-3">
              <div
                className={classNames(
                  "overflow-hidden rounded-[1.4rem] border px-3 py-3",
                  isOutbound
                    ? "border-slate-900/10 bg-white/15 dark:border-slate-950/20 dark:bg-slate-950/15"
                    : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950",
                )}
              >
                {message.audioUrl ? (
                  <audio
                    className="h-12 w-full min-w-[240px] max-w-[320px]"
                    controls
                    preload="none"
                    src={message.audioUrl}
                  />
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t("audioPreview")}</p>
                )}
                {message.audioDurationMs ? (
                  <p className="mt-2 text-xs opacity-70">
                    {Math.max(1, Math.round(message.audioDurationMs / 1000))}s
                  </p>
                ) : null}
              </div>
              {shouldShowMediaCaption ? <p>{message.body}</p> : null}
            </div>
          ) : (
            <p className="text-sm leading-6">{message.body}</p>
          )}
        </div>
      </div>

      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={message.body || (message.type === "sticker" ? t("stickerPreview") : t("imagePreview"))}
      >
        {message.imageUrl ? (
          <div className="flex justify-center">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                <Image
                  alt={
                    message.body ||
                    (message.type === "sticker" ? t("stickerPreview") : t("imagePreview"))
                  }
                  className={classNames(
                    "h-auto w-full max-w-[min(90vw,960px)] object-contain",
                    message.type === "sticker" ? "max-h-[60vh] p-4" : "max-h-[75vh]",
                  )}
                  height={960}
                  src={message.imageUrl}
                  unoptimized
                  width={960}
                />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {message.type === "sticker" ? t("stickerPreview") : t("imagePreview")}
          </p>
        )}
      </Modal>
    </>
  );
}
