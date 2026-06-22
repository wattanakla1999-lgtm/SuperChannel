# AGENTS.md

## Project

SuperChannel is a multi-tenant omnichannel platform for businesses. It combines:

- A unified inbox for customer conversations
- Cross-channel post creation, scheduling, and publishing
- Customer profiles and conversation history
- Channel connection and health management
- Team roles, assignments, tags, notes, and saved replies

Supported channels are added incrementally. Never assume LINE, Facebook,
Instagram, Telegram, X, TikTok, Shopee, and Lazada have identical APIs,
permissions, message types, or publishing capabilities.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL and Prisma ORM
- External OAuth, webhook, messaging, and publishing APIs

Use the versions, package manager, libraries, and conventions already present in
the repository. Do not introduce a parallel architecture without a clear need.

## Commands

Use `npm` unless the lockfile indicates another package manager.

```bash
npm install
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

When Prisma is present:

```bash
npx prisma validate
npx prisma generate
```

Use existing test scripts. Do not add a new test runner when one is configured.

## Before Editing

1. Read `package.json` and relevant configuration.
2. Inspect the nearest implementation in the same feature.
3. Review related types, schema models, services, and tests.
4. Confirm whether affected code runs on the server or in the browser.
5. Keep the requested change narrowly scoped.

Nearby repository patterns take precedence over examples in this file. Preserve
unrelated user changes in a dirty worktree.

## Structure

Prefer feature-first organization:

```text
src/
  app/                  Routes, layouts, and route handlers
  features/             Feature UI, hooks, services, types, and local components
  components/ui/        Shared buttons, feedback, overlays, forms, pagination
  server/               Auth, database, integrations, queues, domain services
  lib/http/             Shared browser API client and HTTP error utilities
  lib/                  Other environment-safe shared utilities
  types/                Cross-feature public types
