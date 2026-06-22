import "server-only";

import { prisma } from "@/server/database/prisma";

export function getWorkspaceSettings(organizationId: string) {
  return prisma.workspaceSettings.findUnique({
    where: { organizationId },
  });
}

export function listSavedReplies(organizationId: string, search?: string) {
  return prisma.savedReply.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    where: {
      organizationId,
      OR: search
        ? [
            { category: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
            { shortcut: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
  });
}
