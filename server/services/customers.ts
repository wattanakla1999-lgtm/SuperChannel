import "server-only";

import type {
    CustomerActivityEntry,
    CustomerDetail,
    CustomerListResponse,
    CustomerSummary,
} from "@/features/customers/types/customers";
import type { ConversationDetail, ConversationSummary } from "@/features/inbox/types/inbox";
import type { AuthenticatedSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { fetchLineProfile } from "@/server/integrations/line-client";
import { getLineAttachmentContent, sendLineImageReplyFromInbox, sendLineReplyFromInbox } from "@/server/services/line";
import { sendMetaImageReplyFromInbox, sendMetaReplyFromInbox } from "@/server/services/meta";
import { createSignedAttachmentUrl, downloadStoredAttachment, uploadConversationImage } from "@/server/storage/message-attachments";
import type { ChannelType, ConversationStatus, Prisma } from "@prisma/client";

const inboxChannelLabels = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINE: "LINE",
  TELEGRAM: "Telegram",
  X: "X",
  TIKTOK: "TikTok",
  SHOPEE: "Shopee",
  LAZADA: "Lazada",
  TIKTOK_SHOP: "TikTok Shop",
} as const;

function toStatusLabel(status: "OPEN" | "PENDING" | "RESOLVED") {
  return status.toLowerCase() as "open" | "pending" | "resolved";
}

function toInboxChannel(channel: keyof typeof inboxChannelLabels) {
  const value = inboxChannelLabels[channel];
  if (value === "Facebook" || value === "Instagram" || value === "LINE" || value === "Telegram") {
    return value;
  }

  return "Telegram";
}

function buildMessageAttachmentUrl(messageId: string, attachmentId: string) {
  return `/api/inbox/messages/${encodeURIComponent(messageId)}/attachments/${encodeURIComponent(attachmentId)}`;
}

function buildLineStickerImageUrl(stickerId: string) {
  return `https://stickershop.line-scdn.net/stickershop/v1/sticker/${encodeURIComponent(stickerId)}/android/sticker.png`;
}

function readLineMetadataValue(
  metadata: Prisma.JsonValue | null,
  key: string,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const line = "line" in metadata ? metadata.line : null;
  if (!line || typeof line !== "object" || Array.isArray(line)) {
    return null;
  }

  const value = key in line ? line[key] : null;
  return typeof value === "string" && value.trim() ? value : null;
}

