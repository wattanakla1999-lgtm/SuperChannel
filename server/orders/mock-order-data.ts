import "server-only";

import type {
  CommerceSummary,
  InvoicePreview,
  OrderDetail,
  OrderHistoryEntry,
  OrderMarketplace,
  OrderStatus,
} from "@/features/orders/types/orders";
import type { IntegrationProvider, IntegrationStatus } from "@/features/integrations/types/integrations";
import {
  canAccessMockInboxCustomer,
  getMockCustomerProfile,
} from "@/server/customers/mock-customer-data";
import { listMockIntegrations } from "@/server/integrations/mock-integrations-data";

type StoredOrderItem = {
  discountAmount: number;
  id: string;
  name: string;
  quantity: number;
  sku: string;
  unitPrice: number;
};

type StoredOrder = {
  billingName: string;
  customerId: string;
  deliveryAddress: string;
  fulfillmentTimeline: Array<{
    description: string;
    timestamp: string;
    title: string;
  }>;
  id: string;
  invoice: InvoicePreview | null;
  items: StoredOrderItem[];
  marketplace: OrderMarketplace;
  orderedAt: string;
  orderNumber: string;
  paymentMethod: string;
  shippingFee: number;
  status: OrderStatus;
  subtotalAmount: number;
  totalAmount: number;
  trackingNumber: string | null;
};

type SessionOrderState = {
  firstLoadFailures: Map<string, number>;
  orders: Map<string, StoredOrder>;
};

const sessionStates = new Map<string, SessionOrderState>();

const marketplaceProviderMap: Record<
  Exclude<OrderMarketplace, "Direct Store">,
  IntegrationProvider
> = {
  Lazada: "lazada",
  Shopee: "shopee",
  "TikTok Shop": "tiktok-shop",
};

function createOrder(input: StoredOrder) {
  return [input.id, input] as const;
}

