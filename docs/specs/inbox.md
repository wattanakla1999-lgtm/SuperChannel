# Unified Inbox Feature

## Task

Create the protected `/inbox` page using mock data. Follow `AGENTS.md`, reuse
the mock Login session, shared components, Axios client, and feature services.

Do not connect a database or external messaging provider in this task.

## Access

- Unauthenticated users visiting `/inbox` must redirect to `/login`.
- Authenticated mock users can access the Inbox.
- Logout must clear the mock session and redirect to `/login`.

## App Layout

Create a reusable authenticated layout containing:

- SuperChannel logo
- Sidebar links: Inbox, Publishing, Integrations, Customers, Team, Settings
- Active navigation state
- Current user name and role
- Logout action
- Responsive mobile navigation

Only Inbox needs to work in this task. Other links may display a disabled or
`Coming soon` state instead of creating new pages.

## Inbox UI

Desktop uses three sections:

1. Inbox filters and conversation list
2. Active conversation and message composer
3. Customer information panel

Include:

- Search conversations
- All, Unread, Open, Pending, and Resolved filters
- Mock LINE, Facebook, Instagram, and Telegram conversations
- Customer avatar, channel badge, preview, timestamp, and unread count
- Text, image, inbound, and outbound message examples
- Assign agent, change status, and add tags
- Message composer with disabled and sending states
- Empty search, no-selection, loading, and error states

On mobile, show the conversation list first. Selecting a conversation opens the
chat view with a Back action. Customer information opens in a drawer.

## Mock Data And API

Keep mock conversations and customers in server-only mock modules.

- `GET /api/inbox/conversations`
- `GET /api/inbox/conversations/:id`
- `POST /api/inbox/conversations/:id/messages`

API calls must go through `features/inbox/services/inboxService.ts` and the
shared Axios client. Sending a mock message should update the visible thread.

## Test IDs

| Component | `data-testid` |
|---|---|
| Inbox page | `inbox-page` |
| Search field | `conversation-search` |
| Conversation list | `conversation-list` |
| Conversation item | `conversation-item-{id}` |
| Message thread | `message-thread` |
| Message input | `message-input` |
| Send button | `send-message-button` |
| Customer panel | `customer-panel` |
| Logout button | `logout-button` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/inbox.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Valid login redirects to and displays `/inbox`
- Conversation list and mock channels render
- Selecting a conversation displays its messages and customer
- Search and status filters work
- Sending a mock message shows loading and appends the message once
- Empty search state appears
- Logout clears the session and redirects to `/login`
- Mobile conversation navigation works without clipping

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

- `/inbox` is protected, responsive, and functional with mock data.
- App layout, conversation selection, search, filters, sending, and logout work.
- Shared components and the Inbox service are reused correctly.
- No database or real provider integration is introduced.
- All checks and Playwright tests pass.
