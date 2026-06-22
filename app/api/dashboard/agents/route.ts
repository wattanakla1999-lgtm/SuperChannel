import { NextResponse } from "next/server";
import type { DashboardQuery } from "@/features/dashboard/types/dashboard";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import { buildDashboardSnapshotFromDatabase } from "@/server/services/dashboard";

function getDashboardQuery(request: Request): DashboardQuery {
  const { searchParams } = new URL(request.url);

  return {
    agent: searchParams.get("agent") ?? undefined,
    channel: (searchParams.get("channel") as DashboardQuery["channel"]) ?? undefined,
    dateRange: (searchParams.get("dateRange") as DashboardQuery["dateRange"]) ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    team: searchParams.get("team") ?? undefined,
  };
}

export async function GET(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const snapshot = await buildDashboardSnapshotFromDatabase(session, getDashboardQuery(request));

    return NextResponse.json({ agents: snapshot.agents });
  } catch (error) {
    if (error instanceof Error && error.name === "FORBIDDEN") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Unable to load agent performance." },
      { status: 500 },
    );
  }
}
