import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse, invalidRequestResponse } from "@/server/http/responses";
import { bulkRemoveCustomerTags } from "@/server/services/tags";

export async function POST(req: NextRequest) {
  const session = await getAuthenticatedSession();
  if (!session) return unauthorizedResponse();

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.customerIds) || !Array.isArray(body.tagIds)) {
    return invalidRequestResponse("customerIds and tagIds must be arrays.");
  }

  try {
    const result = await bulkRemoveCustomerTags(session, { customerIds: body.customerIds, tagIds: body.tagIds });
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e.name === "BAD_REQUEST") return invalidRequestResponse(e.message ?? "Bad request");
    throw err;
  }
}
