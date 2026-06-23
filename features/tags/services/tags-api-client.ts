import { apiClient } from "@/lib/http/api-client";
import type {
  Tag,
  CreateTagPayload,
  UpdateTagPayload,
  MergeTagsPayload,
  BulkTagsPayload,
  BulkTagsResult,
  TagTarget,
} from "../types/tags";

export async function fetchTags(target?: TagTarget): Promise<Tag[]> {
  const response = await apiClient.get<{ tags: Tag[] }>("/api/tags", {
    params: target ? { target } : undefined,
  });
  return response.data.tags;
}

export async function createTag(payload: CreateTagPayload): Promise<Tag> {
  const response = await apiClient.post<{ tag: Tag }>("/api/tags", payload);
  return response.data.tag;
}

export async function updateTag(tagId: string, payload: UpdateTagPayload): Promise<Tag> {
  const response = await apiClient.patch<{ tag: Tag }>(`/api/tags/${tagId}`, payload);
  return response.data.tag;
}

export async function archiveTag(tagId: string): Promise<Tag> {
  const response = await apiClient.post<{ tag: Tag }>(`/api/tags/${tagId}/archive`);
  return response.data.tag;
}

export async function mergeTags(payload: MergeTagsPayload): Promise<void> {
  await apiClient.post("/api/tags/merge", payload);
}

export async function assignTagToCustomer(customerId: string, tagId: string): Promise<void> {
  await apiClient.post(`/api/customers/${customerId}/tags/${tagId}`);
}

export async function removeTagFromCustomer(customerId: string, tagId: string): Promise<void> {
  await apiClient.delete(`/api/customers/${customerId}/tags/${tagId}`);
}

export async function assignTagToConversation(conversationId: string, tagId: string): Promise<void> {
  await apiClient.post(`/api/conversations/${conversationId}/tags/${tagId}`);
}

export async function removeTagFromConversation(conversationId: string, tagId: string): Promise<void> {
  await apiClient.delete(`/api/conversations/${conversationId}/tags/${tagId}`);
}

export async function bulkAssignCustomerTags(payload: BulkTagsPayload): Promise<BulkTagsResult> {
  const response = await apiClient.post<BulkTagsResult>("/api/customers/tags/bulk-assign", payload);
  return response.data;
}

export async function bulkRemoveCustomerTags(payload: BulkTagsPayload): Promise<BulkTagsResult> {
  const response = await apiClient.post<BulkTagsResult>("/api/customers/tags/bulk-remove", payload);
  return response.data;
}
