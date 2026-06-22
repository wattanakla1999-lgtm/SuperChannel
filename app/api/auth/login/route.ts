import { NextResponse } from "next/server";
import { authenticateMockUser } from "@/server/auth/mock-auth";
import { createMockSession } from "@/server/auth/mock-session";

type LoginRequestBody = {
  email?: unknown;
  password?: unknown;
  rememberMe?: unknown;
};

function isLoginRequestBody(body: LoginRequestBody | null): body is {
  email: string;
  password: string;
  rememberMe: boolean;
} {
  return Boolean(
    body &&
      typeof body.email === "string" &&
      typeof body.password === "string" &&
      typeof body.rememberMe === "boolean",
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;

  if (!isLoginRequestBody(body)) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid request payload" },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 450));

  const user = authenticateMockUser({
    email: body.email,
    password: body.password,
  });

  if (!user) {
    return NextResponse.json(
      {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
      { status: 401 },
    );
  }

  await createMockSession(body.rememberMe, user.id);

  return NextResponse.json({ user });
}
