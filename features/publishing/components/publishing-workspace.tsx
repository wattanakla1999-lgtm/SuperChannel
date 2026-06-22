"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Toast } from "@/components/ui/toast";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import { getIntegrations } from "@/features/integrations/services/integration-service";
import {
  createPublishingPost,
  getPublishingPosts,
  publishExistingPost,
} from "../services/publishing-service";
import type {
  MockMediaAsset,
  PublishingChannel,
  PublishingCreateInput,
  PublishingPost,
  PublishingStatus,
} from "../types/publishing";

const tabs: Array<{ label: string; value: PublishingStatus }> = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
  { label: "Failed", value: "failed" },
];

const channelOptions: PublishingChannel[] = [
  "Facebook",
  "Instagram",
  "X",
  "Telegram",
  "TikTok",
];

const mockMediaOptions: MockMediaAsset[] = [
  { accent: "from-pink-200 via-orange-100 to-amber-100", id: "launch-grid", label: "Launch grid" },
  { accent: "from-cyan-200 via-sky-100 to-indigo-100", id: "event-card", label: "Event card" },
  { accent: "from-emerald-200 via-lime-100 to-teal-100", id: "promo-banner", label: "Promo banner" },
];

const channelLimitationCopy: Record<PublishingChannel, string> = {
  Facebook: "Facebook mock preview truncates long captions after two lines.",
  Instagram: "Instagram mock preview assumes square-crop media placement.",
  Telegram: "Telegram mock posts render link-free text only in this demo.",
  TikTok: "TikTok mock warns on long captions and only supports mock media metadata.",
  X: "X mock preview emphasizes short-form copy and compact media cards.",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Publish now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildScheduledAt(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  return new Date(`${dateValue}T${timeValue}:00`).toISOString();
}

export function PublishingWorkspace() {
  const [posts, setPosts] = useState<PublishingPost[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<PublishingStatus>("all");
  const [channelFilter, setChannelFilter] = useState<PublishingChannel | "all">(
    "all",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "error">("success");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<PublishingChannel[]>(
    [],
  );
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [availableChannels, setAvailableChannels] =
    useState<PublishingChannel[]>(channelOptions);
  const [minimumScheduleDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return toDateInputValue(tomorrow);
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPosts() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextPosts = await getPublishingPosts();

        if (!isMounted) {
          return;
        }

        setPosts(nextPosts);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : "We couldn't load the publishing workspace.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAvailableChannels() {
      try {
        const integrations = await getIntegrations();

        if (!isMounted) {
          return;
        }

        const enabledChannels = integrations
          .filter(
            (integration) =>
              integration.capabilities.includes("publishing") &&
              integration.status !== "disconnected" &&
              integration.status !== "coming_soon",
          )
          .map((integration) => {
            switch (integration.id) {
              case "facebook":
                return "Facebook";
              case "instagram":
                return "Instagram";
              case "telegram":
                return "Telegram";
              case "tiktok":
                return "TikTok";
              case "x":
                return "X";
              default:
                return null;
            }
          })
          .filter(Boolean) as PublishingChannel[];

        if (enabledChannels.length > 0) {
          setAvailableChannels(enabledChannels);
          setSelectedChannels((current) =>
            current.filter((channel) => enabledChannels.includes(channel)),
          );
          if (
            channelFilter !== "all" &&
            !enabledChannels.includes(channelFilter)
          ) {
            setChannelFilter("all");
          }
        }
      } catch {
        // Keep the existing publishing options when integrations are unavailable.
      }
    }

    void loadAvailableChannels();

    return () => {
      isMounted = false;
    };
  }, [channelFilter]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToastMessage(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesStatus = activeTab === "all" ? true : post.status === activeTab;
      const matchesChannel =
        channelFilter === "all" ? true : post.channels.includes(channelFilter);

      if (!matchesStatus || !matchesChannel) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        post.caption.toLowerCase().includes(normalizedSearch) ||
        post.channels.some((channel) =>
          channel.toLowerCase().includes(normalizedSearch),
        )
      );
    });
  }, [activeTab, channelFilter, posts, searchTerm]);

  const selectedMedia =
    mockMediaOptions.find((option) => option.id === selectedMediaId) ?? null;

  const resetComposer = () => {
    setCaption("");
    setSelectedChannels([]);
    setSelectedMediaId(null);
    setIsScheduled(false);
    setScheduleDate("");
    setScheduleTime("");
    setFormError(null);
  };

  const toggleChannel = (channel: PublishingChannel) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  };

  const validateComposer = (submitMode: PublishingCreateInput["submitMode"]) => {
    if (!caption.trim() && !selectedMediaId) {
      return "Add a caption or media";
    }

    if (!selectedChannels.length) {
      return "Select at least one channel";
    }

    if (submitMode === "schedule") {
      const scheduledFor = buildScheduledAt(scheduleDate, scheduleTime);
      if (!scheduledFor || new Date(scheduledFor).getTime() <= Date.now()) {
        return "Choose a future date and time";
      }
    }

    return null;
  };

  const handleSubmit = async (submitMode: PublishingCreateInput["submitMode"]) => {
    const validationError = validateComposer(submitMode);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const post = await createPublishingPost({
        caption: caption.trim(),
        channels: selectedChannels,
        mediaId: selectedMediaId,
        scheduledFor:
          submitMode === "schedule"
            ? buildScheduledAt(scheduleDate, scheduleTime)
            : null,
        submitMode,
      });

      setPosts((current) => [post, ...current]);
      setIsComposerOpen(false);
      resetComposer();
      setToastTone(post.status === "failed" ? "error" : "success");
      setToastMessage(
        post.status === "draft"
          ? "Draft saved"
          : post.status === "scheduled"
            ? "Post scheduled"
            : post.status === "failed"
              ? "Post saved with mock failure"
              : "Post published",
      );
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "We couldn't save this post.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishExisting = async (postId: string) => {
    if (publishingPostId) {
      return;
    }

    setPublishingPostId(postId);

    try {
      const post = await publishExistingPost(postId);
      setPosts((current) =>
        current.map((item) => (item.id === postId ? post : item)),
      );
      setToastTone(post.status === "failed" ? "error" : "success");
      setToastMessage(
        post.status === "failed"
          ? "Post saved with mock failure"
          : "Post published",
      );
    } catch (error) {
      setToastTone("error");
      setToastMessage(
        error instanceof ApiError ? error.message : "Unable to publish this post.",
      );
    } finally {
      setPublishingPostId(null);
    }
  };

  const limitationChannels =
    selectedChannels.length > 0 ? selectedChannels : availableChannels.slice(0, 2);

  return (
    <>
      <main
        data-testid="publishing-page"
        className="flex h-full min-h-[calc(100vh-97px)] flex-col px-4 py-4 lg:px-6 lg:py-6"
      >
        <div className="space-y-4">
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                  Publishing workspace
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Draft, schedule, and publish mock channel posts from one queue
                  while reviewing channel coverage and status at a glance.
                </p>
              </div>
              <Button
                data-testid="create-post-button"
                className="w-full sm:w-auto"
                onClick={() => {
                  resetComposer();
                  setIsComposerOpen(true);
                }}
              >
                Create post
              </Button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    className={classNames(
                      "rounded-full px-3 py-2 text-sm font-medium transition",
                      activeTab === tab.value
                        ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700",
                    )}
                    onClick={() => setActiveTab(tab.value)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px] xl:w-[540px]">
                <Input
                  placeholder="Search posts"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <select
                  className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800"
                  value={channelFilter}
                  onChange={(event) =>
                    setChannelFilter(
                      event.target.value as PublishingChannel | "all",
                    )
                  }
                >
                  <option value="all">All channels</option>
                  {availableChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-slate-500 dark:text-slate-400">
                <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
                Loading posts...
              </div>
            ) : errorMessage ? (
              <ErrorState message={errorMessage} />
            ) : posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                description="Create your first mock post to populate the publishing queue."
                action={
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => setIsComposerOpen(true)}
                  >
                    Create post
                  </Button>
                }
              />
            ) : filteredPosts.length === 0 ? (
              <EmptyState
                title="No matching posts"
                description="Try a different tab, channel filter, or search term."
              />
            ) : (
              <div data-testid="post-list" className="space-y-3">
                {filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/70"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={post.status}>{post.status}</StatusBadge>
                          {post.channels.map((channel) => (
                            <span
                              key={channel}
                                className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                            >
                              {channel}
                            </span>
                          ))}
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
                          {post.caption || "Mock media-only post"}
                        </p>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span>{formatDateTime(post.scheduledFor)}</span>
                          <span>Created {formatDateTime(post.createdAt)}</span>
                          {post.media ? <span>Media: {post.media.label}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {post.status === "draft" ? (
                          <Button
                            className="w-full sm:w-auto"
                            variant="secondary"
                            loading={publishingPostId === post.id}
                            onClick={() => handlePublishExisting(post.id)}
                          >
                            Publish now
                          </Button>
                        ) : null}
                        {post.status === "scheduled" ? (
                          <Button
                            className="w-full sm:w-auto"
                            variant="secondary"
                            loading={publishingPostId === post.id}
                            onClick={() => handlePublishExisting(post.id)}
                          >
                            Publish early
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Modal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        title="Create post"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="space-y-6">
            {formError ? <ErrorState message={formError} /> : null}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="post-caption-field"
                  className="text-sm font-semibold text-slate-950 dark:text-slate-100"
                >
                  Caption
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">{caption.length}/280</span>
              </div>
              <textarea
                id="post-caption-field"
                data-testid="post-caption-field"
                className="min-h-40 w-full rounded-[1.25rem] border border-slate-200 px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus-visible:border-cyan-500 dark:focus-visible:ring-slate-800"
                placeholder="Write the post caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                disabled={isSubmitting}
              />
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Mock media</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {mockMediaOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={classNames(
                      "rounded-[1.25rem] border p-3 text-left transition",
                      selectedMediaId === option.id
                        ? "border-cyan-300 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30"
                        : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900",
                    )}
                    onClick={() =>
                      setSelectedMediaId((current) =>
                        current === option.id ? null : option.id,
                      )
                    }
                    disabled={isSubmitting}
                  >
                    <div
                      className={classNames(
                        "h-24 rounded-2xl bg-gradient-to-br",
                        option.accent,
                      )}
                    />
                    <p className="mt-3 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {option.label}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Channels</p>
              <div
                data-testid="channel-selector"
                className="grid gap-3 sm:grid-cols-2"
              >
                {availableChannels.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    className={classNames(
                      "rounded-[1.25rem] border px-4 py-3 text-left text-sm font-medium transition",
                      selectedChannels.includes(channel)
                        ? "border-slate-950 bg-slate-950 text-white dark:border-cyan-500 dark:bg-cyan-500 dark:text-slate-950"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900",
                    )}
                    onClick={() => toggleChannel(channel)}
                    disabled={isSubmitting}
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                    Schedule for later
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Toggle to publish at a future time.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="schedule-toggle"
                  aria-pressed={isScheduled}
                  className={classNames(
                    "rounded-full px-4 py-2 text-sm font-semibold transition",
                    isScheduled
                      ? "bg-slate-950 text-white dark:bg-cyan-500 dark:text-slate-950"
                      : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                  )}
                  onClick={() => setIsScheduled((current) => !current)}
                  disabled={isSubmitting}
                >
                  {isScheduled ? "Scheduled" : "Publish now"}
                </button>
              </div>
              {isScheduled ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={scheduleDate}
                    min={minimumScheduleDate}
                    onChange={(event) => setScheduleDate(event.target.value)}
                    disabled={isSubmitting}
                  />
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Channel preview</p>
              <div className="mt-4 space-y-3">
                <div
                  className={classNames(
                    "h-36 rounded-[1.25rem] bg-gradient-to-br",
                    selectedMedia?.accent ?? "from-slate-200 via-slate-100 to-slate-50",
                  )}
                />
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {caption || "Start writing to preview your mock post."}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(selectedChannels.length
                    ? selectedChannels
                    : availableChannels.slice(0, 2)
                  ).map(
                    (channel) => (
                      <span
                        key={channel}
                        className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {channel}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                Channel-specific limitations
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
                {limitationChannels.map((channel) => (
                  <li key={channel}>{channelLimitationCopy[channel]}</li>
                ))}
              </ul>
            </section>

            <div className="flex flex-col gap-3">
              <Button
                data-testid="save-draft-button"
                variant="secondary"
                loading={isSubmitting}
                onClick={() => handleSubmit("draft")}
              >
                Save draft
              </Button>
              <Button
                data-testid="submit-post-button"
                loading={isSubmitting}
                onClick={() => handleSubmit(isScheduled ? "schedule" : "publish")}
              >
                {isScheduled ? "Schedule post" : "Publish post"}
              </Button>
            </div>
          </aside>
        </div>
      </Modal>

      <Toast message={toastMessage} tone={toastTone} />
    </>
  );
}
