import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getCommerceSummaryFromDatabase } from "@/server/services/orders";
import { getSettingsFromDatabase } from "@/server/services/settings";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

function errorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to load purchase summary." },
      { status: 500 },
    );
  }

  if (error.name === "FORBIDDEN") {
    return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
  }

  if (error.name === "NOT_FOUND") {
    return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
  }

  return NextResponse.json(
    { code: "UNKNOWN", message: "Unable to load purchase summary." },
    { status: 500 },
  );
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { customerId } = await context.params;
  const timezone = (await getSettingsFromDatabase(session)).workspaceProfile.timezone;

  try {
    const summary = await getCommerceSummaryFromDatabase(session, customerId, timezone);
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
