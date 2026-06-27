import { SegmentCondition } from "@/features/segments/schemas/segment-conditions.schema";
import { buildSegmentRawQuery } from "@/features/segments/services/segment-evaluator";
import { prisma } from "@/server/database/prisma";
import { pushLineMulticastMessage } from "@/server/integrations/line-client";
import { getIntegrationCredentials } from "@/server/repositories/integration-repository";
import { decryptCredentialPayload } from "@/server/security/encryption";
import { Campaign, CampaignMessage, Prisma, Segment, ChannelType, MessageType } from "@prisma/client";
import { randomUUID } from "node:crypto";

export type CampaignSendStats = { sent: number; skipped: number; failed: number };

export async function processCampaignId(campaignId: string): Promise<CampaignSendStats> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      messages: { orderBy: { orderIndex: 'asc' } },
      segment: true,
    },
  });

  if (!campaign) return { sent: 0, skipped: 0, failed: 0 };
  return processCampaign(campaign);
}

export async function processCampaign(campaign: Campaign & { messages: CampaignMessage[], segment: Segment | null }): Promise<CampaignSendStats> {
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

  console.info(`[CAMPAIGN] Starting send for campaign ${campaign.id} (${campaign.name})`);

  try {
    let customerIdsQuery = Prisma.sql`SELECT id FROM customers WHERE organization_id = ${campaign.organizationId}::uuid`;
    
    if (campaign.targetType === "TARGETED" && campaign.segment) {
      const conditions = campaign.segment.conditions as unknown as SegmentCondition[];
      const result = buildSegmentRawQuery(campaign.organizationId, campaign.segment.matchType, conditions);
      customerIdsQuery = result.query;
    }

    await prisma.$executeRaw`
      WITH audience AS (
        ${customerIdsQuery}
      ),
      stats AS (
        SELECT 
          c.id as customer_id,
          i.external_id as target_user_id,
          c.marketing_consent_status != 'opted_out' as has_consent
        FROM customers c
        INNER JOIN audience a ON c.id = a.id
        LEFT JOIN customer_channel_identities i ON i.customer_id = c.id AND i.channel::text IN ('line', 'facebook', 'instagram')
        WHERE c.organization_id = ${campaign.organizationId}::uuid
      )
      INSERT INTO campaign_recipients (
        organization_id, campaign_id, customer_id, line_user_id, status, error_reason, created_at, updated_at
      )
      SELECT 
        ${campaign.organizationId}::uuid,
        ${campaign.id}::uuid,
        customer_id,
        COALESCE(target_user_id, ''),
        CASE 
          WHEN target_user_id IS NULL THEN 'SKIPPED'::campaign_recipient_status
          WHEN NOT has_consent THEN 'SKIPPED'::campaign_recipient_status
          ELSE 'PENDING'::campaign_recipient_status
        END,
        CASE 
          WHEN target_user_id IS NULL THEN 'No connected channel identity (LINE/Facebook/Instagram)'
          WHEN NOT has_consent THEN 'No Marketing Consent (opted out)'
          ELSE NULL
        END,
        NOW(), NOW()
      FROM stats;
    `;

    let hasMore = true;
    while (hasMore) {
      const pendingRecipients = await prisma.campaignRecipient.findMany({
        where: {
          campaignId: campaign.id,
          status: "PENDING",
        },
        take: 500,
      });

      if (pendingRecipients.length === 0) {
        hasMore = false;
        break;
      }

      // X-Line-Retry-Key must be a valid UUID v4
      const idempotencyKey = randomUUID();

      const batch = await prisma.campaignBatch.create({
        data: {
          campaignId: campaign.id,
          organizationId: campaign.organizationId,
          idempotencyKey,
          status: "SENDING",
          recipientCount: pendingRecipients.length,
        },
      });

      await prisma.campaignRecipient.updateMany({
        where: { id: { in: pendingRecipients.map((r) => r.id) } },
        data: { batchId: batch.id },
      });

      const successfullySentRecipients: typeof pendingRecipients = [];

      // Query identities of the pending recipients to determine their channel type
      const userIds = pendingRecipients.map(r => r.lineUserId);
      const identities = await prisma.customerChannelIdentity.findMany({
        where: {
          customerId: { in: pendingRecipients.map(r => r.customerId) },
          externalId: { in: userIds },
        },
      });

      const channelMap = new Map<string, string>(); // externalId -> channel
      for (const ident of identities) {
        channelMap.set(ident.externalId, ident.channel);
      }

      const lineRecipients = [];
      const facebookRecipients = [];
      const instagramRecipients = [];

      for (const r of pendingRecipients) {
        const channelVal = channelMap.get(r.lineUserId);
        if (!channelVal) {
          await prisma.campaignRecipient.update({
            where: { id: r.id },
            data: { status: "FAILED", errorReason: "Channel identity not found or disconnected" },
          });
          continue;
        }
        if (channelVal === "LINE") {
          lineRecipients.push(r);
        } else if (channelVal === "FACEBOOK") {
          facebookRecipients.push(r);
        } else if (channelVal === "INSTAGRAM") {
          instagramRecipients.push(r);
        }
      }

      // 1. LINE Multicast Delivery
      if (lineRecipients.length > 0) {
        const lineMessages = campaign.messages.map((msg: CampaignMessage) => {
          if (msg.type === "TEXT") {
            return { type: "text", text: msg.textContent };
          } else if (msg.type === "IMAGE") {
            return { type: "image", originalContentUrl: msg.imageUrl, previewImageUrl: msg.previewImageUrl };
          }
          return null;
        }).filter((m): m is NonNullable<typeof m> => m !== null) as Record<string, unknown>[];

        try {
          const lineUserIds = lineRecipients.map(r => r.lineUserId);
          console.info(`[CAMPAIGN] Sending LINE multicast to ${lineUserIds.length} recipients (campaign ${campaign.id})`);
          let overrideCreds: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string } | undefined;
          if (campaign.integrationId) {
            const creds = await getIntegrationCredentials(campaign.organizationId, campaign.integrationId);
            if (creds) {
              try {
                const decrypted = decryptCredentialPayload({
                  ciphertext: creds.encryptedPayload,
                  iv: creds.iv,
                  authTag: creds.authTag,
                  keyVersion: ((creds as unknown) as { keyVersion?: number }).keyVersion ?? 1,
                }) as { channelAccessToken?: string; channelSecret?: string; apiBaseUrl?: string };
                overrideCreds = {
                  apiBaseUrl: decrypted.apiBaseUrl,
                  channelAccessToken: decrypted.channelAccessToken,
                  channelSecret: decrypted.channelSecret,
                };
              } catch (e) {
                console.warn(`[CAMPAIGN] Failed to decrypt LINE credentials for integration ${campaign.integrationId}`, e);
              }
            }
          }

          await pushLineMulticastMessage(lineUserIds, lineMessages, idempotencyKey, overrideCreds);

          await prisma.campaignRecipient.updateMany({
            where: { id: { in: lineRecipients.map((r) => r.id) } },
            data: { status: "SENT" },
          });

          successfullySentRecipients.push(...lineRecipients);
        } catch (error: unknown) {
          console.error(`[CAMPAIGN] LINE multicast failed for campaign ${campaign.id}:`, error);
          await prisma.campaignRecipient.updateMany({
            where: { id: { in: lineRecipients.map((r) => r.id) } },
            data: { status: "FAILED", errorReason: (error as Error).message },
          });
        }
      }

      // 2. Meta Campaign Loop Delivery helper
      const processMetaRecipients = async (metaRecipients: typeof pendingRecipients, channelKey: "FACEBOOK" | "INSTAGRAM") => {
        if (metaRecipients.length === 0) return;

        try {
          let integration = null;
          if (campaign.integrationId) {
            integration = await prisma.integration.findUnique({
              where: { id: campaign.integrationId },
              include: { credentials: true },
            });
          } else {
            integration = await prisma.integration.findFirst({
              where: {
                organizationId: campaign.organizationId,
                provider: channelKey,
                status: "CONNECTED",
              },
              include: {
                credentials: true,
              },
            });
          }

          if (!integration) {
            throw new Error(`No connected integration found for ${channelKey}`);
          }

          const { getDecryptedAccessToken, resolveMetaRecipientExternalId } = await import("@/server/services/meta");
          const { sendMetaTextMessage, sendMetaImageMessage } = await import("@/server/integrations/meta-client");

          const accessToken = await getDecryptedAccessToken(integration);
          if (!accessToken) {
            throw new Error(`Failed to decrypt credentials for integration ${integration.id}`);
          }

          const metaChannel = channelKey.toLowerCase() as "facebook" | "instagram";
          console.info(`[CAMPAIGN] Sending to ${metaRecipients.length} recipients via Meta ${channelKey}`);

          for (const recipient of metaRecipients) {
            const psid = resolveMetaRecipientExternalId(recipient.lineUserId);
            if (!psid) {
              await prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: "FAILED", errorReason: `No PSID found for user` },
              });
              continue;
            }

            try {
              for (const msg of campaign.messages) {
                if (msg.type === "TEXT") {
                  await sendMetaTextMessage(psid, metaChannel, msg.textContent || "", accessToken);
                } else if (msg.type === "IMAGE") {
                  await sendMetaImageMessage(psid, metaChannel, msg.imageUrl || "", accessToken);
                }
              }

              await prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: "SENT" },
              });

              successfullySentRecipients.push(recipient);
            } catch (recipientError: unknown) {
              console.error(`[CAMPAIGN] Failed to send to Meta recipient ${recipient.id}:`, recipientError);
              await prisma.campaignRecipient.update({
                where: { id: recipient.id },
                data: { status: "FAILED", errorReason: (recipientError as Error).message || String(recipientError) },
              });
            }
          }
        } catch (error: unknown) {
          console.error(`[CAMPAIGN] Meta ${channelKey} processing failed for campaign ${campaign.id}:`, error);
          await prisma.campaignRecipient.updateMany({
            where: { id: { in: metaRecipients.map((r) => r.id) } },
            data: { status: "FAILED", errorReason: (error as Error).message },
          });
        }
      };

      await processMetaRecipients(facebookRecipients, "FACEBOOK");
      await processMetaRecipients(instagramRecipients, "INSTAGRAM");

      await prisma.campaignBatch.update({
        where: { id: batch.id },
        data: { status: "COMPLETED" },
      });

      if (successfullySentRecipients.length > 0) {
        // --- RECORD PATH TO CUSTOMER INTEGRATED CHAT DETAILS (INBOX RECENTS) ---
        try {
          const externalThreadIds = successfullySentRecipients.map((r) => {
            const chan = channelMap.get(r.lineUserId);
            if (chan === "LINE") {
              return `line:user:${r.lineUserId}`;
            } else if (chan === "FACEBOOK") {
              return `meta:${r.lineUserId}`;
            } else {
              return `meta:instagram:${r.lineUserId}`;
            }
          });

          const existingConversations = await prisma.conversation.findMany({
            where: {
              organizationId: campaign.organizationId,
              externalThreadId: { in: externalThreadIds },
            },
            select: {
              id: true,
              customerId: true,
              externalThreadId: true,
            },
          });

          const conversationMapByCustId = new Map<string, string>();
          for (const conv of existingConversations) {
            conversationMapByCustId.set(conv.customerId, conv.id);
          }

          // Generate or find conversations for missing ones safely
          for (const recipient of successfullySentRecipients) {
            if (conversationMapByCustId.has(recipient.customerId)) {
              continue;
            }

            const chan = channelMap.get(recipient.lineUserId);
            const extThreadId = chan === "LINE"
              ? `line:user:${recipient.lineUserId}`
              : chan === "FACEBOOK"
              ? `meta:${recipient.lineUserId}`
              : `meta:instagram:${recipient.lineUserId}`;

            const existing = existingConversations.find((c) => c.externalThreadId === extThreadId);
            if (existing) {
              conversationMapByCustId.set(recipient.customerId, existing.id);
              continue;
            }

            try {
              const channelCode = chan ? chan.toLowerCase() : "line";
              const convId = `conv-${channelCode}-${randomUUID()}`;
              await prisma.conversation.create({
                data: {
                  id: convId,
                  customerId: recipient.customerId,
                  channel: chan as unknown as ChannelType,
                  organizationId: campaign.organizationId,
                  status: "OPEN",
                  externalThreadId: extThreadId,
                  startedAt: new Date(),
                },
              });

              await prisma.customer.update({
                where: { id: recipient.customerId },
                data: { primaryConversationId: convId },
              });

              conversationMapByCustId.set(recipient.customerId, convId);
            } catch (e) {
              console.error(`[CAMPAIGN] Failed to lazily resolve/create conversation for customer ${recipient.customerId}:`, e);
            }
          }

          // Bulk write messages for all recipients
          const messageDataList: Prisma.ConversationMessageCreateManyInput[] = [];
          for (const recipient of successfullySentRecipients) {
            const convId = conversationMapByCustId.get(recipient.customerId);
            if (!convId) continue;

            const chan = channelMap.get(recipient.lineUserId);
            const channelCode = chan ? chan.toLowerCase() : "line";

            for (const msg of campaign.messages) {
              let msgType = "TEXT";
              let msgBody = msg.textContent || "";
              if (msg.type === "IMAGE") {
                msgType = "IMAGE";
                msgBody = "[Image]";
              }

              // Apply campaign details layout as requested:
              // Header: SuperChannel Admin
              // Inside body: "(แคมเปญ: {ชื่อแคมเปญ})\n{เนื้อความ}"
              const formattedBody = msgType === "TEXT"
                ? `(แคมเปญ: ${campaign.name})\n${msgBody}`
                : msgBody;

              messageDataList.push({
                id: `msg-${channelCode}-${randomUUID()}`,
                organizationId: campaign.organizationId,
                conversationId: convId,
                senderDisplayName: "SuperChannel Admin",
                direction: "OUTBOUND",
                type: msgType as unknown as MessageType,
                body: formattedBody,
                createdAt: new Date(),
              });
            }
          }

          if (messageDataList.length > 0) {
            await prisma.conversationMessage.createMany({
              data: messageDataList,
            });

            const uniqueConvIds = Array.from(new Set(messageDataList.map((m) => m.conversationId)));
            const lastMsg = campaign.messages[campaign.messages.length - 1];
            let preview = "";
            if (lastMsg) {
              preview = lastMsg.type === "IMAGE" ? "[Image]" : (lastMsg.textContent || "");
            }

            await prisma.conversation.updateMany({
              where: { id: { in: uniqueConvIds } },
              data: {
                previewText: preview,
                lastMessageAt: new Date(),
              },
            });
          }
        } catch (recordError) {
          console.error(`[CAMPAIGN] Failed to write outbound campaign messages history mapping:`, recordError);
        }
      }
    }

    const failedBatches = await prisma.campaignBatch.count({
      where: { campaignId: campaign.id, status: "FAILED" },
    });
    const completedBatches = await prisma.campaignBatch.count({
      where: { campaignId: campaign.id, status: "COMPLETED" },
    });

    let finalStatus = "COMPLETED";
    if (failedBatches > 0 && completedBatches > 0) {
      finalStatus = "PARTIAL_FAILED";
    } else if (failedBatches > 0 && completedBatches === 0) {
      finalStatus = "FAILED";
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: finalStatus as "COMPLETED" | "PARTIAL_FAILED" | "FAILED" },
    });
    
  } catch (error: unknown) {
    console.error(`[CAMPAIGN] Failed to process campaign ${campaign.id}:`, error);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "FAILED" },
    });
  }

  const counts = await prisma.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId: campaign.id },
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  return {
    sent: byStatus["SENT"] ?? 0,
    skipped: byStatus["SKIPPED"] ?? 0,
    failed: byStatus["FAILED"] ?? 0,
  };
}
