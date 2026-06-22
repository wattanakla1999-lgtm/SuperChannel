import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import { appendConversationMessageFromDatabase } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

type MessageRequestBody = {
  body?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as
    | MessageRequestBody
    | null;

  if (!body || typeof body.body !== "string" || !body.body.trim()) {
    return invalidRequestResponse("Please enter a message before sending.");
  }

  const { conversationId } = await context.params;
  let result;

  try {
    result = await appendConversationMessageFromDatabase(session, conversationId, body.body.trim());
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "CONFLICT") {
        return NextResponse.json(
          { code: "CONFLICT", message: error.message },
          { status: 409 },
        );
      }

      if (error.name === "FORBIDDEN") {
        return NextResponse.json(
          { code: "FORBIDDEN", message: error.message },
          { status: 403 },
        );
      }

      if (error.name === "SERVICE_UNAVAILABLE") {
        return NextResponse.json(
          { code: "SERVICE_UNAVAILABLE", message: error.message },
          { status: 503 },
        );
      }
    }

    throw error;
  }

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