function readLineMetadataNumber(
  metadata: Prisma.JsonValue | null,
  key: string,
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const line = "line" in metadata ? metadata.line : null;
  if (!line || typeof line !== "object" || Array.isArray(line)) {
    return null;
  }

  const value = key in line ? line[key] : null;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSupabaseStoragePath(storagePath: string | null) {
  if (!storagePath?.startsWith("supabase:")) {
    return null;
  }

  return storagePath.slice("supabase:".length);
}

async function resolveAvatarImageUrl(
  customer: {
    id: string;
    avatarUrl?: string | null;
    profileUpdatedAt?: Date | null;
    channelIdentities: Array<{ channel: ChannelType; externalId: string }>;
  }
) {
  const lineIdentity = customer.channelIdentities.find((identity) => identity.channel === "LINE");
  if (lineIdentity) {
    const now = new Date();
    const isCacheValid =
      customer.avatarUrl &&
      customer.profileUpdatedAt &&
      (now.getTime() - customer.profileUpdatedAt.getTime()) < 24 * 60 * 60 * 1000;

    if (isCacheValid) {
      return customer.avatarUrl;
    }

    try {
      const profile = await fetchLineProfile(lineIdentity.externalId);
      const pictureUrl = profile.pictureUrl ?? null;

      // Update database cache in the background (avoid blocking API response)
      prisma.customer.update({
        data: {
          avatarUrl: pictureUrl,
          profileUpdatedAt: new Date(),
        },
        where: {
          id: customer.id,
        },
      }).catch((e) => console.error("[LINE_PROFILE_CACHE] Failed to update profile cache in DB", e));

      return pictureUrl;
    } catch {
      return customer.avatarUrl ?? null;
    }
  }

  const metaIdentity = customer.channelIdentities.find(
    (identity) => identity.channel === "FACEBOOK" || identity.channel === "INSTAGRAM"
  );
  if (metaIdentity) {
    return customer.avatarUrl ?? null;
  }

  return null;
}

function toCustomerSummary(customer: {
  assignedMember: { profile: { fullName: string } } | null;
  avatarFallback: string | null;
  channelIdentities: Array<{ channel: ChannelType; externalId: string; handle: string }>;
  email: string | null;
  id: string;
  lastInteractionAt: Date | null;
  location: string | null;
  name: string;
  phone: string | null;
  primaryConversationId: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED";
  tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
  unreadCount: number;
  avatarImageUrl?: string | null;
}): CustomerSummary {
  return {
    assignedAgent: customer.assignedMember?.profile.fullName ?? "Unassigned",
    avatarImageUrl: customer.avatarImageUrl ?? null,
    avatarFallback: customer.avatarFallback ?? customer.name.slice(0, 2).toUpperCase(),
    connectedChannels: customer.channelIdentities.map((identity) => ({
      channel: toInboxChannel(identity.channel),
      externalId: identity.externalId,
      handle: identity.handle,
    })),
    email: customer.email ?? "",
    id: customer.id,
    lastInteractionAt: customer.lastInteractionAt?.toISOString() ?? new Date(0).toISOString(),
    location: customer.location ?? "",
    name: customer.name,
    phone: customer.phone ?? "",
    primaryConversationId: customer.primaryConversationId,
    status: toStatusLabel(customer.status),
    tags: customer.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
    unreadCount: customer.unreadCount,
  };
}

function toRecentActivity(detail: {
  notesEntries: Array<{ authorMember: { profile: { fullName: string } } | null; body: string; createdAt: Date; id: string }>;
}) {
  return detail.notesEntries.map<CustomerActivityEntry>((note) => ({
    body: note.body,
    channel: "Facebook",
    createdAt: note.createdAt.toISOString(),
    direction: "internal",
    id: note.id,
    senderName: note.authorMember?.profile.fullName ?? "Workspace",
    type: "note",
  }));
}

export async function listCustomersFromDatabase(
  session: AuthenticatedSession,
  query: {
    assignedAgent?: string;
    channel?: "Facebook" | "Instagram" | "LINE" | "Telegram";
    page: number;
    pageSize: number;
    search?: string;
    status?: "open" | "pending" | "resolved";
    tags?: string[];
    tagOperator?: "AND" | "OR";
  },
): Promise<CustomerListResponse> {
  const where: Prisma.CustomerWhereInput = {
    organizationId: session.organizationId,
    assignedMember: query.assignedAgent
      ? {
          profile: {
            fullName: query.assignedAgent,
          },
        }
      : undefined,
    channelIdentities: query.channel
      ? {
          some: {
            channel: query.channel.toUpperCase().replace("-", "_") as ChannelType,
          },
        }
      : undefined,
    OR: query.search
      ? [
          { name: { contains: query.search, mode: "insensitive" as const } },
          { email: { contains: query.search, mode: "insensitive" as const } },
          { phone: { contains: query.search, mode: "insensitive" as const } },
        ]
      : undefined,
    status: query.status ? (query.status.toUpperCase() as ConversationStatus) : undefined,
    ...(query.tags && query.tags.length > 0
      ? query.tagOperator === "OR"
        ? {
            tags: {
              some: {
                tag: {
                  name: { in: query.tags },
                },
              },
            },
          }
        : {
            AND: query.tags.map((tag) => ({
              tags: {
                some: {
                  tag: {
                    name: tag,
                  },
                },
              },
            })),
          }
      : {}),
  };

  const [customers, totalItems, allMembers, allTags] = await Promise.all([
    prisma.customer.findMany({
      include: {
        assignedMember: { include: { profile: true } },
        channelIdentities: true,
        tags: { include: { tag: true } },
      },
      orderBy: { lastInteractionAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.customer.count({ where }),
    prisma.member.findMany({
      include: { profile: true },
      orderBy: { profile: { fullName: "asc" } },
      where: {
        organizationId: session.organizationId,
        role: { in: ["AGENT", "SUPERVISOR"] },
        status: "ACTIVE",
      },
    }),
    prisma.tag.findMany({
      orderBy: { name: "asc" },
      where: { organizationId: session.organizationId },
    }),
  ]);

  const customersWithAvatars = await Promise.all(
    customers.map(async (customer) => ({
      ...customer,
      avatarImageUrl: await resolveAvatarImageUrl(customer),
    })),
  );

  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  return {
    customers: customersWithAvatars.map(toCustomerSummary),
    filters: {
      agents: allMembers.map((member) => ({
        label: member.profile.fullName,
        value: member.profile.fullName,
      })),
      channels: ["Facebook", "Instagram", "LINE", "Telegram"],
      statuses: ["open", "pending", "resolved"],
      tags: allTags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    },
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    },
    totalCustomers: totalItems,
  };
}

export async function getCustomerDetailFromDatabase(session: AuthenticatedSession, customerId: string) {
  const customer = await prisma.customer.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      channelIdentities: true,
      notesEntries: {
        include: {
          authorMember: { include: { profile: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      tags: { include: { tag: true } },
    },
    where: {
      id: customerId,
      organizationId: session.organizationId,
    },
  });

  if (!customer) {
    return null;
  }

  const summary = toCustomerSummary({
    ...customer,
    avatarImageUrl: await resolveAvatarImageUrl(customer),
  });

  return {
    ...summary,
    noteEntries: customer.notesEntries.map((note) => ({
      authorName: note.authorMember?.profile.fullName ?? "Workspace",
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      id: note.id,
    })),
    notes: customer.notes ?? "",
    recentActivity: toRecentActivity(customer),
  } satisfies CustomerDetail;
}

export async function updateCustomerTagsFromDatabase(
  session: AuthenticatedSession,
  customerId: string,
  tags: string[],
) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: session.organizationId,
    },
  });

  if (!customer) {
    return null;
  }

  const existingTags = await prisma.tag.findMany({
    where: {
      organizationId: session.organizationId,
      name: {
        in: tags,
      },
    },
  });
  const existingNames = new Set(existingTags.map((tag) => tag.name));
  const missingNames = tags.filter((tag) => !existingNames.has(tag));

  if (missingNames.length > 0) {
    await prisma.tag.createMany({
      data: missingNames.map((name) => ({
        name,
        organizationId: session.organizationId,
      })),
      skipDuplicates: true,
    });
  }

  const finalTags = await prisma.tag.findMany({
    where: {
      organizationId: session.organizationId,
      name: {
        in: tags,
      },
    },
  });

  await prisma.customerTag.deleteMany({
    where: {
      customerId,
    },
  });

  await prisma.customerTag.createMany({
    data: finalTags.map((tag) => ({
      customerId,
      organizationId: session.organizationId,
      tagId: tag.id,
    })),
    skipDuplicates: true,
  });

  return getCustomerDetailFromDatabase(session, customerId);
}

