import { NextResponse } from "next/server";
import type { IntegrationProvider } from "@/features/integrations/types/integrations";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { testIntegrationInDatabase } from "@/server/services/integrations";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

export async function POST(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { provider } = await context.params;

  const result = await testIntegrationInDatabase(session, provider as IntegrationProvider);

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration unavailable" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
