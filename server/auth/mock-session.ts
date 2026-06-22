import "server-only";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { AuthenticatedUser } from "@/features/login/types/auth";
import { getDefaultMockUser, getMockUserById } from "./mock-auth";

const SESSION_COOKIE_NAME = "superchannel_mock_session";
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

export async function createMockSession(
  rememberMe: boolean,
  accountId: string,
) {
  const cookieStore = await cookies();
  const sessionId = randomUUID();

  cookieStore.set({
    httpOnly: true,
    maxAge: rememberMe ? REMEMBER_ME_MAX_AGE : undefined,
    name: SESSION_COOKIE_NAME,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    value: `${sessionId}:${accountId}`,
  });
}

export async function clearMockSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getMockSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  const [sessionId, accountId] = sessionCookie.value.split(":");
  const user: AuthenticatedUser = accountId
    ? getMockUserById(accountId) ?? getDefaultMockUser()
    : getDefaultMockUser();

  return {
    accountId: user.id,
    id: sessionId || sessionCookie.value,
    user,
  };
}
