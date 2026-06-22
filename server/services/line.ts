import "server-only";

import type { ConversationSummary } from "@/features/inbox/types/inbox";
import type { AuthenticatedSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { fetchLineMessageContent, fetchLineProfile, pushLineImageMessage, pushLineTextMessage } from "@/server/integrations/line-client";
import { Prisma } from "@prisma/client";

type LineWebhookBody = {
  destination?: string;
  events?: LineWebhookEvent[];
};

type LineWebhookEvent = {
  mode?: string;
  replyToken?: string;
  source?: {
    groupId?: string;
    roomId?: string;
    type?: string;
    userId?: string;
  };
  timestamp?: number;
  type: string;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery?: boolean;
  };
  message?: {
    duration?: number;
    packageId?: string;
    id: string;
    keywords?: string[];
    stickerId?: string;
    stickerResourceType?: string;
    text?: string;
    type: string;
    contentProvider?: Record<string, unknown>;
  };
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toConversationSummary(conversation: {
  assignedMember: { profile: { fullName: string } } | null;
  channel: "LINE";
  createdAt: Date;
  customer: { avatarFallback: string | null; id: string; name: string };
  customerId: string;
  id: string;
  lastMessageAt: Date | null;
  previewText: string | null;
  status: "OPEN" | "PENDING" | "RESOLVED";
  tags: Array<{ tag: { name: string } }>;
  unreadCount: number;
}): ConversationSummary {
  return {
    assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
    channel: "LINE",
    customerAvatarFallback:
      conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
    customerId: conversation.customerId,
    customerName: conversation.customer.name,
    id: conversation.id,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? conversation.createdAt.toISOString(),
    preview: conversation.previewText ?? "",
    status: conversation.status.toLowerCase() as "open" | "pending" | "resolved",
    tags: conversation.tags.map(({ tag }) => tag.name),
    unreadCount: conversation.unreadCount,
  };
}

async function getLineIntegration() {
  const integration = await prisma.integration.findFirst({
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    where: {
      provider: "LINE",
    },
  });

  if (!integration) {
    const error = new Error("LINE integration is not configured for any workspace.");
    error.name = "SERVICE_UNAVAILABLE";
    throw error;
  }

  return integration;
}

async function markIntegrationHealthy(integrationId: string) {
  await prisma.integration.update({
    data: {
      lastCheckedAt: new Date(),
      status: "CONNECTED",
    },
    where: {
      id: integrationId,
    },
  });
}

async function ensureLineConversationContext(
  organizationId: string,
  userId: string,
  profile?: {
    displayName: string;
    language?: string;
    pictureUrl?: string;
    statusMessage?: string;
    userId: string;
  } | null,
) {
  const existingIdentity = await prisma.customerChannelIdentity.findFirst({
    include: {
      customer: {
        include: {
          primaryConversation: true,
        },
      },
    },
    where: {
      channel: "LINE",
      externalId: userId,
      organizationId,
    },
  });

  if (existingIdentity) {
    const displayName = profile?.displayName?.trim();
    if (displayName && displayName !== existingIdentity.customer.name) {
      await prisma.customer.update({
        data: {
          avatarFallback: displayName.slice(0, 2).toUpperCase(),
          name: displayName,
        },
        where: {
          id: existingIdentity.customerId,
        },
      });
      await prisma.customerChannelIdentity.update({
        data: {
          handle: displayName,
        },
        where: {
          id: existingIdentity.id,
        },
      });
    }

    if (existingIdentity.customer.primaryConversation) {
      return {
        conversationId: existingIdentity.customer.primaryConversation.id,
        customerId: existingIdentity.customerId,
        customerName: displayName || existingIdentity.customer.name,
      };
    }

    const conversation = await prisma.conversation.create({
      data: {
        channel: "LINE",
        customerId: existingIdentity.customerId,
        externalThreadId: `line:user:${userId}`,
        id: `conv-line-${crypto.randomUUID()}`,
        organizationId,
        startedAt: new Date(),
        status: "OPEN",
      },
    });

    await prisma.customer.update({
      data: {
        primaryConversationId: conversation.id,
      },
      where: {
        id: existingIdentity.customerId,
      },
    });

    return {
      conversationId: conversation.id,
      customerId: existingIdentity.customerId,
      customerName: displayName || existingIdentity.customer.name,
    };
  }

  const displayName = profile?.displayName?.trim() || `LINE User ${userId.slice(-4)}`;
  const customerId = `cust-line-${crypto.randomUUID()}`;
  const conversationId = `conv-line-${crypto.randomUUID()}`;

  await prisma.customer.create({
    data: {
      avatarFallback: displayName.slice(0, 2).toUpperCase(),
      id: customerId,
      lastInteractionAt: new Date(),
      location: profile?.language ? `Locale: ${profile.language}` : null,
      name: displayName,
      notes: profile?.statusMessage ?? null,
      organizationId,
      status: "OPEN",
      unreadCount: 0,
    },
  });

  await prisma.customerChannelIdentity.create({
    data: {
      channel: "LINE",
      customerId,
      externalId: userId,
      handle: displayName,
      organizationId,
    },
  });

  await prisma.conversation.create({
    data: {
      channel: "LINE",
      customerId,
      externalThreadId: `line:user:${userId}`,
      id: conversationId,
      organizationId,
      startedAt: new Date(),
      status: "OPEN",
    },
  });

  await prisma.customer.update({
    data: {
      primaryConversationId: conversationId,
    },
    where: {
      id: customerId,
    },
  });

  return {
    conversationId,
    customerId,
    customerName: displayName,
  };
}

async function addSystemCustomerNote(organizationId: string, customerId: string, body: string) {
  await prisma.customerNote.create({
    data: {
      body,
      customerId,
      organizationId,
    },
  });
}

async function handleLineFollowEvent(
  organizationId: string,
  userId: string,
  occurredAt: Date,
) {
  const profile = await fetchLineProfile(userId).catch(() => null);
  const context = await ensureLineConversationContext(organizationId, userId, profile);

  await prisma.customer.update({
    data: {
      lastInteractionAt: occurredAt,
      status: "OPEN",
    },
    where: {
      id: context.customerId,
    },
  });

  await prisma.conversation.update({
    data: {
      startedAt: occurredAt,
      status: "OPEN",
    },
    where: {
      id: context.conversationId,
    },
  });

  await addSystemCustomerNote(
    organizationId,
    context.customerId,
    "Customer followed the LINE Official Account.",
  );
}

async function handleLineUnfollowEvent(
  organizationId: string,
  userId: string,
  occurredAt: Date,
) {
  const identity = await prisma.customerChannelIdentity.findFirst({
    include: {
      customer: true,
    },
    where: {
      channel: "LINE",
      externalId: userId,
      organizationId,
    },
  });

  if (!identity) {
    return;
  }

  await prisma.customer.update({
    data: {
      lastInteractionAt: occurredAt,
      status: "RESOLVED",
    },
    where: {
      id: identity.customerId,
    },
  });

  await prisma.conversation.updateMany({
    data: {
      resolvedAt: occurredAt,
      status: "RESOLVED",
    },
    where: {
      channel: "LINE",
      customerId: identity.customerId,
      organizationId,
    },
  });

  await addSystemCustomerNote(
    organizationId,
    identity.customerId,
    "Customer unfollowed the LINE Official Account.",
  );
}

async function handleLineMessageEvent(
  organizationId: string,
  event: LineWebhookEvent,
  occurredAt: Date,
) {
  const userId = event.source?.userId;
  const lineMessage = event.message;

  if (!userId || !lineMessage) {
    return;
  }

  const existingIdentity = await prisma.customerChannelIdentity.findFirst({
    where: {
      channel: "LINE",
      externalId: userId,
      organizationId,
    },
  });

  const profile = existingIdentity ? null : await fetchLineProfile(userId).catch(() => null);
  const context = await ensureLineConversationContext(organizationId, userId, profile);
  const messageId = `line-msg-${lineMessage.id}`;
  const messageBody =
    lineMessage.type === "text"
      ? lineMessage.text?.trim() || "LINE text message"
      : lineMessage.type === "image"
        ? "LINE image message"
        : lineMessage.type === "audio"
          ? "LINE audio message"
          : "LINE sticker";

  await prisma.conversationMessage.create({
    data: {
      body: messageBody,
      conversationId: context.conversationId,
      direction: "INBOUND",
      id: messageId,
      metadata: {
        line: {
          contentProvider: (lineMessage.contentProvider ?? null) as Prisma.InputJsonValue | null,
          duration: lineMessage.duration ?? null,
          keywords: (lineMessage.keywords ?? null) as Prisma.InputJsonValue | null,
          packageId: lineMessage.packageId ?? null,
          providerMessageId: lineMessage.id,
          rawType: lineMessage.type,
          stickerId: lineMessage.stickerId ?? null,
          stickerResourceType: lineMessage.stickerResourceType ?? null,
          webhookEventId: event.webhookEventId ?? null,
        },
      } satisfies Prisma.InputJsonValue,
      organizationId,
      senderDisplayName: context.customerName,
      type: lineMessage.type === "text" ? "TEXT" : lineMessage.type === "audio" ? "FILE" : "IMAGE",
    },
  });

  if (lineMessage.type === "image") {
    await prisma.messageAttachment.create({
      data: {
        fileName: `${lineMessage.id}.jpg`,
        kind: "IMAGE",
        messageId,
        mimeType: "image/jpeg",
        organizationId,
        storagePath: `line:content:${lineMessage.id}`,
      },
    });
  }

  if (lineMessage.type === "audio") {
    await prisma.messageAttachment.create({
      data: {
        fileName: `${lineMessage.id}.m4a`,
        kind: "FILE",
        messageId,
        mimeType: "audio/m4a",
        organizationId,
        storagePath: `line:content:${lineMessage.id}`,
      },
    });
  }

  await prisma.conversation.update({
    data: {
      lastMessageAt: occurredAt,
      previewText: messageBody,
      status: "OPEN",
      unreadCount: {
        increment: 1,
      },
    },
    where: {
      id: context.conversationId,
    },
  });

  await prisma.customer.update({
    data: {
      lastInteractionAt: occurredAt,
      status: "OPEN",
      unreadCount: {
        increment: 1,
      },
    },
    where: {
      id: context.customerId,
    },
  });
}

async function processLineWebhookEvent(organizationId: string, event: LineWebhookEvent) {
  const userId = event.source?.userId;
  const occurredAt = event.timestamp ? new Date(event.timestamp) : new Date();

  if (event.type === "follow" && userId) {
    await handleLineFollowEvent(organizationId, userId, occurredAt);
    return;
  }

  if (event.type === "unfollow" && userId) {
    await handleLineUnfollowEvent(organizationId, userId, occurredAt);
    return;
  }

  if (
    event.type === "message" &&
    event.message &&
    (event.message.type === "text" ||
      event.message.type === "image" ||
      event.message.type === "audio" ||
      event.message.type === "sticker")
  ) {
    await handleLineMessageEvent(organizationId, event, occurredAt);
  }
}

function getExternalEventId(event: LineWebhookEvent) {
  if (event.webhookEventId) {
    return event.webhookEventId;
  }

  const sourceUserId = event.source?.userId ?? "unknown";
  const messageId = event.message?.id ?? "no-message";
  const timestamp = event.timestamp ?? 0;
  return `fallback:${event.type}:${sourceUserId}:${messageId}:${timestamp}`;
}

export async function processLineWebhookPayload(payload: LineWebhookBody) {
  const integration = await getLineIntegration();
  const events = payload.events ?? [];
  let duplicates = 0;
  let processed = 0;

  for (const event of events) {
    const externalEventId = getExternalEventId(event);
    let webhookEventId: string;

    try {
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: event.type,
          externalEventId,
          organizationId: integration.organizationId,
          payload: event as Prisma.InputJsonValue,
          processedAt: null,
          provider: "LINE",
          status: "PENDING",
        },
      });

      webhookEventId = webhookEvent.id;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        duplicates += 1;
        continue;
      }

      throw error;
    }

    try {
      await processLineWebhookEvent(integration.organizationId, event);
      await prisma.webhookEvent.update({
        data: {
          processedAt: new Date(),
          status: "PROCESSED",
        },
        where: {
          id: webhookEventId,
        },
      });
      processed += 1;
    } catch (error) {
      await prisma.webhookEvent.update({
        data: {
          errorMessage: error instanceof Error ? error.message : "Unknown LINE webhook processing error.",
          processedAt: new Date(),
          status: "FAILED",
        },
        where: {
          id: webhookEventId,
        },
      });
      throw error;
    }
  }

  await markIntegrationHealthy(integration.id);

  return {
    duplicates,
    processed,
  };
}

