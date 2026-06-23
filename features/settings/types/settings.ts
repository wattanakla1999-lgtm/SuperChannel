import type { ThreadStatus } from "@/features/inbox/types/inbox";
import type { TeamOption } from "@/features/team/types/team";

export const appLocales = ["en", "th"] as const;
export type AppLocale = (typeof appLocales)[number];

export type SettingsSection =
  | "workspace-profile"
  | "business-hours"
  | "inbox-preferences"
  | "tags"
  | "saved-replies"
  | "notifications"
  | "security";

export type WorkspaceProfileSettings = {
  businessName: string;
  email: string;
  language: AppLocale;
  logoPreview: string;
  phone: string;
  timezone: string;
};

export type BusinessHoursDay = {
  closesAt: string;
  day: string;
  enabled: boolean;
  opensAt: string;
};

export type BusinessHoursSettings = {
  holidays: string[];
  outsideBusinessHoursMessage: string;
  workingDays: BusinessHoursDay[];
};

export type InboxPreferencesSettings = {
  autoCloseHours: number;
  defaultAssignment: string;
  defaultConversationStatus: ThreadStatus;
  soundEnabled: boolean;
  showMessagePreview: boolean;
};

export type NotificationsSettings = {
  assignment: boolean;
  desktop: boolean;
  email: boolean;
  expiredConnection: boolean;
  failedPublishing: boolean;
  mention: boolean;
  newMessage: boolean;
  sound: boolean;
};

export type SecuritySettings = {
  accountEmail: string;
  currentSessionId: string;
  role: string;
  sessionIssuedAt: string;
  twoFactorEnabled: boolean;
};

export type SavedReply = {
  category: string;
  id: string;
  message: string;
  shortcut: string;
  title: string;
  updatedAt: string;
};

export type SettingsResponse = {
  assignmentOptions: TeamOption[];
  currentUser: {
    canManageSettings: boolean;
    role: string;
  };
  businessHours: BusinessHoursSettings;
  inboxPreferences: InboxPreferencesSettings;
  notifications: NotificationsSettings;
  savedReplyCategories: string[];
  security: SecuritySettings;
  workspaceProfile: WorkspaceProfileSettings;
};

export type SavedRepliesResponse = {
  replies: SavedReply[];
};

export type WorkspaceProfileInput = Omit<WorkspaceProfileSettings, "logoPreview">;

export type BusinessHoursInput = BusinessHoursSettings;

export type InboxPreferencesInput = InboxPreferencesSettings;

export type NotificationsInput = NotificationsSettings;

export type SavedReplyInput = Omit<SavedReply, "id" | "updatedAt">;
