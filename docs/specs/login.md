# Login Feature

## Task

Create a responsive `/login` page using mock authentication only. Follow `AGENTS.md` and reuse shared components, Axios client, and feature services.

## Mock Account

* Email: `admin@superchannel.local`
* Password: `SuperChannel123!`

Keep credentials in server-only code.

## UI

* SuperChannel logo
* Email and password fields
* Show/hide password
* Remember me
* Sign in button
* Loading and error feedback

Success redirects to `/inbox`.

## Validation

* Empty email: `Please enter your email address`
* Invalid email: `Please enter a valid email address`
* Empty password: `Please enter your password`
* Invalid login: `Invalid email or password`

## API

`POST /api/auth/login`

Create an HTTP-only mock session after successful login. Do not use a database or external authentication.

## Playwright Tests

Create `tests/e2e/login.spec.ts` covering:

* Successful login and redirect
* Invalid credentials
* Empty and invalid fields
* Password visibility
* Loading and duplicate submission
* Forgot-password feedback

Run:

```bash
npm run lint
npx tsc --noEmit
npm run test:e2e
npm run build
```

If any test or check fails, inspect the error, fix the implementation, and run all checks again. Repeat until everything passes.

Review `report/playwright-report/` before finishing.
