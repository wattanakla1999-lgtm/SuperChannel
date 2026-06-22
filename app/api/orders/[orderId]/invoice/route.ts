import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { getMockOrderInvoice } from "@/server/orders/mock-order-data";
import { getMockSettings } from "@/server/settings/mock-settings-data";

type RouteContext = {
  params: Promise<{
    orderId: string;
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
      { code: "UNKNOWN", message: "Unable to load invoice preview." },
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
    { code: "UNKNOWN", message: "Unable to load invoice preview." },
    { status: 500 },
  );
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { orderId } = await context.params;
  const timezone = getMockSettings(session.id, session.user).workspaceProfile.timezone;

  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    const invoice = await getMockOrderInvoice(session.id, orderId);
    return NextResponse.json({ invoice, timezone });
  } catch (error) {
    return errorResponse(error);
  }
}
