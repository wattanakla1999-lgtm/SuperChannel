import "server-only";

import type { AuthenticatedSession } from "@/server/auth/session";

export function isOwnerOrAdmin(session: AuthenticatedSession) {
  return session.user.role === "Owner" || session.user.role === "Admin";
}

export function isWorkspaceManager(session: AuthenticatedSession) {
  return (
    session.user.role === "Owner" ||
    session.user.role === "Admin" ||
    session.user.role === "Supervisor"
  );
}
