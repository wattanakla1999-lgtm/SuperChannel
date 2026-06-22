import "server-only";

import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/server/database/prisma";

export function getActiveMembershipByProfileId(profileId: string, organizationId: string) {
  return prisma.member.findFirst({
    include: {
      organization: true,
      profile: true,
    },
    where: {
      organizationId,
      profileId,
      status: "ACTIVE",
    },
  });
}

export function listOrganizationMembers(organizationId: string) {
  return prisma.member.findMany({
    include: {
      profile: true,
    },
    orderBy: {
      profile: {
        fullName: "asc",
      },
    },
    where: { organizationId },
  });
}

export function listManageableMembers(organizationId: string) {
  return prisma.member.findMany({
    include: {
      profile: true,
    },
    orderBy: {
      profile: {
        fullName: "asc",
      },
    },
    where: {
      organizationId,
      role: {
        in: [WorkspaceRole.SUPERVISOR, WorkspaceRole.AGENT],
      },
      status: "ACTIVE",
    },
  });
}

export function listOrganizationInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    include: {
      invitedByMember: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    where: { organizationId },
  });
}
