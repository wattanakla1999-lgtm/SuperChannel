import "server-only";

import type { AuthenticatedUser } from "@/features/login/types/auth";
import type {
  BusinessHoursInput,
  BusinessHoursSettings,
  InboxPreferencesInput,
  InboxPreferencesSettings,
  NotificationsInput,
  NotificationsSettings,
  SavedReply,
  SavedReplyInput,
  SecuritySettings,
  SettingsResponse,
  WorkspaceProfileInput,
  WorkspaceProfileSettings,
} from "@/features/settings/types/settings";
import { listMockAssignableAgents } from "@/server/team/mock-team-data";

type StoredSettingsState = {
  businessHours: BusinessHoursSettings;
  inboxPreferences: InboxPreferencesSettings;
  notifications: NotificationsSettings;
  savedReplies: Map<string, SavedReply>;
  workspaceProfile: WorkspaceProfileSettings;
};

const sessionStates = new Map<string, StoredSettingsState>();

function isManageRole(role: string) {
  return role === "Owner" || role === "Admin";
}

function createInitialWorkspaceProfile(): WorkspaceProfileSettings {
  return {
    businessName: "SuperChannel Demo Workspace",
    email: "ops@superchannel.local",
    language: "English",
    logoPreview: "SC",
    phone: "+66 2 123 4567",
    timezone: "Asia/Bangkok",
  };
}

function createInitialBusinessHours(): BusinessHoursSettings {
  return {
    holidays: ["2026-07-28", "2026-08-12"],
    outsideBusinessHoursMessage:
      "Thanks for reaching out. Our operators will reply when business hours resume.",
    workingDays: [
      { closesAt: "18:00", day: "Monday", enabled: true, opensAt: "09:00" },
      { closesAt: "18:00", day: "Tuesday", enabled: true, opensAt: "09:00" },
      { closesAt: "18:00", day: "Wednesday", enabled: true, opensAt: "09:00" },
      { closesAt: "18:00", day: "Thursday", enabled: true, opensAt: "09:00" },
      { closesAt: "18:00", day: "Friday", enabled: true, opensAt: "09:00" },
      { closesAt: "13:00", day: "Saturday", enabled: false, opensAt: "10:00" },
      { closesAt: "13:00", day: "Sunday", enabled: false, opensAt: "10:00" },
    ],
  };
}

function createInitialInboxPreferences(): InboxPreferencesSettings {
  return {
    autoCloseHours: 24,
    defaultAssignment: "Mina Ortiz",
    defaultConversationStatus: "open",
    showMessagePreview: true,
    soundEnabled: true,
  };
}

function createInitialNotifications(): NotificationsSettings {
  return {
    assignment: true,
    desktop: true,
    email: true,
    expiredConnection: true,
    failedPublishing: true,
    mention: true,
    newMessage: true,
    sound: true,
  };
}

function createInitialSavedReplies() {
  return new Map<string, SavedReply>([
    [
      "saved-reply-001",
      {
        category: "Support",
        id: "saved-reply-001",
        message:
          "Thanks for reaching out. I’m checking the latest order status now and will update you shortly.",
        shortcut: "/status",
        title: "Order status update",
        updatedAt: "2026-06-21T08:10:00.000Z",
      },
    ],
    [
      "saved-reply-002",
      {
        category: "Escalation",
        id: "saved-reply-002",
        message:
          "I’m escalating this to the on-call operator and will share the next update within 30 minutes.",
        shortcut: "/escalate",
        title: "Ops escalation",
        updatedAt: "2026-06-21T07:30:00.000Z",
      },
    ],
    [
      "saved-reply-003",
      {
        category: "Sales",
        id: "saved-reply-003",
        message:
          "Absolutely. I’ll send the current pricing deck and available package tiers in this thread.",
        shortcut: "/pricing",
        title: "Pricing follow-up",
        updatedAt: "2026-06-20T18:40:00.000Z",
      },
    ],
    [
      "saved-reply-004",
      {
        category: "Creative",
        id: "saved-reply-004",
        message:
          "Sharing the latest approved creative asset now. Let me know if you want a caption-safe crop as well.",
        shortcut: "/creative",
        title: "Creative resend",
        updatedAt: "2026-06-20T15:12:00.000Z",
      },
    ],
  ]);
}

