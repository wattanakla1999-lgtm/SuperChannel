# Customers Feature

## Task

Create the protected `/customers` page using mock data. Follow `AGENTS.md` and
reuse the authenticated layout, session, shared components, Axios client, and
feature-service pattern.

Reuse the Inbox mock contacts as the customer source of truth. Do not connect a
database or external provider in this task.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- The Customers sidebar item navigates to `/customers` and shows its active state.
- Existing Login, Inbox, Publishing, Integrations, session, and logout behavior
  must continue to work.

## UI

Create a responsive customer directory containing:

- Search by customer name, email, or phone
- Filters for channel, tag, assigned agent, and conversation status
- Customer count and clear-filters action
- Desktop table and mobile-friendly customer list
- Shared Pagination component
- Loading, empty, no-results, error, and retry states

Each customer row shows:

- Avatar and name
- Connected channel badges
- Email or phone
- Tags
- Assigned agent
- Conversation status
- Unread count
- Last interaction time

Selecting a customer opens a responsive drawer containing:

- Contact information
- Connected mock channel identities
- Tags and assigned agent
- Editable internal notes
- Recent conversation timeline
- `Open conversation` action that navigates to the related Inbox thread

Use the existing shared Button, Pagination, Drawer/Modal, form, badge, loading,
empty, error, and Toast components. Keep customer-specific UI under
`features/customers/components/`.

## Mock API

Provide at least 25 mock customers so pagination can be verified.

- `GET /api/customers`
- `GET /api/customers/:id`
- `PATCH /api/customers/:id`
- `POST /api/customers/:id/notes`

Use `features/customers/services/customerService.ts` and the shared Axios client.
Search, filters, sorting, and pagination should be represented by query
parameters. Customer updates must also appear in related Inbox customer data.

## Test IDs

| Component | `data-testid` |
|---|---|
| Customers page | `customers-page` |
| Search field | `customer-search` |
| Customer list | `customer-list` |
| Customer row | `customer-row-{id}` |
| Pagination | `customer-pagination` |
| Customer drawer | `customer-drawer` |
| Notes field | `customer-notes-field` |
| Save button | `save-customer-button` |
| Open conversation | `open-conversation-button` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/customers.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Navigation and active sidebar state work
- Customer list and channel badges render
- Search returns matching customers and shows no-results state
- Channel, tag, agent, and status filters work
- Pagination changes the visible customer set without duplicates
- Selecting a customer opens the correct detail drawer
- Updating tags or notes persists in the mock UI
- Open conversation navigates to the related Inbox thread
- Existing Login, Inbox, Publishing, and Integrations tests remain passing
- Mobile list, filters, pagination, and drawer work without clipping

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

- `/customers` is protected, responsive, and functional with mock data.
- Search, filters, pagination, details, tags, notes, and Inbox navigation work.
- Customers and Inbox use consistent mock customer data.
- Shared components and Customer service are reused correctly.
- No database or real provider integration is introduced.
- Existing features have no regression and all checks pass.
