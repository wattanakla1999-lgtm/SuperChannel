import "server-only";

import { prisma } from "@/server/database/prisma";

export function listCustomerOrders(organizationId: string, customerId: string) {
  return prisma.order.findMany({
    include: {
      invoice: {
        include: {
          lineItems: true,
        },
      },
      items: true,
    },
    orderBy: {
      orderedAt: "desc",
    },
    where: {
      customerId,
      organizationId,
    },
  });
}

export function getOrderById(organizationId: string, orderId: string) {
  return prisma.order.findFirst({
    include: {
      customer: true,
      invoice: {
        include: {
          lineItems: true,
        },
      },
      items: true,
    },
    where: {
      id: orderId,
      organizationId,
    },
  });
}