```

Do not create a layer or abstraction for one trivial use. Promote code only when
it is genuinely reused or represents a shared domain rule.

## Next.js Boundaries

- Use Server Components by default.
- Add `"use client"` only for state, effects, browser APIs, or event handlers.
- Keep Client Components small and low in the component tree.
- Keep Prisma, secrets, OAuth tokens, signature verification, and provider calls
  in server-only modules.
- Add `import "server-only"` under `src/server/` where appropriate.
- Never import server-only code into Client Components or browser hooks.
- Add a custom hook only when client-side state or orchestration requires one.
- Route handlers parse and validate requests, call server services, and format
  responses; reusable business rules do not belong in route handlers.

## API Services And Axios

- UI components must not call Axios directly.
- A page or feature that communicates with an internal API should have a focused
  service under `src/features/<feature>/services/`.
- Keep separate services for separate feature concerns; do not create one giant
  application service.
- A presentational page that performs no API work does not need an empty service.
- Hooks may coordinate feature services when client-side orchestration is needed.
- Service functions must have typed inputs and outputs and should return domain
  data rather than raw `AxiosResponse` objects.
- Shared cross-feature API operations may be promoted to a shared service only
  after real reuse exists.

Use one shared browser-side Axios instance, preferably under
`src/lib/http/api-client.ts`.

- Request interceptors may add safe common headers, request IDs, and existing
  client-session authorization when the chosen auth system requires it.
- Never expose server-only tokens or provider credentials to the browser.
- Let Axios set multipart boundaries for `FormData`; do not hardcode them.
- Response interceptors should normalize transport and API errors into one typed
  application error shape.
- Handle session expiry consistently for `401` responses without redirect loops.
- Preserve useful status information for `403`, `404`, `409`, `422`, `429`, and
  `5xx` responses.
- Interceptors must not show feature-specific toast messages. The calling feature
  decides the user-facing message so one failure does not produce duplicate
  notifications.
- Platform APIs remain server-side behind provider adapters; they must not use
  the browser Axios client.

## Core Domain

Keep these concepts separate:

- `ChannelConnection`: an authorized external business account
- `Contact`: an organization-owned customer identity
- `Conversation`: a channel-specific message thread
- `Message`: an inbound, outbound, or internal event
- `Post`: canonical content created in SuperChannel
- `PublishTarget`: channel-specific content and options
- `PublishAttempt`: one delivery attempt and provider result

Do not reuse one status field for independent workflows. Keep conversation,
delivery, publishing, connection-health, and authorization statuses separate.

Suggested statuses, unless the schema already defines them:

- Conversation: `open`, `pending`, `resolved`
- Delivery: `queued`, `sending`, `sent`, `failed`
- Publishing: `draft`, `scheduled`, `publishing`, `published`,
  `partially_failed`, `failed`

Define shared statuses once. Do not duplicate mappings in UI files.

## Multi-Tenant Security

- Every tenant-owned record must be scoped by `organizationId`.
- Resolve user, organization, and role from the authenticated server session.
- Never trust ownership, role, `userId`, or `organizationId` from request data.
- Verify membership and permission before tenant reads or writes.
- Customer access must be limited to records owned by that customer.
- Apply tenant scope to integrations, contacts, conversations, messages, posts,
  publish attempts, and team members.
- Enforce authorization on the server even when the UI hides an action.

Treat missing tenant scope as a security defect.

## Platform Adapters

Each provider must have an isolated server-side adapter. Domain and UI code must
not call provider endpoints directly.

An adapter may support:

- Webhook verification and event normalization
- Sending supported messages and media
- Publishing supported content types
- Authorization refresh or revocation
- Connection health and safe provider errors

Rules:

- Normalize provider payloads at the integration boundary.
- Keep provider DTOs separate from internal domain types.
- Store provider name, external ID, API version, and occurred timestamp.
- Use capability checks; never fake feature parity between channels.
- Show channel limitations before the user submits an action.
- Redact sensitive fields from stored raw events, errors, and logs.

## Webhooks And Idempotency

- Verify provider signatures before processing or causing side effects.
- Reject invalid signatures safely.
- Acknowledge valid webhooks quickly and queue heavy work.
- Deduplicate using provider event IDs or a stable derived key.
- Add database uniqueness for external messages and attempts where possible.
- Redelivery must not duplicate messages, contacts, notifications, or posts.
- Record processing state and retry count for operational visibility.
- Never log tokens, authorization headers, signatures, or full customer payloads.

## Queues And Retries

Use existing queue infrastructure for outbound messages, scheduled posts, media
processing, token refresh, and slow webhook work.

- Persist work before reporting that it was queued successfully.
- Make job handlers idempotent.
- Retry transient failures with bounded exponential backoff.
- Respect rate limits and `Retry-After`.
- Do not retry permanent validation, permission, or unsupported-feature errors.
- Keep provider error codes plus a safe user-facing explanation.
- Support partial success when publishing to multiple channels.

## Prisma And Data Access

- Use the shared Prisma client; never create one per request.
- Access Prisma only from server-side modules.
- Select only fields required by the caller.
- Use transactions for atomic operations.
- Add indexes based on tenant, external ID, inbox, and scheduled-job queries.
- Use migrations for schema changes. Never use `prisma db push` in production.
- Do not run destructive migrations, resets, or production seeds without an
  explicit request and confirmation.

## Validation And Errors

- Treat request data, headers, webhooks, and provider responses as untrusted.
- Validate at the boundary with the repository's existing validation library.
- Return consistent internal API response shapes and suitable HTTP statuses.
- Handle expected domain and provider failures explicitly.
- Never expose stack traces, database errors, tokens, or provider secrets.
- User-facing errors must explain the next useful action.

## Secrets And Tokens

- Use `.env.local` for local secrets and deployment environment variables or a
  secret manager in production.
- Keep safe placeholders only in `.env.example`.
- Never commit credentials or put secrets in `NEXT_PUBLIC_*` variables.
- Encrypt provider refresh tokens and long-lived access tokens at rest.
- Handle token expiry, refresh, revocation, and reconnect states explicitly.
- Treat credentials found in tracked files or logs as compromised and rotate
  them immediately.

## UI

- Build the operational product, not a marketing page, unless requested.
- Reuse the current design system and shared components.
- Keep inbox and publishing layouts dense, responsive, and scannable.
- Use familiar controls and the existing icon library.
- Avoid nested cards and decorative containers that reduce usable space.
- Handle loading, empty, error, forbidden, disconnected, expired-token,
  partial-success, and retry states where relevant.
- Keep forms and dialogs keyboard accessible with visible labels.
- Prevent clipping of chat composers, tables, and actions on mobile.
- Never show an action unsupported by the selected channel connection.

## Shared Components And Card Extraction

Check `src/components/ui/` before creating a new UI primitive. Shared primitives
should provide consistent variants, accessibility, disabled behavior, and
loading behavior.

Common reusable components should include or extend existing equivalents for:

- `Button` and `IconButton`
- `Pagination`
- `Spinner`, `LoadingOverlay`, and `Skeleton`
- `Modal`, `ConfirmDialog`, and shared popup shells
- `Toast`, `Alert`, and success/error feedback
- `EmptyState` and `ErrorState`
- Shared form controls and status badges

Reuse rules:

- If one page contains multiple meaningful cards or sections, extract each card
  into a focused feature component instead of keeping a large page file.
- Keep page files responsible for composition and route-level orchestration.
- Keep feature-specific cards under that feature's `components/` directory.
- Promote a component to `src/components/ui/` or another shared location when it
  is reused across features or is clearly a design-system primitive.
- Do not promote components that contain feature-specific business rules merely
  because they have a similar visual shape.
- Prefer configurable variants over copied components with slightly different
  class names.
- Do not over-abstract a one-off component or create wrapper components that add
  no meaningful behavior.

## Naming

Follow nearby conventions first.

- Components and types: `PascalCase`
- Functions and variables: `camelCase`
- Hooks: `useCamelCase`
- Shared constants: `UPPER_SNAKE_CASE`
- Route entries: `page.tsx`, `layout.tsx`, `route.ts`
- Prefer `*.server.ts` and `*.client.ts` when the runtime boundary is unclear

Use platform-neutral names in domain code. Provider names belong in adapters,
connection metadata, and channel-specific UI.

## Change Safety

- Reuse installed dependencies and existing helpers first.
- Add dependencies only when they remove meaningful complexity or implement a
  standard protocol more safely.
- Avoid unrelated refactors, renames, formatting churn, and metadata changes.
- Do not bypass established adapters or services with duplicate implementations.
- Preserve compatibility unless the task explicitly changes a contract.
- Explain broad schema, permission, API, or integration changes before editing.

## Verification

Testing depth must match the risk of the change. At minimum:

1. Review every impacted file.
2. Run lint and TypeScript checks.
3. Run focused tests when available.
4. Validate Prisma after schema changes.
5. Run a production build for routing, configuration, or broad changes.
6. Verify the affected workflow end to end when practical.

High-risk changes require coverage for tenant isolation, authorization, webhook
signatures, duplicate delivery, idempotency, token refresh, retry behavior, and
partial multi-channel publishing.

Do not claim a flow works without checking it. State anything that could not be
verified.

## Definition Of Done

- The requested behavior is implemented without unrelated scope expansion.
- Server/client and tenant boundaries remain correct.
- Provider-specific behavior stays inside its adapter.
- Relevant loading, empty, error, permission, and partial-success states work.
- Appropriate validation, tests, and build checks pass where possible.
- No secrets or sensitive payloads were added to source or logs.
- The final summary lists changes, verification, assumptions, and limitations.

### Playwright E2E

- Store Playwright tests under `tests/e2e/`.
- Run `npm run test:e2e` after implementing or changing a user-facing workflow.
- Every Playwright run must generate an HTML report under
  `report/playwright-report/`.
- Store screenshots, videos, and traces under `report/test-results/`.
- Capture screenshots only on failure, retain videos on failure, and capture
  traces on the first retry.
- Do not commit the `report/` directory.
- Review the generated HTML report before declaring the workflow complete.
- Include the Playwright test result in the final implementation summary.
