"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Spinner } from "@/components/ui/spinner";
import { classNames } from "@/lib/class-names";
import { ApiError } from "@/lib/http/api-error";
import {
  getCommerceSummary,
  getCustomerOrders,
  getOrder,
  getOrderInvoice,
} from "../services/order-service";
import type {
  CommerceSummary,
  OrderDetail,
  OrderHistoryEntry,
  OrderInvoiceResponse,
  OrderStatus,
} from "../types/orders";

const statusOptions: Array<{ label: string; value: OrderStatus | "all" }> = [
  { label: "All statuses", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Paid", value: "Paid" },
  { label: "Processing", value: "Processing" },
  { label: "Shipped", value: "Shipped" },
  { label: "Delivered", value: "Delivered" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Refunded", value: "Refunded" },
];

const statusClasses: Record<OrderStatus, string> = {
  Cancelled: "bg-rose-100 text-rose-700",
  Delivered: "bg-emerald-100 text-emerald-700",
  Paid: "bg-cyan-100 text-cyan-700",
  Pending: "bg-amber-100 text-amber-700",
  Processing: "bg-violet-100 text-violet-700",
  Refunded: "bg-slate-200 text-slate-700",
  Shipped: "bg-blue-100 text-blue-700",
};

const marketplaceClasses: Record<string, string> = {
  "Direct Store": "bg-slate-950 text-white dark:bg-slate-100 dark:text-slate-950",
  Lazada: "bg-indigo-100 text-indigo-700",
  Shopee: "bg-orange-100 text-orange-700",
  "TikTok Shop": "bg-pink-100 text-pink-700",
};

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function isForbidden(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "THB",
    style: "currency",
  }).format(value);
}

function formatDateTime(value: string | null, timezone: string, options?: Intl.DateTimeFormatOptions) {
  if (!value) {
    return "No purchases yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: timezone,
    year: "numeric",
    ...options,
  }).format(new Date(value));
}

function formatCompactDate(value: string, timezone: string) {
  return formatDateTime(value, timezone, {
    day: "numeric",
    month: "short",
    timeZone: timezone,
    year: "numeric",
  });
}

function toPlainInvoiceText(order: OrderDetail, invoice: NonNullable<OrderInvoiceResponse["invoice"]>, timezone: string) {
  const lines = [
    `Invoice ${invoice.invoiceNumber}`,
    `Order ${order.orderNumber}`,
    `Issued ${formatDateTime(invoice.issuedAt, timezone)}`,
    "",
    `Billed to: ${invoice.billedTo.name}`,
    invoice.billedTo.address,
    invoice.billedTo.email,
    `Tax ID: ${invoice.billedTo.taxId}`,
    "",
    ...invoice.lineItems.map(
      (item) => `${item.description} x${item.quantity} - ${formatCurrency(item.amount)}`,
    ),
    "",
    `Subtotal: ${formatCurrency(invoice.subtotalAmount)}`,
    `Shipping: ${formatCurrency(invoice.shippingFee)}`,
    `Tax: ${formatCurrency(invoice.taxAmount)}`,
    `Total: ${formatCurrency(invoice.totalAmount)}`,
    "",
    invoice.notes,
  ];

  return lines.join("\n");
}

type CustomerOrdersPanelProps = {
  customerId: string;
  customerName: string;
};

