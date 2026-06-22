import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { testMockIntegration } from "@/server/integrations/mock-integrations-data";
import type { IntegrationProvider } from "@/features/integrations/types/integrations";

type RouteContext = {
  params: Promise<{ provider: string }>;
};

function unauthorizedResponse() {
  return NextResponse.json(
    {
      code: "UNAUTHORIZED",
      message: "Your session has expired. Please sign in again.",
    },
    { status: 401 },
  );
}

export async function POST(_: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { provider } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 300));

  const result = await testMockIntegration(
    session.id,
    provider as IntegrationProvider,
  );

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration unavailable" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
