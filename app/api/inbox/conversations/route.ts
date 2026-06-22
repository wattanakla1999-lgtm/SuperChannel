import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { listConversationSummariesFromDatabase } from "@/server/services/customers";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const conversations = await listConversationSummariesFromDatabase(session);

  return NextResponse.json({ conversations });
}
