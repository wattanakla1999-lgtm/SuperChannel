# Inbox Order Context Feature

## Task

Enhance the protected `/inbox` page with order history, purchase summary, and
invoice details beside the active conversation. Follow `AGENTS.md` and reuse the
existing session, Inbox layout, shared components, Axios client, and
feature-service pattern.

Use deterministic mock commerce data linked to the shared Inbox customers. Do
not create a separate Orders page, connect a database, call marketplace APIs, or
allow order mutations in this task.

## Access And Layout

- Unauthenticated access redirects to `/login`.
- All authenticated roles may view commerce data for conversations they can
  access; enforce this rule in the mock API.
- Add `Customer` and `Orders` tabs to the Inbox information panel.
- On mobile, show the same content in the existing customer drawer without
  clipping the chat composer.

## UI

The Orders tab contains:

- Purchase summary: total orders, total spend, average order value, and last
  purchase date
- Order history with order number, marketplace, date, status, item count, and
  total
- Status filter and newest/oldest sorting
- Order details with items, SKU, quantity, price, discount, shipping fee,
  payment method, delivery address, tracking number, and fulfillment timeline
- Invoice number, billing details, tax summary, invoice preview, and a local
  print/download action when an invoice exists
- Loading, empty, no-invoice, error, forbidden, and retry states

Order status values are Pending, Paid, Processing, Shipped, Delivered,
Cancelled, and Refunded. Display currency consistently as THB and dates in the
workspace timezone. Keep this feature read-only.

## Mock Data And API

Provide linked mock orders from Shopee, Lazada, TikTok Shop, and a direct store.
Include customers with multiple orders, no orders, cancelled/refunded orders,
and orders without invoices.

- `GET /api/customers/:customerId/commerce-summary`
- `GET /api/customers/:customerId/orders`
- `GET /api/orders/:orderId`
- `GET /api/orders/:orderId/invoice`

Use `features/orders/services/orderService.ts` and the shared Axios client. Keep
orders and invoice data in server-only mock modules. Customer selection must
never expose another customer's orders, and disconnected mock integrations must
remain clearly identified as historical data.

## Test IDs

| Component | `data-testid` |
|---|---|
| Orders tab | `customer-orders-tab` |
| Purchase summary | `purchase-summary` |
| Order history | `order-history` |
| Order row | `order-row-{id}` |
| Order details | `order-details` |
| Invoice button | `view-invoice-{id}` |
| Invoice preview | `invoice-preview` |
| Retry button | `orders-retry-button` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Extend `tests/e2e/inbox.spec.ts` or create `tests/e2e/orders.spec.ts` covering:

- Selecting a conversation loads the correct customer's purchase summary
- Order history, provider badges, statuses, totals, and sorting render correctly
- Status filtering works without duplicates
- Selecting an order displays the correct items, payment, shipping, and timeline
- Invoice preview contains the matching order, customer, totals, and tax values
- Orders without invoices show the correct empty state
- Customers without orders show the purchase-history empty state
- Switching conversations never retains another customer's commerce data
- Unauthorized commerce API requests are rejected
- Loading, error, and retry states work
- Existing feature tests remain passing
- Mobile Orders tab, details, and invoice preview do not clip or overlap

Run:

```bash
npm run lint
npx tsc --noEmit
npm run test:e2e
npm run build
```

If any check fails, fix the implementation and run all checks again. Repeat
until everything passes. Review `report/playwright-report/` before finishing.

## Acceptance Criteria

- The active Inbox conversation shows the correct customer's commerce context.
- Purchase summary, order history, order details, and invoices are functional.
- Inbox, Customers, and Orders share consistent customer identities.
- Authorization is enforced by both UI and mock API.
- Shared components and the Order service are reused correctly.
- The feature remains read-only and uses no database or external provider.
- Existing features have no regressions and all checks pass.