export async function addCustomerNoteFromDatabase(
  session: AuthenticatedSession,
  customerId: string,
  body: string,
) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: session.organizationId,
    },
  });

  if (!customer) {
    return null;
  }

  await prisma.customerNote.create({
    data: {
      authorMemberId: session.accountId,
      body,
      customerId,
      organizationId: session.organizationId,
    },
  });

  return getCustomerDetailFromDatabase(session, customerId);
}

export async function listConversationSummariesFromDatabase(session: AuthenticatedSession) {
  const conversations = await prisma.conversation.findMany({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: {
            select: {
              channel: true,
              externalId: true,
            },
          },
        },
      },
      tags: { include: { tag: true } },
    },
    orderBy: [
      {
        customer: {
          lastInteractionAt: "desc",
        },
      },
      {
        lastMessageAt: "desc",
      },
    ],
    where: {
      organizationId: session.organizationId,
    },
  });

  return Promise.all(
    conversations.map(async (conversation) => ({
      assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
      channel: toInboxChannel(conversation.channel),
      customerAvatarFallback:
        conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
      customerAvatarImageUrl: await resolveAvatarImageUrl(conversation.customer),
      customerId: conversation.customerId,
      customerName: conversation.customer.name,
      id: conversation.id,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? conversation.createdAt.toISOString(),
      preview: conversation.previewText ?? "",
      status: toStatusLabel(conversation.status),
      tags: conversation.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
      unreadCount: conversation.unreadCount,
    })),
  );
}

