import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedSession } from "@/server/auth/session";
import { pushLineMulticastMessage } from "@/server/integrations/line-client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/server/database/prisma";
import { IntegrationProvider } from "@prisma/client";

const TestSendSchema = z.object({
  lineUserId: z.string().min(1).max(100),
  channel: z.nativeEnum(IntegrationProvider).optional(),
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

    const { lineUserId, messages, channel = "LINE" } = parsed.data;

    if (channel === "LINE") {
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
    } else if (channel === "FACEBOOK" || channel === "INSTAGRAM") {
      const integration = await prisma.integration.findFirst({
        where: {
          organizationId: session.organizationId,
          provider: channel,
          status: "CONNECTED",
        },
        include: {
          credentials: true,
        },
      });

      if (!integration) {
        return NextResponse.json({ error: `ไม่พบการเชื่อมต่อสำหรับ ${channel}` }, { status: 400 });
      }

      const { getDecryptedAccessToken, resolveMetaRecipientExternalId } = await import("@/server/services/meta");
      const { sendMetaTextMessage, sendMetaImageMessage } = await import("@/server/integrations/meta-client");

      const accessToken = await getDecryptedAccessToken(integration);
      if (!accessToken) {
        return NextResponse.json({ error: `ไม่สามารถดึงข้อมูล credentials สำหรับ ${channel}` }, { status: 400 });
      }

      const psid = resolveMetaRecipientExternalId(lineUserId);
      const metaChannel = channel.toLowerCase() as "facebook" | "instagram";

      for (const msg of messages) {
        if (msg.type === "TEXT") {
          await sendMetaTextMessage(psid, metaChannel, msg.textContent, accessToken);
        } else {
          await sendMetaImageMessage(psid, metaChannel, msg.imageUrl, accessToken);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CAMPAIGNS_TEST_SEND]", error);
    const message = error instanceof Error ? error.message : "ส่งข้อความไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
