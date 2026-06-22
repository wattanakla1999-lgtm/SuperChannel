import "server-only";

import type {
  TeamAccountStatus,
  TeamInvitation,
  TeamInvitationInput,
  TeamListResponse,
  TeamMember,
  TeamMemberUpdateInput,
  TeamOption,
  TeamPresence,
  TeamRole,
} from "@/features/team/types/team";

type StoredTeamMember = Omit<
  TeamMember,
  "activeConversationCount" | "assignedConversationCount" | "isCurrentUser"
>;

type SessionTeamState = {
  invitations: Map<string, TeamInvitation>;
  members: Map<string, StoredTeamMember>;
};

const sessionStates = new Map<string, SessionTeamState>();

function memberRecord(input: StoredTeamMember) {
  return [input.id, input] as const;
}

function createInitialMembers() {
  return new Map<string, StoredTeamMember>([
    memberRecord({
      accountStatus: "active",
      avatarFallback: "OO",
      email: "owner@superchannel.local",
      id: "member-owner-001",
      lastActiveAt: "2026-06-21T08:40:00.000Z",
      name: "Olivia Owens",
      onlineStatus: "online",
      role: "Owner",
      team: "Leadership",
      workloadLimit: 20,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "SA",
      email: "admin@superchannel.local",
      id: "member-admin-001",
      lastActiveAt: "2026-06-21T08:37:00.000Z",
      name: "SuperChannel Admin",
      onlineStatus: "online",
      role: "Admin",
      team: "Leadership",
      workloadLimit: 18,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "HQ",
      email: "supervisor@superchannel.local",
      id: "member-supervisor-001",
      lastActiveAt: "2026-06-21T08:11:00.000Z",
      name: "Harper Quinn",
      onlineStatus: "online",
      role: "Supervisor",
      team: "Operations",
      workloadLimit: 14,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "MO",
      email: "agent@superchannel.local",
      id: "member-agent-001",
      lastActiveAt: "2026-06-21T07:58:00.000Z",
      name: "Mina Ortiz",
      onlineStatus: "away",
      role: "Agent",
      team: "Support",
      workloadLimit: 12,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "JC",
      email: "jules.carter@superchannel.local",
      id: "member-agent-002",
      lastActiveAt: "2026-06-21T07:42:00.000Z",
      name: "Jules Carter",
      onlineStatus: "online",
      role: "Agent",
      team: "Support",
      workloadLimit: 12,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "PD",
      email: "priya.das@superchannel.local",
      id: "member-agent-003",
      lastActiveAt: "2026-06-21T07:24:00.000Z",
      name: "Priya Das",
      onlineStatus: "away",
      role: "Supervisor",
      team: "Creative",
      workloadLimit: 10,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "EC",
      email: "ethan.cole@superchannel.local",
      id: "member-agent-004",
      lastActiveAt: "2026-06-21T06:58:00.000Z",
      name: "Ethan Cole",
      onlineStatus: "offline",
      role: "Agent",
      team: "Operations",
      workloadLimit: 10,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "CL",
      email: "celine.leung@superchannel.local",
      id: "member-agent-005",
      lastActiveAt: "2026-06-21T06:18:00.000Z",
      name: "Celine Leung",
      onlineStatus: "offline",
      role: "Agent",
      team: "Creative",
      workloadLimit: 8,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "SN",
      email: "samira.noor@superchannel.local",
      id: "member-agent-006",
      lastActiveAt: "2026-06-21T05:42:00.000Z",
      name: "Samira Noor",
      onlineStatus: "online",
      role: "Agent",
      team: "Growth",
      workloadLimit: 11,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "DR",
      email: "diego.ramos@superchannel.local",
      id: "member-agent-007",
      lastActiveAt: "2026-06-21T05:18:00.000Z",
      name: "Diego Ramos",
      onlineStatus: "away",
      role: "Agent",
      team: "Growth",
      workloadLimit: 9,
    }),
    memberRecord({
      accountStatus: "inactive",
      avatarFallback: "LP",
      email: "lila.perez@superchannel.local",
      id: "member-agent-008",
      lastActiveAt: "2026-06-19T11:20:00.000Z",
      name: "Lila Perez",
      onlineStatus: "offline",
      role: "Agent",
      team: "Support",
      workloadLimit: 7,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "OC",
      email: "olivia.chen@superchannel.local",
      id: "member-agent-009",
      lastActiveAt: "2026-06-21T04:55:00.000Z",
      name: "Olivia Chen",
      onlineStatus: "online",
      role: "Supervisor",
      team: "Retention",
      workloadLimit: 10,
    }),
    memberRecord({
      accountStatus: "active",
      avatarFallback: "RH",
      email: "rhea.patel@superchannel.local",
      id: "member-agent-010",
      lastActiveAt: "2026-06-21T04:22:00.000Z",
      name: "Rhea Patel",
      onlineStatus: "away",
      role: "Agent",
      team: "Retention",
      workloadLimit: 8,
    }),
  ]);
}

