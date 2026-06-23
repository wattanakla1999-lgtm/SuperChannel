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

    const segment = await prisma.$transaction(async (tx) => {
      const updatedSegment = await tx.segment.update({
        where: {
          organizationId_id: { organizationId: session.organizationId, id: segmentId },
        },
        data: {
          isArchived: true,
        },
      });

      // Clear cache on archive
      await tx.segmentMembership.deleteMany({
        where: { organizationId: session.organizationId, segmentId },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorType: "USER",
          actorMemberId: session.accountId,
          action: "segment.archived",
          entityType: "segment",
          entityId: segmentId,
          metadata: {},
        },
      });

      return updatedSegment;
    });

    return NextResponse.json({ success: true, segment });
  } catch (error) {
    console.error("[SEGMENTS_ARCHIVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
