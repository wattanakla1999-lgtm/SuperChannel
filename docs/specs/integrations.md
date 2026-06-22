# Integrations Feature

## Task

Create the protected `/integrations` page using mock connection data. Follow
`AGENTS.md` and reuse the authenticated layout, sidebar, session, shared
components, Axios client, and feature-service pattern.

Do not perform real OAuth, store real credentials, or call provider APIs.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- The Integrations sidebar item navigates to `/integrations` and shows its active
  state.
- Existing Login, Inbox, Publishing, session, and logout behavior must continue
  to work.

## UI

Create a responsive integration hub with search and status filters.

Display cards for:

- LINE Official Account
- Facebook Page
- Instagram Professional Account
- Telegram Bot
- X
- TikTok
- Shopee, Lazada, and TikTok Shop as `Coming soon`

Each available integration card shows:

- Provider name and icon
- Supported capabilities: Inbox, Publishing, or both
- Status: Connected, Disconnected, Expired, or Error
- Mock account name
- Last checked time
- Connect, Configure, Test, Reconnect, or Disconnect actions as appropriate

Use a modal or drawer for a mock connection flow:

1. Explain required account type and permissions.
2. Simulate provider authorization without requesting real credentials.
3. Select a mock business account.
4. Run a mock connection test.
5. Show success or a safe error message.

Disconnect must use a confirmation dialog. Include loading, empty, error, and
retry states. Never display or request a real access token or client secret.

## Mock API

Keep mock connections in a server-only module and use one source of truth.

- `GET /api/integrations`
- `POST /api/integrations/:provider/connect`
- `POST /api/integrations/:provider/test`
- `POST /api/integrations/:provider/reconnect`
- `DELETE /api/integrations/:provider`

Use `features/integrations/services/integrationService.ts` and the shared Axios
client. Publishing channel availability should use the same mock connection
state where practical; disconnected channels must not appear usable.

## Test IDs

| Component | `data-testid` |
|---|---|
| Integrations page | `integrations-page` |
| Search field | `integration-search` |
| Status filter | `integration-status-filter` |
| Provider card | `integration-card-{provider}` |
| Connect button | `connect-{provider}` |
| Test button | `test-{provider}` |
| Disconnect button | `disconnect-{provider}` |
| Connection dialog | `connection-dialog` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/integrations.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Navigation and active sidebar state work
- Provider cards, capabilities, and statuses render
- Search and status filters work
- Mock connect flow changes a provider to Connected
- Connection test shows successful feedback
- Disconnect confirmation changes the provider to Disconnected
- Expired and Error states show Reconnect or Retry actions
- Coming-soon providers cannot be connected
- Existing Login, Inbox, and Publishing tests remain passing
- Mobile cards and connection dialog work without clipping

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

- `/integrations` is protected, responsive, and functional with mock data.
- Search, filters, connect, test, reconnect, and disconnect flows work.
- No real OAuth, credentials, tokens, or provider calls are introduced.
- Existing Login, Inbox, and Publishing behavior has no regression.
- Shared components and Integration service are reused correctly.
- All checks and Playwright tests pass.
