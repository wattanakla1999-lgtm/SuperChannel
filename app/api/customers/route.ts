import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { listCustomersFromDatabase } from "@/server/services/customers";

const allowedChannels = new Set(["Facebook", "Instagram", "LINE", "Telegram"]);
const allowedStatuses = new Set(["open", "pending", "resolved"]);

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "8");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");

  const result = await listCustomersFromDatabase(session, {
    assignedAgent: searchParams.get("assignedAgent") ?? undefined,
    channel:
      channel && allowedChannels.has(channel)
        ? (channel as "Facebook" | "Instagram" | "LINE" | "Telegram")
        : undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize:
      Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 20 ? pageSize : 8,
    search: searchParams.get("search") ?? undefined,
    status:
      status && allowedStatuses.has(status)
        ? (status as "open" | "pending" | "resolved")
        : undefined,
    tag: searchParams.get("tag") ?? undefined,
  });

  return NextResponse.json(result);
}
