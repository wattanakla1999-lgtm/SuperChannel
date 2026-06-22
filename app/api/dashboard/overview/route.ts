import { NextResponse } from "next/server";
import type { DashboardQuery } from "@/features/dashboard/types/dashboard";
import { getMockSession } from "@/server/auth/mock-session";
import { buildMockDashboardSnapshot } from "@/server/dashboard/mock-dashboard-data";

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
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 220));
    const snapshot = buildMockDashboardSnapshot(session, getDashboardQuery(request));

    return NextResponse.json({ overview: snapshot.overview });
  } catch (error) {
    if (error instanceof Error && error.name === "FORBIDDEN") {
      return NextResponse.json(
        { code: "FORBIDDEN", message: error.message },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { code: "INTERNAL_ERROR", message: "Unable to load dashboard overview." },
      { status: 500 },
    );
  }
}
