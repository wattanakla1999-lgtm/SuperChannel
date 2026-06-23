import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, invalidRequestResponse, forbiddenResponse } from "@/server/http/responses";
import { getTags, createTag } from "@/server/services/tags";
import type { TagTarget } from "@/features/tags/types/tags";

export async function GET(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const targetParam = searchParams.get("target");
  const target = (targetParam === "CUSTOMER" || targetParam === "CONVERSATION")
    ? targetParam as TagTarget
    : undefined;

  const tags = await getTags(session, target);
  return NextResponse.json({ tags });
}

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return invalidRequestResponse("Tag name is required.");
  }
  if (body.target !== "CUSTOMER" && body.target !== "CONVERSATION") {
    return invalidRequestResponse("Target must be CUSTOMER or CONVERSATION.");
  }

  try {
    const tag = await createTag(session, {
      name: body.name,
      description: body.description ?? null,
      color: body.color ?? null,
      target: body.target,
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "FORBIDDEN") return forbiddenResponse(e.message ?? "Forbidden");
    if (e.name === "CONFLICT") return NextResponse.json({ message: e.message }, { status: 409 });
    throw err;
  }
}
