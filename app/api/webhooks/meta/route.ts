import { verifyMetaSignature } from "@/server/integrations/meta-client";
import { processMetaWebhookPayload } from "@/server/services/meta";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isMetaWebhookPayload(value: unknown): value is {
  object?: string;
  entry?: Array<{
    id: string;
    messaging?: Array<{
      sender?: { id: string };
      recipient?: { id: string };
      message?: { mid: string };
    }>;
  }>;
} {
  if (!value || typeof value !== "object") {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const verifyToken = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedVerifyToken = process.env.META_VERIFY_TOKEN ?? "test-meta-verify-token";

  if (mode === "subscribe" && verifyToken === expectedVerifyToken) {
    console.info("[META] Webhook GET verification completed successfully.");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[META] Webhook GET verification failed. Token mismatch.");
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  let isValidSignature = false;

  try {
    isValidSignature = verifyMetaSignature(rawBody, signature);
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
        message: "Invalid Meta webhook signature.",
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
        message: "Invalid Meta webhook payload JSON.",
      },
      { status: 400 },
    );
  }

  if (!isMetaWebhookPayload(payload)) {
    return NextResponse.json(
      {
        code: "INVALID_REQUEST",
        message: "Invalid Meta webhook structure.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await processMetaWebhookPayload(payload);
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

    console.error("[META] Error processing Meta webhook payload:", error);

    return NextResponse.json(
      {
        code: "WEBHOOK_PROCESSING_FAILED",
        message: "Meta webhook processing failed.",
      },
      { status: 500 },
    );
  }
}
