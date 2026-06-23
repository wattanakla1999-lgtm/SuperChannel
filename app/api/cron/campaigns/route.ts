import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/database/prisma";
import { Prisma, Campaign, CampaignMessage, Segment } from "@prisma/client";
import { buildSegmentRawQuery } from "@/features/segments/services/segment-evaluator";
import { pushLineMulticastMessage } from "@/server/integrations/line-client";
import { SegmentCondition } from "@/features/segments/schemas/segment-conditions.schema";

export const maxDuration = 300; // Allow 5 minutes for cron processing

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        lte: new Date(),
      },
    },
    include: {
      messages: { orderBy: { orderIndex: 'asc' } },
      segment: true,
    },
    take: 5,
  });

  if (campaigns.length === 0) {
    return NextResponse.json({ success: true, message: "No campaigns to process." });
  }

  for (const campaign of campaigns) {
    await processCampaign(campaign);
  }

  return NextResponse.json({ success: true, processed: campaigns.length });
}

async function processCampaign(campaign: Campaign & { messages: CampaignMessage[], segment: Segment | null }) {
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "SENDING" },
  });

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
            WHERE i.customer_id = c.id AND i.channel = 'LINE'
            LIMIT 1
          ) as line_user_id,
          c.marketing_consent_status = 'OPTED_IN' as has_consent
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
          WHEN NOT has_consent THEN 'No Marketing Consent'
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
        await pushLineMulticastMessage(userIds, lineMessages, idempotencyKey);
        
        await prisma.campaignBatch.update({
          where: { id: batch.id },
          data: { status: "COMPLETED" },
        });

        await prisma.campaignRecipient.updateMany({
          where: { id: { in: pendingRecipients.map((r) => r.id) } },
          data: { status: "SENT" },
        });
      } catch (error: unknown) {
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
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "FAILED" },
    });
  }
}
