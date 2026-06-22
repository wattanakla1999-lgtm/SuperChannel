import "server-only";

import { prisma } from "@/server/database/prisma";

export function listPublishingPosts(organizationId: string) {
  return prisma.publishingPost.findMany({
    include: {
      authorMember: {
        include: {
          profile: true,
        },
      },
      targets: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    where: { organizationId },
  });
}
