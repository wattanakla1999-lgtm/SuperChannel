import { NextResponse } from "next/server";
import { getMockAssignmentMetrics } from "@/server/customers/mock-customer-data";
import { getMockSession } from "@/server/auth/mock-session";
import {
  removeMockTeamMember,
  updateMockTeamMember,
} from "@/server/team/mock-team-data";
import type { TeamRole } from "@/features/team/types/team";

type RouteContext = {
  params: Promise<{
    memberId: string;
  }>;
};

type UpdateBody = {
  accountStatus?: unknown;
  role?: unknown;
  team?: unknown;
  workloadLimit?: unknown;
};

const roles = new Set(["Owner", "Admin", "Supervisor", "Agent"]);
const accountStatuses = new Set(["active", "inactive"]);

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to update member." },
      { status: 500 },
    );
  }

  if (error.name === "FORBIDDEN") {
    return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
  }

  if (error.name === "CONFLICT") {
    return NextResponse.json({ code: "CONFLICT", message: error.message }, { status: 409 });
  }

  return NextResponse.json({ code: "INVALID_REQUEST", message: error.message }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as UpdateBody | null;

  if (
    !body ||
    (body.role !== undefined &&
      (typeof body.role !== "string" || !roles.has(body.role))) ||
    (body.accountStatus !== undefined &&
      (typeof body.accountStatus !== "string" ||
        !accountStatuses.has(body.accountStatus))) ||
    (body.team !== undefined &&
      (typeof body.team !== "string" || !body.team.trim())) ||
    (body.workloadLimit !== undefined &&
      (typeof body.workloadLimit !== "number" || !Number.isFinite(body.workloadLimit)))
  ) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid member update payload." },
      { status: 400 },
    );
  }

  const { memberId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 240));

  try {
    const member = updateMockTeamMember(
      session.id,
      session.accountId,
      session.user.role as TeamRole,
      memberId,
      {
        accountStatus: body.accountStatus as "active" | "inactive" | undefined,
        role: body.role as TeamRole | undefined,
        team: body.team as string | undefined,
        workloadLimit: body.workloadLimit as number | undefined,
      },
    );
    const metrics = getMockAssignmentMetrics(session.id).get(member.name) ?? {
      activeConversationCount: 0,
      assignedConversationCount: 0,
    };

    return NextResponse.json({
      ...member,
      activeConversationCount: metrics.activeConversationCount,
      assignedConversationCount: metrics.assignedConversationCount,
      isCurrentUser: member.id === session.accountId,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }

  const { memberId } = await context.params;

  await new Promise((resolve) => setTimeout(resolve, 220));

  try {
    removeMockTeamMember(
      session.id,
      session.accountId,
      session.user.role as TeamRole,
      memberId,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
