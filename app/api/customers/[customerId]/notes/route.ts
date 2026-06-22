import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { addMockCustomerNote } from "@/server/customers/mock-customer-data";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

type AddNoteBody = {
  body?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as AddNoteBody | null;

  if (!body || typeof body.body !== "string" || !body.body.trim()) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Enter a note before saving.",
      },
      { status: 400 },
    );
  }

  const { customerId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 220));

  const customer = await addMockCustomerNote(
    session.id,
    customerId,
    body.body.trim(),
  );

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
