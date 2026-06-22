import "server-only";

import type { MemberStatus, PresenceStatus, Prisma, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/server/database/prisma";
import type {
  TeamInvitationInput,
  TeamListResponse,
  TeamMemberUpdateInput,
  TeamRole,
} from "@/features/team/types/team";
import type { AuthenticatedSession } from "@/server/auth/session";
import { isOwnerOrAdmin } from "@/server/auth/roles";

function toRoleLabel(role: "OWNER" | "ADMIN" | "SUPERVISOR" | "AGENT") {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "SUPERVISOR":
      return "Supervisor";
    case "AGENT":
      return "Agent";
  }
}

function toRoleEnum(role: TeamRole) {
  return role.toUpperCase() as "OWNER" | "ADMIN" | "SUPERVISOR" | "AGENT";
}

function toMemberStatus(value: "active" | "inactive") {
  return value.toUpperCase() as Exclude<MemberStatus, "INVITED">;
}

function toPresenceStatus(value: TeamListResponse["filters"]["onlineStatuses"][number]) {
  return value.toUpperCase() as PresenceStatus;
}

function assertManageMembers(session: AuthenticatedSession) {
  if (!isOwnerOrAdmin(session)) {
    const error = new Error("Only Owners and Admins can manage team members.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

export async function buildTeamListFromDatabase(
  session: AuthenticatedSession,
  query: {
    accountStatus: "active" | "inactive" | "all";
    onlineStatus: "online" | "away" | "offline" | "all";
    page: number;
    pageSize: number;
    role: TeamRole | "all";
    search?: string;
    team?: string;
  },
): Promise<TeamListResponse> {
  const where: Prisma.MemberWhereInput = {
    organizationId: session.organizationId,
    status:
      query.accountStatus === "all"
        ? undefined
        : toMemberStatus(query.accountStatus),
    onlineStatus:
      query.onlineStatus === "all"
        ? undefined
        : toPresenceStatus(query.onlineStatus),
    role: query.role === "all" ? undefined : (toRoleEnum(query.role) as WorkspaceRole),
    team:
      query.team && query.team !== "all"
        ? query.team
        : undefined,
    profile: query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" as const } },
            { fullName: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : undefined,
  };

  const [members, totalItems, invitations, allMembers, conversations] = await Promise.all([
    prisma.member.findMany({
      include: { profile: true },
      orderBy: { profile: { fullName: "asc" } },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.member.count({ where }),
    prisma.invitation.findMany({
      include: {
        invitedByMember: { include: { profile: true } },
      },
      orderBy: { createdAt: "desc" },
      where: {
        organizationId: session.organizationId,
      },
    }),
    prisma.member.findMany({
      include: { profile: true },
      orderBy: { profile: { fullName: "asc" } },
      where: { organizationId: session.organizationId },
    }),
    prisma.conversation.findMany({
      include: {
        assignedMember: { include: { profile: true } },
      },
      where: {
        organizationId: session.organizationId,
      },
    }),
  ]);

  const counts = new Map<string, { activeConversationCount: number; assignedConversationCount: number }>();
  for (const conversation of conversations) {
    const key = conversation.assignedMember?.profile.fullName;
    if (!key) continue;
    const current = counts.get(key) ?? { activeConversationCount: 0, assignedConversationCount: 0 };
    current.assignedConversationCount += 1;
    if (conversation.status !== "RESOLVED") {
      current.activeConversationCount += 1;
    }
    counts.set(key, current);
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  return {
    currentUser: {
      canManageMembers: isOwnerOrAdmin(session),
      memberId: session.accountId,
      role: session.user.role as TeamRole,
    },
    filters: {
      accountStatuses: ["active", "inactive", "invited"],
      onlineStatuses: ["online", "away", "offline"],
      roles: ["Owner", "Admin", "Supervisor", "Agent"],
      teams: Array.from(new Set(allMembers.map((member) => member.team)))
        .sort((left, right) => left.localeCompare(right))
        .map((team) => ({ label: team, value: team })),
    },
    invitations: invitations.map((invitation) => ({
      createdAt: invitation.createdAt.toISOString(),
      email: invitation.email,
      id: invitation.id,
      invitedBy: invitation.invitedByMember?.profile.fullName ?? "Workspace",
      role: toRoleLabel(invitation.role) as TeamRole,
      status: "pending",
      team: invitation.team,
    })),
    members: members.map((member) => {
      const metrics = counts.get(member.profile.fullName) ?? {
        activeConversationCount: 0,
        assignedConversationCount: 0,
      };
      return {
        accountStatus: member.status.toLowerCase() as "active" | "inactive",
        activeConversationCount: metrics.activeConversationCount,
        assignedConversationCount: metrics.assignedConversationCount,
        avatarFallback: member.profile.avatarFallback ?? member.profile.fullName.slice(0, 2).toUpperCase(),
        email: member.profile.email,
        id: member.id,
        isCurrentUser: member.id === session.accountId,
        lastActiveAt: member.lastActiveAt?.toISOString() ?? member.updatedAt.toISOString(),
        name: member.profile.fullName,
        onlineStatus: member.onlineStatus.toLowerCase() as "online" | "away" | "offline",
        role: toRoleLabel(member.role) as TeamRole,
        team: member.team,
        workloadLimit: member.workloadLimit,
      };
    }),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
    },
    summary: {
      memberCount: allMembers.length,
      pendingInvitationCount: invitations.filter((invitation) => invitation.status === "PENDING").length,
    },
  };
}

export async function inviteTeamMemberInDatabase(
  session: AuthenticatedSession,
  input: TeamInvitationInput,
) {
  assertManageMembers(session);

  const invitation = await prisma.invitation.create({
    data: {
      email: input.email.trim().toLowerCase(),
      id: `invite-${Date.now()}`,
      invitedByMemberId: session.accountId,
      organizationId: session.organizationId,
      role: toRoleEnum(input.role),
      status: "PENDING",
      team: input.team.trim(),
    },
  });

  return {
    createdAt: invitation.createdAt.toISOString(),
    email: invitation.email,
    id: invitation.id,
    invitedBy: session.user.name,
    role: input.role,
    status: "pending" as const,
    team: invitation.team,
  };
}

export async function updateTeamMemberInDatabase(
  session: AuthenticatedSession,
  memberId: string,
  input: TeamMemberUpdateInput,
) {
  assertManageMembers(session);

  const member = await prisma.member.findFirst({
    include: { profile: true },
    where: {
      id: memberId,
      organizationId: session.organizationId,
    },
  });

  if (!member) {
    return null;
  }

  if (member.id === session.accountId && input.accountStatus === "inactive") {
    const error = new Error("You cannot deactivate your own account.");
    error.name = "CONFLICT";
    throw error;
  }

  const nextRole = input.role ? toRoleEnum(input.role) : member.role;
  const nextStatus = input.accountStatus ? input.accountStatus.toUpperCase() as "ACTIVE" | "INACTIVE" : member.status;

  if (member.role === "OWNER" && (nextRole !== "OWNER" || nextStatus !== "ACTIVE")) {
    const ownerCount = await prisma.member.count({
      where: {
        organizationId: session.organizationId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    if (ownerCount <= 1) {
      const error = new Error("At least one active Owner must remain in the workspace.");
      error.name = "CONFLICT";
      throw error;
    }
  }

  const updated = await prisma.member.update({
    data: {
      role: nextRole,
      status: nextStatus,
      team: input.team?.trim() ?? member.team,
      workloadLimit: input.workloadLimit ?? member.workloadLimit,
    },
    include: { profile: true },
    where: { id: memberId },
  });

  const assignedConversationCount = await prisma.conversation.count({
    where: {
      assignedMemberId: updated.id,
      organizationId: session.organizationId,
    },
  });
  const activeConversationCount = await prisma.conversation.count({
    where: {
      assignedMemberId: updated.id,
      organizationId: session.organizationId,
      status: { in: ["OPEN", "PENDING"] },
    },
  });

  return {
    accountStatus: updated.status.toLowerCase() as "active" | "inactive",
    activeConversationCount,
    assignedConversationCount,
    avatarFallback: updated.profile.avatarFallback ?? updated.profile.fullName.slice(0, 2).toUpperCase(),
    email: updated.profile.email,
    id: updated.id,
    isCurrentUser: updated.id === session.accountId,
    lastActiveAt: updated.lastActiveAt?.toISOString() ?? updated.updatedAt.toISOString(),
    name: updated.profile.fullName,
    onlineStatus: updated.onlineStatus.toLowerCase() as "online" | "away" | "offline",
    role: toRoleLabel(updated.role) as TeamRole,
    team: updated.team,
    workloadLimit: updated.workloadLimit,
  };
}

export async function removeTeamMemberInDatabase(
  session: AuthenticatedSession,
  memberId: string,
) {
  assertManageMembers(session);

  const member = await prisma.member.findFirst({
    where: {
      id: memberId,
      organizationId: session.organizationId,
    },
  });

  if (!member) {
    return false;
  }

  if (member.role === "OWNER") {
    const ownerCount = await prisma.member.count({
      where: {
        organizationId: session.organizationId,
        role: "OWNER",
        status: "ACTIVE",
      },
    });

    if (ownerCount <= 1) {
      const error = new Error("At least one active Owner must remain in the workspace.");
      error.name = "CONFLICT";
      throw error;
    }
  }

  await prisma.member.delete({
    where: { id: memberId },
  });

  return true;
}
