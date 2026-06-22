import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/server/auth/session";
import type { TeamRole } from "@/features/team/types/team";
import { unauthorizedResponse } from "@/server/http/responses";
import { inviteTeamMemberInDatabase } from "@/server/services/team";

type InvitationBody = {
  email?: unknown;
  role?: unknown;
  team?: unknown;
};

const roles = new Set(["Owner", "Admin", "Supervisor", "Agent"]);

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to process invitation." },
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

export async function POST(request: Request) {
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as InvitationBody | null;

  if (
    !body ||
    typeof body.email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim()) ||
    typeof body.role !== "string" ||
    !roles.has(body.role) ||
    typeof body.team !== "string" ||
    !body.team.trim()
  ) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Enter a valid email, role, and team." },
      { status: 400 },
    );
  }

  try {
    const invitation = await inviteTeamMemberInDatabase(session, {
      email: body.email.trim(),
      role: body.role as TeamRole,
      team: body.team.trim(),
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
