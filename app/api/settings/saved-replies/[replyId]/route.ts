import { NextResponse } from "next/server";
import type { SavedReplyInput } from "@/features/settings/types/settings";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import {
  deleteSavedReplyInDatabase,
  updateSavedReplyInDatabase,
} from "@/server/services/settings";

type RouteContext = {
  params: Promise<{ replyId: string }>;
};

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to process saved reply." },
      { status: 500 },
    );
  }

  if (error.name === "FORBIDDEN") {
    return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
  }

  if (error.name === "CONFLICT") {
    return NextResponse.json({ code: "CONFLICT", message: error.message }, { status: 409 });
  }

  return NextResponse.json({ code: "INVALID_REQUEST", message: error.message }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as SavedReplyInput | null;

  if (!body) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid saved reply payload." },
      { status: 400 },
    );
  }

  const { replyId } = await context.params;

  try {
    const reply = await updateSavedReplyInDatabase(session, replyId, body);

    if (!reply) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Saved Reply not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(reply);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { replyId } = await context.params;

  try {
    const deleted = await deleteSavedReplyInDatabase(session, replyId);

    if (!deleted) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Saved Reply not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
