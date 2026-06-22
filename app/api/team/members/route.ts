import { NextResponse } from "next/server";
import { getMockAssignmentMetrics } from "@/server/customers/mock-customer-data";
import { getMockSession } from "@/server/auth/mock-session";
import { buildMockTeamList } from "@/server/team/mock-team-data";
import type { TeamAccountStatus, TeamPresence, TeamRole } from "@/features/team/types/team";

const roles = new Set(["Owner", "Admin", "Supervisor", "Agent"]);
const onlineStatuses = new Set(["online", "away", "offline"]);
const accountStatuses = new Set(["active", "inactive"]);

export async function GET(request: Request) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "8");
  const role = searchParams.get("role");
  const onlineStatus = searchParams.get("onlineStatus");
  const accountStatus = searchParams.get("accountStatus");

  await new Promise((resolve) => setTimeout(resolve, 220));

  return NextResponse.json(
    buildMockTeamList(
      session.id,
      session.accountId,
      session.user.role as TeamRole,
      {
        accountStatus:
          accountStatus && accountStatuses.has(accountStatus)
            ? (accountStatus as TeamAccountStatus)
            : "all",
        onlineStatus:
          onlineStatus && onlineStatuses.has(onlineStatus)
            ? (onlineStatus as TeamPresence)
            : "all",
        page: Number.isFinite(page) && page > 0 ? page : 1,
        pageSize:
          Number.isFinite(pageSize) && pageSize > 0 && pageSize <= 20
            ? pageSize
            : 8,
        role: role && roles.has(role) ? (role as TeamRole) : "all",
        search: searchParams.get("search") ?? undefined,
        team: searchParams.get("team") ?? undefined,
      },
      getMockAssignmentMetrics(session.id),
    ),
  );
}
