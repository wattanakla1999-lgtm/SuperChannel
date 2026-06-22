import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import { addCustomerNoteFromDatabase } from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

type AddNoteBody = {
  body?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as AddNoteBody | null;

  if (!body || typeof body.body !== "string" || !body.body.trim()) {
    return invalidRequestResponse("Enter a note before saving.");
  }

  const { customerId } = await context.params;
  const customer = await addCustomerNoteFromDatabase(session, customerId, body.body.trim());

  if (!customer) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Customer not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(customer, { status: 201 });
}
