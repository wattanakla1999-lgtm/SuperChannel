import "server-only";

import type { User } from "@supabase/supabase-js";
import { prisma } from "@/server/database/prisma";
import { createSupabaseServerClient } from "@/server/supabase/server";

export type AuthenticatedSession = {
  accountId: string;
  id: string;
  organizationId: string;
  user: {
    email: string;
    id: string;
    name: string;
    organizationName: string;
    role: string;
  };
};

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

async function resolveSessionForUser(user: User) {
  const membership = await prisma.member.findFirst({
    include: {
      organization: true,
      profile: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    where: {
      profile: {
        userId: user.id,
      },
      status: "ACTIVE",
    },
  });

  if (!membership) {
    return null;
  }

  return {
    accountId: membership.id,
    id: user.id,
    organizationId: membership.organizationId,
    user: {
      email: membership.profile.email,
      id: membership.id,
      name: membership.profile.fullName,
      organizationName: membership.organization.name,
      role: toRoleLabel(membership.role),
    },
  } satisfies AuthenticatedSession;
}

export async function getAuthenticatedSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return resolveSessionForUser(user);
}

export async function requireAuthenticatedSession() {
  const session = await getAuthenticatedSession();

  if (!session) {
    const error = new Error("Your session has expired. Please sign in again.");
    error.name = "UNAUTHORIZED";
    throw error;
  }

  return session;
}
