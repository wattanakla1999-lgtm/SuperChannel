import { apiClient } from "@/lib/http/api-client";
import type {
  BusinessHoursInput,
  BusinessHoursSettings,
  InboxPreferencesInput,
  InboxPreferencesSettings,
  NotificationsInput,
  NotificationsSettings,
  SavedReply,
  SavedReplyInput,
  SavedRepliesResponse,
  SettingsResponse,
  WorkspaceProfileInput,
  WorkspaceProfileSettings,
} from "../types/settings";

export async function getSettings() {
  const response = await apiClient.get<SettingsResponse>("/api/settings");
  return response.data;
}

export async function updateWorkspaceProfile(input: WorkspaceProfileInput) {
  const response = await apiClient.patch<WorkspaceProfileSettings>(
    "/api/settings/workspace-profile",
    input,
  );
  return response.data;
}

export async function updateBusinessHours(input: BusinessHoursInput) {
  const response = await apiClient.patch<BusinessHoursSettings>(
    "/api/settings/business-hours",
    input,
  );
  return response.data;
}

export async function updateInboxPreferences(input: InboxPreferencesInput) {
  const response = await apiClient.patch<InboxPreferencesSettings>(
    "/api/settings/inbox-preferences",
    input,
  );
  return response.data;
}

export async function updateNotifications(input: NotificationsInput) {
  const response = await apiClient.patch<NotificationsSettings>(
    "/api/settings/notifications",
    input,
  );
  return response.data;
}

export async function getSavedReplies(search?: string) {
  const response = await apiClient.get<SavedRepliesResponse>(
    `/api/settings/saved-replies${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );
  return response.data.replies;
}

export async function createSavedReply(input: SavedReplyInput) {
  const response = await apiClient.post<SavedReply>("/api/settings/saved-replies", input);
  return response.data;
}

export async function updateSavedReply(replyId: string, input: SavedReplyInput) {
  const response = await apiClient.patch<SavedReply>(
    `/api/settings/saved-replies/${replyId}`,
    input,
  );
  return response.data;
}

export async function deleteSavedReply(replyId: string) {
  await apiClient.delete(`/api/settings/saved-replies/${replyId}`);
}
