# Customer And Conversation Tags

## Task

Implement workspace-scoped tags using the existing Supabase, Prisma, repository,
service, Axios, authentication, and permission architecture. Preserve the real
LINE integration and existing workflows.

Support two distinct targets:

- Customer tags persist across conversations and can later power segments and
  campaigns.
- Conversation tags describe a specific case or thread and must not silently
  become customer tags.

## Permissions

- Owner and Admin can create, edit, merge, and archive tag definitions.
- Supervisor and Agent can assign and remove active tags.
- All UI and API operations must enforce workspace isolation and role checks.

## UI

- Add a Tags management section under Settings with search, target filter,
  usage count, create, edit, merge, and archive actions.
- Add a reusable searchable multi-select Tag Picker to the Inbox customer panel,
  conversation toolbar, and Customer detail drawer.
- Allow authorized users to create a tag inline from the picker.
- Add bulk assign and remove actions to the Customers page.
- Add Customer and Conversation tag filters with explicit `Match any` (OR) and
  `Match all` (AND) modes.
- Display loading, empty, no-results, validation, forbidden, error, retry,
  success, confirmation, and partial bulk-failure states.
- Support Thai and English without clipping or horizontal overflow.

Tag fields:

- Name, color, optional description, target, and active/archived status
- Name is trimmed, case-insensitively unique per workspace and target
- Archived tags remain on historical records but cannot be newly assigned
- Merge moves assignments and audit history to the destination tag, removes
  duplicates, and archives the source tag

## Database

Inspect the existing schema first and create the next non-destructive Supabase
SQL migration only for missing structures. Keep Prisma synchronized. Do not run
remote SQL automatically or reset existing data.

Required structures:

- `tags`
- `customer_tags`
- `conversation_tags`
- `tag_audit_logs`

Assignment records must include source (`manual`, `automation`, `import`, or
`api`), actor when applicable, and assigned timestamp. Add foreign keys, unique
assignment constraints, workspace-safe indexes, RLS policies, and audit events
for create, update, assign, remove, merge, and archive.

## API And Services

- `GET /api/tags`
- `POST /api/tags`
- `PATCH /api/tags/:id`
- `POST /api/tags/:id/archive`
- `POST /api/tags/merge`
- `POST|DELETE /api/customers/:customerId/tags/:tagId`
- `POST|DELETE /api/conversations/:conversationId/tags/:tagId`
- `POST /api/customers/tags/bulk-assign`
- `POST /api/customers/tags/bulk-remove`

Keep browser API calls in the Tags feature service using the shared Axios
client. Validate payloads server-side and never trust workspace or role values
provided by the browser.

## Test IDs

| Component | `data-testid` |
|---|---|
| Tags settings | `tags-settings` |
| Tag picker | `tag-picker` |
| Create dialog | `create-tag-dialog` |
| Tag row | `tag-row-{id}` |
| Merge dialog | `merge-tag-dialog` |
| Bulk action | `bulk-tag-action` |
| Match mode | `tag-match-mode` |

Prefer accessible roles, labels, and text before test IDs.

## Tests

Cover:

- Create, edit, assign, remove, archive, and merge
- Duplicate and invalid names
- Customer and Conversation tags remain separate
- Inbox and Customers reflect assignments consistently
- Bulk operations report complete and partial results correctly
- AND/OR filtering returns correct results without duplicates
- Archived tags remain visible historically but cannot be assigned
- Role restrictions and cross-workspace access are enforced by API and RLS
- Thai and English desktop/mobile layouts work without clipping
- Existing authentication, LINE, Inbox, Customers, Team, and Settings tests pass

Run lint, TypeScript checks, all Playwright tests, and production build. Fix and
rerun every failed check until all pass. Review the Playwright HTML report.

## Acceptance Criteria

- Tags are reusable, workspace-safe, audited, translated, and persisted.
- Customer and Conversation tag semantics never mix accidentally.
- Shared Tag Picker and services are reused across Inbox and Customers.
- The SQL migration is provided for manual Supabase execution without destructive
  reset or data loss.
- Existing features have no regressions and all checks pass.
