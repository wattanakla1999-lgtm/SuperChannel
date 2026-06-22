import { NextResponse } from "next/server";
import type { TeamAccountStatus, TeamPresence, TeamRole } from "@/features/team/types/team";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { buildTeamListFromDatabase } from "@/server/services/team";

const roles = new Set(["Owner", "Admin", "Supervisor", "Agent"]);
const onlineStatuses = new Set(["online", "away", "offline"]);
const accountStatuses = new Set(["active", "inactive"]);

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "8");
  const role = searchParams.get("role");
  const onlineStatus = searchParams.get("onlineStatus");
  const accountStatus = searchParams.get("accountStatus");

  return NextResponse.json(
    await buildTeamListFromDatabase(
      session,
      {
        accountStatus:
          accountStatus && accountStatuses.has(accountStatus)
            ? (accountStatus as Exclude<TeamAccountStatus, "invited">)
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
    ),
  );
}
