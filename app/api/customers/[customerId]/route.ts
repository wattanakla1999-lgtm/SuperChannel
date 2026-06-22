import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { invalidRequestResponse, unauthorizedResponse } from "@/server/http/responses";
import {
  getCustomerDetailFromDatabase,
  updateCustomerTagsFromDatabase,
} from "@/server/services/customers";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

type UpdateCustomerBody = {
  tags?: unknown;
};

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const tags = value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { customerId } = await context.params;
  const customer = await getCustomerDetailFromDatabase(session, customerId);

  if (!customer) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Customer not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(customer);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as UpdateCustomerBody | null;
  const tags = normalizeTags(body?.tags);

  if (!tags || tags.length === 0) {
    return invalidRequestResponse("Choose at least one tag before saving.");
  }

  const { customerId } = await context.params;
  const customer = await updateCustomerTagsFromDatabase(session, customerId, tags);

  if (!customer) {
    return NextResponse.json(
      {
        code: "NOT_FOUND",
        message: "Customer not found",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(customer);
}
