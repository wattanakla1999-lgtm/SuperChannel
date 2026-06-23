"use client";

import Image from "next/image";
import {
  ArrowLeft,
  Ellipsis,
  MessagesSquare,
  Paperclip,
  Search,
  SendHorizonal,
  Sparkles,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import type { SavedReply } from "@/features/settings/types/settings";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import { useFormatter, useTranslations } from "next-intl";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ChangeEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  getConversation,
  getConversations,
  getSavedReplies,
  sendConversationImage,
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
const LIST_POLL_INTERVAL_MS = 4_000;
const DETAIL_POLL_INTERVAL_MS = 3_000;

const channelClasses: Record<InboxChannel, string> = {
  Facebook: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200",
  Instagram: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200",
  LINE: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  Telegram: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
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
  const [detailCache, setDetailCache] = useState<Record<string, ConversationDetail>>({});
  const detailCacheRef = useRef<Record<string, ConversationDetail>>({});
  const [activeFilter, setActiveFilter] = useState<ConversationStatus>("all");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
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
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messageThreadRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const shouldInstantScrollRef = useRef(false);
  const listUnauthorizedCountRef = useRef(0);
  const detailUnauthorizedCountRef = useRef(0);
  const selectedConversationIdRef = useRef<string | null>(null);
  const isSendingRef = useRef(false);
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

  const resetPanelWidths = () => {
    const workspaceWidth = panelGridRef.current?.clientWidth;
    setPanelWidths(
      workspaceWidth
        ? fitPanelWidths(DEFAULT_PANEL_WIDTHS, workspaceWidth)
        : DEFAULT_PANEL_WIDTHS,
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

  const activeDetail = selectedConversationId ? detailCache[selectedConversationId] || null : null;

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    shouldAutoScrollRef.current = true;
  }, [selectedConversationId]);

  useEffect(() => {
    isSendingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const conversationId = selectedConversationId;
    let isMounted = true;

    async function loadDetail() {
      if (!detailCacheRef.current[conversationId]) {
        setIsDetailLoading(true);
      }
      setDetailError(null);
      setComposerError(null);

      try {
        const detail = await getConversation(conversationId);

        if (!isMounted) {
          return;
        }

        setDetailCache((prev) => {
          const next = { ...prev, [conversationId]: detail };
          detailCacheRef.current = next;
          return next;
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === detail.conversation.id
              ? detail.conversation
              : conversation,
          ),
        );
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

  useEffect(() => {
    let isMounted = true;

    async function refreshConversations() {
      if (document.hidden) {
        return;
      }

      try {
        const nextConversations = await getConversations();

        if (!isMounted) {
          return;
        }

        setConversations(nextConversations);
        listUnauthorizedCountRef.current = 0;
        setActiveConversationId((current) => {
          if (
            current &&
            nextConversations.some((conversation) => conversation.id === current)
          ) {
            return current;
          }

          if (
            initialConversationId &&
            nextConversations.some(
              (conversation) => conversation.id === initialConversationId,
            )
          ) {
            return initialConversationId;
          }

          return nextConversations[0]?.id ?? null;
        });
        setListError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorized(error)) {
          listUnauthorizedCountRef.current += 1;
          if (listUnauthorizedCountRef.current < 2) {
            return;
          }
        }

        setListError(
          isUnauthorized(error)
            ? tCommon("sessionExpired")
            : t("loadError"),
        );
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshConversations();
    }, LIST_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshConversations();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialConversationId, t, tCommon]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    let isMounted = true;

    async function refreshConversationDetail() {
      if (document.hidden || isSendingRef.current) {
        return;
      }

      const currentConversationId = selectedConversationIdRef.current;
      if (!currentConversationId) {
        return;
      }

      try {
        const detail = await getConversation(currentConversationId);

        if (!isMounted || selectedConversationIdRef.current !== currentConversationId) {
          return;
        }

        setDetailCache((prev) => {
          const next = { ...prev, [currentConversationId]: detail };
          detailCacheRef.current = next;
          return next;
        });
        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === detail.conversation.id
              ? detail.conversation
              : conversation,
          ),
        );
        detailUnauthorizedCountRef.current = 0;
        setDetailError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isUnauthorized(error)) {
          detailUnauthorizedCountRef.current += 1;
          if (detailUnauthorizedCountRef.current < 2) {
            return;
          }
        }

        setDetailError(
          isUnauthorized(error)
            ? tCommon("sessionExpired")
            : t("conversationError"),
        );
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshConversationDetail();
    }, DETAIL_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshConversationDetail();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedConversationId, t, tCommon]);

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setIsMobileDetailOpen(true);
    setIsCustomerDrawerOpen(false);
    shouldAutoScrollRef.current = true;
    shouldInstantScrollRef.current = !!detailCacheRef.current[conversationId];
  };

  const handleSendMessage = async () => {
    const trimmedMessage = messageDraft.trim();

    if (!selectedConversationId || (!trimmedMessage && !pendingImage) || isSending) {
      return;
    }

    setComposerError(null);
    setIsSending(true);

    try {
      const applySendResult = (
        result: Awaited<ReturnType<typeof sendConversationMessage>>,
      ) => {
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

        setDetailCache((prev) => {
          const currentDetail = selectedConversationId ? prev[selectedConversationId] : null;
          if (!currentDetail || currentDetail.conversation.id !== selectedConversationId) {
            return prev;
          }
          const nextDetail = {
            ...currentDetail,
            conversation: result.conversation,
            messages: [...currentDetail.messages, result.message],
          };
          const next = { ...prev, [selectedConversationId]: nextDetail };
          detailCacheRef.current = next;
          return next;
        });
      };

      if (pendingImage) {
        applySendResult(
          await sendConversationImage(selectedConversationId, pendingImage.file),
        );
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }

      if (trimmedMessage) {
        applySendResult(
          await sendConversationMessage(selectedConversationId, {
            body: trimmedMessage,
          }),
        );
      }

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

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setComposerError(t("imageOnlyError"));
      event.target.value = "";
      return;
    }

    setComposerError(null);
    setPendingImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file,
        previewUrl: URL.createObjectURL(file),
      };
    });
    event.target.value = "";
  };

  const handleRemovePendingImage = () => {
    setPendingImage((current) => {
      if (current) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  };

  const handleMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
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
  const latestMessageId = activeMessages[activeMessages.length - 1]?.id ?? null;
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

  useEffect(() => {
    const messageThread = messageThreadRef.current;

    if (!messageThread) {
      return;
    }

    const handleScroll = () => {
      const distanceFromBottom =
        messageThread.scrollHeight - messageThread.scrollTop - messageThread.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 96;
    };

    messageThread.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      messageThread.removeEventListener("scroll", handleScroll);
    };
  }, [activeConversation]);

  useLayoutEffect(() => {
    const messageThread = messageThreadRef.current;

    if (!messageThread || !activeConversation || !shouldAutoScrollRef.current) {
      return;
    }

    const behavior = shouldInstantScrollRef.current ? "auto" : "smooth";
    shouldInstantScrollRef.current = false;

    if (behavior === "auto") {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    } else {
      const timeoutId = window.setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
      }, 100);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeConversation, latestMessageId, activeMessages.length, isDetailLoading]);

  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

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
          <div className="flex h-full min-h-0 flex-col overflow-hidden border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-100">
                    <MessagesSquare className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />
                    <span>Conversations</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {visibleConversations.length} active threads
                  </p>
                </div>
                <button
                  aria-label={t("search")}
                  data-testid="conversation-search-toggle"
                  className={classNames(
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white",
                    isSearchExpanded && "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/40 dark:text-cyan-200",
                  )}
                  type="button"
                  onClick={() => setIsSearchExpanded((current) => !current)}
                >
                  <Search className="h-4.5 w-4.5" />
                </button>
              </div>
              <div className={classNames("grid transition-all", isSearchExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                <div className="overflow-hidden">
                  <Input
                    data-testid="conversation-search"
                    disabled={!areFiltersInteractive}
                    placeholder={t("search")}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    disabled={!areFiltersInteractive}
                    className={classNames(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                      activeFilter === filter
                        ? "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900",
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
              className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-2 dark:bg-slate-950"
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
                <div className="space-y-1.5">
                  {visibleConversations.map((conversation) => {
                    const isUnread = conversation.unreadCount > 0;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        data-testid={`conversation-item-${conversation.id}`}
                        className={classNames(
                          "w-full rounded-2xl border px-3 py-3 text-left transition",
                          selectedConversationId === conversation.id
                            ? "border-cyan-200 bg-cyan-50/80 dark:border-cyan-800 dark:bg-cyan-950/30"
                            : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:hover:border-slate-800 dark:hover:bg-slate-900",
                        )}
                        onClick={() => handleSelectConversation(conversation.id)}
                      >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          {conversation.customerAvatarImageUrl ? (
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100">
                              <Image
                                alt={conversation.customerName}
                                className="object-cover"
                                fill
                                sizes="44px"
                                src={conversation.customerAvatarImageUrl}
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-slate-800">
                              {conversation.customerAvatarFallback}
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p
                                className={classNames(
                                  "truncate text-sm text-slate-950 dark:text-slate-100",
                                  isUnread ? "font-extrabold" : "font-semibold",
                                )}
                              >
                                {conversation.customerName}
                              </p>
                              <span
                                className={classNames(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                  channelClasses[conversation.channel],
                                )}
                              >
                                {conversation.channel}
                              </span>
                              <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                            </div>
                            <p
                              className={classNames(
                                "line-clamp-1 text-sm dark:text-slate-400",
                                isUnread
                                  ? "font-bold text-slate-900 dark:text-slate-100"
                                  : "text-slate-600",
                              )}
                            >
                              {conversation.preview}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p
                            className={classNames(
                              "text-xs dark:text-slate-400",
                              isUnread
                                ? "font-bold text-slate-700 dark:text-slate-200"
                                : "text-slate-500",
                            )}
                          >
                            {formatTimestamp(conversation.lastMessageAt)}
                          </p>
                          {conversation.unreadCount > 0 ? (
                            <span className="mt-1 inline-flex min-w-6 items-center justify-center rounded-full bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        <PanelResizeDivider
          side="left"
          value={panelWidths.left}
          isActive={activeDivider === "left"}
          onDoubleClick={resetPanelWidths}
          onKeyDown={(event) => handleDividerKeyDown("left", event)}
          onPointerDown={(event) => handleDividerPointerDown("left", event)}
          onPointerMove={handleDividerPointerMove}
          onPointerEnd={handleDividerPointerEnd}
        />

        <section
          data-testid="chat-panel"
          className={classNames("min-h-0 min-w-0", !isMobileDetailOpen && "hidden lg:block")}
        >
          <div className="flex h-full min-h-0 flex-col overflow-hidden border-y border-slate-200 bg-[#f6fbfd] dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    aria-label={tCommon("back")}
                    type="button"
                    className="rounded-full border border-slate-200 p-2 text-slate-700 dark:border-slate-700 dark:text-slate-300 lg:hidden"
                    onClick={() => setIsMobileDetailOpen(false)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  {activeConversation ? (
                    activeConversation.customerAvatarImageUrl ? (
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100">
                        <Image alt={activeConversation.customerName} className="object-cover" fill sizes="40px" src={activeConversation.customerAvatarImageUrl} unoptimized />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white dark:bg-slate-800">
                        {activeConversation.customerAvatarFallback}
                      </div>
                    )
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {activeConversation?.customerName ?? t("selectConversation")}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {activeConversation
                        ? t("channelConversation", { channel: activeConversation.channel })
                        : t("selectConversation")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label={t("search")} type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
                    <Search className="h-4 w-4" />
                  </button>
                  <button aria-label="More actions" type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
                    <Ellipsis className="h-4 w-4" />
                  </button>
                  {activeConversation ? (
                    <button
                      type="button"
                      className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300 xl:hidden"
                      onClick={() => setIsCustomerDrawerOpen(true)}
                    >
                      {t("customer")}
                    </button>
                  ) : null}
                </div>
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
                  ref={messageThreadRef}
                  data-testid="message-thread"
                  className="min-h-0 flex-1 overflow-y-auto bg-[#f6fbfd] px-4 py-4 dark:bg-slate-950"
                >
                  <div className="space-y-4">
                    {activeMessages.map((message, index) => {
                      const previousMessage = activeMessages[index - 1];
                      const currentDay = new Date(message.createdAt).toDateString();
                      const previousDay = previousMessage
                        ? new Date(previousMessage.createdAt).toDateString()
                        : null;

                      return (
                        <MessageBubble
                          key={message.id}
                          isFirstOfDay={currentDay !== previousDay}
                          message={message}
                          customerAvatarUrl={activeConversation.customerAvatarImageUrl}
                          customerAvatarFallback={activeConversation.customerAvatarFallback}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  {composerError ? (
                    <div className="mb-3">
                      <Alert tone="error">{composerError}</Alert>
                    </div>
                  ) : null}
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <input
                      ref={imageInputRef}
                      accept="image/*"
                      className="hidden"
                      type="file"
                      onChange={handleImageSelection}
                    />
                    {pendingImage ? (
                      <div className="mb-3 flex items-center gap-3 rounded-[1.2rem] bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.1rem] bg-slate-200 dark:bg-slate-800">
                          <Image
                            alt={pendingImage.file.name}
                            className="object-cover"
                            fill
                            sizes="64px"
                            src={pendingImage.previewUrl}
                            unoptimized
                          />
                          <button
                            aria-label={t("removeImage")}
                            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-white backdrop-blur transition hover:bg-slate-950 dark:bg-slate-100/85 dark:text-slate-950 dark:hover:bg-white"
                            type="button"
                            onClick={handleRemovePendingImage}
                          >
                            <span className="text-sm">×</span>
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {pendingImage.file.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {t("imageReady")}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <div className="flex min-w-0 flex-1 overflow-hidden rounded-[1.6rem] bg-white ring-1 ring-slate-200 transition focus-within:ring-2 focus-within:ring-cyan-300 dark:bg-slate-950 dark:ring-slate-800 dark:focus-within:ring-cyan-500/60">
                        <textarea
                          data-testid="message-input"
                          className="min-h-[48px] max-h-32 w-full resize-none bg-transparent px-5 py-3 text-[15px] leading-6 text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                          placeholder={t("replyPlaceholder")}
                          value={messageDraft}
                          onChange={(event) => setMessageDraft(event.target.value)}
                          onKeyDown={handleMessageKeyDown}
                          disabled={!activeConversation || isSending}
                          rows={1}
                        />
                      </div>
                      <div className="relative group">
                        <button
                          aria-label={t("attachImage")}
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition hover:bg-blue-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/20 dark:hover:bg-cyan-500/20"
                          disabled={!activeConversation || isSending}
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-1 dark:ring-slate-700">
                          {t("attachImage")}
                          <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                        </div>
                      </div>
                      <div className="relative group">
                        <button
                          aria-label={t("savedReplies")}
                          className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                          type="button"
                          onClick={() => void handleOpenSavedReplies()}
                        >
                          <Sparkles className="h-5 w-5" />
                        </button>
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 scale-95 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-md transition-all duration-150 group-hover:scale-100 group-hover:opacity-100 dark:bg-slate-800 dark:text-slate-100 dark:ring-1 dark:ring-slate-700">
                          {t("savedReplies")}
                          <div className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                        </div>
                      </div>
                      <button
                        aria-label={isSending ? t("sending") : t("send")}
                        data-testid="send-message-button"
                        className={classNames(
                          "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full shadow-lg shadow-cyan-500/20 transition",
                          !activeConversation || (!messageDraft.trim() && !pendingImage)
                            ? "cursor-not-allowed bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-600"
                            : "bg-gradient-to-br from-sky-500 to-cyan-500 text-white hover:from-sky-400 hover:to-cyan-400 dark:text-slate-950",
                        )}
                        disabled={!activeConversation || (!messageDraft.trim() && !pendingImage) || isSending}
                        type="button"
                        onClick={handleSendMessage}
                      >
                        {isSending ? <Spinner className="text-current" /> : <SendHorizonal className="h-5 w-5" />}
                      </button>
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
          onDoubleClick={resetPanelWidths}
          onKeyDown={(event) => handleDividerKeyDown("right", event)}
          onPointerDown={(event) => handleDividerPointerDown("right", event)}
          onPointerMove={handleDividerPointerMove}
          onPointerEnd={handleDividerPointerEnd}
        />

        <CustomerPanel
          activeConversation={activeConversation}
          activeCustomer={activeCustomer}
          activeMessages={activeMessages}
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
