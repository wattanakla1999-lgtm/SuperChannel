import type { IntegrationStatus } from "@/features/integrations/types/integrations";

export type OrderStatus =
  | "Pending"
  | "Paid"
  | "Processing"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Refunded";

export type OrderMarketplace =
  | "Shopee"
  | "Lazada"
  | "TikTok Shop"
  | "Direct Store";

export type CommerceSummary = {
  customerId: string;
  lastPurchaseAt: string | null;
  timezone: string;
  totalOrders: number;
  totalSpend: number;
  averageOrderValue: number;
};

export type CommerceSummaryResponse = CommerceSummary;

export type OrderHistoryEntry = {
  customerId: string;
  hasInvoice: boolean;
  id: string;
  integrationStatus: IntegrationStatus;
  itemCount: number;
  marketplace: OrderMarketplace;
  orderedAt: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
};

export type CustomerOrdersResponse = {
  orders: OrderHistoryEntry[];
  timezone: string;
};

export type OrderLineItem = {
  discountAmount: number;
  id: string;
  name: string;
  quantity: number;
  sku: string;
  unitPrice: number;
};

export type OrderTimelineEntry = {
  description: string;
  timestamp: string;
  title: string;
};

export type OrderDetail = {
  billingName: string;
  customerId: string;
  deliveryAddress: string;
  fulfillmentTimeline: OrderTimelineEntry[];
  hasInvoice: boolean;
  id: string;
  integrationStatus: IntegrationStatus;
  invoiceId: string | null;
  items: OrderLineItem[];
  marketplace: OrderMarketplace;
  orderNumber: string;
  orderedAt: string;
  paymentMethod: string;
  shippingFee: number;
  status: OrderStatus;
  subtotalAmount: number;
  totalAmount: number;
  trackingNumber: string | null;
};

export type OrderDetailResponse = OrderDetail & {
  timezone: string;
};

export type InvoicePreview = {
  billedTo: {
    address: string;
    email: string;
    name: string;
    taxId: string;
  };
  customerId: string;
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  lineItems: Array<{
    amount: number;
    description: string;
    quantity: number;
  }>;
  notes: string;
  orderId: string;
  orderNumber: string;
  paymentMethod: string;
  shippingFee: number;
  subtotalAmount: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
};

export type OrderInvoiceResponse = {
  invoice: InvoicePreview | null;
  timezone: string;
};
