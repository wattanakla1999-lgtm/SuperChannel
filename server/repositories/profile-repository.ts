import "server-only";

import { prisma } from "@/server/database/prisma";

export function getProfileByEmail(email: string) {
  return prisma.profile.findFirst({
    where: {
      email: {
        equals: email.trim().toLowerCase(),
        mode: "insensitive",
      },
    },
  });
}

export function getProfileByUserId(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
  });
}

export function linkProfileToAuthUser(profileId: string, userId: string) {
  return prisma.profile.update({
    data: { userId },
    where: { id: profileId },
  });
}
