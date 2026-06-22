import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/server/env";

type LineProfile = {
  displayName: string;
  language?: string;
  pictureUrl?: string;
  statusMessage?: string;
  userId: string;
};

type LinePushResult = {
  requestId: string | null;
};

const LINE_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const lineProfileCache = new Map<string, { expiresAt: number; profile: LineProfile }>();

type LineContentResult = {
  body: Uint8Array;
  contentType: string;
};

function getLineConfig() {
  if (!serverEnv.lineChannelSecret || !serverEnv.lineChannelAccessToken) {
    const error = new Error("LINE integration is not configured on this server.");
    error.name = "SERVICE_UNAVAILABLE";
    throw error;
  }

  return {
    apiBaseUrl: serverEnv.lineApiBaseUrl ?? "https://api.line.me",
    channelAccessToken: serverEnv.lineChannelAccessToken,
    channelSecret: serverEnv.lineChannelSecret,
  };
}

function hasLineMockBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.startsWith("mock://");
}

function getLineContentBaseUrl(apiBaseUrl: string) {
  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return apiBaseUrl;
  }

  return "https://api-data.line.me";
}

async function parseLineResponse(response: Response) {
  if (response.ok) {
    return null;
  }

  const text = await response.text().catch(() => "");
  const error = new Error(
    text || "LINE API request failed.",
  );
  error.name = response.status === 401 || response.status === 403 ? "FORBIDDEN" : "BAD_GATEWAY";
  throw error;
}

export function verifyLineSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    return false;
  }

  const { channelSecret } = getLineConfig();
  const expected = createHmac("sha256", channelSecret).update(rawBody, "utf8").digest("base64");
  const provided = Buffer.from(signature, "utf8");
  const actual = Buffer.from(expected, "utf8");

  return provided.length === actual.length && timingSafeEqual(provided, actual);
}

export async function fetchLineProfile(userId: string): Promise<LineProfile> {
  const cachedProfile = lineProfileCache.get(userId);
  if (cachedProfile && cachedProfile.expiresAt > Date.now()) {
    return cachedProfile.profile;
  }

  const { apiBaseUrl, channelAccessToken } = getLineConfig();

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    const profile = {
      displayName: `LINE User ${userId.slice(-4)}`,
      language: "en",
      pictureUrl: `https://example.invalid/line/${userId}`,
      statusMessage: "Mock LINE profile",
      userId,
    };
    lineProfileCache.set(userId, {
      expiresAt: Date.now() + LINE_PROFILE_CACHE_TTL_MS,
      profile,
    });
    return profile;
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/profile/${encodeURIComponent(userId)}`,
    {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
      method: "GET",
    },
  );

  await parseLineResponse(response);
  const profile = await response.json() as LineProfile;
  lineProfileCache.set(userId, {
    expiresAt: Date.now() + LINE_PROFILE_CACHE_TTL_MS,
    profile,
  });
  return profile;
}

export async function pushLineTextMessage(userId: string, text: string): Promise<LinePushResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig();

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return {
      requestId: `mock-line-request-${Date.now()}`,
    };
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/message/push`,
    {
      body: JSON.stringify({
        messages: [{ text, type: "text" }],
        to: userId,
      }),
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  await parseLineResponse(response);

  return {
    requestId: response.headers.get("x-line-request-id"),
  };
}

export async function pushLineImageMessage(
  userId: string,
  originalContentUrl: string,
  previewImageUrl: string,
): Promise<LinePushResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig();

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return {
      requestId: `mock-line-request-${Date.now()}`,
    };
  }

  const response = await fetch(
    `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/message/push`,
    {
      body: JSON.stringify({
        messages: [
          {
            originalContentUrl,
            previewImageUrl,
            type: "image",
          },
        ],
        to: userId,
      }),
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  await parseLineResponse(response);

  return {
    requestId: response.headers.get("x-line-request-id"),
  };
}

export async function fetchLineMessageContent(messageId: string): Promise<LineContentResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig();
  const contentBaseUrl = getLineContentBaseUrl(apiBaseUrl);

  if (hasLineMockBaseUrl(contentBaseUrl)) {
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn4x0gAAAAASUVORK5CYII=";

    return {
      body: Buffer.from(tinyPngBase64, "base64"),
      contentType: "image/png",
    };
  }

  const response = await fetch(
    `${contentBaseUrl.replace(/\/$/, "")}/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
      method: "GET",
    },
  );

  await parseLineResponse(response);

  return {
    body: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "image/jpeg",
  };
}
