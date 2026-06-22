import "server-only";

import { prisma } from "@/server/database/prisma";

export function listConversations(organizationId: string) {
  return prisma.conversation.findMany({
    include: {
      assignedMember: {
        include: {
          profile: true,
        },
      },
      customer: true,
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    where: { organizationId },
  });
}

export function getConversationById(organizationId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    include: {
      assignedMember: {
        include: {
          profile: true,
        },
      },
      customer: {
        include: {
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
      },
      messages: {
        include: {
          attachments: true,
          senderMember: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    where: {
      id: conversationId,
      organizationId,
    },
  });
}
