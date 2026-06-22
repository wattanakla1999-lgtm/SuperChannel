import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import {
  getMockCustomerDetail,
  updateMockCustomer,
} from "@/server/customers/mock-customer-data";

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

  const { customerId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 180));

  const customer = await getMockCustomerDetail(session.id, customerId);

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

  const body = (await request.json().catch(() => null)) as UpdateCustomerBody | null;
  const tags = normalizeTags(body?.tags);

  if (!tags || tags.length === 0) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Choose at least one tag before saving.",
      },
      { status: 400 },
    );
  }

  const { customerId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 220));

  const customer = await updateMockCustomer(session.id, customerId, { tags });

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
