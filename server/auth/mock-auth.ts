import "server-only";

import type { AuthenticatedUser, LoginInput } from "@/features/login/types/auth";
import type { TeamRole } from "@/features/team/types/team";

const MOCK_ACCOUNT_PASSWORD = "SuperChannel123!";

type MockAccount = AuthenticatedUser & {
  teamRole: TeamRole;
};

const MOCK_ACCOUNTS = [
  {
    email: "owner@superchannel.local",
    id: "member-owner-001",
    name: "Olivia Owens",
    organizationName: "SuperChannel Demo Workspace",
    role: "Owner",
    teamRole: "Owner",
  },
  {
    email: "admin@superchannel.local",
    id: "member-admin-001",
    name: "SuperChannel Admin",
    organizationName: "SuperChannel Demo Workspace",
    role: "Admin",
    teamRole: "Admin",
  },
  {
    email: "supervisor@superchannel.local",
    id: "member-supervisor-001",
    name: "Harper Quinn",
    organizationName: "SuperChannel Demo Workspace",
    role: "Supervisor",
    teamRole: "Supervisor",
  },
  {
    email: "agent@superchannel.local",
    id: "member-agent-001",
    name: "Mina Ortiz",
    organizationName: "SuperChannel Demo Workspace",
    role: "Agent",
    teamRole: "Agent",
  },
] satisfies MockAccount[];

const accountsById = new Map(MOCK_ACCOUNTS.map((account) => [account.id, account]));

export function authenticateMockUser({
  email,
  password,
}: Pick<LoginInput, "email" | "password">): AuthenticatedUser | null {
  const normalizedEmail = email.trim().toLowerCase();

  const account = MOCK_ACCOUNTS.find(
    (mockAccount) => mockAccount.email.toLowerCase() === normalizedEmail,
  );

  if (!account || password !== MOCK_ACCOUNT_PASSWORD) {
    return null;
  }

  return account;
}

export function getMockUserById(accountId: string): AuthenticatedUser | null {
  return (accountsById.get(accountId) ?? null) as AuthenticatedUser | null;
}

export function getDefaultMockUser(): AuthenticatedUser {
  return MOCK_ACCOUNTS[1] as AuthenticatedUser;
}