function createInitialOrders() {
  return new Map<string, StoredOrder>([
    createOrder({
      billingName: "Nina Tan",
      customerId: "cust-line-nina",
      deliveryAddress:
        "52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand",
      fulfillmentTimeline: [
        {
          description: "Payment captured from the customer's LINE checkout link.",
          timestamp: "2026-06-20T03:15:00.000Z",
          title: "Paid",
        },
        {
          description: "Operations approved same-day handling for the priority workspace add-on.",
          timestamp: "2026-06-20T03:25:00.000Z",
          title: "Processing",
        },
        {
          description: "Workspace access and onboarding handoff completed.",
          timestamp: "2026-06-20T04:00:00.000Z",
          title: "Delivered",
        },
      ],
      id: "order-nina-1003",
      invoice: {
        billedTo: {
          address:
            "52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand",
          email: "nina.tan@example.com",
          name: "Nina Tan",
          taxId: "0105559021431",
        },
        customerId: "cust-line-nina",
        id: "invoice-nina-1003",
        invoiceNumber: "INV-2026-1003",
        issuedAt: "2026-06-20T04:05:00.000Z",
        lineItems: [
          {
            amount: 2_000,
            description: "SC Messenger Hub Annual",
            quantity: 1,
          },
          {
            amount: 290,
            description: "Priority Support Add-on",
            quantity: 1,
          },
        ],
        notes: "Local mock invoice for workspace activation. No external tax service used.",
        orderId: "order-nina-1003",
        orderNumber: "SC-1003",
        paymentMethod: "LINE Pay",
        shippingFee: 0,
        subtotalAmount: 2_290,
        taxAmount: 160.3,
        taxRate: 0.07,
        totalAmount: 2_450.3,
      },
      items: [
        {
          discountAmount: 200,
          id: "item-nina-1003-1",
          name: "SC Messenger Hub Annual",
          quantity: 1,
          sku: "SC-HUB-ANNUAL",
          unitPrice: 2_200,
        },
        {
          discountAmount: 0,
          id: "item-nina-1003-2",
          name: "Priority Support Add-on",
          quantity: 1,
          sku: "SC-SUPPORT-PRIORITY",
          unitPrice: 290,
        },
      ],
      marketplace: "Direct Store",
      orderedAt: "2026-06-20T03:11:00.000Z",
      orderNumber: "SC-1003",
      paymentMethod: "LINE Pay",
      shippingFee: 0,
      status: "Delivered",
      subtotalAmount: 2_290,
      totalAmount: 2_450.3,
      trackingNumber: null,
    }),
    createOrder({
      billingName: "Nina Tan",
      customerId: "cust-line-nina",
      deliveryAddress:
        "52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand",
      fulfillmentTimeline: [
        {
          description: "Order imported from the Shopee historical commerce mock.",
          timestamp: "2026-06-18T01:30:00.000Z",
          title: "Paid",
        },
        {
          description: "Packed and handed to the marketplace courier.",
          timestamp: "2026-06-18T08:10:00.000Z",
          title: "Shipped",
        },
      ],
      id: "order-nina-1002",
      invoice: null,
      items: [
        {
          discountAmount: 50,
          id: "item-nina-1002-1",
          name: "Creator Comment Triage Pack",
          quantity: 1,
          sku: "SC-TRIAGE-PACK",
          unitPrice: 1_040,
        },
        {
          discountAmount: 0,
          id: "item-nina-1002-2",
          name: "Weekend Escalation Coverage",
          quantity: 1,
          sku: "SC-WEEKEND-COVER",
          unitPrice: 420,
        },
      ],
      marketplace: "Shopee",
      orderedAt: "2026-06-18T01:22:00.000Z",
      orderNumber: "SP-40219",
      paymentMethod: "ShopeePay",
      shippingFee: 35,
      status: "Shipped",
      subtotalAmount: 1_410,
      totalAmount: 1_445,
      trackingNumber: "SPXTH21061840219",
    }),
    createOrder({
      billingName: "Nina Tan",
      customerId: "cust-line-nina",
      deliveryAddress:
        "52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand",
      fulfillmentTimeline: [
        {
          description: "Historical Lazada order captured for refund reconciliation.",
          timestamp: "2026-06-10T09:00:00.000Z",
          title: "Paid",
        },
        {
          description: "Refund approved after duplicate plan purchase.",
          timestamp: "2026-06-11T10:40:00.000Z",
          title: "Refunded",
        },
      ],
      id: "order-nina-1001",
      invoice: {
        billedTo: {
          address:
            "52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand",
          email: "nina.tan@example.com",
          name: "Nina Tan",
          taxId: "0105559021431",
        },
        customerId: "cust-line-nina",
        id: "invoice-nina-1001",
        invoiceNumber: "INV-2026-1001",
        issuedAt: "2026-06-10T09:15:00.000Z",
        lineItems: [
          {
            amount: 890,
            description: "Duplicate Starter Automation Pack",
            quantity: 1,
          },
        ],
        notes: "Historical invoice retained after refund for support context only.",
        orderId: "order-nina-1001",
        orderNumber: "LZD-88214",
        paymentMethod: "Credit card",
        shippingFee: 0,
        subtotalAmount: 890,
        taxAmount: 62.3,
        taxRate: 0.07,
        totalAmount: 952.3,
      },
      items: [
        {
          discountAmount: 0,
          id: "item-nina-1001-1",
          name: "Starter Automation Pack",
          quantity: 1,
          sku: "SC-AUTO-STARTER",
          unitPrice: 890,
        },
      ],
      marketplace: "Lazada",
      orderedAt: "2026-06-10T08:54:00.000Z",
      orderNumber: "LZD-88214",
      paymentMethod: "Credit card",
      shippingFee: 0,
      status: "Refunded",
      subtotalAmount: 890,
      totalAmount: 952.3,
      trackingNumber: null,
    }),
    createOrder({
      billingName: "Aya Lim",
      customerId: "cust-ig-aya",
      deliveryAddress: "18 Tiong Bahru Road #09-03 Singapore 168731",
      fulfillmentTimeline: [
        {
          description: "Payment settled before refund review.",
          timestamp: "2026-06-17T05:05:00.000Z",
          title: "Paid",
        },
        {
          description: "Refund issued after a duplicate asset request.",
          timestamp: "2026-06-18T02:20:00.000Z",
          title: "Refunded",
        },
      ],
      id: "order-aya-2001",
      invoice: {
        billedTo: {
          address: "18 Tiong Bahru Road #09-03 Singapore 168731",
          email: "aya.lim@example.com",
          name: "Aya Lim",
          taxId: "N/A",
        },
        customerId: "cust-ig-aya",
        id: "invoice-aya-2001",
        invoiceNumber: "INV-2026-2001",
        issuedAt: "2026-06-17T05:15:00.000Z",
        lineItems: [
          {
            amount: 590,
            description: "Creative Refresh Bundle",
            quantity: 1,
          },
        ],
        notes: "Retained for refund audit in this deterministic mock session.",
        orderId: "order-aya-2001",
        orderNumber: "SC-2001",
        paymentMethod: "Visa",
        shippingFee: 0,
        subtotalAmount: 590,
        taxAmount: 41.3,
        taxRate: 0.07,
        totalAmount: 631.3,
      },
      items: [
        {
          discountAmount: 0,
          id: "item-aya-2001-1",
          name: "Creative Refresh Bundle",
          quantity: 1,
          sku: "SC-CREATIVE-REFRESH",
          unitPrice: 590,
        },
      ],
      marketplace: "Direct Store",
      orderedAt: "2026-06-17T05:01:00.000Z",
      orderNumber: "SC-2001",
      paymentMethod: "Visa",
      shippingFee: 0,
      status: "Refunded",
      subtotalAmount: 590,
      totalAmount: 631.3,
      trackingNumber: null,
    }),
    createOrder({
      billingName: "Aya Lim",
      customerId: "cust-ig-aya",
      deliveryAddress: "18 Tiong Bahru Road #09-03 Singapore 168731",
      fulfillmentTimeline: [
        {
          description: "Order reserved before the customer cancelled from TikTok Shop.",
          timestamp: "2026-06-19T06:10:00.000Z",
          title: "Pending",
        },
        {
          description: "Marketplace cancellation synced into the mock inbox context.",
          timestamp: "2026-06-19T07:00:00.000Z",
          title: "Cancelled",
        },
      ],
      id: "order-aya-2002",
      invoice: null,
      items: [
        {
          discountAmount: 20,
          id: "item-aya-2002-1",
          name: "Launch Image Resend Pack",
          quantity: 1,
          sku: "SC-LAUNCH-RESEND",
          unitPrice: 240,
        },
      ],
      marketplace: "TikTok Shop",
      orderedAt: "2026-06-19T06:05:00.000Z",
      orderNumber: "TTS-51008",
      paymentMethod: "TikTok Wallet",
      shippingFee: 0,
      status: "Cancelled",
      subtotalAmount: 220,
      totalAmount: 220,
      trackingNumber: null,
    }),
    createOrder({
      billingName: "Jonas Holt",
      customerId: "cust-tg-jonas",
      deliveryAddress: "47 Clarence Street, Sydney NSW 2000 Australia",
      fulfillmentTimeline: [
        {
          description: "Invoice generated for incident reporting package renewal.",
          timestamp: "2026-06-20T11:02:00.000Z",
          title: "Paid",
        },
        {
          description: "Ops team queued the workspace export and routing update.",
          timestamp: "2026-06-20T11:35:00.000Z",
          title: "Processing",
        },
      ],
      id: "order-jonas-3001",
      invoice: {
        billedTo: {
          address: "47 Clarence Street, Sydney NSW 2000 Australia",
          email: "jonas.holt@example.com",
          name: "Jonas Holt",
          taxId: "AUS-MOCK-3001",
        },
        customerId: "cust-tg-jonas",
        id: "invoice-jonas-3001",
        invoiceNumber: "INV-2026-3001",
        issuedAt: "2026-06-20T11:03:00.000Z",
        lineItems: [
          {
            amount: 1_490,
            description: "Incident Dashboard Plus",
            quantity: 1,
          },
          {
            amount: 180,
            description: "Ops Escalation Routing Template",
            quantity: 1,
          },
        ],
        notes: "Read-only preview generated from deterministic mock order data.",
        orderId: "order-jonas-3001",
        orderNumber: "SC-3001",
        paymentMethod: "Bank transfer",
        shippingFee: 0,
        subtotalAmount: 1_670,
        taxAmount: 116.9,
        taxRate: 0.07,
        totalAmount: 1_786.9,
      },
      items: [
        {
          discountAmount: 0,
          id: "item-jonas-3001-1",
          name: "Incident Dashboard Plus",
          quantity: 1,
          sku: "SC-INCIDENT-PLUS",
          unitPrice: 1_490,
        },
        {
          discountAmount: 0,
          id: "item-jonas-3001-2",
          name: "Ops Escalation Routing Template",
          quantity: 1,
          sku: "SC-OPS-ROUTING",
          unitPrice: 180,
        },
      ],
      marketplace: "Direct Store",
      orderedAt: "2026-06-20T11:00:00.000Z",
      orderNumber: "SC-3001",
      paymentMethod: "Bank transfer",
      shippingFee: 0,
      status: "Processing",
      subtotalAmount: 1_670,
      totalAmount: 1_786.9,
      trackingNumber: null,
    }),
  ]);
}

