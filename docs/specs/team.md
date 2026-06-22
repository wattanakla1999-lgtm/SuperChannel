# Team Feature

## Task

Create the protected `/team` page using mock data. Follow `AGENTS.md` and reuse
the authenticated layout, session, shared components, Axios client, and
feature-service pattern.

Reuse one mock team source for Team, Inbox assignment, and Customer assignment.
Do not connect a database or email provider in this task.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- The Team sidebar item navigates to `/team` and shows its active state.
- Owner and Admin roles may manage members.
- Supervisor and Agent roles may view the team but cannot change members.
- Existing session, navigation, and logout behavior must continue to work.

## UI

Create a responsive team-management page containing:

- Search by name or email
- Filters for role, team, online status, and account status
- Team member count and pending invitation count
- Desktop table and mobile member list
- Shared Pagination component
- Invite member button
- Loading, empty, no-results, forbidden, error, and retry states

Each member shows:

- Avatar, name, and email
- Role: Owner, Admin, Supervisor, or Agent
- Team/group
- Online and account status
- Active and assigned conversation counts
- Last active time
- Manage action when permitted

The Invite Member dialog includes email, role, and team. The member drawer
supports changing role, team, workload limit, and active status. Use confirmation
for deactivation and removal.

Rules:

- Email must be valid and unique.
- At least one active Owner must always remain.
- A user cannot remove or deactivate their own account.
- Permission restrictions must be enforced by the mock API, not only the UI.

## Mock API

Provide at least 12 members and several pending invitations.

- `GET /api/team/members`
- `POST /api/team/invitations`
- `PATCH /api/team/members/:id`
- `DELETE /api/team/members/:id`

Use `features/team/services/teamService.ts` and the shared Axios client. Changes
to members must appear in Inbox and Customer assignment controls.

## Test IDs

| Component | `data-testid` |
|---|---|
| Team page | `team-page` |
| Search field | `team-search` |
| Member list | `team-member-list` |
| Member row | `team-member-{id}` |
| Pagination | `team-pagination` |
| Invite button | `invite-member-button` |
| Invite dialog | `invite-member-dialog` |
| Member drawer | `team-member-drawer` |
| Save button | `save-team-member-button` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/team.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Navigation and active sidebar state work
- Members, roles, statuses, and workload render
- Search, filters, and pagination work without duplicates
- Valid invitation creates one pending invitation
- Invalid or duplicate email shows validation feedback
- Authorized role and team updates persist in mock state
- Self-deactivation and removal are blocked
- Deactivating the final Owner is blocked
- Read-only roles cannot mutate members through the UI or mock API
- Team updates appear in Inbox and Customer assignment controls
- Existing feature tests remain passing
- Mobile list, invitation dialog, and member drawer work without clipping

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

- `/team` is protected, responsive, and functional with mock data.
- Search, filters, pagination, invitations, permissions, and member updates work.
- Inbox, Customers, and Team use consistent mock member data.
- Shared components and Team service are reused correctly.
- No database or email integration is introduced.
- Existing features have no regression and all checks pass.
