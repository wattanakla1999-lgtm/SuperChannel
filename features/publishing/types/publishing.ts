export type PublishingChannel =
  | "Facebook"
  | "Instagram"
  | "X"
  | "Telegram"
  | "TikTok";

export type PublishingStatus = "all" | "draft" | "scheduled" | "published" | "failed";

export type PublishingStoredStatus = Exclude<PublishingStatus, "all">;

export type MediaAsset = {
  accent: string;
  id: string;
  label: string;
};

export type PublishingPost = {
  caption: string;
  channels: PublishingChannel[];
  createdAt: string;
  id: string;
  media: MediaAsset | null;
  scheduledFor: string | null;
  status: PublishingStoredStatus;
};

export type PublishingPostsResponse = {
  posts: PublishingPost[];
};

export type PublishingCreateInput = {
  caption: string;
  channels: PublishingChannel[];
  mediaId: string | null;
  scheduledFor: string | null;
  submitMode: "draft" | "publish" | "schedule";
};

export type PublishingCreateResponse = {
  post: PublishingPost;
};

export type PublishingPublishResponse = {
  post: PublishingPost;
};