export async function sendLineReplyFromInbox(
  session: AuthenticatedSession,
  conversationId: string,
  body: string,
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: {
            where: {
              channel: "LINE",
            },
          },
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    where: {
      channel: "LINE",
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const recipient = conversation.customer.channelIdentities[0];

  if (!recipient) {
    const error = new Error("The LINE recipient could not be resolved for this conversation.");
    error.name = "CONFLICT";
    throw error;
  }

  const integration = await prisma.integration.findFirst({
    where: {
      organizationId: session.organizationId,
      provider: "LINE",
    },
  });

  if (!integration || integration.status === "DISCONNECTED" || integration.status === "COMING_SOON") {
    const error = new Error("LINE Official Account is not connected for this workspace.");
    error.name = "CONFLICT";
    throw error;
  }

  const pushResult = await pushLineTextMessage(recipient.externalId, body);
  const createdAt = new Date();

  const message = await prisma.conversationMessage.create({
    data: {
      body,
      conversationId,
      direction: "OUTBOUND",
      id: crypto.randomUUID(),
      metadata: {
        line: {
          providerRequestId: pushResult.requestId,
          recipientExternalId: recipient.externalId,
        },
      } satisfies Prisma.InputJsonValue,
      organizationId: session.organizationId,
      senderDisplayName: session.user.name,
      senderMemberId: session.accountId,
      type: "TEXT",
    },
  });

  await prisma.conversation.update({
    data: {
      firstResponseAt: conversation.firstResponseAt ?? createdAt,
      lastMessageAt: createdAt,
      previewText: body,
      unreadCount: 0,
    },
    where: {
      id: conversationId,
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

  await markIntegrationHealthy(integration.id);

  return {
    conversation: toConversationSummary({
      assignedMember: conversation.assignedMember,
      channel: "LINE",
      createdAt: conversation.createdAt,
      customer: conversation.customer,
      customerId: conversation.customerId,
      id: conversation.id,
      lastMessageAt: createdAt,
      previewText: body,
      status: conversation.status,
      tags: conversation.tags,
      unreadCount: 0,
    }),
    message: {
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      direction: "outbound" as const,
      id: message.id,
      senderName: message.senderDisplayName,
      type: "text" as const,
    },
  };
}

export async function sendLineImageReplyFromInbox(
  session: AuthenticatedSession,
  conversationId: string,
  image: {
    contentType: string;
    fileName: string;
    storagePath: string;
  },
  urls: {
    originalContentUrl: string;
    previewImageUrl: string;
  },
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: {
            where: {
              channel: "LINE",
            },
          },
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    where: {
      channel: "LINE",
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const recipient = conversation.customer.channelIdentities[0];

  if (!recipient) {
    const error = new Error("The LINE recipient could not be resolved for this conversation.");
    error.name = "CONFLICT";
    throw error;
  }

  const integration = await prisma.integration.findFirst({
    where: {
      organizationId: session.organizationId,
      provider: "LINE",
    },
  });

  if (!integration || integration.status === "DISCONNECTED" || integration.status === "COMING_SOON") {
    const error = new Error("LINE Official Account is not connected for this workspace.");
    error.name = "CONFLICT";
    throw error;
  }

  const pushResult = await pushLineImageMessage(
    recipient.externalId,
    urls.originalContentUrl,
    urls.previewImageUrl,
  );
  const createdAt = new Date();
  const messageId = crypto.randomUUID();
  const attachmentId = crypto.randomUUID();

  const message = await prisma.conversationMessage.create({
    data: {
      body: "",
      conversationId,
      direction: "OUTBOUND",
      id: messageId,
      metadata: {
        line: {
          providerRequestId: pushResult.requestId,
          recipientExternalId: recipient.externalId,
        },
      } satisfies Prisma.InputJsonValue,
      organizationId: session.organizationId,
      senderDisplayName: session.user.name,
      senderMemberId: session.accountId,
      type: "IMAGE",
    },
  });

  await prisma.messageAttachment.create({
    data: {
      fileName: image.fileName,
      id: attachmentId,
      kind: "IMAGE",
      messageId,
      mimeType: image.contentType,
      organizationId: session.organizationId,
      storagePath: `supabase:${image.storagePath}`,
    },
  });

  await prisma.conversation.update({
    data: {
      firstResponseAt: conversation.firstResponseAt ?? createdAt,
      lastMessageAt: createdAt,
      previewText: "Image attachment",
      unreadCount: 0,
    },
    where: {
      id: conversationId,
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

  await markIntegrationHealthy(integration.id);

  return {
    conversation: toConversationSummary({
      assignedMember: conversation.assignedMember,
      channel: "LINE",
      createdAt: conversation.createdAt,
      customer: conversation.customer,
      customerId: conversation.customerId,
      id: conversation.id,
      lastMessageAt: createdAt,
      previewText: "Image attachment",
      status: conversation.status,
      tags: conversation.tags,
      unreadCount: 0,
    }),
    message: {
      body: "",
      createdAt: message.createdAt.toISOString(),
      direction: "outbound" as const,
      id: message.id,
      imageUrl: `/api/inbox/messages/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(attachmentId)}`,
      senderName: message.senderDisplayName,
      type: "image" as const,
    },
  };
}

export async function getLineAttachmentContent(
  session: AuthenticatedSession,
  messageId: string,
  attachmentId: string,
) {
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

  if (!attachment || attachment.message.conversation.channel !== "LINE") {
    return null;
  }

  const providerMessageId =
    attachment.storagePath?.startsWith("line:content:")
      ? attachment.storagePath.slice("line:content:".length)
      : null;

  if (!providerMessageId) {
    return null;
  }

  const content = await fetchLineMessageContent(providerMessageId);

  return {
    body: content.body,
    contentType: content.contentType,
    fileName: attachment.fileName,
  };
}
