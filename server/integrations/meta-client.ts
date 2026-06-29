import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type MetaProfile = {
  id: string;
  name: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  pictureUrl?: string;
};

const metaProfileCache = new Map<string, { expiresAt: number; profile: MetaProfile }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getMetaConfig() {
  const apiBaseUrl = process.env.META_API_BASE_URL ?? "https://graph.facebook.com";
  const appSecret = process.env.META_APP_SECRET ?? "test-meta-app-secret";
  const verifyToken = process.env.META_VERIFY_TOKEN ?? "test-meta-verify-token";

  return {
    apiBaseUrl,
    appSecret,
    verifyToken,
  };
}

function isMockMode(apiBaseUrl: string, accessToken?: string): boolean {
  return (
    apiBaseUrl.startsWith("mock://") ||
    process.env.NODE_ENV === "test" ||
    process.env.PLAYWRIGHT_TEST === "true" ||
    (accessToken != null && accessToken.startsWith("mock-"))
  );
}

function isMockProfileId(psid: string) {
  return psid.startsWith("fb-psid-") || psid.startsWith("ig-psid-");
}

export function verifyMetaSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const { appSecret } = getMetaConfig();
  const signatureHash = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  
  const expectedHash = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const provided = Buffer.from(signatureHash, "utf8");
  const actual = Buffer.from(expectedHash, "utf8");

  return provided.length === actual.length && timingSafeEqual(provided, actual);
}

function isMetaPermissionError(response: Response, errorText: string) {
  return (
    response.status === 401 ||
    response.status === 403 ||
    errorText.includes('"code":190') ||
    errorText.includes("pages_messaging") ||
    errorText.includes("pages_manage_metadata") ||
    errorText.includes("permission(s) must be granted")
  );
}

function createMetaApiError(
  response: Response,
  errorText: string,
  action: "load profile" | "send message",
) {
  if (isMetaPermissionError(response, errorText)) {
    const error = new Error(
      `Facebook Page access token cannot ${action}. Reconnect Facebook with pages_messaging and pages_manage_metadata permissions, then try again.`,
    );
    error.name = "FORBIDDEN";
    return error;
  }

  const error = new Error(`Meta API error: ${errorText || response.statusText}`);
  error.name = "BAD_GATEWAY";
  return error;
}

export async function fetchMetaProfile(
  psid: string,
  channel: "facebook" | "instagram",
  accessToken: string,
): Promise<MetaProfile> {
  const cached = metaProfileCache.get(psid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.profile;
  }

  const { apiBaseUrl } = getMetaConfig();

  if (isMockMode(apiBaseUrl, accessToken) || isMockProfileId(psid)) {
    const profile: MetaProfile = channel === "facebook"
      ? {
          id: psid,
          name: "Marco Rivera",
          firstName: "Marco",
          lastName: "Rivera",
          pictureUrl: "https://example.invalid/fb/marco.jpg",
        }
      : {
          id: psid,
          name: "Aya Lim",
          username: "aya_lim",
          pictureUrl: "https://example.invalid/ig/aya.jpg",
        };
    
    metaProfileCache.set(psid, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      profile,
    });
    return profile;
  }

  const fields = channel === "facebook"
    ? "first_name,last_name,profile_pic"
    : "username,name,profile_pic";

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v19.0/${psid}?fields=${fields}&access_token=${accessToken}`;
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw createMetaApiError(response, errorText, "load profile");
  }

  const data = await response.json();
  const profile: MetaProfile = channel === "facebook"
    ? {
        id: psid,
        name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || `Facebook User ${psid.slice(-4)}`,
        firstName: data.first_name,
        lastName: data.last_name,
        pictureUrl: data.profile_pic,
      }
    : {
        id: psid,
        name: data.name || data.username || `Instagram User ${psid.slice(-4)}`,
        username: data.username,
        pictureUrl: data.profile_pic,
      };

  metaProfileCache.set(psid, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    profile,
  });
  return profile;
}

export async function sendMetaTextMessage(
  psid: string,
  channel: "facebook" | "instagram",
  text: string,
  accessToken: string,
): Promise<{ messageId: string }> {
  const { apiBaseUrl } = getMetaConfig();

  if (isMockMode(apiBaseUrl, accessToken)) {
    return { messageId: `mock-meta-msg-${Date.now()}` };
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v19.0/me/messages?access_token=${accessToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw createMetaApiError(response, errorText, "send message");
  }

  const data = await response.json();
  return { messageId: data.message_id || `meta-msg-${Date.now()}` };
}

export async function sendMetaImageMessage(
  psid: string,
  channel: "facebook" | "instagram",
  imageUrl: string,
  accessToken: string,
): Promise<{ messageId: string }> {
  const { apiBaseUrl } = getMetaConfig();

  if (isMockMode(apiBaseUrl, accessToken)) {
    return { messageId: `mock-meta-msg-${Date.now()}` };
  }

  const url = `${apiBaseUrl.replace(/\/$/, "")}/v19.0/me/messages?access_token=${accessToken}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipient: { id: psid },
      message: {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw createMetaApiError(response, errorText, "send message");
  }

  const data = await response.json();
  return { messageId: data.message_id || `meta-msg-${Date.now()}` };
}
