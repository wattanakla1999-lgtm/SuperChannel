"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import type { SavedReply } from "@/features/settings/types/settings";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import { useFormatter, useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  getConversation,
  getConversations,
  getSavedReplies,
  sendConversationMessage,
} from "../services/inbox-service";
import {
  CENTER_PANEL_MIN,
  DEFAULT_PANEL_WIDTHS,
  DIVIDER_WIDTH,
  LEFT_PANEL_MAX,
  LEFT_PANEL_MIN,
  PANEL_WIDTHS_STORAGE_KEY,
  PanelSide,
  RIGHT_PANEL_MAX,
  RIGHT_PANEL_MIN,
  type ConversationDetail,
  type ConversationStatus,
  type ConversationSummary,
  type InboxChannel,
  type PanelWidths
} from "../types/inbox";
import CustomerPanel from "./CustomerPanel";
import MessageBubble from "./MessageBubble";
import PanelResizeDivider from "./PanelResizeDivider";

const filters: ConversationStatus[] = ["all", "unread", "open", "pending", "resolved"];

const channelClasses: Record<InboxChannel, string> = {
  Facebook: "bg-blue-100 text-blue-700",
  Instagram: "bg-pink-100 text-pink-700",
  LINE: "bg-emerald-100 text-emerald-700",
  Telegram: "bg-sky-100 text-sky-700",
};


function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function fitPanelWidths(widths: PanelWidths, workspaceWidth: number): PanelWidths {
  let left = clamp(widths.left, LEFT_PANEL_MIN, LEFT_PANEL_MAX);
  let right = clamp(widths.right, RIGHT_PANEL_MIN, RIGHT_PANEL_MAX);
  const maximumSideWidth = Math.max(
    LEFT_PANEL_MIN + RIGHT_PANEL_MIN,
    workspaceWidth - CENTER_PANEL_MIN - DIVIDER_WIDTH * 2,
  );
  let overflow = Math.max(0, left + right - maximumSideWidth);

  const leftReduction = Math.min(left - LEFT_PANEL_MIN, overflow / 2);
  left -= leftReduction;
  overflow -= leftReduction;

  const rightReduction = Math.min(right - RIGHT_PANEL_MIN, overflow);
  right -= rightReduction;
  overflow -= rightReduction;

  left -= Math.min(left - LEFT_PANEL_MIN, overflow);

  return { left: Math.round(left), right: Math.round(right) };
}



function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function matchesConversationFilter(
  activeFilter: ConversationStatus,
  conversation: ConversationSummary,
) {
  if (activeFilter === "all") {
    return true;
  }

  if (activeFilter === "unread") {
    return conversation.unreadCount > 0;
  }

  return conversation.status === activeFilter;
}