export function CustomerOrdersPanel({
  customerId,
  customerName,
}: CustomerOrdersPanelProps) {
  const [summary, setSummary] = useState<CommerceSummary | null>(null);
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [invoice, setInvoice] = useState<OrderInvoiceResponse["invoice"]>(null);
  const [timezone, setTimezone] = useState("Asia/Bangkok");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbiddenState, setIsForbiddenState] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadCommerce() {
      try {
        const [nextSummary, nextOrdersResponse] = await Promise.all([
          getCommerceSummary(customerId),
          getCustomerOrders(customerId),
        ]);

        if (!isMounted) {
          return;
        }

        setSummary(nextSummary);
        setOrders(nextOrdersResponse.orders);
        setTimezone(nextSummary.timezone || nextOrdersResponse.timezone);
        setSelectedOrderId(nextOrdersResponse.orders[0]?.id ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setIsForbiddenState(isForbidden(error));
        setError(
          isUnauthorized(error)
            ? "Your session has expired. Please sign in again."
            : error instanceof ApiError
              ? error.message
              : "We couldn't load this customer's commerce data.",
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCommerce();

    return () => {
      isMounted = false;
    };
  }, [customerId, retryToken]);

  const visibleOrders = orders
    .filter((order) => statusFilter === "all" || order.status === statusFilter)
    .sort((left, right) =>
      sortOrder === "newest"
        ? right.orderedAt.localeCompare(left.orderedAt)
        : left.orderedAt.localeCompare(right.orderedAt),
    );
  const resolvedSelectedOrderId =
    selectedOrderId && visibleOrders.some((order) => order.id === selectedOrderId)
      ? selectedOrderId
      : visibleOrders[0]?.id ?? null;

  useEffect(() => {
    if (!resolvedSelectedOrderId) {
      return;
    }

    let isMounted = true;

    async function loadDetail() {
      try {
        const nextOrder = await getOrder(resolvedSelectedOrderId);

        if (!isMounted) {
          return;
        }

        setOrderDetail(nextOrder);
        setTimezone(nextOrder.timezone);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setError(
          error instanceof ApiError
            ? error.message
            : "We couldn't load order details right now.",
        );
      }
    }

    void loadDetail();

    return () => {
      isMounted = false;
    };
  }, [resolvedSelectedOrderId]);

  useEffect(() => {
    if (!resolvedSelectedOrderId) {
      return;
    }

    const selectedSummary = orders.find((order) => order.id === resolvedSelectedOrderId);

    if (!selectedSummary?.hasInvoice) {
      return;
    }

    let isMounted = true;

    async function loadInvoice() {
      try {
        const response = await getOrderInvoice(resolvedSelectedOrderId);

        if (!isMounted) {
          return;
        }

        setInvoice(response.invoice);
        setTimezone(response.timezone);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setInvoice(null);
        setError(
          error instanceof ApiError
            ? error.message
            : "We couldn't load the invoice preview.",
        );
      }
    }

    void loadInvoice();

    return () => {
      isMounted = false;
    };
  }, [orders, resolvedSelectedOrderId]);

  const selectedOrderSummary =
    resolvedSelectedOrderId
      ? orders.find((order) => order.id === resolvedSelectedOrderId) ?? null
      : null;
  const isDetailLoading =
    Boolean(resolvedSelectedOrderId) &&
    orderDetail?.id !== resolvedSelectedOrderId;
  const isInvoiceLoading =
    Boolean(selectedOrderSummary?.hasInvoice) &&
    invoice?.orderId !== resolvedSelectedOrderId;

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);

    if (resolvedSelectedOrderId !== orderId) {
      setOrderDetail(null);
      setInvoice(null);
    }
  };

  const handlePrintInvoice = () => {
    if (!orderDetail || !invoice) {
      return;
    }

    const nextWindow = window.open("", "_blank", "noopener,noreferrer");

    if (!nextWindow) {
      return;
    }

    nextWindow.document.write(
      `<pre style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; padding: 24px;">${toPlainInvoiceText(orderDetail, invoice, timezone)}</pre>`,
    );
    nextWindow.document.close();
    nextWindow.focus();
    nextWindow.print();
  };

  const handleDownloadInvoice = () => {
    if (!orderDetail || !invoice) {
      return;
    }

    const blob = new Blob([toPlainInvoiceText(orderDetail, invoice, timezone)], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${invoice.invoiceNumber}.txt`;
    link.click();
    URL.revokeObjectURL(objectUrl);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
        Loading customer commerce...
      </div>
    );
  }

  if (isForbiddenState) {
    return (
      <ErrorState
        description={error ?? "You do not have access to this customer's commerce data."}
        title="Commerce access is restricted"
      />
    );
  }

  if (error && orders.length === 0 && summary === null) {
    return (
      <ErrorState
        actionLabel="Retry"
        description={error}
        onAction={() => {
          setSummary(null);
          setOrders([]);
          setSelectedOrderId(null);
          setOrderDetail(null);
          setInvoice(null);
          setError(null);
          setIsForbiddenState(false);
          setIsLoading(true);
          setRetryToken((current) => current + 1);
        }}
        testId="orders-retry-button"
        title="Orders unavailable"
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto pr-1">
        <section
          data-testid="purchase-summary"
          className="grid gap-3 sm:grid-cols-2"
        >
          <SummaryCard label="Total orders" value={String(summary?.totalOrders ?? 0)} />
          <SummaryCard
            label="Total spend"
            value={formatCurrency(summary?.totalSpend ?? 0)}
          />
          <SummaryCard
            label="Average order value"
            value={formatCurrency(summary?.averageOrderValue ?? 0)}
          />
          <SummaryCard
            label="Last purchase"
            value={formatDateTime(summary?.lastPurchaseAt ?? null, timezone, {
              day: "numeric",
              month: "short",
              timeZone: timezone,
              year: "numeric",
            })}
          />
        </section>

        <section className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              Order history
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Read-only marketplace and direct store purchases for {customerName}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span className="mb-1 block">Status</span>
              <select
                aria-label="Order status filter"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as OrderStatus | "all")
                }
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span className="mb-1 block">Sort</span>
              <select
                aria-label="Order sort"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>

        <div data-testid="order-history" className="space-y-3">
          {orders.length === 0 ? (
            <EmptyState
              description="This customer has not placed any mock marketplace or direct-store orders yet."
              title="No purchase history yet"
            />
          ) : visibleOrders.length === 0 ? (
            <EmptyState
              description="Try another status filter to see matching purchases."
              title="No orders match this filter"
            />
          ) : (
            visibleOrders.map((order) => (
              <article
                key={order.id}
                data-testid={`order-row-${order.id}`}
                className={classNames(
                  "min-h-[8.5rem] overflow-hidden rounded-[1.5rem] border p-4 transition",
                  selectedOrderId === order.id
                    ? "border-cyan-200 bg-cyan-50 dark:border-cyan-700 dark:bg-cyan-950/30"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
                )}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={classNames(
                            "rounded-full px-2 py-1 text-[11px] font-semibold",
                            marketplaceClasses[order.marketplace],
                          )}
                        >
                          {order.marketplace}
                        </span>
                        <span
                          className={classNames(
                            "rounded-full px-2 py-1 text-[11px] font-semibold",
                            statusClasses[order.status],
                          )}
                        >
                          {order.status}
                        </span>
                        {order.integrationStatus !== "connected" ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                            Historical data
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                          {order.orderNumber}
                        </p>
                        <p className="break-words text-sm text-slate-500 dark:text-slate-400">
                          {formatCompactDate(order.orderedAt, timezone)} · {order.itemCount} items
                        </p>
                      </div>
                    </div>
                    <div className="min-w-0 sm:text-right">
                      <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.hasInvoice ? (
                        <Button
                          className="mt-3 w-full sm:w-auto"
                          data-testid={`view-invoice-${order.id}`}
                          variant="secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSelectOrder(order.id);
                          }}
                        >
                          View invoice
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </button>
              </article>
            ))
          )}
        </div>
        </section>

        {selectedOrderSummary ? (
          <section
            data-testid="order-details"
            className="w-full max-w-full space-y-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
          >
          {isDetailLoading || !orderDetail ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
              Loading order details...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-lg font-semibold text-slate-950 dark:text-slate-100">
                    {orderDetail.orderNumber}
                  </p>
                  <p className="break-words text-sm text-slate-500 dark:text-slate-400">
                    {orderDetail.marketplace} · {formatDateTime(orderDetail.orderedAt, timezone)}
                  </p>
                </div>
                {orderDetail.integrationStatus !== "connected" ? (
                  <span className="max-w-full break-words rounded-full bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
                    Historical data from a disconnected marketplace mock
                  </span>
                ) : null}
              </div>

              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
                <InfoBlock label="Payment method" value={orderDetail.paymentMethod} />
                <InfoBlock
                  label="Tracking number"
                  value={orderDetail.trackingNumber ?? "Not available"}
                />
                <InfoBlock label="Billing name" value={orderDetail.billingName} />
                <InfoBlock label="Delivery address" value={orderDetail.deliveryAddress} />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Items
                </p>
                <div className="space-y-3">
                  {orderDetail.items.map((item) => (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                            {item.name}
                          </p>
                          <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                            SKU {item.sku} · Qty {item.quantity}
                          </p>
                        </div>
                        <div className="min-w-0 text-sm text-slate-700 dark:text-slate-300 sm:text-right">
                          <p>{formatCurrency(item.unitPrice)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Discount {formatCurrency(item.discountAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex w-full max-w-full flex-col gap-4">
                <section
                  data-testid="fulfillment-timeline-card"
                  className="w-full max-w-full space-y-3 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                >
                  <p
                    data-testid="fulfillment-timeline-heading"
                    className="whitespace-normal text-xs font-semibold uppercase leading-5 tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:tracking-[0.18em]"
                  >
                    Fulfillment timeline
                  </p>
                  <div className="space-y-3">
                    {orderDetail.fulfillmentTimeline.map((entry) => (
                      <div
                        key={`${entry.title}-${entry.timestamp}`}
                        className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <p className="break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                            {entry.title}
                          </p>
                          <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                            {formatDateTime(entry.timestamp, timezone)}
                          </p>
                        </div>
                        <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-400">
                          {entry.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <section
                  data-testid="charges-card"
                  className="w-full max-w-full overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950"
                >
                  <p className="whitespace-normal text-xs font-semibold uppercase leading-5 tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:tracking-[0.18em]">
                    Charges
                  </p>
                  <dl className="mt-3 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    <ChargeRow label="Subtotal" value={formatCurrency(orderDetail.subtotalAmount)} />
                    <ChargeRow label="Shipping" value={formatCurrency(orderDetail.shippingFee)} />
                    <ChargeRow
                      isTotal
                      label="Total"
                      value={formatCurrency(orderDetail.totalAmount)}
                    />
                  </dl>
                </section>
              </div>
            </div>
          )}
          </section>
        ) : null}

        {selectedOrderSummary ? (
          <section
            data-testid="invoice-preview"
            className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                Invoice preview
              </p>
              <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                Local mock print and download only
              </p>
            </div>
            {invoice ? (
              <div className="flex flex-wrap gap-2">
                <Button className="w-full sm:w-auto" variant="secondary" onClick={handlePrintInvoice}>
                  Print
                </Button>
                <Button className="w-full sm:w-auto" variant="secondary" onClick={handleDownloadInvoice}>
                  Download
                </Button>
              </div>
            ) : null}
          </div>

          {isInvoiceLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-500 dark:text-slate-400">
              <Spinner className="mr-2 text-slate-400 dark:text-slate-500" />
              Loading invoice preview...
            </div>
          ) : invoice && orderDetail ? (
            <div className="mt-4 space-y-4 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold text-slate-950 dark:text-slate-100">
                    {invoice.invoiceNumber}
                  </p>
                  <p className="break-words text-sm text-slate-500 dark:text-slate-400">
                    Order {invoice.orderNumber} · Issued {formatDateTime(invoice.issuedAt, timezone)}
                  </p>
                </div>
                <span className="max-w-full break-words rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white dark:bg-cyan-500 dark:text-slate-950">
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>

              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
                <InfoBlock label="Billed to" value={invoice.billedTo.name} />
                <InfoBlock label="Tax ID" value={invoice.billedTo.taxId} />
                <InfoBlock label="Email" value={invoice.billedTo.email} />
                <InfoBlock label="Address" value={invoice.billedTo.address} />
              </div>

              <div className="space-y-3">
                {invoice.lineItems.map((item) => (
                  <div
                    key={`${item.description}-${item.quantity}`}
                    className="flex flex-col gap-3 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                        {item.description}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Qty {item.quantity}
                      </p>
                    </div>
                    <p className="min-w-0 break-words text-sm text-slate-700 dark:text-slate-300 sm:text-right">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
                <dl className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                  <ChargeRow label="Subtotal" value={formatCurrency(invoice.subtotalAmount)} />
                  <ChargeRow label="Shipping" value={formatCurrency(invoice.shippingFee)} />
                  <ChargeRow
                    label={`Tax (${Math.round(invoice.taxRate * 100)}%)`}
                    value={formatCurrency(invoice.taxAmount)}
                  />
                  <ChargeRow isTotal label="Total" value={formatCurrency(invoice.totalAmount)} />
                </dl>
              </div>

              <p className="break-words text-sm text-slate-600 dark:text-slate-400">{invoice.notes}</p>
            </div>
          ) : (
            <div className="mt-4">
              <EmptyState
                description="This order does not have a mock invoice preview."
                title="No invoice available"
              />
            </div>
          )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="flex min-h-[7.75rem] flex-col justify-between rounded-[1.25rem] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-3 line-clamp-3 overflow-hidden text-lg font-semibold text-slate-950 dark:text-slate-100">
        {value}
      </p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{value}</p>
    </div>
  );
}

function ChargeRow({
  isTotal = false,
  label,
  value,
}: {
  isTotal?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <dt className={classNames(isTotal && "font-semibold text-slate-950 dark:text-slate-100")}>
        {label}
      </dt>
      <dd className={classNames("whitespace-nowrap text-right", isTotal && "font-semibold text-slate-950 dark:text-slate-100")}>
        {value}
      </dd>
    </div>
  );
}
