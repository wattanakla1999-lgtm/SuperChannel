/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/database/prisma";
import { getAuthenticatedSession } from "@/server/auth/session";
import { SegmentMatch } from "@prisma/client";
import { SegmentConditionSchema } from "@/features/segments/schemas/segment-conditions.schema";

const UpdateSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  matchType: z.nativeEnum(SegmentMatch).optional(),
  conditions: z.array(SegmentConditionSchema).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { segmentId } = await params;

    const segment = await prisma.segment.findUnique({
      where: {
        organizationId_id: { organizationId: session.organizationId, id: segmentId },
      },
    });

    if (!segment) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return NextResponse.json(segment);
  } catch (error) {
    console.error("[SEGMENTS_GET_BY_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId || !session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { segmentId } = await params;
    const body = await request.json();
    const parsed = UpdateSegmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const currentSegment = await prisma.segment.findUnique({
      where: {
        organizationId_id: { organizationId: session.organizationId, id: segmentId },
      },
    });

    if (!currentSegment) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (currentSegment.isArchived) {
      return new NextResponse("Cannot update an archived segment", { status: 400 });
    }

    const { name, description, matchType, conditions } = parsed.data;

    const isConditionsChanged =
      conditions !== undefined &&
      JSON.stringify(conditions) !== JSON.stringify(currentSegment.conditions);

    const segment = await prisma.$transaction(async (tx) => {
      // If conditions changed, clear memberships and increment version
      if (isConditionsChanged) {
        await tx.segmentMembership.deleteMany({
          where: { organizationId: session.organizationId, segmentId },
        });
      }

      const updatedSegment = await tx.segment.update({
        where: {
          organizationId_id: { organizationId: session.organizationId, id: segmentId },
        },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(matchType !== undefined && { matchType }),
          ...(conditions !== undefined && {
            conditions: conditions as any,
            conditionsVersion: { increment: isConditionsChanged ? 1 : 0 },
            lastCalculatedAt: isConditionsChanged ? null : undefined,
          }),
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorType: "USER",
          actorMemberId: session.accountId,
          action: "segment.updated",
          entityType: "segment",
          entityId: segmentId,
          metadata: {
            isConditionsChanged,
            newVersion: updatedSegment.conditionsVersion,
            updates: parsed.data,
          },
        },
      });

      return updatedSegment;
    });

    return NextResponse.json(segment);
  } catch (error) {
    console.error("[SEGMENTS_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
