import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import { appendConversationImageFromDatabase } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return invalidRequestResponse("Please choose an image before sending.");
  }

  const { conversationId } = await context.params;

  try {
    const result = await appendConversationImageFromDatabase(session, conversationId, file);

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
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "INVALID_REQUEST") {
        return invalidRequestResponse(error.message);
      }

      if (error.name === "CONFLICT") {
        return NextResponse.json(
          { code: "CONFLICT", message: error.message },
          { status: 409 },
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
}
