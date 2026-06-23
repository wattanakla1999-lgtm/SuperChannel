import "server-only";

import { prisma } from "@/server/database/prisma";
import type { AuthenticatedSession } from "@/server/auth/session";
import { isOwnerOrAdmin } from "@/server/auth/roles";
import type {
  CreateTagPayload,
  UpdateTagPayload,
  MergeTagsPayload,
  BulkTagsPayload,
  BulkTagsResult,
  TagTarget,
  Tag,
} from "@/features/tags/types/tags";
import { TagAssignmentSource, Prisma } from "@prisma/client";

function assertManageTags(session: AuthenticatedSession) {
  if (!isOwnerOrAdmin(session)) {
    const error = new Error("Only Owners and Admins can manage tag definitions.");
    error.name = "FORBIDDEN";
    throw error;
  }
}

export async function getTags(session: AuthenticatedSession, target?: TagTarget): Promise<Tag[]> {
  const tags = await prisma.tag.findMany({
    where: {
      organizationId: session.organizationId,
      ...(target && { target }),
    },
    include: {
      _count: {
        select: {
          customerTags: true,
          conversationTags: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return tags.map((t) => ({
    id: t.id,
    organizationId: t.organizationId,
    name: t.name,
    description: t.description,
    color: t.color,
    target: t.target as TagTarget,
    isArchived: t.isArchived,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    usageCount: t.target === "CUSTOMER" ? t._count.customerTags : t._count.conversationTags,
  }));
}

export async function createTag(
  session: AuthenticatedSession,
  payload: CreateTagPayload
): Promise<Tag> {
  assertManageTags(session);

  const tag = await prisma.$transaction(async (tx) => {
    const existing = await tx.tag.findFirst({
      where: {
        organizationId: session.organizationId,
        target: payload.target,
        name: {
          equals: payload.name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      const error = new Error("A tag with this name already exists for this target.");
      error.name = "CONFLICT";
      throw error;
    }

    const created = await tx.tag.create({
      data: {
        organizationId: session.organizationId,
        name: payload.name.trim(),
        description: payload.description,
        color: payload.color,
        target: payload.target,
      },
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId: created.id,
        action: "create",
        metadata: { payload: payload as unknown as Prisma.InputJsonValue },
      },
    });

    return created;
  });

  return {
    ...tag,
    target: tag.target as TagTarget,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
    usageCount: 0,
  };
}

export async function updateTag(
  session: AuthenticatedSession,
  tagId: string,
  payload: UpdateTagPayload
): Promise<Tag> {
  assertManageTags(session);

  const tag = await prisma.$transaction(async (tx) => {
    const existing = await tx.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing || existing.organizationId !== session.organizationId) {
      const error = new Error("Tag not found");
      error.name = "NOT_FOUND";
      throw error;
    }

    if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await tx.tag.findFirst({
        where: {
          organizationId: session.organizationId,
          target: existing.target,
          name: {
            equals: payload.name,
            mode: "insensitive",
          },
        },
      });

      if (duplicate) {
        const error = new Error("A tag with this name already exists.");
        error.name = "CONFLICT";
        throw error;
      }
    }

    const updated = await tx.tag.update({
      where: { id: tagId },
      data: {
        ...(payload.name && { name: payload.name.trim() }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.color !== undefined && { color: payload.color }),
        ...(payload.isArchived !== undefined && { isArchived: payload.isArchived }),
      },
      include: {
        _count: {
          select: {
            customerTags: true,
            conversationTags: true,
          },
        },
      },
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId: updated.id,
        action: payload.isArchived ? "archive" : "update",
        metadata: { payload: payload as unknown as Prisma.InputJsonValue },
      },
    });

    return updated;
  });

  return {
    ...tag,
    target: tag.target as TagTarget,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
    usageCount: tag.target === "CUSTOMER" ? tag._count.customerTags : tag._count.conversationTags,
  };
}

export async function mergeTags(
  session: AuthenticatedSession,
  payload: MergeTagsPayload
): Promise<void> {
  assertManageTags(session);

  await prisma.$transaction(async (tx) => {
    const source = await tx.tag.findUnique({
      where: { id: payload.sourceTagId },
    });
    const dest = await tx.tag.findUnique({
      where: { id: payload.destinationTagId },
    });

    if (!source || !dest || source.organizationId !== session.organizationId || dest.organizationId !== session.organizationId) {
      const error = new Error("Tag not found");
      error.name = "NOT_FOUND";
      throw error;
    }

    if (source.target !== dest.target) {
      const error = new Error("Cannot merge tags with different targets");
      error.name = "BAD_REQUEST";
      throw error;
    }

    if (source.target === "CUSTOMER") {
      const sourceAssignments = await tx.customerTag.findMany({
        where: { tagId: source.id },
      });
      for (const assign of sourceAssignments) {
        await tx.customerTag.upsert({
          where: {
            customerId_tagId: {
              customerId: assign.customerId,
              tagId: dest.id,
            },
          },
          create: {
            organizationId: session.organizationId,
            customerId: assign.customerId,
            tagId: dest.id,
            assignedByMemberId: session.accountId,
            source: TagAssignmentSource.MANUAL,
          },
          update: {},
        });
      }
    } else {
      const sourceAssignments = await tx.conversationTag.findMany({
        where: { tagId: source.id },
      });
      for (const assign of sourceAssignments) {
        await tx.conversationTag.upsert({
          where: {
            conversationId_tagId: {
              conversationId: assign.conversationId,
              tagId: dest.id,
            },
          },
          create: {
            organizationId: session.organizationId,
            conversationId: assign.conversationId,
            tagId: dest.id,
            assignedByMemberId: session.accountId,
            source: TagAssignmentSource.MANUAL,
          },
          update: {},
        });
      }
    }

    // Archive source tag
    await tx.tag.update({
      where: { id: source.id },
      data: { isArchived: true },
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId: dest.id,
        action: "merge",
        metadata: { sourceTagId: source.id },
      },
    });
  });
}

export async function assignTagToCustomer(
  session: AuthenticatedSession,
  customerId: string,
  tagId: string
) {
  await prisma.$transaction(async (tx) => {
    const tag = await tx.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.organizationId !== session.organizationId || tag.target !== "CUSTOMER") {
      const error = new Error("Invalid tag");
      error.name = "BAD_REQUEST";
      throw error;
    }
    if (tag.isArchived) {
      const error = new Error("Archived tags cannot be assigned");
      error.name = "BAD_REQUEST";
      throw error;
    }

    await tx.customerTag.upsert({
      where: {
        customerId_tagId: { customerId, tagId },
      },
      create: {
        organizationId: session.organizationId,
        customerId,
        tagId,
        assignedByMemberId: session.accountId,
        source: TagAssignmentSource.MANUAL,
      },
      update: {},
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId,
        action: "assign",
        targetId: customerId,
      },
    });
  });
}

export async function removeTagFromCustomer(
  session: AuthenticatedSession,
  customerId: string,
  tagId: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.customerTag.deleteMany({
      where: { customerId, tagId, organizationId: session.organizationId },
    });
    
    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId,
        action: "remove",
        targetId: customerId,
      },
    });
  });
}

