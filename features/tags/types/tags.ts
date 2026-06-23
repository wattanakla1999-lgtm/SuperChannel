import { TagTarget, TagAssignmentSource } from "@prisma/client";

export type { TagTarget, TagAssignmentSource };

export interface Tag {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  color: string | null;
  target: TagTarget;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface CreateTagPayload {
  name: string;
  description?: string | null;
  color?: string | null;
  target: TagTarget;
}

export interface UpdateTagPayload {
  name?: string;
  description?: string | null;
  color?: string | null;
  isArchived?: boolean;
}

export interface MergeTagsPayload {
  sourceTagId: string;
  destinationTagId: string;
}

export interface BulkTagsPayload {
  customerIds: string[];
  tagIds: string[];
}

export interface BulkTagsResult {
  successful: number;
  failed: number;
  errors?: string[];
}
