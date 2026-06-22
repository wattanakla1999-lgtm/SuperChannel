import { apiClient } from "@/lib/http/api-client";
import type {
  PublishingCreateInput,
  PublishingCreateResponse,
  PublishingPostsResponse,
  PublishingPublishResponse,
} from "../types/publishing";

export async function getPublishingPosts() {
  const response =
    await apiClient.get<PublishingPostsResponse>("/api/publishing/posts");
  return response.data.posts;
}

export async function createPublishingPost(input: PublishingCreateInput) {
  const response = await apiClient.post<PublishingCreateResponse>(
    "/api/publishing/posts",
    input,
  );
  return response.data.post;
}

export async function publishExistingPost(postId: string) {
  const response = await apiClient.post<PublishingPublishResponse>(
    `/api/publishing/posts/${postId}/publish`,
  );
  return response.data.post;
}