function getSessionState(sessionId: string) {
  const existing = sessionStates.get(sessionId);

  if (existing) {
    return existing;
  }

  const nextState = {
    firstLoadFailures: new Map<string, number>([["cust-tg-jonas", 2]]),
    orders: createInitialOrders(),
  } satisfies SessionOrderState;

  sessionStates.set(sessionId, nextState);
  return nextState;
}

function buildError(name: string, message: string) {
  const error = new Error(message);
  error.name = name;
  return error;
}

async function getIntegrationStatusMap(sessionId: string) {
  const integrations = await listMockIntegrations(sessionId);

  return new Map(integrations.map((integration) => [integration.id, integration.status]));
}

function getMarketplaceIntegrationStatus(
  marketplace: OrderMarketplace,
  integrationStatuses: Map<IntegrationProvider, IntegrationStatus>,
) {
  if (marketplace === "Direct Store") {
    return "connected" satisfies IntegrationStatus;
  }

  const provider = marketplaceProviderMap[marketplace];
  return integrationStatuses.get(provider) ?? "disconnected";
}

function toHistoryEntry(
  order: StoredOrder,
  integrationStatuses: Map<IntegrationProvider, IntegrationStatus>,
): OrderHistoryEntry {
  return {
    customerId: order.customerId,
    hasInvoice: Boolean(order.invoice),
    id: order.id,
    integrationStatus: getMarketplaceIntegrationStatus(
      order.marketplace,
      integrationStatuses,
    ),
    itemCount: order.items.reduce((total, item) => total + item.quantity, 0),
    marketplace: order.marketplace,
    orderedAt: order.orderedAt,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
  };
}

