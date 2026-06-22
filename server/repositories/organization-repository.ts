import "server-only";

import { prisma } from "@/server/database/prisma";

export function getOrganizationById(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
  });
}

export function getWorkspaceSettingsByOrganizationId(organizationId: string) {
  return prisma.workspaceSettings.findUnique({
    where: { organizationId },
  });
}
