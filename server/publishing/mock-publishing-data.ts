import "server-only";

import type {
  MockMediaAsset,
  PublishingCreateInput,
  PublishingPost,
  PublishingPublishResponse,
} from "@/features/publishing/types/publishing";

const mediaAssets: MockMediaAsset[] = [
  { accent: "from-pink-200 via-orange-100 to-amber-100", id: "launch-grid", label: "Launch grid" },
  { accent: "from-cyan-200 via-sky-100 to-indigo-100", id: "event-card", label: "Event card" },
  { accent: "from-emerald-200 via-lime-100 to-teal-100", id: "promo-banner", label: "Promo banner" },
];

function createInitialPostStore() {
  return new Map<string, PublishingPost>([
    [
      "post-001",
      {
        caption: "Weekend launch checklist is live. Grab the final promo assets and posting windows before 6 PM.",
        channels: ["Facebook", "Instagram"],
        createdAt: "2026-06-21T03:10:00.000Z",
        id: "post-001",
        media: mediaAssets[0],
        scheduledFor: "2026-06-22T02:30:00.000Z",
        status: "scheduled",
      },
    ],
    [
      "post-002",
      {
        caption: "Shipping notice: same-day courier cutoffs now update automatically in the workspace.",
        channels: ["Telegram", "X"],
        createdAt: "2026-06-20T10:20:00.000Z",
        id: "post-002",
        media: null,
        scheduledFor: null,
        status: "published",
      },
    ],
    [
      "post-003",
      {
        caption: "Drafting the next creator toolkit drop with carousel variations and hashtag options.",
        channels: ["Instagram", "TikTok"],
        createdAt: "2026-06-19T09:00:00.000Z",
        id: "post-003",
        media: mediaAssets[2],
        scheduledFor: null,
        status: "draft",
      },
    ],
    [
      "post-004",
      {
        caption: "The provider rejected this post because the mock TikTok caption exceeded the safe preview limit.",
        channels: ["TikTok"],
        createdAt: "2026-06-18T07:40:00.000Z",
        id: "post-004",
        media: mediaAssets[1],
        scheduledFor: null,
        status: "failed",
      },
    ],
  ]);
}

const sessionPostStores = new Map<string, Map<string, PublishingPost>>();

function getSessionPostStore(sessionId: string) {
  const existing = sessionPostStores.get(sessionId);

  if (existing) {
    return existing;
  }

  const nextStore = createInitialPostStore();
  sessionPostStores.set(sessionId, nextStore);
  return nextStore;
}

function comparePosts(left: PublishingPost, right: PublishingPost) {
  return right.createdAt.localeCompare(left.createdAt);
}

export async function listMockPublishingPosts(sessionId: string) {
  return Array.from(getSessionPostStore(sessionId).values()).sort(comparePosts);
}

export async function listMockMediaAssets() {
  return mediaAssets;
}

export async function createMockPublishingPost(
  sessionId: string,
  input: PublishingCreateInput,
) {
  const media = input.mediaId
    ? mediaAssets.find((asset) => asset.id === input.mediaId) ?? null
    : null;

  const status =
    input.submitMode === "draft"
      ? "draft"
      : input.submitMode === "schedule"
        ? "scheduled"
        : input.channels.includes("TikTok") && input.caption.length > 120
          ? "failed"
          : "published";

  const post: PublishingPost = {
    caption: input.caption,
    channels: [...input.channels],
    createdAt: new Date().toISOString(),
    id: `post-${Date.now()}`,
    media,
    scheduledFor: status === "scheduled" ? input.scheduledFor : null,
    status,
  };

  getSessionPostStore(sessionId).set(post.id, post);

  return { post };
}

export async function publishMockPublishingPost(
  sessionId: string,
  postId: string,
): Promise<PublishingPublishResponse | null> {
  const post = getSessionPostStore(sessionId).get(postId);

  if (!post) {
    return null;
  }

  const nextStatus =
    post.channels.includes("TikTok") && post.caption.length > 120
      ? "failed"
      : "published";

  const updated: PublishingPost = {
    ...post,
    scheduledFor: null,
    status: nextStatus,
  };

  getSessionPostStore(sessionId).set(postId, updated);

  return { post: updated };
}
