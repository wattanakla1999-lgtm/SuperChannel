import { processCampaignId } from "@/features/campaigns/services/campaign-sender.service";
import { getAuthenticatedSession } from "@/server/auth/session";
import { prisma } from "@/server/database/prisma";
import { CampaignMessageType, CampaignStatus, CampaignTargetType, IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

const UpdateCampaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(150),
  description: z.string().max(500).optional(),
  channel: z.literal("LINE"),
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: session.organizationId },
      include: {
        messages: { orderBy: { orderIndex: "asc" } },
        segment: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CAMPAIGNS_GET]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId || !session?.accountId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: campaignId } = await params;

    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: session.organizationId },
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (existingCampaign.status !== "DRAFT" && existingCampaign.status !== "SCHEDULED") {
      return NextResponse.json(
        { error: "Cannot edit campaign in current status" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = UpdateCampaignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, description, targetType, segmentId, scheduledAt, isDraft, messages } = parsed.data;

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
      const updatedCampaign = await tx.campaign.update({
        where: { id: campaignId },
        data: {
          name,
          description: description || null,
          channel: IntegrationProvider.LINE,
          targetType: targetType === "BROADCAST" ? CampaignTargetType.BROADCAST : CampaignTargetType.TARGETED,
          segmentId: segmentId ?? null,
          scheduledAt: isDraft ? null : (scheduledAt ? new Date(scheduledAt) : null),
          status: isDraft ? CampaignStatus.DRAFT : CampaignStatus.SCHEDULED,
        },
      });

      // Clear existing messages
      await tx.campaignMessage.deleteMany({
        where: { campaignId },
      });

      // Add new messages
      await tx.campaignMessage.createMany({
        data: messages.map((msg, i) => ({
          campaignId,
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
          campaignId,
          organizationId: session.organizationId,
          actorMemberId: session.accountId,
          action: "UPDATE",
        },
      });

      return updatedCampaign;
    });

    if (!isDraft && !scheduledAt) {
      await processCampaignId(campaign.id);
    }

    return NextResponse.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[CAMPAIGNS_PUT]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
