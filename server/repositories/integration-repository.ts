import "server-only";

import { prisma } from "@/server/database/prisma";

export function listIntegrations(organizationId: string) {
  return prisma.integration.findMany({
    orderBy: {
      provider: "asc",
    },
    where: { organizationId },
  });
}

export function getIntegrationCredentials(organizationId: string, integrationId: string) {
  return prisma.integrationCredential.findFirst({
    where: {
      integrationId,
      organizationId,
    },
  });
}
