import { apiClient } from "@/lib/http/api-client";
import type {
  CommerceSummaryResponse,
  CustomerOrdersResponse,
  OrderDetailResponse,
  OrderInvoiceResponse,
} from "../types/orders";

export async function getCommerceSummary(customerId: string) {
  const response = await apiClient.get<CommerceSummaryResponse>(
    `/api/customers/${customerId}/commerce-summary`,
  );
  return response.data;
}

export async function getCustomerOrders(customerId: string) {
  const response = await apiClient.get<CustomerOrdersResponse>(
    `/api/customers/${customerId}/orders`,
  );
  return response.data;
}

export async function getOrder(orderId: string) {
  const response = await apiClient.get<OrderDetailResponse>(`/api/orders/${orderId}`);
  return response.data;
}

export async function getOrderInvoice(orderId: string) {
  const response = await apiClient.get<OrderInvoiceResponse>(
    `/api/orders/${orderId}/invoice`,
  );
  return response.data;
}
