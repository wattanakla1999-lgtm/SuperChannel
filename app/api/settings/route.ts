import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { getMockSettings } from "@/server/settings/mock-settings-data";

export async function GET() {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 220));

  return NextResponse.json(getMockSettings(session.id, session.user));
}
