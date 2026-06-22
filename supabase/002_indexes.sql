create index if not exists idx_workspace_settings_organization_id
  on public.workspace_settings (organization_id);

create index if not exists idx_profiles_organization_id
  on public.profiles (organization_id);

create index if not exists idx_profiles_user_id
  on public.profiles (user_id);

create index if not exists idx_members_organization_role_status
  on public.members (organization_id, role, status);

create index if not exists idx_members_organization_team
  on public.members (organization_id, team);

create index if not exists idx_invitations_organization_status_created_at
  on public.invitations (organization_id, status, created_at desc);

create index if not exists idx_integrations_organization_status_provider
  on public.integrations (organization_id, status, provider);

create index if not exists idx_customers_organization_last_interaction
  on public.customers (organization_id, last_interaction_at desc);

create index if not exists idx_customers_organization_assigned_status
  on public.customers (organization_id, assigned_member_id, status, last_interaction_at desc);

create index if not exists idx_customers_search_name_trgm
  on public.customers using gin (lower(name) gin_trgm_ops);

create index if not exists idx_customers_search_email_trgm
  on public.customers using gin (lower(coalesce(email, '')) gin_trgm_ops);

create index if not exists idx_customer_channel_identities_organization_customer
  on public.customer_channel_identities (organization_id, customer_id);

create index if not exists idx_customer_channel_identities_handle_trgm
  on public.customer_channel_identities using gin (lower(handle) gin_trgm_ops);

create index if not exists idx_conversations_organization_last_message
  on public.conversations (organization_id, last_message_at desc);

create index if not exists idx_conversations_organization_status_last_message
  on public.conversations (organization_id, status, last_message_at desc);

create index if not exists idx_conversations_organization_assigned_last_message
  on public.conversations (organization_id, assigned_member_id, last_message_at desc);

create index if not exists idx_conversations_organization_customer
  on public.conversations (organization_id, customer_id);

create index if not exists idx_messages_organization_conversation_created_at
  on public.conversation_messages (organization_id, conversation_id, created_at asc);

create index if not exists idx_messages_search_body_trgm
  on public.conversation_messages using gin (lower(body) gin_trgm_ops);

create index if not exists idx_message_attachments_organization_message
  on public.message_attachments (organization_id, message_id);

create index if not exists idx_customer_tags_organization_customer
  on public.customer_tags (organization_id, customer_id);

create index if not exists idx_conversation_tags_organization_conversation
  on public.conversation_tags (organization_id, conversation_id);

create index if not exists idx_customer_notes_organization_customer_created_at
  on public.customer_notes (organization_id, customer_id, created_at desc);

create index if not exists idx_saved_replies_organization_updated_at
  on public.saved_replies (organization_id, updated_at desc);

create index if not exists idx_saved_replies_search_title_trgm
  on public.saved_replies using gin (lower(title) gin_trgm_ops);

create index if not exists idx_saved_replies_search_message_trgm
  on public.saved_replies using gin (lower(message) gin_trgm_ops);

create index if not exists idx_publishing_posts_organization_status_created_at
  on public.publishing_posts (organization_id, status, created_at desc);

create index if not exists idx_publishing_posts_organization_scheduled_for
  on public.publishing_posts (organization_id, scheduled_for desc);

create index if not exists idx_publishing_targets_organization_post
  on public.publishing_targets (organization_id, post_id);

create index if not exists idx_publishing_targets_organization_provider_status
  on public.publishing_targets (organization_id, provider, status);

create index if not exists idx_orders_organization_customer_ordered_at
  on public.orders (organization_id, customer_id, ordered_at desc);

create index if not exists idx_orders_organization_status_ordered_at
  on public.orders (organization_id, status, ordered_at desc);

create index if not exists idx_orders_search_order_number_trgm
  on public.orders using gin (lower(order_number) gin_trgm_ops);

create index if not exists idx_order_items_organization_order
  on public.order_items (organization_id, order_id);

create index if not exists idx_invoices_organization_order
  on public.invoices (organization_id, order_id);

create index if not exists idx_invoices_search_invoice_number_trgm
  on public.invoices using gin (lower(invoice_number) gin_trgm_ops);

create index if not exists idx_invoice_line_items_organization_invoice
  on public.invoice_line_items (organization_id, invoice_id);

create unique index if not exists idx_webhook_events_provider_external_event
  on public.webhook_events (provider, external_event_id);

create index if not exists idx_webhook_events_organization_status_received_at
  on public.webhook_events (organization_id, status, received_at desc);

create index if not exists idx_audit_logs_organization_created_at
  on public.audit_logs (organization_id, created_at desc);
