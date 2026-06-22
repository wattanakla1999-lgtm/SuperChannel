# Analytics Dashboard Feature

## Task

Create the protected `/dashboard` page using deterministic mock data. Follow
`AGENTS.md` and reuse the authenticated layout, session, shared components,
Axios client, and feature-service pattern.

Derive analytics from the shared Inbox and Team mock sources. Do not connect a
database, analytics provider, or external messaging provider in this task.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- Add Dashboard to the authenticated sidebar and show its active state.
- Owner, Admin, and Supervisor roles see workspace and agent analytics.
- Agent roles see only their own analytics.
- Enforce data scope in the mock API, not only in the UI.

## UI

Create a responsive dashboard containing:

- Date range: Today, Last 7 days, Last 30 days, and Custom
- Channel, team, and agent filters
- Refresh action and last-updated time
- KPI cards: total conversations, open conversations, average first response
  time, SLA compliance, and resolved conversations
- Conversation trend chart
- Channel distribution chart
- SLA met versus breached chart
- Agent performance table with assigned, resolved, average first response time,
  SLA compliance, and current workload
- Loading, empty, forbidden, error, and retry states

Use accessible chart summaries and tooltips. Charts must resize without
overflowing on mobile. Reuse a proven chart library already installed; if none
exists, install one suitable lightweight library.

## Metric Rules

- First response time is the duration from the first inbound message to the
  first outbound agent reply in a conversation.
- Average first response time excludes conversations without an agent reply.
- SLA is met when the first response occurs within the mock workspace SLA target.
- SLA compliance is `met eligible conversations / eligible conversations * 100`.
- Resolved conversations use the conversation resolved timestamp within the
  selected range.
- Display `No data` instead of zero when a metric has no eligible records.

## Mock API

- `GET /api/dashboard/overview`
- `GET /api/dashboard/trends`
- `GET /api/dashboard/agents`

Support date range, channel, team, and agent query parameters. Use
`features/dashboard/services/dashboardService.ts` and the shared Axios client.
Keep metric calculation in a server-only dashboard service and return
deterministic results.

## Test IDs

| Component | `data-testid` |
|---|---|
| Dashboard page | `dashboard-page` |
| Date range | `dashboard-date-range` |
| Filter bar | `dashboard-filters` |
| KPI section | `dashboard-kpis` |
| Conversation trend | `conversation-trend-chart` |
| Channel distribution | `channel-distribution-chart` |
| SLA chart | `sla-chart` |
| Agent table | `agent-performance-table` |
| Retry button | `dashboard-retry-button` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/dashboard.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Navigation and active sidebar state work
- KPI values, charts, and agent rows render from shared mock data
- Date, channel, team, and agent filters update every dashboard section
- Empty, loading, error, and retry states work
- Owner, Admin, and Supervisor can view permitted team analytics
- Agent users cannot access another agent's analytics through UI or mock API
- Metric rules handle unreplied conversations and no eligible data correctly
- Existing feature tests remain passing
- Mobile cards, charts, filters, and table do not clip or overlap

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

- `/dashboard` is protected, responsive, and functional with mock data.
- Metrics follow the documented rules and respond consistently to filters.
- Dashboard, Inbox, and Team use the same mock conversations and members.
- Role-based analytics scope is enforced by both UI and mock API.
- Shared components and the Dashboard service are reused correctly.
- No database or real analytics integration is introduced.
- Existing features have no regressions and all checks pass.
