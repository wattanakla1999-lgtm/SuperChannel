import "server-only";

import type { ConversationStatus } from "@prisma/client";
import { prisma } from "@/server/database/prisma";

type ListCustomersInput = {
  assignedMemberId?: string;
  organizationId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: ConversationStatus;
  tagNames?: string[];
};

export async function listCustomers({
  assignedMemberId,
  organizationId,
  page,
  pageSize,
  search,
  status,
  tagNames,
}: ListCustomersInput) {
  const where = {
    assignedMemberId,
    organizationId,
    status,
    tags: tagNames?.length
      ? {
          some: {
            tag: {
              name: {
                in: tagNames,
              },
            },
          },
        }
      : undefined,
    OR: search
      ? [
          {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            phone: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ]
      : undefined,
  };

  const [customers, totalItems] = await prisma.$transaction([
    prisma.customer.findMany({
      include: {
        assignedMember: {
          include: {
            profile: true,
          },
        },
        channelIdentities: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        lastInteractionAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    totalItems,
  };
}

export function getCustomerById(organizationId: string, customerId: string) {
  return prisma.customer.findFirst({
    include: {
      assignedMember: {
        include: {
          profile: true,
        },
      },
      channelIdentities: true,
      notesEntries: {
        include: {
          authorMember: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
    where: {
      id: customerId,
      organizationId,
    },
  });
}
