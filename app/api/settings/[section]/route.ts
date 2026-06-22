import { NextResponse } from "next/server";
import type {
  BusinessHoursInput,
  InboxPreferencesInput,
  NotificationsInput,
  WorkspaceProfileInput,
} from "@/features/settings/types/settings";
import { getAuthenticatedSession } from "@/server/auth/session";
import { unauthorizedResponse } from "@/server/http/responses";
import {
  updateBusinessHoursInDatabase,
  updateInboxPreferencesInDatabase,
  updateNotificationsInDatabase,
  updateWorkspaceProfileInDatabase,
} from "@/server/services/settings";

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
  const session = await getAuthenticatedSession();

  if (!session) {
    return unauthorizedResponse();
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

  try {
    switch (section) {
      case "workspace-profile":
        return NextResponse.json(await updateWorkspaceProfileInDatabase(session, body as WorkspaceProfileInput));
      case "business-hours":
        return NextResponse.json(await updateBusinessHoursInDatabase(session, body as BusinessHoursInput));
      case "inbox-preferences":
        return NextResponse.json(await updateInboxPreferencesInDatabase(session, body as InboxPreferencesInput));
      case "notifications":
        return NextResponse.json(await updateNotificationsInDatabase(session, body as NotificationsInput));
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
