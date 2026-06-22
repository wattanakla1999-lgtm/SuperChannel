import { NextResponse } from "next/server";
import { getMockSession } from "@/server/auth/mock-session";
import { inviteMockTeamMember } from "@/server/team/mock-team-data";
import type { TeamRole } from "@/features/team/types/team";

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
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
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

  await new Promise((resolve) => setTimeout(resolve, 260));

  try {
    const invitation = inviteMockTeamMember(
      session.id,
      session.accountId,
      session.user.role as TeamRole,
      {
        email: body.email.trim(),
        role: body.role as TeamRole,
        team: body.team.trim(),
      },
    );

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
