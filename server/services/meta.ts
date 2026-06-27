import "server-only";

import type { ConversationSummary } from "@/features/inbox/types/inbox";
import type { AuthenticatedSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { fetchMetaProfile, sendMetaImageMessage, sendMetaTextMessage } from "@/server/integrations/meta-client";
import { decryptCredentialPayload } from "@/server/security/encryption";
import { Integration, IntegrationCredential, Prisma } from "@prisma/client";

type IntegrationWithCredentials = Integration & {
  credentials?: IntegrationCredential | null;
};

type MetaWebhookBody = {
  object?: string;
  entry?: MetaWebhookEntry[];
};

type MetaWebhookEntry = {
  id: string;
  time?: number;
  messaging?: MetaMessagingEvent[];
};

type MetaMessagingEvent = {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  delivery?: unknown;
  message?: {
    mid?: string;
    text?: string;
    attachments?: Array<{
      type: string;
      payload?: {
        url: string;
      };
    }>;
    is_echo?: boolean;
  };
  postback?: unknown;
  read?: unknown;
};

function buildMetaScopedExternalId(
  channel: "FACEBOOK" | "INSTAGRAM",
  userId: string,
  pageId?: string,
) {
  if (channel === "FACEBOOK" && pageId) {
    return `facebook:page:${pageId}:psid:${userId}`;
  }

  return userId;
}

function buildMetaExternalThreadId(
  channel: "FACEBOOK" | "INSTAGRAM",
  userId: string,
  pageId?: string,
) {
  if (channel === "FACEBOOK" && pageId) {
    return `meta:facebook:page:${pageId}:psid:${userId}`;
  }

  return `meta:${channel.toLowerCase()}:${userId}`;
}

export function resolveMetaRecipientExternalId(externalId: string) {
  const scopedPsidMarker = ":psid:";
  const psidIndex = externalId.lastIndexOf(scopedPsidMarker);

  if (externalId.startsWith("facebook:page:") && psidIndex >= 0) {
    return externalId.slice(psidIndex + scopedPsidMarker.length);
  }

  return externalId;
}

function isUniqueConstraintError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function toConversationSummary(
  conversation: {
    assignedMember: { profile: { fullName: string } } | null;
    channel: "FACEBOOK" | "INSTAGRAM";
    createdAt: Date;
    customer: { avatarFallback: string | null; id: string; name: string; avatarUrl?: string | null };
    customerId: string;
    id: string;
    lastMessageAt: Date | null;
    previewText: string | null;
    status: "OPEN" | "PENDING" | "RESOLVED";
    tags: Array<{ tag: { id: string; name: string; color: string | null } }>;
    unreadCount: number;
  },
  channel: "Facebook" | "Instagram",
): ConversationSummary {
  return {
    assignedAgent: conversation.assignedMember?.profile.fullName ?? "Unassigned",
    channel,
    customerAvatarFallback:
      conversation.customer.avatarFallback ?? conversation.customer.name.slice(0, 2).toUpperCase(),
    customerAvatarImageUrl: conversation.customer.avatarUrl ?? null,
    customerId: conversation.customerId,
    customerName: conversation.customer.name,
    id: conversation.id,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? conversation.createdAt.toISOString(),
    preview: conversation.previewText ?? "",
    status: conversation.status.toLowerCase() as "open" | "pending" | "resolved",
    tags: conversation.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
    unreadCount: conversation.unreadCount,
  };
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

async function ensureMetaConversationContext(
  organizationId: string,
  channel: "FACEBOOK" | "INSTAGRAM",
  userId: string,
  integration: IntegrationWithCredentials,
  pageId?: string,
) {
  const externalId = buildMetaScopedExternalId(channel, userId, pageId);
  const externalThreadId = buildMetaExternalThreadId(channel, userId, pageId);
  const legacyExternalThreadId = buildMetaExternalThreadId(channel, userId);
  const externalIdentityIds =
    externalId === userId ? [externalId] : [externalId, userId];
  const externalThreadIds =
    externalThreadId === legacyExternalThreadId
      ? [externalThreadId]
      : [externalThreadId, legacyExternalThreadId];

  // Try to find the identity first
  const identity = await prisma.customerChannelIdentity.findFirst({
    where: {
      organizationId,
      channel,
      externalId: {
        in: externalIdentityIds,
      },
    },
    include: {
      customer: {
        include: {
          conversations: {
            where: {
              organizationId,
              channel,
              externalThreadId: {
                in: externalThreadIds,
              },
            },
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      },
    },
  });

  let displayName = identity?.customer?.name;
  let avatarUrl = identity?.customer?.avatarUrl;
  let username: string | undefined = undefined;

  if (identity) {
    const customer = identity.customer;
    const now = new Date();
    const isPlaceholder = customer.name.startsWith("Facebook User") || customer.name.startsWith("Instagram User");
    const isCacheValid =
      customer.name &&
      !isPlaceholder &&
      customer.avatarUrl &&
      customer.profileUpdatedAt &&
      (now.getTime() - customer.profileUpdatedAt.getTime()) < 24 * 60 * 60 * 1000;

    if (!isCacheValid) {
      try {
        const accessToken = await getDecryptedAccessToken(integration);
        const metaProfile = await fetchMetaProfile(userId, channel.toLowerCase() as "facebook" | "instagram", accessToken);
        displayName = metaProfile.name;
        avatarUrl = metaProfile.pictureUrl || null;
        username = metaProfile.username;
        
        await prisma.customer.update({
          data: {
            name: displayName,
            avatarUrl: avatarUrl,
            avatarFallback: displayName.slice(0, 2).toUpperCase(),
            profileUpdatedAt: new Date(),
          },
          where: {
            id: customer.id,
          },
        });
        console.log(`[META_PROFILE_SYNC] Success: Scoped profile synced for customer ${customer.id}`, {
          psid: userId,
          name: displayName,
        });
      } catch (error) {
        console.error(`[META_PROFILE_SYNC] Failure: Failed to sync profile for customer ${customer.id}`, {
          psid: userId,
          error,
        });
      }
    }

    const conversation = identity.customer.conversations[0];
    if (conversation) {
      if (conversation.externalThreadId !== externalThreadId) {
        await prisma.conversation.update({
          data: {
            externalThreadId,
          },
          where: {
            id: conversation.id,
          },
        });
      }

      if (identity.externalId !== externalId) {
        await prisma.customerChannelIdentity.update({
          data: {
            externalId,
          },
          where: {
            id: identity.id,
          },
        });
      }

      return {
        conversationId: conversation.id,
        customerId: identity.customerId,
        customerName: displayName || identity.customer.name,
      };
    }

    // Identity exists but conversation does not. Create a conversation.
    const conversationId = `conv-meta-${channel.toLowerCase()}-${crypto.randomUUID()}`;
    try {
      const createdConv = await prisma.conversation.create({
        data: {
          channel,
          customerId: identity.customerId,
          externalThreadId,
          id: conversationId,
          organizationId,
          startedAt: new Date(),
          status: "OPEN",
        },
      });

      await prisma.customer.update({
        data: {
          primaryConversationId: createdConv.id,
        },
        where: {
          id: identity.customerId,
        },
      });

      if (identity.externalId !== externalId) {
        await prisma.customerChannelIdentity.update({
          data: {
            externalId,
          },
          where: {
            id: identity.id,
          },
        });
      }

      return {
        conversationId: createdConv.id,
        customerId: identity.customerId,
        customerName: displayName || identity.customer.name,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        // Conversation already exists
        const existingConv = await prisma.conversation.findUnique({
          where: {
            organizationId_externalThreadId: {
              organizationId,
              externalThreadId,
            },
          },
        });
        if (existingConv) {
          return {
            conversationId: existingConv.id,
            customerId: identity.customerId,
            customerName: displayName || identity.customer.name,
          };
        }
      }
      throw error;
    }
  }

  displayName = `${channel === "FACEBOOK" ? "Facebook" : "Instagram"} User ${userId.slice(-4)}`;
  let profileUpdatedAt: Date | null = null;

  try {
    const accessToken = await getDecryptedAccessToken(integration);
    const metaProfile = await fetchMetaProfile(userId, channel.toLowerCase() as "facebook" | "instagram", accessToken);
    displayName = metaProfile.name;
    avatarUrl = metaProfile.pictureUrl || null;
    username = metaProfile.username;
    profileUpdatedAt = new Date();
    console.log(`[META_PROFILE_SYNC] Success: Scoped profile synced for new customer`, {
      psid: userId,
      name: displayName,
    });
  } catch (error) {
    console.error(`[META_PROFILE_SYNC] Failure: Failed to sync profile for new customer`, {
      psid: userId,
      error,
    });
  }

  const customerId = `cust-meta-${channel.toLowerCase()}-${crypto.randomUUID()}`;
  const conversationId = `conv-meta-${channel.toLowerCase()}-${crypto.randomUUID()}`;

  try {
    return await prisma.$transaction(async (tx) => {
      // Double check within transaction
      const existingId = await tx.customerChannelIdentity.findFirst({
        where: {
          organizationId,
          channel,
          externalId: {
            in: externalIdentityIds,
          },
        },
        include: {
          customer: true,
        },
      });

      if (existingId) {
        let existingConv = await tx.conversation.findUnique({
          where: {
            organizationId_externalThreadId: {
              organizationId,
              externalThreadId,
            },
          },
        });
        if (!existingConv) {
          existingConv = await tx.conversation.create({
            data: {
              channel,
              customerId: existingId.customerId,
              externalThreadId,
              id: conversationId,
              organizationId,
              startedAt: new Date(),
              status: "OPEN",
            },
          });
          await tx.customer.update({
            data: {
              primaryConversationId: existingConv.id,
            },
            where: {
              id: existingId.customerId,
            },
          });
        }
        return {
          conversationId: existingConv.id,
          customerId: existingId.customerId,
          customerName: displayName || existingId.customer.name,
        };
      }

      await tx.customer.create({
        data: {
          avatarFallback: displayName.slice(0, 2).toUpperCase(),
          avatarUrl,
          profileUpdatedAt,
          id: customerId,
          lastInteractionAt: new Date(),
          name: displayName,
          organizationId,
          status: "OPEN",
          unreadCount: 0,
        },
      });

      await tx.customerChannelIdentity.create({
        data: {
          channel,
          customerId,
          externalId,
          handle: username || displayName,
          organizationId,
        },
      });

      await tx.conversation.create({
        data: {
          channel,
          customerId,
          externalThreadId,
          id: conversationId,
          organizationId,
          startedAt: new Date(),
          status: "OPEN",
        },
      });

      await tx.customer.update({
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
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // Fallback lookup
      const fallbackId = await prisma.customerChannelIdentity.findFirst({
        where: {
          organizationId,
          channel,
          externalId: {
            in: externalIdentityIds,
          },
        },
        include: {
          customer: true,
        },
      });
      if (fallbackId) {
        let fallbackConv = await prisma.conversation.findUnique({
          where: {
            organizationId_externalThreadId: {
              organizationId,
              externalThreadId,
            },
          },
        });
        if (!fallbackConv) {
          fallbackConv = await prisma.conversation.create({
            data: {
              channel,
              customerId: fallbackId.customerId,
              externalThreadId,
              id: conversationId,
              organizationId,
              startedAt: new Date(),
              status: "OPEN",
            },
          });
          await prisma.customer.update({
            data: {
              primaryConversationId: fallbackConv.id,
            },
            where: {
              id: fallbackId.customerId,
            },
          });
        }
        return {
          conversationId: fallbackConv.id,
          customerId: fallbackId.customerId,
          customerName: displayName || fallbackId.customer.name,
        };
      }
    }
    throw error;
  }
}

export async function getDecryptedAccessToken(integration: IntegrationWithCredentials) {
  if (integration.credentials) {
    try {
      const decrypted = decryptCredentialPayload({
        authTag: integration.credentials.authTag,
        ciphertext: integration.credentials.encryptedPayload,
        iv: integration.credentials.iv,
        keyVersion: integration.credentials.keyVersion,
      }) as { accessToken?: string };
      
      if (decrypted.accessToken) {
        return decrypted.accessToken;
      }
    } catch (e) {
      console.warn(`[META] Failed to decrypt credentials for integration ${integration.id}`, e);
    }
  }

  return process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? process.env.META_PAGE_ACCESS_TOKEN ?? "mock-page-access-token";
}

function getAvailableAccountIds(integration: IntegrationWithCredentials) {
  if (!Array.isArray(integration.availableAccounts)) {
    return [];
  }

  return integration.availableAccounts
    .map((account) => {
      if (!account || typeof account !== "object") {
        return null;
      }

      const id = (account as { id?: unknown }).id;
      return typeof id === "string" ? id : null;
    })
    .filter((id): id is string => Boolean(id));
}

function matchesConnectionMetadata(integration: IntegrationWithCredentials, pageId: string) {
  const metadata = integration.connectionMetadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  const values = [
    (metadata as { accountId?: unknown }).accountId,
    (metadata as { pageId?: unknown }).pageId,
  ];

  return values.some((value) => value === pageId);
}

function matchesCredentialsAccountId(integration: IntegrationWithCredentials, pageId: string) {
  if (!integration.credentials) {
    return false;
  }

  try {
    const decrypted = decryptCredentialPayload({
      authTag: integration.credentials.authTag,
      ciphertext: integration.credentials.encryptedPayload,
      iv: integration.credentials.iv,
      keyVersion: integration.credentials.keyVersion,
    }) as { accountId?: string; pageId?: string };

    return decrypted.accountId === pageId || decrypted.pageId === pageId;
  } catch (error) {
    console.warn("[FACEBOOK_WEBHOOK] Failed to inspect integration credentials.", {
      error: error instanceof Error ? error.message : "Unknown credential error.",
      integrationId: integration.id,
      pageId,
    });
    return false;
  }
}

async function getConnectedFacebookIntegrationByPageId(pageId: string) {
  const integrations = await prisma.integration.findMany({
    include: {
      credentials: true,
    },
    where: {
      provider: "FACEBOOK",
      status: "CONNECTED",
    },
  });

  return integrations.find(
    (integration) =>
      matchesCredentialsAccountId(integration, pageId) ||
      matchesConnectionMetadata(integration, pageId) ||
      getAvailableAccountIds(integration).includes(pageId),
  ) ?? null;
}

async function handleMetaMessageEvent(
  organizationId: string,
  integration: IntegrationWithCredentials,
  channel: "FACEBOOK" | "INSTAGRAM",
  event: MetaMessagingEvent,
  occurredAt: Date,
  options?: {
    body?: string;
    pageId?: string;
  },
) {
  const userId = event.sender?.id;
  const metaMessage = event.message;

  if (!userId || !metaMessage?.mid) {
    return;
  }

  const context = await ensureMetaConversationContext(
    organizationId,
    channel,
    userId,
    integration,
    options?.pageId,
  );
  const messageId = `meta-msg-${metaMessage.mid}`;

  const hasImage = metaMessage.attachments?.some((att) => att.type === "image");
  const imageUrl = metaMessage.attachments?.find((att) => att.type === "image")?.payload?.url;
  const messageText = options?.body ?? metaMessage.text?.trim();

  const messageBody =
    messageText || (hasImage ? "Sent an image" : `${channel === "FACEBOOK" ? "Facebook" : "Instagram"} message`);

  const messageType = hasImage ? "IMAGE" : "TEXT";

  await prisma.conversationMessage.create({
    data: {
      body: messageBody,
      conversationId: context.conversationId,
      direction: "INBOUND",
      id: messageId,
      createdAt: occurredAt,
      metadata: {
        meta: {
          mid: metaMessage.mid,
          sentAt: occurredAt.toISOString(),
          senderPsid: userId,
          recipientId: event.recipient?.id,
          rawMessage: metaMessage,
        },
      } satisfies Prisma.InputJsonValue,
      organizationId,
      senderDisplayName: context.customerName,
      type: messageType,
    },
  });

  if (hasImage && imageUrl) {
    await prisma.messageAttachment.create({
      data: {
        fileName: `${metaMessage.mid}.jpg`,
        kind: "IMAGE",
        messageId,
        mimeType: "image/jpeg",
        organizationId,
        storagePath: `meta:content:${metaMessage.mid}`,
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

export async function processMetaWebhookPayload(payload: MetaWebhookBody) {
  const entries = payload.entry ?? [];
  let duplicates = 0;
  let processed = 0;

  for (const entry of entries) {
    const entryId = entry.id;
    const messaging = entry.messaging ?? [];

    const isInstagramEntry = payload.object === "instagram";
    const providerEnum = isInstagramEntry ? "INSTAGRAM" : "FACEBOOK";

    // Look up integrations for this provider
    const integrations = await prisma.integration.findMany({
      where: {
        provider: providerEnum,
      },
      include: {
        credentials: true,
      },
    });

    // Find the integration matching this entry ID
    let matchedIntegration = null;
    for (const integration of integrations) {
      if (integration.credentials) {
        try {
          const creds = decryptCredentialPayload({
            authTag: integration.credentials.authTag,
            ciphertext: integration.credentials.encryptedPayload,
            iv: integration.credentials.iv,
            keyVersion: integration.credentials.keyVersion,
          }) as { accountId?: string };

          if (creds.accountId === entryId) {
            matchedIntegration = integration;
            break;
          }
        } catch {
          // ignore decryption failure for non-matching secrets
        }
      }
    }

    if (!matchedIntegration && integrations.length > 0) {
      // Fallback: If no credentials specifically match on decrypted fields (or mock mode), use the first connected integration
      matchedIntegration = integrations[0];
    }

    if (!matchedIntegration) {
      console.warn(`[META] No connected integration found for provider ${providerEnum}`);
      continue;
    }

    const { organizationId, id: integrationId } = matchedIntegration;

    for (const event of messaging) {
      const mid = event.message?.mid;
      const occurredAt = event.timestamp ? new Date(event.timestamp) : new Date();

      if (!mid) {
        continue;
      }

      if (event.message?.is_echo) {
        continue;
      }

      const messageId = `meta-msg-${mid}`;
      const existingMessage = await prisma.conversationMessage.findUnique({
        where: {
          id: messageId,
        },
      });

      if (existingMessage) {
        duplicates += 1;
        continue;
      }

      const externalEventId = `meta:${providerEnum.toLowerCase()}:${mid}`;
      let webhookEventId: string;

      try {
        const webhookEvent = await prisma.webhookEvent.create({
          data: {
            eventType: event.message?.text ? "message" : "attachment",
            externalEventId,
            organizationId,
            payload: event as Prisma.InputJsonValue,
            processedAt: null,
            provider: providerEnum,
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
        const pageId = event.recipient?.id ?? entryId;
        await handleMetaMessageEvent(
          organizationId,
          matchedIntegration,
          providerEnum,
          event,
          occurredAt,
          {
            body: event.message?.text?.trim() || undefined,
            pageId,
          },
        );
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
            errorMessage: error instanceof Error ? error.message : "Unknown Meta webhook processing error.",
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

    await markIntegrationHealthy(integrationId);
  }

  return {
    duplicates,
    processed,
  };
}

function getFacebookIgnoredReason(payload: MetaWebhookBody, event: MetaMessagingEvent) {
  if (payload.object !== "page") {
    return "unsupported_object";
  }

  if (event.message?.is_echo) {
    return "echo_message";
  }

  if (event.delivery) {
    return "delivery_event";
  }

  if (event.read) {
    return "read_event";
  }

  if (event.postback) {
    return "postback_event";
  }

  if (!event.message?.text?.trim()) {
    return "missing_message_text";
  }

  if (!event.sender?.id) {
    return "missing_sender_id";
  }

  if (!event.message.mid) {
    return "missing_message_id";
  }

  return null;
}

function getFacebookEventType(event: MetaMessagingEvent) {
  if (event.delivery) {
    return "delivery";
  }

  if (event.read) {
    return "read";
  }

  if (event.postback) {
    return "postback";
  }

  return "message";
}

export async function processFacebookMessengerWebhookPayload(payload: MetaWebhookBody) {
  const entries = payload.entry ?? [];
  let duplicates = 0;
  let ignored = 0;
  let processed = 0;

  for (const entry of entries) {
    const entryPageId = entry.id;
    const messaging = entry.messaging ?? [];

    for (const event of messaging) {
      const pageId = event.recipient?.id ?? entryPageId;
      const reason = getFacebookIgnoredReason(payload, event);

      if (reason) {
        ignored += 1;
        console.info("[FACEBOOK_WEBHOOK] Ignored Messenger event.", {
          eventType: getFacebookEventType(event),
          messageId: event.message?.mid ?? null,
          pageId,
          reason,
          senderPsid: event.sender?.id ?? null,
        });
        continue;
      }

      const text = event.message?.text?.trim();
      const senderPsid = event.sender?.id;
      const externalMessageId = event.message?.mid;

      if (!text || !senderPsid || !externalMessageId) {
        ignored += 1;
        continue;
      }

      let integration = await getConnectedFacebookIntegrationByPageId(pageId);

      if (!integration) {
        // Fallback: If no credentials specifically match on decrypted fields, use the first connected integration
        const connectedIntegrations = await prisma.integration.findMany({
          include: {
            credentials: true,
          },
          where: {
            provider: "FACEBOOK",
            status: "CONNECTED",
          },
        });
        if (connectedIntegrations.length > 0) {
          integration = connectedIntegrations[0];
        }
      }

      if (!integration) {
        ignored += 1;
        console.warn("[FACEBOOK_WEBHOOK] Ignored Messenger event without connected integration.", {
          messageId: externalMessageId,
          pageId,
          senderPsid,
        });
        continue;
      }

      const messageId = `meta-msg-${externalMessageId}`;
      const existingMessage = await prisma.conversationMessage.findUnique({
        where: {
          id: messageId,
        },
      });

      if (existingMessage) {
        duplicates += 1;
        console.info("[FACEBOOK_WEBHOOK] Ignored duplicate Messenger message.", {
          messageId: externalMessageId,
          pageId,
          senderPsid,
        });
        continue;
      }

      const occurredAt = event.timestamp ? new Date(event.timestamp) : new Date();
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          eventType: "message",
          externalEventId: `facebook:message:${externalMessageId}`,
          organizationId: integration.organizationId,
          payload: event as Prisma.InputJsonValue,
          processedAt: null,
          provider: "FACEBOOK",
          status: "PENDING",
        },
      });

      try {
        await handleMetaMessageEvent(
          integration.organizationId,
          integration,
          "FACEBOOK",
          event,
          occurredAt,
          {
            body: text,
            pageId,
          },
        );
        await prisma.webhookEvent.update({
          data: {
            processedAt: new Date(),
            status: "PROCESSED",
          },
          where: {
            id: webhookEvent.id,
          },
        });
        await markIntegrationHealthy(integration.id);
        processed += 1;
        console.info("[FACEBOOK_WEBHOOK] Saved Messenger message.", {
          conversationMessageId: messageId,
          externalMessageId,
          organizationId: integration.organizationId,
          pageId,
          senderPsid,
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          duplicates += 1;
          await prisma.webhookEvent.update({
            data: {
              errorMessage: "Duplicate Messenger message.",
              processedAt: new Date(),
              status: "PROCESSED",
            },
            where: {
              id: webhookEvent.id,
            },
          });
          console.info("[FACEBOOK_WEBHOOK] Ignored duplicate Messenger message.", {
            messageId: externalMessageId,
            pageId,
            senderPsid,
          });
          continue;
        }

        await prisma.webhookEvent.update({
          data: {
            errorMessage: error instanceof Error ? error.message : "Unknown Facebook webhook processing error.",
            processedAt: new Date(),
            status: "FAILED",
          },
          where: {
            id: webhookEvent.id,
          },
        });
        throw error;
      }
    }
  }

  return {
    duplicates,
    ignored,
    processed,
  };
}

export async function sendMetaReplyFromInbox(
  session: AuthenticatedSession,
  conversationId: string,
  body: string,
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    where: {
      channel: {
        in: ["FACEBOOK", "INSTAGRAM"],
      },
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const recipient = conversation.customer.channelIdentities.find(
    (identity) => identity.channel === conversation.channel,
  );

  if (!recipient) {
    const error = new Error(`The recipient could not be resolved for this ${conversation.channel} conversation.`);
    error.name = "CONFLICT";
    throw error;
  }

  const integration = await prisma.integration.findFirst({
    where: {
      organizationId: session.organizationId,
      provider: conversation.channel,
    },
    include: {
      credentials: true,
    },
  });

  if (!integration || integration.status === "DISCONNECTED" || integration.status === "COMING_SOON") {
    const error = new Error(`${conversation.channel === "FACEBOOK" ? "Facebook Page" : "Instagram Account"} is not connected for this workspace.`);
    error.name = "CONFLICT";
    throw error;
  }

  const accessToken = await getDecryptedAccessToken(integration);
  const recipientExternalId = resolveMetaRecipientExternalId(recipient.externalId);
  const sendResult = await sendMetaTextMessage(
    recipientExternalId,
    conversation.channel.toLowerCase() as "facebook" | "instagram",
    body,
    accessToken,
  );

  const createdAt = new Date();

  const message = await prisma.conversationMessage.create({
    data: {
      body,
      conversationId,
      direction: "OUTBOUND",
      id: crypto.randomUUID(),
      metadata: {
        meta: {
          providerMessageId: sendResult.messageId,
          recipientExternalId,
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

  const channelLabel = conversation.channel === "FACEBOOK" ? "Facebook" : "Instagram";

  return {
    conversation: toConversationSummary(
      {
        assignedMember: conversation.assignedMember,
        channel: conversation.channel as "FACEBOOK" | "INSTAGRAM",
        createdAt: conversation.createdAt,
        customer: conversation.customer,
        customerId: conversation.customerId,
        id: conversation.id,
        lastMessageAt: createdAt,
        previewText: body,
        status: conversation.status,
        tags: conversation.tags,
        unreadCount: 0,
      },
      channelLabel,
    ),
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

export async function sendMetaImageReplyFromInbox(
  session: AuthenticatedSession,
  conversationId: string,
  image: {
    contentType: string;
    fileName: string;
    storagePath: string;
  },
  imageUrl: string,
) {
  const conversation = await prisma.conversation.findFirst({
    include: {
      assignedMember: { include: { profile: true } },
      customer: {
        include: {
          channelIdentities: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    where: {
      channel: {
        in: ["FACEBOOK", "INSTAGRAM"],
      },
      id: conversationId,
      organizationId: session.organizationId,
    },
  });

  if (!conversation) {
    return null;
  }

  const recipient = conversation.customer.channelIdentities.find(
    (identity) => identity.channel === conversation.channel,
  );

  if (!recipient) {
    const error = new Error(`The recipient could not be resolved for this ${conversation.channel} conversation.`);
    error.name = "CONFLICT";
    throw error;
  }

  const integration = await prisma.integration.findFirst({
    where: {
      organizationId: session.organizationId,
      provider: conversation.channel,
    },
    include: {
      credentials: true,
    },
  });

  if (!integration || integration.status === "DISCONNECTED" || integration.status === "COMING_SOON") {
    const error = new Error(`${conversation.channel === "FACEBOOK" ? "Facebook Page" : "Instagram Account"} is not connected for this workspace.`);
    error.name = "CONFLICT";
    throw error;
  }

  const accessToken = await getDecryptedAccessToken(integration);
  const recipientExternalId = resolveMetaRecipientExternalId(recipient.externalId);
  const sendResult = await sendMetaImageMessage(
    recipientExternalId,
    conversation.channel.toLowerCase() as "facebook" | "instagram",
    imageUrl,
    accessToken,
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
        meta: {
          providerMessageId: sendResult.messageId,
          recipientExternalId,
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

  const channelLabel = conversation.channel === "FACEBOOK" ? "Facebook" : "Instagram";

  return {
    conversation: toConversationSummary(
      {
        assignedMember: conversation.assignedMember,
        channel: conversation.channel as "FACEBOOK" | "INSTAGRAM",
        createdAt: conversation.createdAt,
        customer: conversation.customer,
        customerId: conversation.customerId,
        id: conversation.id,
        lastMessageAt: createdAt,
        previewText: "Image attachment",
        status: conversation.status,
        tags: conversation.tags,
        unreadCount: 0,
      },
      channelLabel,
    ),
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
