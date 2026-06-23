import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, invalidRequestResponse, forbiddenResponse } from "@/server/http/responses";
import { updateTag } from "@/server/services/tags";

type RouteContext = { params: Promise<{ tagId: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const { tagId } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body) return invalidRequestResponse("Request body is required.");

  try {
    const tag = await updateTag(session, tagId, {
      name: body.name,
      description: body.description,
      color: body.color,
      isArchived: body.isArchived,
    });
    return NextResponse.json({ tag });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "FORBIDDEN") return forbiddenResponse(e.message ?? "Forbidden");
    if (e.name === "NOT_FOUND") return NextResponse.json({ message: e.message }, { status: 404 });
    if (e.name === "CONFLICT") return NextResponse.json({ message: e.message }, { status: 409 });
    throw err;
  }
}
