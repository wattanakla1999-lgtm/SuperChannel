import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, forbiddenResponse } from "@/server/http/responses";
import { updateTag } from "@/server/services/tags";

type RouteContext = { params: Promise<{ tagId: string }> };

export async function POST(_: NextRequest, context: RouteContext) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const { tagId } = await context.params;

  try {
    const tag = await updateTag(session, tagId, { isArchived: true });
    return NextResponse.json({ tag });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "FORBIDDEN") return forbiddenResponse(e.message ?? "Forbidden");
    if (e.name === "NOT_FOUND") return NextResponse.json({ message: e.message }, { status: 404 });
    throw err;
  }
}
