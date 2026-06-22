import { NextResponse } from "next/server";
import type {
  BusinessHoursInput,
  InboxPreferencesInput,
  NotificationsInput,
  WorkspaceProfileInput,
} from "@/features/settings/types/settings";
import { getMockSession } from "@/server/auth/mock-session";
import {
  updateMockBusinessHours,
  updateMockInboxPreferences,
  updateMockNotifications,
  updateMockWorkspaceProfile,
} from "@/server/settings/mock-settings-data";

type RouteContext = {
  params: Promise<{ section: string }>;
};

function toErrorResponse(error: unknown) {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { code: "UNKNOWN", message: "Unable to update settings." },
      { status: 500 },
    );
  }

  if (error.name === "FORBIDDEN") {
    return NextResponse.json({ code: "FORBIDDEN", message: error.message }, { status: 403 });
  }

  return NextResponse.json({ code: "INVALID_REQUEST", message: error.message }, { status: 400 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getMockSession();

  if (!session) {
    return NextResponse.json(
      {
        code: "UNAUTHORIZED",
        message: "Your session has expired. Please sign in again.",
      },
      { status: 401 },
    );
  }

  const { section } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | WorkspaceProfileInput
    | BusinessHoursInput
    | InboxPreferencesInput
    | NotificationsInput
    | null;

  if (!body) {
    return NextResponse.json(
      { code: "INVALID_REQUEST", message: "Invalid settings payload." },
      { status: 400 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 240));

  try {
    switch (section) {
      case "workspace-profile":
        return NextResponse.json(updateMockWorkspaceProfile(session.id, session.user, body as WorkspaceProfileInput));
      case "business-hours":
        return NextResponse.json(updateMockBusinessHours(session.id, session.user, body as BusinessHoursInput));
      case "inbox-preferences":
        return NextResponse.json(updateMockInboxPreferences(session.id, session.user, body as InboxPreferencesInput));
      case "notifications":
        return NextResponse.json(updateMockNotifications(session.id, session.user, body as NotificationsInput));
      default:
        return NextResponse.json(
          { code: "NOT_FOUND", message: "Settings section not found." },
          { status: 404 },
        );
    }
  } catch (error) {
    return toErrorResponse(error);
  }
}