function getSessionState(sessionId: string) {
  const existing = sessionStates.get(sessionId);

  if (existing) {
    return existing;
  }

  const nextState = {
    businessHours: createInitialBusinessHours(),
    inboxPreferences: createInitialInboxPreferences(),
    notifications: createInitialNotifications(),
    savedReplies: createInitialSavedReplies(),
    workspaceProfile: createInitialWorkspaceProfile(),
  } satisfies StoredSettingsState;

  sessionStates.set(sessionId, nextState);
  return nextState;
}

function cloneBusinessHours(input: BusinessHoursSettings): BusinessHoursSettings {
  return {
    holidays: [...input.holidays],
    outsideBusinessHoursMessage: input.outsideBusinessHoursMessage,
    workingDays: input.workingDays.map((day) => ({ ...day })),
  };
}

function buildSecuritySettings(sessionId: string, user: AuthenticatedUser): SecuritySettings {
  return {
    accountEmail: user.email,
    currentSessionId: sessionId,
    role: user.role,
    sessionIssuedAt: "2026-06-21T08:45:00.000Z",
    twoFactorEnabled: false,
  };
}

function buildSettingsResponse(
  sessionId: string,
  user: AuthenticatedUser,
): SettingsResponse {
  const state = getSessionState(sessionId);
  const assignmentOptions = listMockAssignableAgents(sessionId);

  return {
    assignmentOptions,
    businessHours: cloneBusinessHours(state.businessHours),
    currentUser: {
      canManageSettings: isManageRole(user.role),
      role: user.role,
    },
    inboxPreferences: { ...state.inboxPreferences },
    notifications: { ...state.notifications },
    savedReplyCategories: Array.from(
      new Set(Array.from(state.savedReplies.values()).map((reply) => reply.category)),
    ).sort((left, right) => left.localeCompare(right)),
    security: buildSecuritySettings(sessionId, user),
    workspaceProfile: { ...state.workspaceProfile },
  };
}