export async function getConversationDetailFromDatabase(
  session: AuthenticatedSession,
  conversationId: string,
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: true,
          tags: { include: { tag: true } },
        },
      },
    messages: {
        include: {
          attachments: true,
        },
        orderBy: { createdAt: "asc" },
      },
      tags: { include: { tag: true } },
    },
    where: {
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  if (conversation.unreadCount > 0 || conversation.customer.unreadCount > 0) {
    await prisma.$transaction([
      prisma.conversation.update({
        data: {
          unreadCount: 0,
        },
        where: {
          id: conversation.id,
        },
      }),
      prisma.customer.update({
        data: {
          unreadCount: 0,
        },
        where: {
          id: conversation.customer.id,
        },
      }),
    ]);

    conversation.unreadCount = 0;
    conversation.customer.unreadCount = 0;
  }

  const summary: ConversationSummary = {
    assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
    channel: toInboxChannel(conversation.channel),
    customerAvatarFallback:
      conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
    customerAvatarImageUrl: await resolveAvatarImageUrl(conversation.customer),
    customerId: conversation.customerId,
    customerName: conversation.customer.name,
    id: conversation.id,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? conversation.createdAt.toISOString(),
    preview: conversation.previewText ?? "",
    status: toStatusLabel(conversation.status),
    tags: conversation.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
    unreadCount: conversation.unreadCount,
  };

  return {
    conversation: summary,
    customer: {
      avatarImageUrl: await resolveAvatarImageUrl(conversation.customer),
      avatarFallback:
        conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
      customerTags: conversation.customer.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
      email: conversation.customer.email ?? "",
      id: conversation.customer.id,
      location: conversation.customer.location ?? "",
      name: conversation.customer.name,
      notes: conversation.customer.notes ?? "",
      phone: conversation.customer.phone ?? "",
    },
    messages: conversation.messages.map((message) => {
      const imageAttachment = message.attachments.find(
        (attachment) => attachment.kind === "IMAGE",
      );
      const rawLineType = readLineMetadataValue(message.metadata, "rawType");
      const lineStickerId = readLineMetadataValue(message.metadata, "stickerId");
      const isSticker = rawLineType === "sticker" && Boolean(lineStickerId);

      return {
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        direction: message.direction.toLowerCase() as "inbound" | "outbound",
        id: message.id,
        imageUrl:
          isSticker && lineStickerId
            ? buildLineStickerImageUrl(lineStickerId)
            : message.type === "IMAGE" && imageAttachment
            ? buildMessageAttachmentUrl(message.id, imageAttachment.id)
            : null,
        audioDurationMs:
          readLineMetadataValue(message.metadata, "rawType") === "audio"
            ? readLineMetadataNumber(message.metadata, "duration")
            : null,
        audioUrl:
          readLineMetadataValue(message.metadata, "rawType") === "audio"
            ? (() => {
                const audioAttachment = message.attachments.find(
                  (attachment) => attachment.kind === "FILE",
                );
                return audioAttachment
                  ? buildMessageAttachmentUrl(message.id, audioAttachment.id)
                  : null;
              })()
            : null,
        senderName: message.senderDisplayName,
        type:
          isSticker
            ? "sticker"
            : readLineMetadataValue(message.metadata, "rawType") === "audio"
              ? "audio"
              : message.type.toLowerCase() as "text" | "image",
      };
    }),
  } satisfies ConversationDetail;
}

export async function appendConversationMessageFromDatabase(
  session: AuthenticatedSession,
  conversationId: string,
  body: string,
) {
  const lineResult = await sendLineReplyFromInbox(session, conversationId, body);

  if (lineResult) {
    return lineResult;
  }

  const metaResult = await sendMetaReplyFromInbox(session, conversationId, body);

  if (metaResult) {
    return metaResult;
  }

  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: true,
      tags: { include: { tag: true } },
    },
    where: {
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const message = await prisma.conversationMessage.create({
    data: {
      body,
      conversationId,
      direction: "OUTBOUND",
      id: crypto.randomUUID(),
      organizationId: session.organizationId,
      senderDisplayName: session.user.name,
      senderMemberId: session.accountId,
      type: "TEXT",
    },
  });

  await prisma.conversation.update({
    data: {
      lastMessageAt: message.createdAt,
      previewText: body,
      unreadCount: 0,
    },
    where: {
      id: conversation.id,
    },
  });

  return {
    conversation: {
      assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
      channel: toInboxChannel(conversation.channel),
      customerAvatarFallback:
        conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
      customerId: conversation.customerId,
      customerName: conversation.customer.name,
      id: conversation.id,
      lastMessageAt: message.createdAt.toISOString(),
      preview: body,
      status: toStatusLabel(conversation.status),
      tags: conversation.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
      unreadCount: 0,
    },
    message: {
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      direction: "outbound",
      id: message.id,
      audioDurationMs: null,
      audioUrl: null,
      imageUrl: null,
      senderName: message.senderDisplayName,
      type: "text",
    },
  };
}

