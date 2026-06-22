import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { appendMockConversationMessage } from "@/server/inbox/mock-inbox-data";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

type MessageRequestBody = {
  body?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
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

  const body = (await request.json().catch(() => null)) as
    | MessageRequestBody
    | null;

  if (!body || typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Please enter a message before sending.",
      },
      { status: 400 },
    );
  }

  const { conversationId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 400));

  const result = await appendMockConversationMessage(
    session.id,
    conversationId,
    body.body.trim(),
  );

  if (!result) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Conversation not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(result, { status: 201 });
}
