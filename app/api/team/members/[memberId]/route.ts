import { NextResponse } from "next/server";
import type { TeamRole } from "@/features/team/types/team";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import {
  removeTeamMemberInDatabase,
  updateTeamMemberInDatabase,
} from "@/server/services/team";

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
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
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

  try {
    const member = await updateTeamMemberInDatabase(
      session,
      memberId,
      {
        accountStatus: body.accountStatus as "active" | "inactive" | undefined,
        role: body.role as TeamRole | undefined,
        team: body.team as string | undefined,
        workloadLimit: body.workloadLimit as number | undefined,
      },
    );

    if (!member) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Team member not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const { memberId } = await context.params;

  try {
    const removed = await removeTeamMemberInDatabase(session, memberId);

    if (!removed) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Team member not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