export async function appendConversationImageFromDatabase(
  session: AuthenticatedSession,
  conversationId: string,
  file: File,
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: true,
      tags: { include: { tag: true } },
    },
    where: {
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const uploaded = await uploadConversationImage({
    conversationId,
    file,
    organizationId: session.organizationId,
  });

  if (conversation.channel === "LINE") {
    const signedUrl = await createSignedAttachmentUrl(uploaded.storagePath);
    return sendLineImageReplyFromInbox(
      session,
      conversationId,
      uploaded,
      {
        originalContentUrl: signedUrl,
        previewImageUrl: signedUrl,
      },
    );
  }

  if (conversation.channel === "FACEBOOK" || conversation.channel === "INSTAGRAM") {
    const signedUrl = await createSignedAttachmentUrl(uploaded.storagePath);
    return sendMetaImageReplyFromInbox(
      session,
      conversationId,
      uploaded,
      signedUrl,
    );
  }

  const createdAt = new Date();
  const messageId = crypto.randomUUID();
  const attachmentId = crypto.randomUUID();
  const message = await prisma.conversationMessage.create({
    data: {
      body: "",
      conversationId,
      direction: "OUTBOUND",
      id: messageId,
      organizationId: session.organizationId,
      senderDisplayName: session.user.name,
      senderMemberId: session.accountId,
      type: "IMAGE",
    },
  });

  await prisma.messageAttachment.create({
    data: {
      fileName: uploaded.fileName,
      id: attachmentId,
      kind: "IMAGE",
      messageId,
      mimeType: uploaded.contentType,
      organizationId: session.organizationId,
      storagePath: `supabase:${uploaded.storagePath}`,
    },
  });

  await prisma.conversation.update({
    data: {
      lastMessageAt: createdAt,
      previewText: "Image attachment",
      unreadCount: 0,
    },
    where: {
      id: conversation.id,
    },
  });

  await prisma.customer.update({
    data: {
      lastInteractionAt: createdAt,
      unreadCount: 0,
    },
    where: {
      id: conversation.customerId,
    },
  });

  return {
    conversation: {
      assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
      channel: toInboxChannel(conversation.channel),
      customerAvatarFallback:
        conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
      customerId: conversation.customerId,
      customerName: conversation.customer.name,
      id: conversation.id,
      lastMessageAt: createdAt.toISOString(),
      preview: "Image attachment",
      status: toStatusLabel(conversation.status),
      tags: conversation.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
      unreadCount: 0,
    },
    message: {
      body: "",
      createdAt: message.createdAt.toISOString(),
      direction: "outbound" as const,
      id: message.id,
      audioDurationMs: null,
      audioUrl: null,
      imageUrl: buildMessageAttachmentUrl(message.id, attachmentId),
      senderName: message.senderDisplayName,
      type: "image" as const,
    },
  };
}

export async function getMessageAttachmentContent(
  session: AuthenticatedSession,
  messageId: string,
  attachmentId: string,
) {
  const lineContent = await getLineAttachmentContent(session, messageId, attachmentId);

  if (lineContent) {
    return lineContent;
  }

  const attachment = await prisma.messageAttachment.findFirst({
    include: {
      message: {
        include: {
          conversation: true,
        },
      },
    },
    where: {
      id: attachmentId,
      kind: {
        in: ["IMAGE", "FILE"],
      },
      messageId,
      organizationId: session.organizationId,
    },
  });

  if (!attachment) {
    return null;
  }

  const storagePath = readSupabaseStoragePath(attachment.storagePath);

  if (!storagePath) {
    return null;
  }

  const content = await downloadStoredAttachment(storagePath);

  return {
    body: content.body,
    contentType: attachment.mimeType || content.contentType,
    fileName: attachment.fileName,
  };
}
