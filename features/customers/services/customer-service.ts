import { apiClient } from "@/lib/http/api-client";
import type {
  AddCustomerNoteInput,
  CustomerDetail,
  CustomerListResponse,
  CustomerQuery,
  UpdateCustomerInput,
} from "../types/customers";

function toQueryString(query: CustomerQuery) {
  const params = new URLSearchParams();

  if (query.search) {
    params.set("search", query.search);
  }

  if (query.channel && query.channel !== "all") {
    params.set("channel", query.channel);
  }

  if (query.tags && query.tags.length > 0) {
    query.tags.forEach(tag => params.append("tags", tag));
  }

  if (query.tagOperator) {
    params.set("tagOperator", query.tagOperator);
  }

  if (query.assignedAgent) {
    params.set("assignedAgent", query.assignedAgent);
  }

  if (query.status && query.status !== "all") params.append("status", query.status);

  if (query.page) {
    params.set("page", String(query.page));
  }

  if (query.pageSize) {
    params.set("pageSize", String(query.pageSize));
  }

  const search = params.toString();
  return search ? `?${search}` : "";
}

export async function getCustomers(query: CustomerQuery) {
  const response = await apiClient.get<CustomerListResponse>(
    `/api/customers${toQueryString(query)}`,
  );

  return response.data;
}

export async function getCustomer(customerId: string) {
  const response = await apiClient.get<CustomerDetail>(`/api/customers/${customerId}`);
  return response.data;
}

export async function updateCustomer(
  customerId: string,
  input: UpdateCustomerInput,
) {
  const response = await apiClient.patch<CustomerDetail>(
    `/api/customers/${customerId}`,
    input,
  );

  return response.data;
}

export async function addCustomerNote(
  customerId: string,
  input: AddCustomerNoteInput,
) {
  const response = await apiClient.post<CustomerDetail>(
    `/api/customers/${customerId}/notes`,
    input,
  );

  return response.data;
}
