import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { getMockSettings } from "@/server/settings/mock-settings-data";
import { getMockCommerceSummary } from "@/server/orders/mock-order-data";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
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
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { customerId } = await context.params;
  const timezone = getMockSettings(session.id, session.user).workspaceProfile.timezone;

  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    const summary = await getMockCommerceSummary(session.id, customerId, timezone);
    return NextResponse.json(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
