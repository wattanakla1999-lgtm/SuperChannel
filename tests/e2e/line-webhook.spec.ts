import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

const lineSecret = process.env.LINE_CHANNEL_SECRET ?? "test-line-secret";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

function signLinePayload(rawBody: string) {
  return createHmac("sha256", lineSecret).update(rawBody, "utf8").digest("base64");
}

async function postLineWebhook(
  request: APIRequestContext,
  payload: Record<string, unknown>,
  options?: { invalidSignature?: boolean },
) {
  const rawBody = JSON.stringify(payload);
  return request.post("/api/webhooks/line", {
    data: rawBody,
    headers: {
      "content-type": "application/json",
      "x-line-signature": options?.invalidSignature ? "invalid-signature" : signLinePayload(rawBody),
    },
  });
}

test.describe("line webhook", () => {
  test("rejects invalid signatures", async ({ request }) => {
    const response = await postLineWebhook(
      request,
      {
        destination: "test-destination",
        events: [],
      },
      { invalidSignature: true },
    );

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_SIGNATURE",
    });
  });

  test("persists valid text, image, audio, and sticker LINE messages and deduplicates webhook events", async ({
    page,
    request,
  }) => {
    const uniqueToken = Date.now().toString();
    const textBody = `LINE webhook text ${uniqueToken}`;
    const textPayload = {
      destination: "test-destination",
      events: [
        {
          message: {
            id: `line-provider-message-${uniqueToken}`,
            text: textBody,
            type: "text",
          },
          mode: "active",
          replyToken: `reply-${uniqueToken}`,
          source: {
            type: "user",
            userId: "U1234567890abcdef1234567890nina12",
          },
          timestamp: Date.now(),
          type: "message",
          webhookEventId: `line-webhook-${uniqueToken}`,
        },
      ],
    };

    const firstTextResponse = await postLineWebhook(request, textPayload);
    expect(firstTextResponse.status()).toBe(200);
    await expect(firstTextResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    const duplicateTextResponse = await postLineWebhook(request, textPayload);
    expect(duplicateTextResponse.status()).toBe(200);
    await expect(duplicateTextResponse.json()).resolves.toMatchObject({
      duplicates: 1,
      processed: 0,
    });

    const imagePayload = {
      destination: "test-destination",
      events: [
        {
          message: {
            contentProvider: {
              type: "line",
            },
            id: `line-provider-image-${uniqueToken}`,
            type: "image",
          },
          mode: "active",
          source: {
            type: "user",
            userId: "U1234567890abcdef1234567890nina12",
          },
          timestamp: Date.now() + 1000,
          type: "message",
          webhookEventId: `line-webhook-image-${uniqueToken}`,
        },
      ],
    };

    const imageResponse = await postLineWebhook(request, imagePayload);
    expect(imageResponse.status()).toBe(200);
    await expect(imageResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    const audioPayload = {
      destination: "test-destination",
      events: [
        {
          message: {
            duration: 4200,
            id: `line-provider-audio-${uniqueToken}`,
            type: "audio",
          },
          mode: "active",
          source: {
            type: "user",
            userId: "U1234567890abcdef1234567890nina12",
          },
          timestamp: Date.now() + 1500,
          type: "message",
          webhookEventId: `line-webhook-audio-${uniqueToken}`,
        },
      ],
    };

    const audioResponse = await postLineWebhook(request, audioPayload);
    expect(audioResponse.status()).toBe(200);
    await expect(audioResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    const stickerPayload = {
      destination: "test-destination",
      events: [
        {
          message: {
            id: `line-provider-sticker-${uniqueToken}`,
            packageId: "11537",
            stickerId: "52002734",
            stickerResourceType: "STATIC",
            type: "sticker",
          },
          mode: "active",
          source: {
            type: "user",
            userId: "U1234567890abcdef1234567890nina12",
          },
          timestamp: Date.now() + 2000,
          type: "message",
          webhookEventId: `line-webhook-sticker-${uniqueToken}`,
        },
      ],
    };

    const stickerResponse = await postLineWebhook(request, stickerPayload);
    expect(stickerResponse.status()).toBe(200);
    await expect(stickerResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    await login(page);

    const detailResponse = await page.request.get("/api/inbox/conversations/conv-line-001");
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();
    const matchingTextMessages = detail.messages.filter(
      (message: { body: string }) => message.body === textBody,
    );
    expect(matchingTextMessages).toHaveLength(1);
    expect(
      detail.messages.some(
        (message: { body: string; type: string }) =>
          message.body === "LINE image message" && message.type === "image",
      ),
    ).toBeTruthy();
    expect(
      detail.messages.some(
        (message: {
          audioDurationMs?: number | null;
          audioUrl?: string | null;
          body: string;
          type: string;
        }) =>
          message.body === "LINE audio message" &&
          message.type === "audio" &&
          message.audioDurationMs === 4200 &&
          Boolean(message.audioUrl?.includes("/api/inbox/messages/")),
      ),
    ).toBeTruthy();
    expect(
      detail.messages.some(
        (message: { body: string; imageUrl?: string | null; type: string }) =>
          message.body === "LINE sticker" &&
          message.type === "sticker" &&
          Boolean(message.imageUrl?.includes("/sticker/52002734/")),
      ),
    ).toBeTruthy();
  });

  test("handles follow and unfollow events for a real LINE user profile", async ({
    page,
    request,
  }) => {
    const uniqueToken = `Ulinefollow${Date.now()}`;
    const followPayload = {
      destination: "test-destination",
      events: [
        {
          mode: "active",
          source: {
            type: "user",
            userId: uniqueToken,
          },
          timestamp: Date.now(),
          type: "follow",
          webhookEventId: `line-follow-${uniqueToken}`,
        },
      ],
    };

    const followResponse = await postLineWebhook(request, followPayload);
    expect(followResponse.status()).toBe(200);

    await login(page);

    const conversationsResponse = await page.request.get("/api/inbox/conversations");
    expect(conversationsResponse.status()).toBe(200);
    const conversations = (await conversationsResponse.json()) as {
      conversations: Array<{ customerName: string; id: string }>;
    };
    const createdConversation = conversations.conversations.find(
      (conversation) => conversation.customerName === `LINE User ${uniqueToken.slice(-4)}`,
    );

    expect(createdConversation).toBeTruthy();

    const unfollowPayload = {
      destination: "test-destination",
      events: [
        {
          mode: "active",
          source: {
            type: "user",
            userId: uniqueToken,
          },
          timestamp: Date.now() + 1000,
          type: "unfollow",
          webhookEventId: `line-unfollow-${uniqueToken}`,
        },
      ],
    };

    const unfollowResponse = await postLineWebhook(request, unfollowPayload);
    expect(unfollowResponse.status()).toBe(200);

    const detailResponse = await page.request.get(
      `/api/inbox/conversations/${createdConversation?.id}`,
    );
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();
    expect(detail.conversation.status).toBe("resolved");
  });

  test("sends LINE replies from the inbox through the provider adapter", async ({
    page,
  }) => {
    const uniqueToken = Date.now().toString();
    const replyBody = `LINE outbound reply ${uniqueToken}`;

    await login(page);

    const connectResponse = await page.request.post("/api/integrations/line/connect", {
      data: {
        accountId: "line-main",
      },
    });
    expect(connectResponse.status()).toBe(200);

    const sendResponse = await page.request.post(
      "/api/inbox/conversations/conv-line-001/messages",
      {
        data: {
          body: replyBody,
        },
      },
    );
    expect(sendResponse.status()).toBe(201);
    await expect(sendResponse.json()).resolves.toMatchObject({
      message: {
        body: replyBody,
        direction: "outbound",
      },
    });

    await page.goto("/inbox");
    await page.getByTestId("conversation-item-conv-line-001").click();
    await expect(page.getByTestId("message-thread")).toContainText(replyBody);
  });
});
