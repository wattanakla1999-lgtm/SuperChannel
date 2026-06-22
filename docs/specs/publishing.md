# Publishing Feature

## Task

Create the protected `/publishing` page using mock data. Follow `AGENTS.md` and
reuse the existing authenticated layout, session, shared components, Axios
client, and feature-service pattern.

Do not connect a database, file storage, or real social provider in this task.

## Access And Navigation

- Unauthenticated access redirects to `/login`.
- The Publishing sidebar item must navigate to `/publishing` and show its active
  state.
- Existing Login, Inbox, sidebar, logout, and session behavior must keep working.

## UI

Create a responsive publishing workspace containing:

- Page heading and `Create post` button
- Tabs: All, Drafts, Scheduled, Published, Failed
- Search and channel filters
- Post list with content preview, channels, schedule, status, and actions
- Empty, loading, error, and no-results states

The Create Post modal or drawer must include:

- Caption field with character count
- Mock media selection and image preview
- Facebook, Instagram, X, Telegram, and TikTok channel selection
- Publish now or schedule for later
- Date and time fields for scheduled posts
- Channel preview
- Save draft and Publish/Schedule actions
- Disabled and submitting states

Use shared Button, Modal/Drawer, form controls, status badge, loading, empty,
error, and Toast components. Extract meaningful sections into feature
components instead of creating one large page file.

## Validation

- Caption or media is required: `Add a caption or media`
- At least one channel is required: `Select at least one channel`
- Scheduled date must be in the future: `Choose a future date and time`
- Show channel-specific limitations before submission.

## Mock API

Keep mock posts in a server-only module.

- `GET /api/publishing/posts`
- `POST /api/publishing/posts`
- `POST /api/publishing/posts/:id/publish`

Use `features/publishing/services/publishingService.ts` and the shared Axios
client. Support mock draft, scheduled, published, and failed results. Do not
upload media externally; preview it locally and store safe mock metadata only.

## Test IDs

| Component | `data-testid` |
|---|---|
| Publishing page | `publishing-page` |
| Create post button | `create-post-button` |
| Caption field | `post-caption-field` |
| Channel selector | `channel-selector` |
| Schedule toggle | `schedule-toggle` |
| Save draft button | `save-draft-button` |
| Submit post button | `submit-post-button` |
| Post list | `post-list` |

Prefer accessible roles, labels, and text before test IDs.

## Playwright Tests

Create `tests/e2e/publishing.spec.ts` covering:

- Unauthenticated access redirects to `/login`
- Publishing navigation and active state work
- Mock post list and status filters render correctly
- Required caption/media and channel validation work
- Saving a draft adds one draft post
- Publishing now adds one published post
- Scheduling requires a future time and adds one scheduled post
- Search and channel filters work
- Existing Login and Inbox tests remain passing
- Mobile composer and post list work without clipping

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

- `/publishing` is protected, responsive, and functional with mock data.
- Draft, publish-now, schedule, search, filter, and validation flows work.
- Existing Login and Inbox behavior has no regression.
- Shared components and Publishing service are reused correctly.
- No database, storage, or real provider integration is introduced.
- All checks and Playwright tests pass.
