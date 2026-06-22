import { NextResponse } from "next/server";
import type { IntegrationProvider } from "@/features/integrations/types/integrations";
import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import { connectIntegrationInDatabase } from "@/server/services/integrations";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as
    | { accountId?: unknown }
    | null;

  if (!body || typeof body.accountId !== "string") {
    return invalidRequestResponse("Please select an account.");
  }

  const { provider } = await context.params;

  const result = await connectIntegrationInDatabase(session, provider as IntegrationProvider, body.accountId);

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration unavailable" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
