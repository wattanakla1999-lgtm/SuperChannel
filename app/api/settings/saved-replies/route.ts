import { NextResponse } from "next/server";
import type { SavedReplyInput } from "@/features/settings/types/settings";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import {
  createSavedReplyInDatabase,
  listSavedRepliesFromDatabase,
} from "@/server/services/settings";

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

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);

  return NextResponse.json({
    replies: await listSavedRepliesFromDatabase(session, searchParams.get("search") ?? undefined),
  });
}

export async function POST(request: Request) {
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

  try {
    return NextResponse.json(await createSavedReplyInDatabase(session, body), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
