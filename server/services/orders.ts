import "server-only";

import { prisma } from "@/server/database/prisma";
import type {
  CommerceSummaryResponse,
  CustomerOrdersResponse,
  OrderDetailResponse,
  OrderInvoiceResponse,
} from "@/features/orders/types/orders";
import type { AuthenticatedSession } from "@/server/auth/session";

function marketplaceLabel(value: "SHOPEE" | "LAZADA" | "TIKTOK_SHOP" | "DIRECT_STORE") {
  switch (value) {
    case "SHOPEE":
      return "Shopee";
    case "LAZADA":
      return "Lazada";
    case "TIKTOK_SHOP":
      return "TikTok Shop";
    case "DIRECT_STORE":
      return "Direct Store";
  }
}

function integrationStatusForMarketplace(value: "SHOPEE" | "LAZADA" | "TIKTOK_SHOP" | "DIRECT_STORE") {
  return value === "DIRECT_STORE" ? "connected" : "coming_soon";
}

function orderStatusLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export async function getCommerceSummaryFromDatabase(
  session: AuthenticatedSession,
  customerId: string,
  timezone: string,
): Promise<CommerceSummaryResponse> {
  const orders = await prisma.order.findMany({
    orderBy: { orderedAt: "desc" },
    where: {
      customerId,
      organizationId: session.organizationId,
    },
  });

  const totalSpend = orders.reduce((total, order) => total + Number(order.totalAmount), 0);

  return {
    averageOrderValue: orders.length > 0 ? totalSpend / orders.length : 0,
    customerId,
    lastPurchaseAt: orders[0]?.orderedAt.toISOString() ?? null,
    timezone,
    totalOrders: orders.length,
    totalSpend,
  };
}

export async function listCustomerOrdersFromDatabase(
  session: AuthenticatedSession,
  customerId: string,
  timezone: string,
): Promise<CustomerOrdersResponse> {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      invoice: true,
    },
    orderBy: { orderedAt: "desc" },
    where: {
      customerId,
      organizationId: session.organizationId,
    },
  });

  return {
    orders: orders.map((order) => ({
      customerId: order.customerId,
      hasInvoice: Boolean(order.invoice),
      id: order.id,
      integrationStatus: integrationStatusForMarketplace(order.marketplace),
      itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
      marketplace: marketplaceLabel(order.marketplace),
      orderedAt: order.orderedAt.toISOString(),
      orderNumber: order.orderNumber,
      status: orderStatusLabel(order.status) as never,
      totalAmount: Number(order.totalAmount),
    })),
    timezone,
  };
}

export async function getOrderDetailFromDatabase(
  session: AuthenticatedSession,
  orderId: string,
  timezone: string,
): Promise<OrderDetailResponse | null> {
  const order = await prisma.order.findFirst({
    include: {
      invoice: true,
      items: true,
    },
    where: {
      id: orderId,
      organizationId: session.organizationId,
    },
  });

  if (!order) {
    return null;
  }

  return {
    billingName: order.billingName,
    customerId: order.customerId,
    deliveryAddress: order.deliveryAddress,
    fulfillmentTimeline: order.fulfillmentTimeline as OrderDetailResponse["fulfillmentTimeline"],
    hasInvoice: Boolean(order.invoice),
    id: order.id,
    integrationStatus: integrationStatusForMarketplace(order.marketplace),
    invoiceId: order.invoice?.id ?? null,
    items: order.items.map((item) => ({
      discountAmount: Number(item.discountAmount),
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      sku: item.sku,
      unitPrice: Number(item.unitPrice),
    })),
    marketplace: marketplaceLabel(order.marketplace),
    orderedAt: order.orderedAt.toISOString(),
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    shippingFee: Number(order.shippingFee),
    status: orderStatusLabel(order.status) as never,
    subtotalAmount: Number(order.subtotalAmount),
    timezone,
    totalAmount: Number(order.totalAmount),
    trackingNumber: order.trackingNumber,
  };
}

export async function getOrderInvoiceFromDatabase(
  session: AuthenticatedSession,
  orderId: string,
  timezone: string,
): Promise<OrderInvoiceResponse | null> {
  const invoice = await prisma.invoice.findFirst({
    include: {
      lineItems: true,
      order: true,
    },
    where: {
      orderId,
      organizationId: session.organizationId,
    },
  });

  return {
    invoice: invoice
      ? {
          billedTo: {
            address: invoice.billedToAddress,
            email: invoice.billedToEmail ?? "",
            name: invoice.billedToName,
            taxId: invoice.billedToTaxId ?? "",
          },
          customerId: invoice.customerId,
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          issuedAt: invoice.issuedAt.toISOString(),
          lineItems: invoice.lineItems.map((item) => ({
            amount: Number(item.amount),
            description: item.description,
            quantity: item.quantity,
          })),
          notes: invoice.notes ?? "",
          orderId: invoice.orderId,
          orderNumber: invoice.order.orderNumber,
          paymentMethod: invoice.paymentMethod,
          shippingFee: Number(invoice.shippingFee),
          subtotalAmount: Number(invoice.subtotalAmount),
          taxAmount: Number(invoice.taxAmount),
          taxRate: Number(invoice.taxRate),
          totalAmount: Number(invoice.totalAmount),
        }
      : null,
    timezone,
  };
}