function createInitialInvitations() {
  return new Map<string, TeamInvitation>([
    [
      "invite-001",
      {
        createdAt: "2026-06-21T07:00:00.000Z",
        email: "sam.keller@superchannel.local",
        id: "invite-001",
        invitedBy: "SuperChannel Admin",
        role: "Agent",
        status: "pending",
        team: "Support",
      },
    ],
    [
      "invite-002",
      {
        createdAt: "2026-06-20T16:40:00.000Z",
        email: "anya.ross@superchannel.local",
        id: "invite-002",
        invitedBy: "Olivia Owens",
        role: "Supervisor",
        status: "pending",
        team: "Growth",
      },
    ],
    [
      "invite-003",
      {
        createdAt: "2026-06-20T10:12:00.000Z",
        email: "leo.farrell@superchannel.local",
        id: "invite-003",
        invitedBy: "SuperChannel Admin",
        role: "Agent",
        status: "pending",
        team: "Creative",
      },
    ],
  ]);
}

function getSessionState(sessionId: string) {
  const existing = sessionStates.get(sessionId);

  if (existing) {
    return existing;
  }

  const state = {
    invitations: createInitialInvitations(),
    members: createInitialMembers(),
  } satisfies SessionTeamState;

  sessionStates.set(sessionId, state);
  return state;
}

