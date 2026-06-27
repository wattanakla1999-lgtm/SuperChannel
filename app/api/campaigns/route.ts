import { processCampaignId } from "@/features/campaigns/services/campaign-sender.service";
import { getAuthenticatedSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { CampaignMessageType, CampaignStatus, CampaignTargetType, IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 300;

const CreateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  description: z.string().max(500).optional(),
  channel: z.nativeEnum(IntegrationProvider).default(IntegrationProvider.LINE),
  targetType: z.enum(["BROADCAST", "TARGETED"]),
  segmentId: z.string().uuid().nullish(),
  scheduledAt: z.string().datetime().nullish(),
  isDraft: z.boolean().optional(),
  messages: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("TEXT"),
          textContent: z.string().min(1).max(5000),
        }),
        z.object({
          type: z.literal("IMAGE"),
          imageUrl: z.string().url(),
          previewImageUrl: z.string().url(),
        }),
      ])
    )
    .min(1)
    .max(5),
});

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId || !session?.accountId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, channel, targetType, segmentId, scheduledAt, isDraft, messages } = parsed.data;

    if (targetType === "TARGETED" && !segmentId) {
      return NextResponse.json(
        { error: "segmentId is required for TARGETED campaigns" },
        { status: 400 }
      );
    }

    // Validate segment belongs to org if provided
    if (segmentId) {
      const segment = await prisma.segment.findUnique({
        where: { id: segmentId, organizationId: session.organizationId },
      });
      if (!segment) {
        return NextResponse.json({ error: "Segment not found" }, { status: 404 });
      }
    }

    const campaign = await prisma.$transaction(async (tx) => {
      const newCampaign = await tx.campaign.create({
        data: {
          organizationId: session.organizationId,
          name,
          description: description || null,
          channel: channel,
          targetType: targetType === "BROADCAST" ? CampaignTargetType.BROADCAST : CampaignTargetType.TARGETED,
          segmentId: segmentId ?? null,
          scheduledAt: isDraft ? null : (scheduledAt ? new Date(scheduledAt) : null),
          status: isDraft ? CampaignStatus.DRAFT : CampaignStatus.SCHEDULED,
          createdByMemberId: session.accountId,
        },
      });

      await tx.campaignMessage.createMany({
        data: messages.map((msg, i) => ({
          campaignId: newCampaign.id,
          organizationId: session.organizationId,
          type: msg.type === "TEXT" ? CampaignMessageType.TEXT : CampaignMessageType.IMAGE,
          textContent: msg.type === "TEXT" ? msg.textContent : null,
          imageUrl: msg.type === "IMAGE" ? msg.imageUrl : null,
          previewImageUrl: msg.type === "IMAGE" ? msg.previewImageUrl : null,
          orderIndex: i,
        })),
      });

      await tx.campaignAuditLog.create({
        data: {
          campaignId: newCampaign.id,
          organizationId: session.organizationId,
          actorMemberId: session.accountId,
          action: "CREATE",
        },
      });

      return newCampaign;
    });

    if (!isDraft && !scheduledAt) {
      // For immediate send, process it in the background or await it.
      // Awaiting means the user gets a loading state and waits until sent.
      // We will await it to ensure it goes out right away.
      await processCampaignId(campaign.id);
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CAMPAIGNS_POST]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
