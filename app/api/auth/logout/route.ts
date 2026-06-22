import { NextResponse } from "next/server";
import { clearMockSession } from "@/server/auth/mock-session";

export async function POST() {
  await clearMockSession();
  return NextResponse.json({ success: true });
}
