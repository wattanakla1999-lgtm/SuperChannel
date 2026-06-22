import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import {
  connectMockIntegration,
} from "@/server/integrations/mock-integrations-data";
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

export async function POST(request: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as
    | { accountId?: unknown }
    | null;

  if (!body || typeof body.accountId !== "string") {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Please select a mock account" },
      { status: 400 },
    );
  }

  const { provider } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 350));

  const result = await connectMockIntegration(
    session.id,
    provider as IntegrationProvider,
    body.accountId,
  );

  if (!result) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Integration unavailable" },
      { status: 404 },
    );
  }

  return NextResponse.json(result);
}
