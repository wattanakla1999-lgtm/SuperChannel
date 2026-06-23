import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, invalidRequestResponse } from "@/server/http/responses";
import { assignTagToConversation, removeTagFromConversation } from "@/server/services/tags";

type RouteContext = { params: Promise<{ conversationId: string; tagId: string }> };

export async function POST(_: NextRequest, context: RouteContext) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const { conversationId, tagId } = await context.params;

  try {
    await assignTagToConversation(session, conversationId, tagId);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "BAD_REQUEST") return invalidRequestResponse(e.message ?? "Bad request");
    throw err;
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const { conversationId, tagId } = await context.params;

  await removeTagFromConversation(session, conversationId, tagId);
  return NextResponse.json({ success: true });
}
