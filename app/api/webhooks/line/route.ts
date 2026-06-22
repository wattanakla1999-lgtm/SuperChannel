import { NextResponse } from "next/server";
import { processLineWebhookPayload } from "@/server/services/line";
import { verifyLineSignature } from "@/server/integrations/line-client";

export const runtime = "nodejs";

function isLineWebhookPayload(value: unknown): value is {
  destination?: string;
  events?: Array<{ type: string } & Record<string, unknown>>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const events = (value as { events?: unknown }).events;
  if (events === undefined) {
    return true;
  }

  return Array.isArray(events) && events.every(
    (event) =>
      event &&
      typeof event === "object" &&
      typeof (event as { type?: unknown }).type === "string",
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  let isValidSignature = false;

  try {
    isValidSignature = verifyLineSignature(rawBody, signature);
  } catch (error) {
    if (error instanceof Error && error.name === "SERVICE_UNAVAILABLE") {
      return NextResponse.json(
        {
          code: "SERVICE_UNAVAILABLE",
          message: error.message,
        },
        { status: 503 },
      );
    }

    throw error;
  }

  if (!isValidSignature) {
    return NextResponse.json(
      {
        code: "INVALID_SIGNATURE",
        message: "Invalid LINE webhook signature.",
      },
      { status: 401 },
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Invalid LINE webhook payload.",
      },
      { status: 400 },
    );
  }

  if (!isLineWebhookPayload(payload)) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Invalid LINE webhook payload.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await processLineWebhookPayload(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "SERVICE_UNAVAILABLE") {
      return NextResponse.json(
        {
          code: "SERVICE_UNAVAILABLE",
          message: error.message,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "LINE webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
