import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { listMockIntegrations } from "@/server/integrations/mock-integrations-data";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    },
    { status: 401 },
  );
}

export async function GET() {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  await new Promise((resolve) => setTimeout(resolve, 220));

  const integrations = await listMockIntegrations(session.id);
  return NextResponse.json({ integrations });
}
