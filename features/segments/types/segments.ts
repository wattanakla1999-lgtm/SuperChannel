import { Segment as PrismaSegment, SegmentMatch } from "@prisma/client";
import { SegmentCondition } from "../schemas/segment-conditions.schema";

export type { SegmentCondition };

export type Segment = Omit<PrismaSegment, "conditions"> & {
  conditions: SegmentCondition[];
};

export interface SegmentListResponse {
  data: Segment[];
  total: number;
}

export interface CreateSegmentInput {
  name: string;
  description?: string;
  matchType: SegmentMatch;
  conditions: SegmentCondition[];
}

export interface UpdateSegmentInput {
  name?: string;
  description?: string | null;
  matchType?: SegmentMatch;
  conditions?: SegmentCondition[];
}

export interface SegmentPreviewInput {
  matchType: SegmentMatch;
  conditions: SegmentCondition[];
}

export interface SegmentPreviewResult {
  count: number;
  previewCustomers: {
    id: string;
    name: string;
    avatarFallback: string | null;
  }[];
}
