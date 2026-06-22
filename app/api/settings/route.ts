import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getSettingsFromDatabase } from "@/server/services/settings";

export async function GET() {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return NextResponse.json(await getSettingsFromDatabase(session));
}
