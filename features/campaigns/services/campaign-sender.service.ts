import { SegmentCondition } from "@/features/segments/schemas/segment-conditions.schema";
import { buildSegmentRawQuery } from "@/features/segments/services/segment-evaluator";
import { prisma } from "@/server/database/prisma";
import { pushLineMulticastMessage } from "@/server/integrations/line-client";
import { getIntegrationCredentials } from "@/server/repositories/integration-repository";
import { decryptCredentialPayload } from "@/server/security/encryption";
import { Campaign, CampaignMessage, Prisma, Segment } from "@prisma/client";
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
          (
            SELECT external_id FROM customer_channel_identities i 
            WHERE i.customer_id = c.id AND i.channel = 'line'
            LIMIT 1
          ) as line_user_id,
          c.marketing_consent_status != 'opted_out' as has_consent
        FROM customers c
        INNER JOIN audience a ON c.id = a.id
        WHERE c.organization_id = ${campaign.organizationId}::uuid
      )
      INSERT INTO campaign_recipients (
        organization_id, campaign_id, customer_id, line_user_id, status, error_reason, created_at, updated_at
      )
      SELECT 
        ${campaign.organizationId}::uuid,
        ${campaign.id}::uuid,
        customer_id,
        COALESCE(line_user_id, ''),
        CASE 
          WHEN line_user_id IS NULL THEN 'SKIPPED'::campaign_recipient_status
          WHEN NOT has_consent THEN 'SKIPPED'::campaign_recipient_status
          ELSE 'PENDING'::campaign_recipient_status
        END,
        CASE 
          WHEN line_user_id IS NULL THEN 'No LINE ID'
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

      const lineMessages = campaign.messages.map((msg: CampaignMessage) => {
        if (msg.type === "TEXT") {
          return { type: "text", text: msg.textContent };
        } else if (msg.type === "IMAGE") {
          return { type: "image", originalContentUrl: msg.imageUrl, previewImageUrl: msg.previewImageUrl };
        }
        return null;
      }).filter((m): m is NonNullable<typeof m> => m !== null) as Record<string, unknown>[];

      try {
        const userIds = pendingRecipients.map(r => r.lineUserId);
        console.info(`[CAMPAIGN] Sending batch ${batch.id} to ${userIds.length} recipients (campaign ${campaign.id})`);
        // Try to load integration credentials for the campaign's integration (if set)
        let overrideCreds: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string } | undefined;
        if (campaign.integrationId) {
          const creds = await getIntegrationCredentials(campaign.organizationId, campaign.integrationId);
          if (creds) {
            try {
              const decrypted = decryptCredentialPayload({
                ciphertext: creds.encryptedPayload,
                iv: creds.iv,
                authTag: creds.authTag,
                keyVersion: (creds as any).keyVersion ?? 1,
              }) as { channelAccessToken?: string; channelSecret?: string; apiBaseUrl?: string };
              overrideCreds = {
                apiBaseUrl: decrypted.apiBaseUrl,
                channelAccessToken: decrypted.channelAccessToken,
                channelSecret: decrypted.channelSecret,
              };
            } catch (e) {
              console.warn(`[CAMPAIGN] Failed to decrypt integration credentials for integration ${campaign.integrationId}`, e);
            }
          }
        }

        await pushLineMulticastMessage(userIds, lineMessages, idempotencyKey, overrideCreds);

        await prisma.campaignBatch.update({
          where: { id: batch.id },
          data: { status: "COMPLETED" },
        });

        await prisma.campaignRecipient.updateMany({
          where: { id: { in: pendingRecipients.map((r) => r.id) } },
          data: { status: "SENT" },
        });

        // --- RECORD PATH TO CUSTOMER INTEGRATED CHAT DETAILS (INBOX RECENTS) ---
        try {
          const externalThreadIds = pendingRecipients.map((r) => `line:user:${r.lineUserId}`);

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
          for (const recipient of pendingRecipients) {
            if (conversationMapByCustId.has(recipient.customerId)) {
              continue;
            }

            const extThreadId = `line:user:${recipient.lineUserId}`;
            const existing = existingConversations.find((c) => c.externalThreadId === extThreadId);
            if (existing) {
              conversationMapByCustId.set(recipient.customerId, existing.id);
              continue;
            }

            try {
              const convId = `conv-line-${randomUUID()}`;
              await prisma.conversation.create({
                data: {
                  id: convId,
                  customerId: recipient.customerId,
                  channel: "LINE",
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
          for (const recipient of pendingRecipients) {
            const convId = conversationMapByCustId.get(recipient.customerId);
            if (!convId) continue;

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
                id: `msg-line-${randomUUID()}`,
                organizationId: campaign.organizationId,
                conversationId: convId,
                senderDisplayName: "SuperChannel Admin",
                direction: "OUTBOUND",
                type: msgType as any,
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
      } catch (error: unknown) {
        console.error(`[CAMPAIGN] Batch ${batch.id} failed for campaign ${campaign.id}:`, error);
        await prisma.campaignBatch.update({
          where: { id: batch.id },
          data: { status: "FAILED", errorMessage: (error as Error).message },
        });

        await prisma.campaignRecipient.updateMany({
          where: { id: { in: pendingRecipients.map((r) => r.id) } },
          data: { status: "FAILED", errorReason: (error as Error).message },
        });
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
