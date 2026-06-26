import { processFacebookMessengerWebhookPayload } from "@/server/services/meta";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isFacebookMessengerWebhookPayload(value: unknown): value is {
  object?: string;
  entry?: Array<{
    id: string;
    messaging?: Array<{
      sender?: { id: string };
      recipient?: { id: string };
      message?: { mid?: string; text?: string };
      timestamp?: number;
    }>;
  }>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entries = (value as { entry?: unknown }).entry;
  if (entries === undefined) {
    return true;
  }

  return Array.isArray(entries);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const expectedVerifyToken =
    process.env.META_WEBHOOK_VERIFY_TOKEN ?? "test-meta-verify-token";

  if (mode === "subscribe" && verifyToken === expectedVerifyToken && challenge) {
    console.info("[FACEBOOK_WEBHOOK] GET verification completed successfully.");
    return new Response(challenge, {
      headers: {
        "Content-Type": "text/plain",
      },
      status: 200,
    });
  }

  console.warn("[FACEBOOK_WEBHOOK] GET verification failed.");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    console.warn("[FACEBOOK_WEBHOOK] Invalid webhook payload JSON.", {
      error: error instanceof Error ? error.message : "Unknown JSON parse error.",
    });
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Invalid Facebook webhook payload JSON.",
      },
      { status: 400 },
    );
  }

  if (!isFacebookMessengerWebhookPayload(payload)) {
    console.warn("[FACEBOOK_WEBHOOK] Invalid webhook payload structure.");
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Invalid Facebook webhook structure.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await processFacebookMessengerWebhookPayload(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[FACEBOOK_WEBHOOK] Error processing Messenger webhook payload.", {
      error: error instanceof Error ? error.message : "Unknown processing error.",
    });

    return NextResponse.json(
      {
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "Facebook webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
