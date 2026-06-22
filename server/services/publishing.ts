import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import type { PublishingCreateInput, PublishingPost } from "@/features/publishing/types/publishing";
import type { AuthenticatedSession } from "@/server/auth/session";

function toProviderEnum(channel: string) {
  return channel.toUpperCase().replace(" ", "_").replace("-", "_") as
    | "FACEBOOK"
    | "INSTAGRAM"
    | "X"
    | "TELEGRAM"
    | "TIKTOK";
}

function mapPost(post: {
  caption: string;
  createdAt: Date;
  id: string;
  mediaMetadata: unknown;
  scheduledFor: Date | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  targets: Array<{ provider: string }>;
}) {
  return {
    caption: post.caption,
    channels: post.targets.map((target) =>
      target.provider === "FACEBOOK"
        ? "Facebook"
        : target.provider === "INSTAGRAM"
          ? "Instagram"
          : target.provider === "TELEGRAM"
            ? "Telegram"
            : target.provider === "TIKTOK"
              ? "TikTok"
              : "X",
    ) as PublishingPost["channels"],
    createdAt: post.createdAt.toISOString(),
    id: post.id,
    media: post.mediaMetadata as PublishingPost["media"],
    scheduledFor: post.scheduledFor?.toISOString() ?? null,
    status: post.status.toLowerCase() as PublishingPost["status"],
  } satisfies PublishingPost;
}

export async function listPublishingPostsFromDatabase(session: AuthenticatedSession) {
  const posts = await prisma.publishingPost.findMany({
    include: {
      targets: true,
    },
    orderBy: { createdAt: "desc" },
    where: { organizationId: session.organizationId },
  });

  return posts.map(mapPost);
}

export async function createPublishingPostInDatabase(
  session: AuthenticatedSession,
  input: PublishingCreateInput,
) {
  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  const status =
    input.submitMode === "draft"
      ? "DRAFT"
      : input.submitMode === "schedule"
        ? "SCHEDULED"
        : "PUBLISHED";

  const post = await prisma.publishingPost.create({
    data: {
      authorMemberId: session.accountId,
      caption: input.caption,
      id: crypto.randomUUID(),
      mediaMetadata: input.mediaId
        ? { id: input.mediaId }
        : Prisma.JsonNull,
      organizationId: session.organizationId,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      scheduledFor,
      status,
      submitMode:
        input.submitMode === "draft"
          ? "DRAFT"
          : input.submitMode === "schedule"
            ? "SCHEDULE"
            : "PUBLISH",
      targets: {
        create: input.channels.map((channel) => ({
          organizationId: session.organizationId,
          provider: toProviderEnum(channel),
          status:
            status === "SCHEDULED"
              ? "SCHEDULED"
              : status === "PUBLISHED"
                ? "PUBLISHED"
                : "PENDING",
          scheduledFor,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        })),
      },
    },
    include: {
      targets: true,
    },
  });

  return { post: mapPost(post) };
}

export async function publishPublishingPostInDatabase(
  session: AuthenticatedSession,
  postId: string,
) {
  const post = await prisma.publishingPost.findFirst({
    include: {
      targets: true,
    },
    where: {
      id: postId,
      organizationId: session.organizationId,
    },
  });

  if (!post) {
    return null;
  }

  const publishedAt = new Date();

  const updated = await prisma.publishingPost.update({
    data: {
      publishedAt,
      scheduledFor: null,
      status: "PUBLISHED",
      targets: {
        updateMany: {
          data: {
            publishedAt,
            scheduledFor: null,
            status: "PUBLISHED",
          },
          where: {
            postId,
          },
        },
      },
    },
    include: {
      targets: true,
    },
    where: {
      id: postId,
    },
  });

  return { post: mapPost(updated) };
}
