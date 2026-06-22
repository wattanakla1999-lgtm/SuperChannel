import "server-only";

import { prisma } from "@/server/database/prisma";
import type {
  AppLocale,
  BusinessHoursInput,
  NotificationsInput,
  SavedReplyInput,
  SettingsResponse,
  WorkspaceProfileInput,
  InboxPreferencesInput,
} from "@/features/settings/types/settings";
import type { AuthenticatedSession } from "@/server/auth/session";
import { isOwnerOrAdmin } from "@/server/auth/roles";

function assertManageSettings(session: AuthenticatedSession) {
  if (!isOwnerOrAdmin(session)) {
    const error = new Error("Only Owners and Admins can update workspace settings.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

function parseLocale(value: "EN" | "TH"): AppLocale {
  return value === "TH" ? "th" : "en";
}

function toLocaleEnum(value: AppLocale) {
  return value === "th" ? "TH" : "EN";
}

function buildSecuritySettings(session: AuthenticatedSession) {
  return {
    accountEmail: session.user.email,
    currentSessionId: session.id,
    role: session.user.role,
    sessionIssuedAt: new Date().toISOString(),
    twoFactorEnabled: false,
  };
}

export async function getSettingsFromDatabase(session: AuthenticatedSession): Promise<SettingsResponse> {
  const [settings, members, savedReplies] = await Promise.all([
    prisma.workspaceSettings.findUniqueOrThrow({
      where: { organizationId: session.organizationId },
    }),
    prisma.member.findMany({
      include: { profile: true },
      orderBy: { profile: { fullName: "asc" } },
      where: {
        organizationId: session.organizationId,
        role: { in: ["AGENT", "SUPERVISOR"] },
        status: "ACTIVE",
      },
    }),
    prisma.savedReply.findMany({
      orderBy: { updatedAt: "desc" },
      where: { organizationId: session.organizationId },
    }),
  ]);

  return {
    assignmentOptions: members.map((member) => ({
      label: member.profile.fullName,
      value: member.profile.fullName,
    })),
    businessHours: settings.businessHours as SettingsResponse["businessHours"],
    currentUser: {
      canManageSettings: isOwnerOrAdmin(session),
      role: session.user.role,
    },
    inboxPreferences: settings.inboxPreferences as SettingsResponse["inboxPreferences"],
    notifications: settings.notifications as SettingsResponse["notifications"],
    savedReplyCategories: Array.from(new Set(savedReplies.map((reply) => reply.category))).sort(
      (left, right) => left.localeCompare(right),
    ),
    security: buildSecuritySettings(session),
    workspaceProfile: {
      businessName: settings.businessName,
      email: settings.supportEmail,
      language: parseLocale(settings.defaultLocale),
      logoPreview: settings.logoPreview ?? "SC",
      phone: settings.supportPhone ?? "",
      timezone: settings.timezone,
    },
  };
}

export async function updateWorkspaceProfileInDatabase(
  session: AuthenticatedSession,
  input: WorkspaceProfileInput,
) {
  assertManageSettings(session);

  const updated = await prisma.workspaceSettings.update({
    data: {
      businessName: input.businessName.trim(),
      defaultLocale: toLocaleEnum(input.language),
      supportEmail: input.email.trim(),
      supportPhone: input.phone.trim(),
      timezone: input.timezone.trim() || "Asia/Bangkok",
    },
    where: { organizationId: session.organizationId },
  });

  return {
    businessName: updated.businessName,
    email: updated.supportEmail,
    language: parseLocale(updated.defaultLocale),
    logoPreview: updated.logoPreview ?? "SC",
    phone: updated.supportPhone ?? "",
    timezone: updated.timezone,
  };
}

export async function updateBusinessHoursInDatabase(
  session: AuthenticatedSession,
  input: BusinessHoursInput,
) {
  assertManageSettings(session);

  await prisma.workspaceSettings.update({
    data: {
      businessHours: input,
    },
    where: { organizationId: session.organizationId },
  });

  return input;
}

export async function updateInboxPreferencesInDatabase(
  session: AuthenticatedSession,
  input: InboxPreferencesInput,
) {
  assertManageSettings(session);

  await prisma.workspaceSettings.update({
    data: {
      inboxPreferences: input,
    },
    where: { organizationId: session.organizationId },
  });

  return input;
}

export async function updateNotificationsInDatabase(
  session: AuthenticatedSession,
  input: NotificationsInput,
) {
  assertManageSettings(session);

  await prisma.workspaceSettings.update({
    data: {
      notifications: input,
    },
    where: { organizationId: session.organizationId },
  });

  return input;
}

export async function updateLocalePreferenceInDatabase(
  session: AuthenticatedSession,
  locale: AppLocale,
) {
  await prisma.workspaceSettings.update({
    data: {
      defaultLocale: toLocaleEnum(locale),
    },
    where: { organizationId: session.organizationId },
  });

  await prisma.profile.updateMany({
    data: {
      localePreference: toLocaleEnum(locale),
    },
    where: {
      email: session.user.email,
      organizationId: session.organizationId,
    },
  });

  return locale;
}

export async function listSavedRepliesFromDatabase(
  session: AuthenticatedSession,
  search?: string,
) {
  const replies = await prisma.savedReply.findMany({
    orderBy: { updatedAt: "desc" },
    where: {
      organizationId: session.organizationId,
      OR: search
        ? [
            { title: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
            { shortcut: { contains: search, mode: "insensitive" } },
            { message: { contains: search, mode: "insensitive" } },
          ]
        : undefined,
    },
  });

  return replies.map((reply) => ({
    category: reply.category,
    id: reply.id,
    message: reply.message,
    shortcut: reply.shortcut,
    title: reply.title,
    updatedAt: reply.updatedAt.toISOString(),
  }));
}

export async function createSavedReplyInDatabase(
  session: AuthenticatedSession,
  input: SavedReplyInput,
) {
  assertManageSettings(session);

  const reply = await prisma.savedReply.create({
    data: {
      category: input.category.trim(),
      createdByMemberId: session.accountId,
      id: crypto.randomUUID(),
      message: input.message.trim(),
      organizationId: session.organizationId,
      shortcut: input.shortcut.trim(),
      title: input.title.trim(),
    },
  });

  return {
    category: reply.category,
    id: reply.id,
    message: reply.message,
    shortcut: reply.shortcut,
    title: reply.title,
    updatedAt: reply.updatedAt.toISOString(),
  };
}

export async function updateSavedReplyInDatabase(
  session: AuthenticatedSession,
  replyId: string,
  input: SavedReplyInput,
) {
  assertManageSettings(session);

  const reply = await prisma.savedReply.findFirst({
    where: {
      id: replyId,
      organizationId: session.organizationId,
    },
  });

  if (!reply) {
    return null;
  }

  const updated = await prisma.savedReply.update({
    data: {
      category: input.category.trim(),
      message: input.message.trim(),
      shortcut: input.shortcut.trim(),
      title: input.title.trim(),
    },
    where: { id: replyId },
  });

  return {
    category: updated.category,
    id: updated.id,
    message: updated.message,
    shortcut: updated.shortcut,
    title: updated.title,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteSavedReplyInDatabase(session: AuthenticatedSession, replyId: string) {
  assertManageSettings(session);

  const deleted = await prisma.savedReply.deleteMany({
    where: {
      id: replyId,
      organizationId: session.organizationId,
    },
  });

  return deleted.count > 0;
}
