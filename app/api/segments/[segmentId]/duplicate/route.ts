/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/server/database/prisma";
import { getAuthenticatedSession } from "@/server/auth/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ segmentId: string }> }
) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId || !session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { segmentId } = await params;

    const sourceSegment = await prisma.segment.findUnique({
      where: {
        organizationId_id: { organizationId: session.organizationId, id: segmentId },
      },
    });

    if (!sourceSegment) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const segment = await prisma.$transaction(async (tx) => {
      const newSegment = await tx.segment.create({
        data: {
          organizationId: session.organizationId,
          name: `${sourceSegment.name} (Copy)`,
          description: sourceSegment.description,
          matchType: sourceSegment.matchType,
          conditions: sourceSegment.conditions as any,
          conditionsVersion: 1,
          lastCalculatedAt: null,
          isArchived: false,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorType: "USER",
          actorMemberId: session.accountId,
          action: "segment.duplicated",
          entityType: "segment",
          entityId: newSegment.id,
          metadata: { originalSegmentId: segmentId, name: newSegment.name },
        },
      });

      return newSegment;
    });

    return NextResponse.json(segment);
  } catch (error) {
    console.error("[SEGMENTS_DUPLICATE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
