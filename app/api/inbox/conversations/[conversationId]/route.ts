import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { getMockConversationDetail } from "@/server/inbox/mock-inbox-data";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const { conversationId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 250));

  const detail = await getMockConversationDetail(session.id, conversationId);

  if (!detail) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Conversation not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(detail);
}
