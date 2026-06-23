/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/database/prisma";
import { getAuthenticatedSession } from "@/server/auth/session";
import { SegmentMatch } from "@prisma/client";
import { SegmentConditionSchema } from "@/features/segments/schemas/segment-conditions.schema";

const CreateSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  matchType: z.nativeEnum(SegmentMatch),
  conditions: z.array(SegmentConditionSchema),
});

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    const where = {
      organizationId: session.organizationId,
      isArchived: false,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [segments, total] = await Promise.all([
      prisma.segment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.segment.count({ where }),
    ]);

    return NextResponse.json({ data: segments, total });
  } catch (error) {
    console.error("[SEGMENTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId || !session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const parsed = CreateSegmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { name, description, matchType, conditions } = parsed.data;

    // Conditions are validated. conditionsVersion = 1 by default. lastCalculatedAt is null (pending background sync).
    // The requirement: "Treat conditions as the source of truth and memberships as a cache... set lastCalculatedAt to null."

    const segment = await prisma.$transaction(async (tx) => {
      const newSegment = await tx.segment.create({
        data: {
          organizationId: session.organizationId,
          name,
          description,
          matchType,
          conditions: conditions as any,
          conditionsVersion: 1,
          lastCalculatedAt: null,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          organizationId: session.organizationId,
          actorType: "USER",
          actorMemberId: session.accountId,
          action: "segment.created",
          entityType: "segment",
          entityId: newSegment.id,
          metadata: { name: newSegment.name, conditionsCount: conditions.length },
        },
      });

      return newSegment;
    });

    return NextResponse.json(segment);
  } catch (error) {
    console.error("[SEGMENTS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
