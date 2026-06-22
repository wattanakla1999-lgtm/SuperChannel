import { NextResponse } from "next/server";
import { listMockConversations } from "@/server/inbox/mock-inbox-data";
import { getMockSession } from "@/server/auth/mock-session";

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

  await new Promise((resolve) => setTimeout(resolve, 200));

  const conversations = await listMockConversations(session.id);

  return NextResponse.json({ conversations });
}
