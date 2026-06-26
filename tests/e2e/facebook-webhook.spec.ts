import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const facebookVerifyToken =
  process.env.META_WEBHOOK_VERIFY_TOKEN ?? "superchannel_facebook_verify_token";

test.beforeAll(async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.conversation.deleteMany({
      where: {
        channel: "FACEBOOK",
        OR: [
          { previewText: "ทดสอบส่งข้อความผ่าน facebook" },
          { previewText: "ทดสอบส่งข้อความผ่าน facebook รอบสอง" },
          { externalThreadId: { contains: "fb-psid-" } },
        ],
      },
    });
    await prisma.customer.deleteMany({
      where: {
        OR: [
          { name: { contains: "Facebook User" } },
          { id: { contains: "fb-psid-" } },
        ],
      },
    });
  } catch (error) {
    console.warn("Clean up failed:", error);
  } finally {
    await prisma.$disconnect();
  }
});

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

async function postFacebookWebhook(
  request: APIRequestContext,
  payload: Record<string, unknown>,
) {
  return request.post("/api/webhooks/facebook", {
    data: payload,
  });
}

test.describe("facebook webhook", () => {
  test("approves GET verification on valid token", async ({ request }) => {
    const response = await request.get("/api/webhooks/facebook", {
      params: {
        "hub.challenge": "facebook_challenge_response",
        "hub.mode": "subscribe",
        "hub.verify_token": facebookVerifyToken,
      },
    });

    expect(response.status()).toBe(200);
    await expect(response.text()).resolves.toBe("facebook_challenge_response");
  });

  test("persists valid Messenger text messages and ignores unsupported events", async ({
    page,
    request,
  }) => {
    const uniqueToken = Date.now().toString();
    const firstTextBody = "ทดสอบส่งข้อความผ่าน facebook";
    const secondTextBody = "ทดสอบส่งข้อความผ่าน facebook รอบสอง";
    const senderPsid = `fb-psid-${uniqueToken}`;
    const payload = {
      entry: [
        {
          id: "fb-main",
          messaging: [
            {
              message: {
                mid: `mid-facebook-text-${uniqueToken}`,
                text: firstTextBody,
              },
              recipient: {
                id: "fb-main",
              },
              sender: {
                id: senderPsid,
              },
              timestamp: Date.now(),
            },
            {
              delivery: {
                mids: [`mid-facebook-delivery-${uniqueToken}`],
              },
              recipient: {
                id: "fb-main",
              },
              sender: {
                id: senderPsid,
              },
              timestamp: Date.now(),
            },
            {
              message: {
                mid: `mid-facebook-image-${uniqueToken}`,
                attachments: [
                  {
                    payload: {
                      url: "https://example.invalid/fb/image.jpg",
                    },
                    type: "image",
                  },
                ],
              },
              recipient: {
                id: "fb-main",
              },
              sender: {
                id: senderPsid,
              },
              timestamp: Date.now(),
            },
          ],
        },
      ],
      object: "page",
    };
    const secondPayload = {
      entry: [
        {
          id: "fb-main",
          messaging: [
            {
              message: {
                mid: `mid-facebook-text-second-${uniqueToken}`,
                text: secondTextBody,
              },
              recipient: {
                id: "fb-main",
              },
              sender: {
                id: senderPsid,
              },
              timestamp: Date.now() + 1000,
            },
          ],
        },
      ],
      object: "page",
    };

    await login(page);

    const firstResponse = await postFacebookWebhook(request, payload);
    expect(firstResponse.status()).toBe(200);
    await expect(firstResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      ignored: 2,
      processed: 1,
    });

    const duplicateResponse = await postFacebookWebhook(request, payload);
    expect(duplicateResponse.status()).toBe(200);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      duplicates: 1,
      ignored: 2,
      processed: 0,
    });

    const secondResponse = await postFacebookWebhook(request, secondPayload);
    expect(secondResponse.status()).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      ignored: 0,
      processed: 1,
    });

    const conversationsResponse = await page.request.get("/api/inbox/conversations");
    expect(conversationsResponse.status()).toBe(200);
    const conversations = (await conversationsResponse.json()) as {
      conversations: Array<{
        channel: string;
        id: string;
        preview: string;
        unreadCount: number;
        customerName: string;
        customerAvatarImageUrl: string | null;
      }>;
    };
    const matchingConversations = conversations.conversations.filter(
      (conversation) =>
        conversation.channel === "Facebook" && conversation.preview === secondTextBody,
    );

    expect(matchingConversations).toHaveLength(1);
    expect(matchingConversations[0].unreadCount).toBe(2);
    expect(matchingConversations[0].customerName).toBe("Marco Rivera");
    expect(matchingConversations[0].customerAvatarImageUrl).toBe("https://example.invalid/fb/marco.jpg");

    const detailResponse = await page.request.get(
      `/api/inbox/conversations/${matchingConversations[0].id}`,
    );
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();
    const matchingMessages = detail.messages.filter(
      (message: { body: string; direction: string; type: string }) =>
        message.direction === "inbound" &&
        message.type === "text" &&
        (message.body === firstTextBody || message.body === secondTextBody),
    );

    expect(matchingMessages.map((message: { body: string }) => message.body)).toEqual([
      firstTextBody,
      secondTextBody,
    ]);
    expect(detail.conversation.preview).toBe(secondTextBody);
    expect(detail.customer.name).toBe("Marco Rivera");
    expect(detail.customer.avatarImageUrl).toBe("https://example.invalid/fb/marco.jpg");
  });
});
