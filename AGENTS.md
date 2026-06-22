# AGENTS.md

## Project

SuperChannel is a multi-tenant platform that combines customer conversations and
cross-channel publishing in one workspace.

Core features:

- Unified inbox
- Social post creation and publishing
- Customer profiles and conversation history
- Channel integrations and connection health
- Team roles, assignments, tags, notes, and saved replies

Channels are added incrementally. Never assume LINE, Facebook, Instagram,
Telegram, X, TikTok, Shopee, and Lazada support the same capabilities.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Axios for browser-to-application API calls
- PostgreSQL and Prisma when database features are introduced
- Playwright for end-to-end testing

Use the package manager, dependencies, and conventions already in the repository.

## Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run test:e2e
npm run build
```

When Prisma is present, also run:

```bash
npx prisma validate
npx prisma generate
```

## Before Editing

1. Read `package.json` and the nearest related implementation.
2. Review related types, services, tests, and schema models.
3. Confirm whether the code runs on the server or in the browser.
4. Reuse existing patterns before creating new ones.
5. Keep changes limited to the requested task.

Preserve unrelated user changes and do not perform broad refactors without a
clear reason.

## Structure

Follow the current repository layout. Prefer:

```text
app/                    Routes, layouts, pages, and route handlers
features/<feature>/     Feature components, hooks, services, types, validation
components/ui/          Shared UI primitives
lib/http/               Shared Axios client and HTTP error utilities
lib/                    Environment-safe shared utilities
server/                 Server-only auth, database, integrations, and services
tests/e2e/              Playwright tests
```

Do not create an abstraction or folder for one trivial use.

## Next.js Boundaries

- Use Server Components by default.
- Add `"use client"` only for state, effects, browser APIs, or event handlers.
- Keep Client Components small.
- Keep Prisma, secrets, OAuth tokens, provider APIs, and webhook verification in
  server-only modules.
- Never import server-only code into Client Components.
- Route handlers validate requests, call services, and format responses.
- Keep reusable business logic out of pages, JSX, and route handlers.

## Shared Components

Check `components/ui/` before creating a new primitive. Reuse or create shared
components for commonly repeated UI, including:

- `Button` and `IconButton`
- `Pagination`
- `Spinner`, `LoadingOverlay`, and `Skeleton`
- `Modal` and `ConfirmDialog`
- `Toast`, `Alert`, and success/error feedback
- Form controls, `EmptyState`, `ErrorState`, and status badges

Rules:

- If a page has multiple meaningful cards or sections, extract them into focused
  feature components.
- Keep page files responsible for composition and route-level orchestration.
- Keep feature-specific components in `features/<feature>/components/`.
- Promote a component to `components/ui/` when it is reused across features or is
  clearly a design-system primitive.
- Do not promote components containing feature-specific business rules.
- Prefer configurable variants over copied components with different classes.
- Do not over-abstract a one-off component.

## API Services And Axios

- UI components must not call Axios directly.
- Keep API calls in focused services under
  `features/<feature>/services/`.
- Use one shared Axios instance at `lib/http/api-client.ts`.
- Services must have typed inputs and outputs and return domain data, not raw
  `AxiosResponse` objects.
- Hooks may coordinate services only when client-side orchestration is needed.
- Do not create an empty service for a page that performs no API work.

Axios interceptors:

- Request interceptors may add safe shared headers and client-session auth.
- Never expose server or provider credentials to the browser.
- Let Axios set multipart boundaries for `FormData`.
- Response interceptors must normalize API errors into one typed error shape.
- Handle `401` session expiry consistently without redirect loops.
- Preserve status details for `403`, `404`, `409`, `422`, `429`, and `5xx`.
- Interceptors must not show feature-specific Toast messages; the calling feature
  decides the user-facing feedback.
- External platform APIs remain server-side behind provider adapters.

## Security And Data

- Scope every tenant-owned query by `organizationId`.
- Resolve user, organization, and role from the authenticated server session.
- Never trust ownership, role, `userId`, or `organizationId` from request data.
- Enforce authorization on the server even when the UI hides an action.
- Validate request data, webhooks, and provider responses at their boundaries.
- Never expose stack traces, database errors, tokens, or provider secrets.
- Never commit credentials or place secrets in `NEXT_PUBLIC_*` variables.
- Use the shared Prisma client and access Prisma only from server-side modules.
- Use migrations for schema changes; never use `prisma db push` in production.

## Integrations

- Isolate each provider behind a server-side adapter.
- Normalize provider payloads before they enter domain code.
- Verify webhook signatures before side effects.
- Deduplicate webhook events and outbound work using stable external IDs.
- Make queued jobs idempotent and retry only transient failures.
- Respect provider rate limits and `Retry-After`.
- Support partial success when publishing to multiple channels.
- Never log tokens, signatures, authorization headers, or full customer payloads.

## UI

- Build the operational product, not a marketing page, unless requested.
- Reuse the current design system and icon library.
- Keep inbox and publishing layouts responsive, dense, and scannable.
- Handle loading, empty, error, forbidden, disconnected, expired-token,
  partial-success, and retry states where relevant.
- Keep forms and dialogs keyboard accessible with visible labels.
- Prevent clipping of tables, chat composers, and actions on mobile.
- Never show an action unsupported by the selected channel.

## Change Safety

- Reuse installed dependencies and helpers first.
- Add dependencies only when they remove meaningful complexity.
- Avoid unrelated renames, formatting churn, and metadata changes.
- Do not bypass shared components, services, or adapters with duplicates.
- Preserve existing contracts unless the task explicitly changes them.

## Verification

For every task:

1. Review impacted files.
2. Run lint and TypeScript checks.
3. Run focused tests when available.
4. Run a production build for routing, configuration, or broad changes.
5. Verify the affected workflow end to end when practical.

### Playwright E2E

- Store tests under `tests/e2e/`.
- Run `npm run test:e2e` for every changed user-facing workflow.
- Generate the HTML report under `report/playwright-report/`.
- Store screenshots, videos, and traces under `report/test-results/`.
- Do not commit `report/`.
- Review the HTML report before declaring the workflow complete.
- Include Playwright results in the final summary.

Do not claim a flow works without checking it. State anything that could not be
verified.

## Definition Of Done

- The requested behavior is implemented without unrelated scope expansion.
- Shared components and feature services follow the rules above.
- Server/client, tenant, and provider boundaries remain correct.
- Relevant loading, empty, error, and permission states work.
- Appropriate checks and Playwright tests pass where applicable.
- No secrets or sensitive payloads were added to source or logs.
- The final summary lists changes, checks, assumptions, and limitations.