export async function assignTagToConversation(
  session: AuthenticatedSession,
  conversationId: string,
  tagId: string
) {
  await prisma.$transaction(async (tx) => {
    const tag = await tx.tag.findUnique({ where: { id: tagId } });
    if (!tag || tag.organizationId !== session.organizationId || tag.target !== "CONVERSATION") {
      const error = new Error("Invalid tag");
      error.name = "BAD_REQUEST";
      throw error;
    }
    if (tag.isArchived) {
      const error = new Error("Archived tags cannot be assigned");
      error.name = "BAD_REQUEST";
      throw error;
    }

    await tx.conversationTag.upsert({
      where: {
        conversationId_tagId: { conversationId, tagId },
      },
      create: {
        organizationId: session.organizationId,
        conversationId,
        tagId,
        assignedByMemberId: session.accountId,
        source: TagAssignmentSource.MANUAL,
      },
      update: {},
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId,
        action: "assign",
        targetId: conversationId,
      },
    });
  });
}

export async function removeTagFromConversation(
  session: AuthenticatedSession,
  conversationId: string,
  tagId: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.conversationTag.deleteMany({
      where: { conversationId, tagId, organizationId: session.organizationId },
    });

    await tx.tagAuditLog.create({
      data: {
        organizationId: session.organizationId,
        actorMemberId: session.accountId,
        tagId,
        action: "remove",
        targetId: conversationId,
      },
    });
  });
}

export async function bulkAssignCustomerTags(
  session: AuthenticatedSession,
  payload: BulkTagsPayload
): Promise<BulkTagsResult> {
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const customerId of payload.customerIds) {
    for (const tagId of payload.tagIds) {
      try {
        await assignTagToCustomer(session, customerId, tagId);
        successful++;
      } catch (err) {
        const e = err as { message?: string };
        failed++;
        errors.push(`Customer ${customerId}, Tag ${tagId}: ${e.message}`);
      }
    }
  }

  return { successful, failed, errors };
}

export async function bulkRemoveCustomerTags(
  session: AuthenticatedSession,
  payload: BulkTagsPayload
): Promise<BulkTagsResult> {
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const customerId of payload.customerIds) {
    for (const tagId of payload.tagIds) {
      try {
        await removeTagFromCustomer(session, customerId, tagId);
        successful++;
      } catch (err) {
        const e = err as { message?: string };
        failed++;
        errors.push(`Customer ${customerId}, Tag ${tagId}: ${e.message}`);
      }
    }
  }

  return { successful, failed, errors };
}