function isManageRole(role: TeamRole) {
  return role === "Owner" || role === "Admin";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getMemberById(state: SessionTeamState, memberId: string) {
  const member = state.members.get(memberId);

  if (!member) {
    throw new Error(`Unknown team member: ${memberId}`);
  }

  return member;
}

export function getMockTeamMemberByAccountId(sessionId: string, memberId: string) {
  const state = getSessionState(sessionId);
  return state.members.get(memberId) ?? null;
}

export function listMockAssignableAgents(sessionId: string) {
  const state = getSessionState(sessionId);

  return Array.from(state.members.values())
    .filter((member) => member.role === "Agent" || member.role === "Supervisor")
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((member) => ({
      label:
        member.accountStatus === "inactive"
          ? `${member.name} (Inactive)`
          : member.name,
      value: member.name,
    }));
}

export function listMockTeamMembersForDashboard(sessionId: string) {
  const state = getSessionState(sessionId);

  return Array.from(state.members.values())
    .map((member) => ({ ...member }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function resolveMockAssignedAgentLabel(sessionId: string, rawName: string) {
  const state = getSessionState(sessionId);
  const member = Array.from(state.members.values()).find(
    (teamMember) => teamMember.name === rawName,
  );

  if (!member) {
    return rawName;
  }

  return member.accountStatus === "inactive"
    ? `${member.name} (Inactive)`
    : member.name;
}

function buildFilterOptions(state: SessionTeamState) {
  const members = Array.from(state.members.values());

  return {
    accountStatuses: ["active", "inactive", "invited"] satisfies TeamAccountStatus[],
    onlineStatuses: ["online", "away", "offline"] satisfies TeamPresence[],
    roles: ["Owner", "Admin", "Supervisor", "Agent"] satisfies TeamRole[],
    teams: Array.from(
      new Set(members.map((member) => member.team)),
    )
      .sort((left, right) => left.localeCompare(right))
      .map((team) => ({ label: team, value: team })) satisfies TeamOption[],
  };
}

export function buildMockTeamList(
  sessionId: string,
  currentMemberId: string | null,
  currentRole: TeamRole,
  query: {
    accountStatus: TeamAccountStatus | "all";
    onlineStatus: TeamPresence | "all";
    page: number;
    pageSize: number;
    role: TeamRole | "all";
    search?: string;
    team?: string;
  },
  assignmentMetrics: Map<
    string,
    { activeConversationCount: number; assignedConversationCount: number }
  >,
): TeamListResponse {
  const state = getSessionState(sessionId);
  const members = Array.from(state.members.values());
  const normalizedSearch = query.search?.trim().toLowerCase() ?? "";

  const filteredMembers = members
    .filter((member) => {
      if (query.role !== "all" && member.role !== query.role) {
        return false;
      }

      if (query.team && query.team !== "all" && member.team !== query.team) {
        return false;
      }

      if (
        query.onlineStatus !== "all" &&
        member.onlineStatus !== query.onlineStatus
      ) {
        return false;
      }

      if (
        query.accountStatus !== "all" &&
        member.accountStatus !== query.accountStatus
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return (
        member.name.toLowerCase().includes(normalizedSearch) ||
        member.email.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / query.pageSize),
  );
  const page = Math.min(Math.max(1, query.page), totalPages);
  const startIndex = (page - 1) * query.pageSize;

  return {
    currentUser: {
      canManageMembers: isManageRole(currentRole),
      memberId: currentMemberId,
      role: currentRole,
    },
    filters: buildFilterOptions(state),
    invitations: Array.from(state.invitations.values()).sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
    members: filteredMembers
      .slice(startIndex, startIndex + query.pageSize)
      .map((member) => {
        const metrics = assignmentMetrics.get(member.name) ?? {
          activeConversationCount: 0,
          assignedConversationCount: 0,
        };

        return {
          ...member,
          activeConversationCount: metrics.activeConversationCount,
          assignedConversationCount: metrics.assignedConversationCount,
          isCurrentUser: member.id === currentMemberId,
        };
      }),
    pagination: {
      page,
      pageSize: query.pageSize,
      totalItems: filteredMembers.length,
      totalPages,
    },
    summary: {
      memberCount: members.length,
      pendingInvitationCount: state.invitations.size,
    },
  };
}

function assertManagePermissions(currentRole: TeamRole) {
  if (!isManageRole(currentRole)) {
    const error = new Error("Only Owners and Admins can manage team members.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

function assertUniqueEmail(
  state: SessionTeamState,
  email: string,
  excludeMemberId?: string,
) {
  const normalizedEmail = normalizeEmail(email);

  const duplicateMember = Array.from(state.members.values()).find(
    (member) =>
      member.id !== excludeMemberId &&
      normalizeEmail(member.email) === normalizedEmail,
  );
  const duplicateInvitation = Array.from(state.invitations.values()).find(
    (invitation) => normalizeEmail(invitation.email) === normalizedEmail,
  );

  if (duplicateMember || duplicateInvitation) {
    const error = new Error("That email already belongs to a member or pending invitation.");
    error.name = "CONFLICT";
    throw error;
  }
}

function activeOwnerCount(state: SessionTeamState) {
  return Array.from(state.members.values()).filter(
    (member) => member.role === "Owner" && member.accountStatus === "active",
  ).length;
}

export function inviteMockTeamMember(
  sessionId: string,
  currentMemberId: string,
  currentRole: TeamRole,
  input: TeamInvitationInput,
) {
  assertManagePermissions(currentRole);

  const state = getSessionState(sessionId);
  assertUniqueEmail(state, input.email);

  const invitation: TeamInvitation = {
    createdAt: new Date().toISOString(),
    email: normalizeEmail(input.email),
    id: `invite-${Date.now()}`,
    invitedBy: getMemberById(state, currentMemberId).name,
    role: input.role,
    status: "pending",
    team: input.team.trim(),
  };

  state.invitations.set(invitation.id, invitation);
  return invitation;
}

export function updateMockTeamMember(
  sessionId: string,
  currentMemberId: string,
  currentRole: TeamRole,
  memberId: string,
  input: TeamMemberUpdateInput,
) {
  assertManagePermissions(currentRole);

  const state = getSessionState(sessionId);
  const member = getMemberById(state, memberId);

  if (member.id === currentMemberId && input.accountStatus === "inactive") {
    const error = new Error("You cannot deactivate your own account.");
    error.name = "CONFLICT";
    throw error;
  }

  const nextRole = input.role ?? member.role;
  const nextAccountStatus = input.accountStatus ?? member.accountStatus;

  if (
    member.role === "Owner" &&
    (nextRole !== "Owner" || nextAccountStatus !== "active") &&
    activeOwnerCount(state) <= 1
  ) {
    const error = new Error("At least one active Owner must remain in the workspace.");
    error.name = "CONFLICT";
    throw error;
  }

  if (typeof input.workloadLimit === "number") {
    if (!Number.isFinite(input.workloadLimit) || input.workloadLimit < 1 || input.workloadLimit > 50) {
      const error = new Error("Workload limit must be between 1 and 50.");
      error.name = "INVALID";
      throw error;
    }
  }

  member.role = nextRole;
  member.accountStatus = nextAccountStatus;
  member.team = input.team?.trim() || member.team;
  member.workloadLimit = input.workloadLimit ?? member.workloadLimit;

  return member;
}

export function removeMockTeamMember(
  sessionId: string,
  currentMemberId: string,
  currentRole: TeamRole,
  memberId: string,
) {
  assertManagePermissions(currentRole);

  const state = getSessionState(sessionId);
  const member = getMemberById(state, memberId);

  if (member.id === currentMemberId) {
    const error = new Error("You cannot remove your own account.");
    error.name = "CONFLICT";
    throw error;
  }

  if (
    member.role === "Owner" &&
    member.accountStatus === "active" &&
    activeOwnerCount(state) <= 1
  ) {
    const error = new Error("At least one active Owner must remain in the workspace.");
    error.name = "CONFLICT";
    throw error;
  }

  state.members.delete(memberId);
}

export function listAllMockTeamMembers(sessionId: string) {
  return Array.from(getSessionState(sessionId).members.values());
}