export function InboxWorkspace({
  initialConversationId = null,
}: {
  initialConversationId?: string | null;
}) {
  const format = useFormatter();
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const formatTimestamp = (value: string) =>
    format.dateTime(new Date(value), {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone: "Asia/Bangkok",
    });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [activeDetail, setActiveDetail] = useState<ConversationDetail | null>(null);
  const [activeFilter, setActiveFilter] = useState<ConversationStatus>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savedReplies, setSavedReplies] = useState<SavedReply[]>([]);
  const [isSavedRepliesOpen, setIsSavedRepliesOpen] = useState(false);
  const [isSavedRepliesLoading, setIsSavedRepliesLoading] = useState(false);
  const [savedRepliesError, setSavedRepliesError] = useState<string | null>(null);
  const [savedReplySearch, setSavedReplySearch] = useState("");
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(
    Boolean(initialConversationId),
  );
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [panelWidths, setPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [arePanelWidthsLoaded, setArePanelWidthsLoaded] = useState(false);
  const [activeDivider, setActiveDivider] = useState<PanelSide | null>(null);
  const panelGridRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    side: PanelSide;
    startX: number;
    startWidth: number;
  } | null>(null);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    let nextWidths = DEFAULT_PANEL_WIDTHS;

    try {
      const storedWidths = window.localStorage.getItem(PANEL_WIDTHS_STORAGE_KEY);

      if (storedWidths) {
        const parsedWidths = JSON.parse(storedWidths) as Partial<PanelWidths>;

        if (Number.isFinite(parsedWidths.left) && Number.isFinite(parsedWidths.right)) {
          nextWidths = {
            left: Number(parsedWidths.left),
            right: Number(parsedWidths.right),
          };
        }
      }
    } catch {
      // Ignore unavailable or malformed local storage and keep the defaults.
    }

    const workspaceWidth = panelGridRef.current?.clientWidth;
    setPanelWidths(
      workspaceWidth ? fitPanelWidths(nextWidths, workspaceWidth) : nextWidths,
    );
    setArePanelWidthsLoaded(true);
  }, []);

  useEffect(() => {
    if (!arePanelWidthsLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        PANEL_WIDTHS_STORAGE_KEY,
        JSON.stringify(panelWidths),
      );
    } catch {
      // Resizing still works when local storage is unavailable.
    }
  }, [arePanelWidthsLoaded, panelWidths]);

  useEffect(() => {
    const panelGrid = panelGridRef.current;

    if (!panelGrid) {
      return;
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      setPanelWidths((current) =>
        fitPanelWidths(current, entry.contentRect.width),
      );
    });

    resizeObserver.observe(panelGrid);
    return () => resizeObserver.disconnect();
  }, []);

  const updatePanelWidth = (side: PanelSide, requestedWidth: number) => {
    const workspaceWidth = panelGridRef.current?.clientWidth ?? 0;

    setPanelWidths((current) => {
      const otherWidth = side === "left" ? current.right : current.left;
      const minimum = side === "left" ? LEFT_PANEL_MIN : RIGHT_PANEL_MIN;
      const configuredMaximum = side === "left" ? LEFT_PANEL_MAX : RIGHT_PANEL_MAX;
      const availableMaximum = workspaceWidth
        ? workspaceWidth - otherWidth - CENTER_PANEL_MIN - DIVIDER_WIDTH * 2
        : configuredMaximum;
      const nextWidth = clamp(
        requestedWidth,
        minimum,
        Math.max(minimum, Math.min(configuredMaximum, availableMaximum)),
      );

      return { ...current, [side]: Math.round(nextWidth) };
    });
  };

  const handleDividerPointerDown = (
    side: PanelSide,
    event: PointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      side,
      startX: event.clientX,
      startWidth: panelWidths[side],
    };
    setActiveDivider(side);
  };

  const handleDividerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const delta = event.clientX - dragState.startX;
    updatePanelWidth(
      dragState.side,
      dragState.startWidth + (dragState.side === "left" ? delta : -delta),
    );
  };

  const handleDividerPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setActiveDivider(null);
  };

  const handleDividerKeyDown = (
    side: PanelSide,
    event: KeyboardEvent<HTMLDivElement>,
  ) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    updatePanelWidth(
      side,
      panelWidths[side] + (side === "left" ? direction : -direction) * 16,
    );
  };

  useEffect(() => {
    let isMounted = true;

    async function loadConversations() {
      setIsListLoading(true);
      setListError(null);

      try {
        const nextConversations = await getConversations();

        if (!isMounted) {
          return;
        }

        setConversations(nextConversations);
        setActiveConversationId(
          (current) =>
            current ??
            (initialConversationId &&
            nextConversations.some(
              (conversation) => conversation.id === initialConversationId,
            )
              ? initialConversationId
              : nextConversations[0]?.id ?? null),
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setListError(
          isUnauthorized(error)
            ? tCommon("sessionExpired")
            : t("loadError"),
        );
      } finally {
        if (isMounted) {
          setIsListLoading(false);
        }
      }
    }

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [initialConversationId, t, tCommon]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleConversations = conversations.filter((conversation) => {
    if (!matchesConversationFilter(activeFilter, conversation)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return (
      conversation.customerName.toLowerCase().includes(normalizedSearch) ||
      conversation.preview.toLowerCase().includes(normalizedSearch) ||
      conversation.channel.toLowerCase().includes(normalizedSearch)
    );
  });

  const selectedConversationId = !visibleConversations.length
    ? null
    : visibleConversations.find(
        (conversation) => conversation.id === activeConversationId,
      )?.id ?? visibleConversations[0].id;

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const conversationId = selectedConversationId;
    let isMounted = true;

    async function loadDetail() {
      setIsDetailLoading(true);
      setDetailError(null);
      setComposerError(null);

      try {
        const detail = await getConversation(conversationId);

        if (!isMounted) {
          return;
        }

        setActiveDetail(detail);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDetailError(
          isUnauthorized(error)
            ? tCommon("sessionExpired")
            : t("conversationError"),
        );
      } finally {
        if (isMounted) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [selectedConversationId, t, tCommon]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsMobileDetailOpen(true);
    setIsCustomerDrawerOpen(false);
  };

  const handleSendMessage = async () => {
    if (!selectedConversationId || !messageDraft.trim() || isSending) {
      return;
    }

    setComposerError(null);
    setIsSending(true);

    try {
      const result = await sendConversationMessage(selectedConversationId, {
        body: messageDraft,
      });

      setConversations((current) =>
        current
          .map((conversation) =>
            conversation.id === selectedConversationId
              ? result.conversation
              : conversation,
          )
          .sort((left, right) =>
            right.lastMessageAt.localeCompare(left.lastMessageAt),
          ),
      );

      setActiveDetail((current) =>
        current && current.conversation.id === selectedConversationId
          ? {
              ...current,
              conversation: result.conversation,
              messages: [...current.messages, result.message],
            }
          : current,
      );
      setMessageDraft("");
    } catch (error) {
      setComposerError(
        error instanceof ApiError
          ? error.message
          : t("sendError"),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenSavedReplies = async () => {
    setIsSavedRepliesOpen(true);
    setSavedRepliesError(null);

    if (savedReplies.length > 0) {
      return;
    }

    setIsSavedRepliesLoading(true);

    try {
      setSavedReplies(await getSavedReplies());
    } catch (error) {
      setSavedRepliesError(
        error instanceof ApiError
          ? error.message
          : t("savedRepliesError"),
      );
    } finally {
      setIsSavedRepliesLoading(false);
    }
  };

  const activeConversation =
    selectedConversationId && activeDetail?.conversation.id === selectedConversationId
      ? activeDetail.conversation
      : null;
  const activeCustomer =
    activeConversation && activeDetail?.conversation.id === selectedConversationId
      ? activeDetail.customer
      : null;
  const activeMessages =
    activeConversation && activeDetail?.conversation.id === selectedConversationId
      ? activeDetail.messages
      : [];
  const areFiltersInteractive = isHydrated && !isListLoading;
  const normalizedSavedReplySearch = savedReplySearch.trim().toLowerCase();
  const visibleSavedReplies = savedReplies.filter((reply) => {
    if (!normalizedSavedReplySearch) {
      return true;
    }

    return (
      reply.title.toLowerCase().includes(normalizedSavedReplySearch) ||
      reply.shortcut.toLowerCase().includes(normalizedSavedReplySearch) ||
      reply.category.toLowerCase().includes(normalizedSavedReplySearch) ||
      reply.message.toLowerCase().includes(normalizedSavedReplySearch)
    );
  });

  return (
    <main
      data-testid="inbox-page"
      className={classNames(
        "flex h-[calc(100vh-97px)] min-h-[calc(100vh-97px)] flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-6",
        activeDivider && "xl:cursor-col-resize xl:select-none",
      )}
    >
      <div
        ref={panelGridRef}
        data-testid="inbox-panel-grid"
        className="grid min-h-0 min-w-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[var(--inbox-left-width)_12px_minmax(280px,1fr)_12px_var(--inbox-right-width)] xl:grid-rows-[minmax(0,1fr)] xl:gap-0"
        style={
          {
            "--inbox-left-width": `${panelWidths.left}px`,
            "--inbox-right-width": `${panelWidths.right}px`,
          } as CSSProperties
        }
      >
        <section
          data-testid="conversation-panel"
          className={classNames("min-h-0 min-w-0", isMobileDetailOpen && "hidden lg:block")}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <Input
                data-testid="conversation-search"
                disabled={!areFiltersInteractive}
                placeholder={t("search")}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    disabled={!areFiltersInteractive}
                    className={classNames(
                      "rounded-full px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                      activeFilter === filter
                        ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                    )}
                    onClick={() => setActiveFilter(filter)}
                  >
                    {t(`filters.${filter}`)}
                  </button>
                ))}
              </div>
            </div>

            <div
              data-testid="conversation-list"
              className="min-h-0 flex-1 overflow-y-auto p-3"
            >
              {isListLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                  {t("loadingList")}
                </div>
              ) : listError ? (
                <div className="p-2">
                  <Alert tone="error">{listError}</Alert>
                </div>
              ) : visibleConversations.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  {t("emptySearch")}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      data-testid={`conversation-item-${conversation.id}`}
                      className={classNames(
                        "w-full rounded-[1.5rem] border px-4 py-4 text-left transition",
                        selectedConversationId === conversation.id
                          ? "border-cyan-200 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                      )}
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                            {conversation.customerAvatarFallback}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                                {conversation.customerName}
                              </p>
                              <span
                                className={classNames(
                                  "rounded-full px-2 py-1 text-[11px] font-semibold",
                                  channelClasses[conversation.channel],
                                )}
                              >
                                {conversation.channel}
                              </span>
                            </div>
                            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                              {conversation.preview}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTimestamp(conversation.lastMessageAt)}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <span className="mt-2 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <PanelResizeDivider
          side="left"
          value={panelWidths.left}
          isActive={activeDivider === "left"}
          onKeyDown={(event) => handleDividerKeyDown("left", event)}
          onPointerDown={(event) => handleDividerPointerDown("left", event)}
          onPointerMove={handleDividerPointerMove}
          onPointerEnd={handleDividerPointerEnd}
        />

        <section
          data-testid="chat-panel"
          className={classNames("min-h-0 min-w-0", !isMobileDetailOpen && "hidden lg:block")}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 lg:hidden"
                    onClick={() => setIsMobileDetailOpen(false)}
                  >
                    {tCommon("back")}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {activeConversation?.customerName ?? t("selectConversation")}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeConversation
                        ? t("channelConversation", { channel: activeConversation.channel })
                        : t("selectConversation")}
                    </p>
                  </div>
                </div>
                {activeConversation ? (
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 lg:hidden"
                    onClick={() => setIsCustomerDrawerOpen(true)}
                  >
                    {t("customer")}
                  </button>
                ) : null}
              </div>
            </div>

            {isDetailLoading ? (
              <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                {t("loadingConversation")}
              </div>
            ) : detailError ? (
              <div className="p-4">
                <Alert tone="error">{detailError}</Alert>
              </div>
            ) : !activeConversation ? (
              <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("selectThread")}
              </div>
            ) : (
              <>
                <div
                  data-testid="message-thread"
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
                >
                  {activeMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>

                <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                  {composerError ? (
                    <div className="mb-3">
                      <Alert tone="error">{composerError}</Alert>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3">
                    <textarea
                      data-testid="message-input"
                      className="min-h-28 rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800"
                      placeholder={t("replyPlaceholder")}
                      value={messageDraft}
                      onChange={(event) => setMessageDraft(event.target.value)}
                      disabled={!activeConversation || isSending}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t("mockStorage")}
                      </p>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button
                          className="w-auto"
                          onClick={() => void handleOpenSavedReplies()}
                          variant="secondary"
                        >
                          {t("savedReplies")}
                        </Button>
                        <Button
                          data-testid="send-message-button"
                          className="w-auto min-w-36"
                          loading={isSending}
                          onClick={handleSendMessage}
                          disabled={!activeConversation || !messageDraft.trim()}
                        >
                          {isSending ? t("sending") : t("send")}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <PanelResizeDivider
          side="right"
          value={panelWidths.right}
          isActive={activeDivider === "right"}
          onKeyDown={(event) => handleDividerKeyDown("right", event)}
          onPointerDown={(event) => handleDividerPointerDown("right", event)}
          onPointerMove={handleDividerPointerMove}
          onPointerEnd={handleDividerPointerEnd}
        />

        <CustomerPanel
          activeConversation={activeConversation}
          activeCustomer={activeCustomer}
          isDrawerOpen={isCustomerDrawerOpen}
          onCloseDrawer={() => setIsCustomerDrawerOpen(false)}
        />
      </div>

      <Modal
        isOpen={isSavedRepliesOpen}
        onClose={() => setIsSavedRepliesOpen(false)}
        title={t("savedReplies")}
      >
        <div className="space-y-4">
          <Input
            placeholder={t("searchSavedReplies")}
            value={savedReplySearch}
            onChange={(event) => setSavedReplySearch(event.target.value)}
          />

          {isSavedRepliesLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
              {t("loadingSavedReplies")}
            </div>
          ) : savedRepliesError ? (
            <Alert tone="error">{savedRepliesError}</Alert>
          ) : visibleSavedReplies.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              {t("savedRepliesEmpty")}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSavedReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-950"
                  onClick={() => {
                    setMessageDraft(reply.message);
                    setIsSavedRepliesOpen(false);
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{reply.title}</p>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {reply.shortcut}
                    </span>
                    <span className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800">
                      {reply.category}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{reply.message}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </main>
  );
}