function assertManagePermissions(role: string) {
  if (!isManageRole(role)) {
    const error = new Error("Only Owners and Admins can update workspace settings.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

function assertValidEmail(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error("Enter a valid workspace email.");
    error.name = "INVALID";
    throw error;
  }
}

function assertUniqueShortcut(
  replies: Map<string, SavedReply>,
  shortcut: string,
  excludeId?: string,
) {
  const normalizedShortcut = shortcut.trim().toLowerCase();

  const duplicate = Array.from(replies.values()).find(
    (reply) =>
      reply.id !== excludeId && reply.shortcut.trim().toLowerCase() === normalizedShortcut,
  );

  if (duplicate) {
    const error = new Error("Saved Reply shortcuts must be unique.");
    error.name = "CONFLICT";
    throw error;
  }
}

export function getMockSettings(sessionId: string, user: AuthenticatedUser) {
  return buildSettingsResponse(sessionId, user);
}

export function updateMockWorkspaceProfile(
  sessionId: string,
  user: AuthenticatedUser,
  input: WorkspaceProfileInput,
) {
  assertManagePermissions(user.role);

  if (!input.businessName.trim()) {
    const error = new Error("Business name is required.");
    error.name = "INVALID";
    throw error;
  }

  assertValidEmail(input.email.trim());

  const state = getSessionState(sessionId);
  state.workspaceProfile = {
    ...state.workspaceProfile,
    businessName: input.businessName.trim(),
    email: input.email.trim(),
    language: input.language.trim() || "English",
    phone: input.phone.trim(),
    timezone: input.timezone.trim() || "Asia/Bangkok",
  };

  return { ...state.workspaceProfile };
}

export function updateMockBusinessHours(
  sessionId: string,
  user: AuthenticatedUser,
  input: BusinessHoursInput,
) {
  assertManagePermissions(user.role);

  for (const day of input.workingDays) {
    if (day.enabled && day.closesAt <= day.opensAt) {
      const error = new Error("Closing time must be after opening time.");
      error.name = "INVALID";
      throw error;
    }
  }

  const state = getSessionState(sessionId);
  state.businessHours = cloneBusinessHours({
    holidays: input.holidays.map((holiday) => holiday.trim()).filter(Boolean),
    outsideBusinessHoursMessage: input.outsideBusinessHoursMessage.trim(),
    workingDays: input.workingDays.map((day) => ({
      closesAt: day.closesAt,
      day: day.day,
      enabled: day.enabled,
      opensAt: day.opensAt,
    })),
  });

  return cloneBusinessHours(state.businessHours);
}

export function updateMockInboxPreferences(
  sessionId: string,
  user: AuthenticatedUser,
  input: InboxPreferencesInput,
) {
  assertManagePermissions(user.role);

  if (!Number.isFinite(input.autoCloseHours) || input.autoCloseHours < 0) {
    const error = new Error("Auto-close duration must be zero or a positive number.");
    error.name = "INVALID";
    throw error;
  }

  const allowedAssignments = new Set(
    listMockAssignableAgents(sessionId).map((option) => option.value),
  );

  if (!allowedAssignments.has(input.defaultAssignment)) {
    const error = new Error("Please choose a valid default assignment.");
    error.name = "INVALID";
    throw error;
  }

  const state = getSessionState(sessionId);
  state.inboxPreferences = { ...input };
  return { ...state.inboxPreferences };
}

export function updateMockNotifications(
  sessionId: string,
  user: AuthenticatedUser,
  input: NotificationsInput,
) {
  assertManagePermissions(user.role);
  const state = getSessionState(sessionId);
  state.notifications = { ...input };
  return { ...state.notifications };
}

export function listMockSavedReplies(sessionId: string, search?: string) {
  const state = getSessionState(sessionId);
  const normalizedSearch = search?.trim().toLowerCase() ?? "";

  return Array.from(state.savedReplies.values())
    .filter((reply) => {
      if (!normalizedSearch) {
        return true;
      }

      return (
        reply.title.toLowerCase().includes(normalizedSearch) ||
        reply.shortcut.toLowerCase().includes(normalizedSearch) ||
        reply.category.toLowerCase().includes(normalizedSearch) ||
        reply.message.toLowerCase().includes(normalizedSearch)
      );
    })
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((reply) => ({ ...reply }));
}

export function createMockSavedReply(
  sessionId: string,
  user: AuthenticatedUser,
  input: SavedReplyInput,
) {
  assertManagePermissions(user.role);

  if (!input.title.trim() || !input.message.trim()) {
    const error = new Error("Saved Reply title and message are required.");
    error.name = "INVALID";
    throw error;
  }

  const state = getSessionState(sessionId);
  assertUniqueShortcut(state.savedReplies, input.shortcut);

  const reply: SavedReply = {
    category: input.category.trim() || "General",
    id: `saved-reply-${Date.now()}`,
    message: input.message.trim(),
    shortcut: input.shortcut.trim(),
    title: input.title.trim(),
    updatedAt: new Date().toISOString(),
  };

  state.savedReplies.set(reply.id, reply);
  return { ...reply };
}

export function updateMockSavedReply(
  sessionId: string,
  user: AuthenticatedUser,
  replyId: string,
  input: SavedReplyInput,
) {
  assertManagePermissions(user.role);

  if (!input.title.trim() || !input.message.trim()) {
    const error = new Error("Saved Reply title and message are required.");
    error.name = "INVALID";
    throw error;
  }

  const state = getSessionState(sessionId);
  const reply = state.savedReplies.get(replyId);

  if (!reply) {
    return null;
  }

  assertUniqueShortcut(state.savedReplies, input.shortcut, replyId);

  reply.category = input.category.trim() || "General";
  reply.message = input.message.trim();
  reply.shortcut = input.shortcut.trim();
  reply.title = input.title.trim();
  reply.updatedAt = new Date().toISOString();

  return { ...reply };
}

export function deleteMockSavedReply(
  sessionId: string,
  user: AuthenticatedUser,
  replyId: string,
) {
  assertManagePermissions(user.role);
  const state = getSessionState(sessionId);
  return state.savedReplies.delete(replyId);
}

