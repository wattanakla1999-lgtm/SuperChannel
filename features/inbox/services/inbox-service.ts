import { apiClient } from "@/lib/http/api-client";
import type { SavedRepliesResponse } from "@/features/settings/types/settings";
import type {
  InboxConversationResponse,
  InboxConversationsResponse,
  SendMessageInput,
  SendMessageResponse,
} from "../types/inbox";

const inFlightRequests = new Map<string, Promise<unknown>>();

function dedupeRequest<T>(key: string, request: () => Promise<T>) {
  const existingRequest = inFlightRequests.get(key) as Promise<T> | undefined;

  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = request().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, nextRequest);
  return nextRequest;
}

export async function getConversations() {
  const response = await dedupeRequest("inbox:conversations", () =>
    apiClient.get<InboxConversationsResponse>("/api/inbox/conversations"),
  );
  return response.data.conversations;
}

export async function getConversation(conversationId: string) {
  const response = await dedupeRequest(`inbox:conversation:${conversationId}`, () =>
    apiClient.get<InboxConversationResponse>(
      `/api/inbox/conversations/${conversationId}`,
    ),
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

export async function sendConversationImage(
  conversationId: string,
  file: File,
) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await apiClient.post<SendMessageResponse>(
    `/api/inbox/conversations/${conversationId}/attachments`,
    formData,
  );

  return response.data;
}

export async function getSavedReplies() {
  const response = await dedupeRequest("settings:saved-replies", () =>
    apiClient.get<SavedRepliesResponse>("/api/settings/saved-replies"),
  );
  return response.data.replies;
}

export async function logout() {
  await apiClient.post("/api/auth/logout");
}
