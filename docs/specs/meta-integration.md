# Facebook And Instagram Messaging

## Task

Connect Facebook Page Messenger and Instagram Professional messaging to the
existing Unified Inbox through one Meta App. Reuse the current integration,
provider-adapter, customer identity, conversation, message, attachment, Axios,
Supabase, Prisma, authentication, and permission architecture.

This task covers messaging only. Do not add Publishing, comments, ads, Campaign,
or Broadcast support.

## Connection Flow

- Add Connect Facebook/Instagram in Integrations using Meta OAuth.
- Request only permissions required by the selected current Meta API products.
- Let an authorized user select a Facebook Page and eligible Instagram account.
- Validate the connection, subscribe the selected accounts to Webhooks, encrypt
  tokens, and store expiry/status without exposing credentials to the browser.
- Support Test, Reconnect, and Disconnect. Disconnect must revoke/unsubscribe
  access where supported and preserve historical conversations.

## Messaging

- Implement Meta Webhook GET verification and POST signature verification.
- Process events idempotently and scope them to the correct organization and
  integration.
- Receive and persist text and image messages for Facebook and Instagram.
- Fetch safe profile information and create provider-scoped customer identities.
- Send replies from the existing Inbox through the correct Meta Send API while
  enforcing current messaging-window and platform-policy restrictions.
- Never merge customers automatically by display name alone.
- Show provider badges, sending, failed, retry, expired-token, and unsupported
  message states in the existing Inbox.

## Security And Review

- Keep App Secret and tokens server-only and encrypted at rest.
- Derive organization and role from the authenticated session.
- Verify current Meta permission names, Graph API version, App Review, Business
  Verification, privacy policy, and data-deletion requirements before launch.
- Development mode may be tested only with permitted app roles/accounts; clearly
  report what remains blocked until Meta approves Advanced Access.

## Verification

Verify OAuth connection, Webhook verification/signatures, duplicate events,
Facebook and Instagram inbound messages, replies, reconnect/disconnect, tenant
isolation, and responsive Inbox behavior. Run lint, TypeScript checks, and build.
