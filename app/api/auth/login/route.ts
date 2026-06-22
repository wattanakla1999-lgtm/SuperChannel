import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/supabase/server";

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

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    return NextResponse.json(
      {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      },
      { status: 401 },
    );
  }

  const session = await getAuthenticatedSession();

  if (!session) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        code: "FORBIDDEN",
        message: "Your account is not linked to an active workspace membership.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({ user: session.user });
}