function toOrderDetail(
  order: StoredOrder,
  integrationStatuses: Map<IntegrationProvider, IntegrationStatus>,
): OrderDetail {
  return {
    billingName: order.billingName,
    customerId: order.customerId,
    deliveryAddress: order.deliveryAddress,
    fulfillmentTimeline: order.fulfillmentTimeline.map((entry) => ({ ...entry })),
    hasInvoice: Boolean(order.invoice),
    id: order.id,
    integrationStatus: getMarketplaceIntegrationStatus(
      order.marketplace,
      integrationStatuses,
    ),
    invoiceId: order.invoice?.id ?? null,
    items: order.items.map((item) => ({ ...item })),
    marketplace: order.marketplace,
    orderNumber: order.orderNumber,
    orderedAt: order.orderedAt,
    paymentMethod: order.paymentMethod,
    shippingFee: order.shippingFee,
    status: order.status,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    trackingNumber: order.trackingNumber,
  };
}

function assertAccessibleCustomer(sessionId: string, customerId: string) {
  const customer = getMockCustomerProfile(sessionId, customerId);

  if (!customer) {
    throw buildError("NOT_FOUND", "Customer not found.");
  }

  if (!canAccessMockInboxCustomer(sessionId, customerId)) {
    throw buildError("FORBIDDEN", "You do not have access to this customer's commerce data.");
  }

  return customer;
}

function getCustomerOrders(state: SessionOrderState, customerId: string) {
  return Array.from(state.orders.values())
    .filter((order) => order.customerId === customerId)
    .sort((left, right) => right.orderedAt.localeCompare(left.orderedAt));
}

function maybeFailCustomerOrders(sessionId: string, customerId: string) {
  const state = getSessionState(sessionId);
  const remainingFailures = state.firstLoadFailures.get(customerId) ?? 0;

  if (remainingFailures <= 0) {
    return;
  }

  state.firstLoadFailures.set(customerId, remainingFailures - 1);
  throw buildError("TEMPORARY_UNAVAILABLE", "Commerce history is temporarily unavailable.");
}

export async function getMockCommerceSummary(sessionId: string, customerId: string, timezone: string) {
  assertAccessibleCustomer(sessionId, customerId);

  const orders = getCustomerOrders(getSessionState(sessionId), customerId);
  const totalSpend = orders.reduce((total, order) => total + order.totalAmount, 0);

  return {
    averageOrderValue: orders.length > 0 ? totalSpend / orders.length : 0,
    customerId,
    lastPurchaseAt: orders[0]?.orderedAt ?? null,
    timezone,
    totalOrders: orders.length,
    totalSpend,
  } satisfies CommerceSummary;
}

export async function listMockCustomerOrders(
  sessionId: string,
  customerId: string,
) {
  assertAccessibleCustomer(sessionId, customerId);
  maybeFailCustomerOrders(sessionId, customerId);

  const integrationStatuses = await getIntegrationStatusMap(sessionId);

  return getCustomerOrders(getSessionState(sessionId), customerId).map((order) =>
    toHistoryEntry(order, integrationStatuses),
  );
}

export async function getMockOrderDetail(sessionId: string, orderId: string) {
  const order = getSessionState(sessionId).orders.get(orderId);

  if (!order) {
    throw buildError("NOT_FOUND", "Order not found.");
  }

  assertAccessibleCustomer(sessionId, order.customerId);
  const integrationStatuses = await getIntegrationStatusMap(sessionId);

  return toOrderDetail(order, integrationStatuses);
}

export async function getMockOrderInvoice(sessionId: string, orderId: string) {
  const order = getSessionState(sessionId).orders.get(orderId);

  if (!order) {
    throw buildError("NOT_FOUND", "Order not found.");
  }

  assertAccessibleCustomer(sessionId, order.customerId);
  return order.invoice ? { ...order.invoice, billedTo: { ...order.invoice.billedTo }, lineItems: order.invoice.lineItems.map((item) => ({ ...item })) } : null;
}
