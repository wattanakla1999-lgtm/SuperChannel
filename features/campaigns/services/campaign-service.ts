import "server-only";

import { prisma } from "@/server/database/prisma";
import { Prisma } from "@prisma/client";
import { buildSegmentRawQuery } from "@/features/segments/services/segment-evaluator";
import { SegmentCondition } from "@/features/segments/schemas/segment-conditions.schema";
import { AuthenticatedSession } from "@/server/auth/session";

export async function calculateCampaignAudience(
  organizationId: string,
  targetType: "BROADCAST" | "TARGETED",
  segmentId?: string | null
) {
  let customerIdsQuery: Prisma.Sql;

  if (targetType === "BROADCAST") {
    customerIdsQuery = Prisma.sql`SELECT id FROM customers WHERE organization_id = ${organizationId}::uuid`;
  } else {
    if (!segmentId) {
      throw new Error("Segment ID is required for targeted campaigns.");
    }
    const segment = await prisma.segment.findUnique({
      where: { id: segmentId, organizationId },
    });
    if (!segment) {
      throw new Error("Segment not found.");
    }
    const conditions = segment.conditions as unknown as SegmentCondition[];
    const result = buildSegmentRawQuery(organizationId, segment.matchType, conditions);
    customerIdsQuery = result.query;
  }

  const result = await prisma.$queryRaw<{ 
    total: bigint; 
    eligible: bigint; 
    missing_line: bigint; 
    no_consent: bigint; 
  }[]>`
    WITH audience AS (
      ${customerIdsQuery}
    ),
    stats AS (
      SELECT 
        c.id,
        EXISTS (
          SELECT 1 FROM customer_channel_identities i 
          WHERE i.customer_id = c.id AND i.channel = 'LINE'
        ) as has_line,
        c.marketing_consent_status = 'OPTED_IN' as has_consent
      FROM customers c
      INNER JOIN audience a ON c.id = a.id
      WHERE c.organization_id = ${organizationId}::uuid
    )
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN has_line AND has_consent THEN 1 ELSE 0 END) as eligible,
      SUM(CASE WHEN NOT has_line THEN 1 ELSE 0 END) as missing_line,
      SUM(CASE WHEN has_line AND NOT has_consent THEN 1 ELSE 0 END) as no_consent
    FROM stats;
  `;

  const stats = result[0];

  return {
    total: Number(stats?.total ?? 0),
    eligible: Number(stats?.eligible ?? 0),
    missingLine: Number(stats?.missing_line ?? 0),
    noConsent: Number(stats?.no_consent ?? 0),
  };
}

export async function getCampaigns(session: AuthenticatedSession, page: number = 1, limit: number = 20, search: string = "") {
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: {
        createdByMember: { include: { profile: true } },
        _count: {
          select: { recipients: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { items, total, page, limit };
}

export async function getCampaignById(session: AuthenticatedSession, id: string) {
  return prisma.campaign.findUnique({
    where: { id, organizationId: session.organizationId },
    include: {
      messages: { orderBy: { orderIndex: 'asc' } },
      segment: true,
      integration: true,
      _count: {
        select: {
          recipients: true,
        }
      }
    },
  });
}

export async function cancelCampaign(session: AuthenticatedSession, campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: session.organizationId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  if (campaign.status !== "SCHEDULED") {
    throw new Error("Only scheduled campaigns can be cancelled.");
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "CANCELLED" },
  });

  await prisma.campaignAuditLog.create({
    data: {
      campaignId,
      organizationId: session.organizationId,
      actorMemberId: session.accountId,
      action: "CANCEL",
    },
  });

  return { success: true };
}
