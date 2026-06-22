import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { getSettingsFromDatabase } from "@/server/services/settings";
import { listCustomerOrdersFromDatabase } from "@/server/services/orders";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

function errorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to load order history." },
      { status: 500 },
    );
  }

  if (error.name === "FORBIDDEN") {
    return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
  }

  if (error.name === "NOT_FOUND") {
    return NextResponse.json({ code: "NOT_FOUND", message: error.message }, { status: 404 });
  }

  if (error.name === "TEMPORARY_UNAVAILABLE") {
    return NextResponse.json(
      { code: "TEMPORARY_UNAVAILABLE", message: error.message },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { code: "UNKNOWN", message: "Unable to load order history." },
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
    return NextResponse.json(await listCustomerOrdersFromDatabase(session, customerId, timezone));
  } catch (error) {
    return errorResponse(error);
  }
}
