export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getConversationDetailFromDatabase } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { conversationId } = await context.params;
  const detail = await getConversationDetailFromDatabase(session, conversationId);

  if (!detail) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Conversation not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(detail, {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
