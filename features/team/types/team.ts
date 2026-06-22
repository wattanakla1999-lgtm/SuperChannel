export type TeamRole = "Owner" | "Admin" | "Supervisor" | "Agent";

export type TeamPresence = "online" | "away" | "offline";

export type TeamAccountStatus = "active" | "inactive" | "invited";

export type TeamOption = {
  label: string;
  value: string;
};

export type TeamMember = {
  accountStatus: Exclude<TeamAccountStatus, "invited">;
  activeConversationCount: number;
  assignedConversationCount: number;
  avatarFallback: string;
  email: string;
  id: string;
  isCurrentUser: boolean;
  lastActiveAt: string;
  name: string;
  onlineStatus: TeamPresence;
  role: TeamRole;
  team: string;
  workloadLimit: number;
};

export type TeamInvitation = {
  createdAt: string;
  email: string;
  id: string;
  invitedBy: string;
  role: TeamRole;
  status: "pending";
  team: string;
};

export type TeamListResponse = {
  currentUser: {
    canManageMembers: boolean;
    memberId: string | null;
    role: TeamRole;
  };
  filters: {
    accountStatuses: TeamAccountStatus[];
    onlineStatuses: TeamPresence[];
    roles: TeamRole[];
    teams: TeamOption[];
  };
  invitations: TeamInvitation[];
  members: TeamMember[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: {
    memberCount: number;
    pendingInvitationCount: number;
  };
};

export type TeamQuery = {
  accountStatus?: TeamAccountStatus | "all";
  onlineStatus?: TeamPresence | "all";
  page?: number;
  pageSize?: number;
  role?: TeamRole | "all";
  search?: string;
  team?: string;
};

export type TeamInvitationInput = {
  email: string;
  role: TeamRole;
  team: string;
};

export type TeamMemberUpdateInput = {
  accountStatus?: Exclude<TeamAccountStatus, "invited">;
  role?: TeamRole;
  team?: string;
  workloadLimit?: number;
};
