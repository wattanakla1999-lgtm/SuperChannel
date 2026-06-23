import { apiClient } from "@/lib/http/api-client";
import {
  Segment,
  SegmentListResponse,
  CreateSegmentInput,
  UpdateSegmentInput,
  SegmentPreviewInput,
  SegmentPreviewResult,
} from "../types/segments";

export const segmentsApiClient = {
  async getSegments(params?: { search?: string; page?: number; limit?: number }) {
    const { data } = await apiClient.get<SegmentListResponse>("/api/segments", {
      params,
    });
    return data;
  },

  async getSegment(segmentId: string) {
    const { data } = await apiClient.get<Segment>(`/api/segments/${segmentId}`);
    return data;
  },

  async createSegment(input: CreateSegmentInput) {
    const { data } = await apiClient.post<Segment>("/api/segments", input);
    return data;
  },

  async updateSegment(segmentId: string, input: UpdateSegmentInput) {
    const { data } = await apiClient.put<Segment>(
      `/api/segments/${segmentId}`,
      input,
    );
    return data;
  },

  async duplicateSegment(segmentId: string) {
    const { data } = await apiClient.post<Segment>(
      `/api/segments/${segmentId}/duplicate`,
    );
    return data;
  },

  async archiveSegment(segmentId: string) {
    const { data } = await apiClient.post<{ success: boolean }>(
      `/api/segments/${segmentId}/archive`,
    );
    return data;
  },

  async previewSegment(input: SegmentPreviewInput) {
    const { data } = await apiClient.post<SegmentPreviewResult>(
      "/api/segments/preview",
      input,
    );
    return data;
  },
};
