export const dynamic = "force-dynamic";

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

  return NextResponse.json(
    { conversations },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    },
  );
}
