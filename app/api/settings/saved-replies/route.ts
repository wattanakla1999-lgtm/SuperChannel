import { NextResponse } from "next/server";
import type { SavedReplyInput } from "@/features/settings/types/settings";
import { getMockSession } from "@/server/auth/mock-session";
import {
  createMockSavedReply,
  listMockSavedReplies,
} from "@/server/settings/mock-settings-data";

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

  const { searchParams } = new URL(request.url);

  await new Promise((resolve) => setTimeout(resolve, 160));

  return NextResponse.json({
    replies: listMockSavedReplies(session.id, searchParams.get("search") ?? undefined),
  });
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => null)) as SavedReplyInput | null;

  if (!body) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid saved reply payload." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  try {
    return NextResponse.json(createMockSavedReply(session.id, session.user, body), { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
