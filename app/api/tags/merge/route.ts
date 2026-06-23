import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, invalidRequestResponse, forbiddenResponse } from "@/server/http/responses";
import { mergeTags } from "@/server/services/tags";

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  if (!body?.sourceTagId || !body?.destinationTagId) {
    return invalidRequestResponse("sourceTagId and destinationTagId are required.");
  }

  try {
    await mergeTags(session, {
      sourceTagId: body.sourceTagId,
      destinationTagId: body.destinationTagId,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "FORBIDDEN") return forbiddenResponse(e.message ?? "Forbidden");
    if (e.name === "NOT_FOUND") return NextResponse.json({ message: e.message }, { status: 404 });
    if (e.name === "BAD_REQUEST") return invalidRequestResponse(e.message ?? "Bad request");
    throw err;
  }
}
