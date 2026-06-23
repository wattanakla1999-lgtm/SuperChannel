import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { pushLineMulticastMessage } from "@/server/integrations/line-client";
import { randomUUID } from "node:crypto";

const TestSendSchema = z.object({
  lineUserId: z.string().min(1).max(100),
  messages: z
    .array(
      z.discriminatedUnion("type", [
        z.object({ type: z.literal("TEXT"), textContent: z.string().min(1) }),
        z.object({
          type: z.literal("IMAGE"),
          imageUrl: z.string().url(),
          previewImageUrl: z.string().url(),
        }),
      ])
    )
    .min(1)
    .max(5),
});

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedSession();
    if (!session?.organizationId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const parsed = TestSendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lineUserId, messages } = parsed.data;

    const lineMessages = messages
      .map((msg) => {
        if (msg.type === "TEXT") {
          return { type: "text" as const, text: msg.textContent };
        } else {
          return {
            type: "image" as const,
            originalContentUrl: msg.imageUrl,
            previewImageUrl: msg.previewImageUrl,
          };
        }
      });

    // X-Line-Retry-Key must be a valid UUID v4
    const idempotencyKey = randomUUID();
    await pushLineMulticastMessage([lineUserId], lineMessages, idempotencyKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CAMPAIGNS_TEST_SEND]", error);
    const message = error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
