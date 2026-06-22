import { NextResponse } from "next/server";
import { isAppLocale, localeCookieName } from "@/i18n/config";
import { getAuthenticatedSession } from "@/server/auth/session";
import { updateLocalePreferenceInDatabase } from "@/server/services/settings";

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as { locale?: unknown } | null;

  if (!body || !isAppLocale(body.locale)) {
    return NextResponse.json(
      { code: "UNSUPPORTED_LOCALE", message: "Unsupported locale." },
      { status: 400 },
    );
  }

  const session = await getAuthenticatedSession();

  if (session) {
    await updateLocalePreferenceInDatabase(session, body.locale);
  }

  const response = NextResponse.json({ locale: body.locale });
  response.cookies.set({
    name: localeCookieName,
    value: body.locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
