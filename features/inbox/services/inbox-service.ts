import { apiClient } from "@/lib/http/api-client";
import type { SavedRepliesResponse } from "@/features/settings/types/settings";
import type {
  InboxConversationResponse,
  InboxConversationsResponse,
  SendMessageInput,
  SendMessageResponse,
} from "../types/inbox";

export async function getConversations() {
  const response =
    await apiClient.get<InboxConversationsResponse>("/api/inbox/conversations");
  return response.data.conversations;
}

export async function getConversation(conversationId: string) {
  const response = await apiClient.get<InboxConversationResponse>(
    `/api/inbox/conversations/${conversationId}`,
  );
  return response.data;
}

export async function sendConversationMessage(
  conversationId: string,
  input: SendMessageInput,
) {
  const response = await apiClient.post<SendMessageResponse>(
    `/api/inbox/conversations/${conversationId}/messages`,
    input,
  );
  return response.data;
}

export async function getSavedReplies() {
  const response = await apiClient.get<SavedRepliesResponse>("/api/settings/saved-replies");
  return response.data.replies;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}
