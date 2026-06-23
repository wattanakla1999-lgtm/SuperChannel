import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/database/prisma";
import { getAuthenticatedSession } from "@/server/auth/session";
import { SegmentMatch } from "@prisma/client";
import { SegmentConditionSchema } from "@/features/segments/schemas/segment-conditions.schema";
import { buildSegmentRawQuery } from "@/features/segments/services/segment-evaluator";

const PreviewBodySchema = z.object({
  matchType: z.nativeEnum(SegmentMatch),
  conditions: z.array(SegmentConditionSchema),
});

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const parsed = PreviewBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.issues }, { status: 400 });
    }

    const { matchType, conditions } = parsed.data;

    const sqlQuery = buildSegmentRawQuery(session.organizationId, matchType, conditions);

    // Get count and preview list (first 5)
    // We execute a raw query to fetch up to 5 matching customers, and also COUNT over the same condition.
    // To do it efficiently, we can use Prisma.$queryRaw.
    // The query inside sqlQuery.query returns "SELECT id FROM customers ..."
    
    // Preview customers
    const previewCustomersRaw = await prisma.$queryRaw<
      { id: string; name: string; avatar_fallback: string | null }[]
    >`
      SELECT id, name, avatar_fallback
      FROM customers
      WHERE id IN (${sqlQuery.query})
      ORDER BY last_interaction_at DESC NULLS LAST
      LIMIT 5
    `;

    // Total count
    const countRaw = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM (${sqlQuery.query}) as matching_customers
    `;

    const totalCount = Number(countRaw[0]?.count ?? 0);

    return NextResponse.json({
      count: totalCount,
      previewCustomers: previewCustomersRaw.map((c) => ({
        id: c.id,
        name: c.name,
        avatarFallback: c.avatar_fallback,
      })),
    });
  } catch (error) {
    console.error("[SEGMENTS_PREVIEW]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
