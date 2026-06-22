# Settings Feature

## Task

Create the protected `/settings` page using mock data. Follow `AGENTS.md` and
reuse the authenticated layout, session, shared components, Axios client, and
feature-service pattern.

Do not connect a database, file storage, notification provider, or real security
provider in this task.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- The Settings sidebar item navigates to `/settings` and shows its active state.
- Owner and Admin roles may update settings.
- Supervisor and Agent roles have read-only access.
- Existing session, navigation, and logout behavior must continue to work.

## UI

Create a responsive Settings page with these sections:

- Workspace Profile
- Business Hours
- Inbox Preferences
- Saved Replies
- Notifications
- Security

Workspace Profile includes business name, logo preview, timezone, language,
email, and phone. Use `Asia/Bangkok` as the default timezone. Logo selection is
preview-only and must not upload externally.

Business Hours supports working days, opening/closing times, holidays, and an
outside-business-hours message.

Inbox Preferences includes default assignment, default conversation status,
auto-close duration, sound, and message preview settings.

Saved Replies supports search, create, edit, category, shortcut, preview, and
delete confirmation. Use the same mock Saved Replies in the Inbox composer.

Notifications includes new message, assignment, mention, failed publishing,
expired connection, desktop, email, and sound toggles.

Security displays mock session information and a disabled `Two-factor
authentication - Coming soon` control. Do not expose credentials or tokens.

Include Save, Reset, loading, success, error, forbidden, unsaved-change warning,
and confirmation states. Use shared form, Button, modal, loading, and feedback
components.

## Validation

- Business name is required.
- Workspace email must be valid.
- Closing time must be after opening time.
- Auto-close duration must be zero or a positive number.
- Saved Reply title and message are required.
- Saved Reply shortcuts must be unique.

## Mock API

Keep settings and Saved Replies in server-only mock modules.

- `GET /api/settings`
- `PATCH /api/settings/:section`
- `GET /api/settings/saved-replies`
- `POST /api/settings/saved-replies`
- `PATCH /api/settings/saved-replies/:id`
- `DELETE /api/settings/saved-replies/:id`

Use `features/settings/services/settingsService.ts` and the shared Axios client.
Permission checks must also be enforced by the mock API.

## Test IDs

| Component | `data-testid` |
|---|---|
| Settings page | `settings-page` |
| Settings navigation | `settings-navigation` |
| Save button | `save-settings-button` |
| Reset button | `reset-settings-button` |
| Saved Reply list | `saved-reply-list` |
| Add Saved Reply | `add-saved-reply-button` |
| Saved Reply dialog | `saved-reply-dialog` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/settings.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Navigation and active sidebar state work
- All Settings sections render and switch correctly
- Workspace and Business Hours validation work
- Saving and resetting settings update mock state correctly
- Unsaved-change warning prevents accidental loss
- Saved Reply create, edit, search, and delete work
- Saved Replies appear in the Inbox composer
- Notification toggles persist in mock state
- Read-only roles cannot update settings through the UI or mock API
- Existing feature tests remain passing
- Mobile navigation, forms, and dialogs work without clipping

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

- `/settings` is protected, responsive, and functional with mock data.
- Profile, hours, Inbox preferences, Saved Replies, and notifications work.
- Inbox and Settings use consistent mock Saved Replies.
- Role restrictions are enforced by both UI and mock API.
- No database, upload, notification, or real security integration is introduced.
- Existing features have no regression and all checks pass.
