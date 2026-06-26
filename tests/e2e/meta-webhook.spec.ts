import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { createHmac } from "node:crypto";

const metaAppSecret = process.env.META_APP_SECRET ?? "test-meta-app-secret";
const metaVerifyToken = process.env.META_VERIFY_TOKEN ?? "test-meta-verify-token";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@superchannel.local");
  await page.getByLabel("Password").fill("SuperChannel123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

function signMetaPayload(rawBody: string) {
  return "sha256=" + createHmac("sha256", metaAppSecret).update(rawBody, "utf8").digest("hex");
}

async function postMetaWebhook(
  request: APIRequestContext,
  payload: Record<string, unknown>,
  options?: { invalidSignature?: boolean },
) {
  const rawBody = JSON.stringify(payload);
  return request.post("/api/webhooks/meta", {
    data: rawBody,
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": options?.invalidSignature ? "sha256=invalid-signature" : signMetaPayload(rawBody),
    },
  });
}

test.describe("meta webhook", () => {
  test("rejects GET verification on token mismatch", async ({ request }) => {
    const response = await request.get("/api/webhooks/meta", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong-token",
        "hub.challenge": "12345",
      },
    });

    expect(response.status()).toBe(403);
  });

  test("approves GET verification on valid token", async ({ request }) => {
    const response = await request.get("/api/webhooks/meta", {
      params: {
        "hub.mode": "subscribe",
        "hub.verify_token": metaVerifyToken,
        "hub.challenge": "12345_challenge_response",
      },
    });

    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toBe("12345_challenge_response");
  });

  test("rejects invalid signature POST request", async ({ request }) => {
    const response = await postMetaWebhook(
      request,
      {
        object: "page",
        entry: [],
      },
      { invalidSignature: true },
    );

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "INVALID_SIGNATURE",
    });
  });

  test("persists valid text and image Facebook messages idempotently", async ({
    page,
    request,
  }) => {
    const uniqueToken = Date.now().toString();
    const fbTextBody = `Facebook Page text ${uniqueToken}`;
    const fbPayload = {
      object: "page",
      entry: [
        {
          id: "fb-main",
          time: Date.now(),
          messaging: [
            {
              sender: {
                id: "U_fb_user_123",
              },
              recipient: {
                id: "fb-main",
              },
              timestamp: Date.now(),
              message: {
                mid: `mid-fb-text-${uniqueToken}`,
                text: fbTextBody,
              },
            },
          ],
        },
      ],
    };

    // First delivery
    const firstResponse = await postMetaWebhook(request, fbPayload);
    expect(firstResponse.status()).toBe(200);
    await expect(firstResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    // Duplicate delivery
    const secondResponse = await postMetaWebhook(request, fbPayload);
    expect(secondResponse.status()).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      duplicates: 1,
      processed: 0,
    });

    // Image delivery
    const imagePayload = {
      object: "page",
      entry: [
        {
          id: "fb-main",
          time: Date.now() + 100,
          messaging: [
            {
              sender: {
                id: "U_fb_user_123",
              },
              recipient: {
                id: "fb-main",
              },
              timestamp: Date.now() + 100,
              message: {
                mid: `mid-fb-img-${uniqueToken}`,
                attachments: [
                  {
                    type: "image",
                    payload: {
                      url: "https://example.invalid/fb/image.jpg",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const imageResponse = await postMetaWebhook(request, imagePayload);
    expect(imageResponse.status()).toBe(200);
    await expect(imageResponse.json()).resolves.toMatchObject({
      duplicates: 0,
      processed: 1,
    });

    // Login and verify conversation shows up in Unified Inbox
    await login(page);

    // Let's load the active conversations list
    const conversationsResponse = await page.request.get("/api/inbox/conversations");
    expect(conversationsResponse.status()).toBe(200);
    const conversations = (await conversationsResponse.json()) as {
      conversations: Array<{ customerName: string; id: string; channel: string }>;
    };

    // Check we have a conversation with this customer
    const createdConversation = conversations.conversations.find(
      (c) => c.customerName === "Marco Rivera" && c.channel === "Facebook",
    );
    expect(createdConversation).toBeDefined();

    const detailUrl = `/api/inbox/conversations/${createdConversation!.id}`;
    const detailResponse = await page.request.get(detailUrl);
    expect(detailResponse.status()).toBe(200);
    const detail = await detailResponse.json();

    const matchingBody = detail.messages.filter(
      (m: { body: string }) => m.body === fbTextBody,
    );
    expect(matchingBody).toHaveLength(1);

    expect(
      detail.messages.some(
        (m: { body: string; type: string }) =>
          m.body === "Sent an image" && m.type === "image",
      ),
    ).toBeTruthy();
  });
});
