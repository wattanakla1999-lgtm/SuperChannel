import "server-only";

import { serverEnv } from "@/server/env";
import { createHmac, timingSafeEqual } from "node:crypto";

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

function getLineConfig(override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string }) {
  const apiBaseUrl = override?.apiBaseUrl ?? serverEnv.lineApiBaseUrl ?? "https://api.line.me";
  const channelAccessToken = override?.channelAccessToken ?? serverEnv.lineChannelAccessToken;
  const channelSecret = override?.channelSecret ?? serverEnv.lineChannelSecret;

  if (!channelSecret || !channelAccessToken) {
    const error = new Error("LINE integration is not configured on this server.");
    error.name = "SERVICE_UNAVAILABLE";
    throw error;
  }

  return {
    apiBaseUrl,
    channelAccessToken,
    channelSecret,
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

export async function fetchLineProfile(userId: string, override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string }): Promise<LineProfile> {
  const cachedProfile = lineProfileCache.get(userId);
  if (cachedProfile && cachedProfile.expiresAt > Date.now()) {
    return cachedProfile.profile;
  }

  const { apiBaseUrl, channelAccessToken } = getLineConfig(override);

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

export async function pushLineTextMessage(userId: string, text: string, override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string }): Promise<LinePushResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig(override);

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return {
      requestId: `mock-line-request-${Date.now()}`,
    };
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/message/push`;
  const payload = {
    messages: [{ text, type: "text" }],
    to: userId,
  };

  console.info(`[LINE] pushText -> url=${url} to=${userId} payloadSize=${JSON.stringify(payload).length}`);

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  await parseLineResponse(response);

  const respText = await response.text().catch(() => "");
  console.info(`[LINE] pushText response status=${response.status} body=${respText?.slice(0, 1000)}`);

  return {
    requestId: response.headers.get("x-line-request-id"),
  };
}

export async function pushLineImageMessage(
  userId: string,
  originalContentUrl: string,
  previewImageUrl: string,
  override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string },
): Promise<LinePushResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig(override);

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return {
      requestId: `mock-line-request-${Date.now()}`,
    };
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/message/push`;
  const payload = {
    messages: [
      {
        originalContentUrl,
        previewImageUrl,
        type: "image",
      },
    ],
    to: userId,
  };

  console.info(`[LINE] pushImage -> url=${url} to=${userId} payloadSize=${JSON.stringify(payload).length}`);

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${channelAccessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  await parseLineResponse(response);

  const respText = await response.text().catch(() => "");
  console.info(`[LINE] pushImage response status=${response.status} body=${respText?.slice(0, 1000)}`);

  return {
    requestId: response.headers.get("x-line-request-id"),
  };
}

export async function pushLineMulticastMessage(
  userIds: string[],
  messages: Record<string, unknown>[],
  retryKey?: string,
  override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string },
): Promise<LinePushResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig(override);

  if (hasLineMockBaseUrl(apiBaseUrl)) {
    return {
      requestId: `mock-line-request-${Date.now()}`,
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${channelAccessToken}`,
    "Content-Type": "application/json",
  };

  if (retryKey) {
    headers["X-Line-Retry-Key"] = retryKey;
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v2/bot/message/multicast`;
  const payload = { messages, to: userIds };

  console.info(`[LINE] multicast -> url=${url} recipients=${userIds.length} sample=${userIds.slice(0,5).join(",")} retryKey=${retryKey ? 'present' : 'none'} payloadSize=${JSON.stringify(payload).length}`);

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers,
    method: "POST",
  });

  await parseLineResponse(response);

  const respText = await response.text().catch(() => "");
  console.info(`[LINE] multicast response status=${response.status} body=${respText?.slice(0, 2000)}`);

  return {
    requestId: response.headers.get("x-line-request-id"),
  };
}

export async function fetchLineMessageContent(messageId: string, override?: { apiBaseUrl?: string; channelAccessToken?: string; channelSecret?: string }): Promise<LineContentResult> {
  const { apiBaseUrl, channelAccessToken } = getLineConfig(override);
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
