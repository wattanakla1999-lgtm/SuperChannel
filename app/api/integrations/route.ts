import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { listIntegrationsFromDatabase } from "@/server/services/integrations";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const integrations = await listIntegrationsFromDatabase(session);
  return NextResponse.json({ integrations });
}
