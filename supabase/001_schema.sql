create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type public.app_locale as enum ('en', 'th');
create type public.workspace_role as enum ('owner', 'admin', 'supervisor', 'agent');
create type public.member_status as enum ('active', 'inactive', 'invited');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');
create type public.presence_status as enum ('online', 'away', 'offline');
create type public.channel_type as enum (
  'line',
  'facebook',
  'instagram',
  'telegram',
  'x',
  'tiktok',
  'shopee',
  'lazada',
  'tiktok_shop'
);
create type public.conversation_status as enum ('open', 'pending', 'resolved');
create type public.message_direction as enum ('inbound', 'outbound', 'internal');
create type public.message_type as enum ('text', 'image', 'note', 'file');
create type public.attachment_kind as enum ('image', 'file', 'video');
create type public.integration_provider as enum (
  'line',
  'facebook',
  'instagram',
  'telegram',
  'x',
  'tiktok',
  'shopee',
  'lazada',
  'tiktok_shop'
);
create type public.integration_capability as enum ('inbox', 'publishing');
create type public.integration_status as enum (
  'connected',
  'disconnected',
  'expired',
  'error',
  'coming_soon'
);
create type public.publishing_status as enum ('draft', 'scheduled', 'published', 'failed');
create type public.publish_submit_mode as enum ('draft', 'publish', 'schedule');
create type public.publishing_target_status as enum (
  'pending',
  'scheduled',
  'published',
  'failed',
  'skipped'
);
create type public.order_marketplace as enum (
  'shopee',
  'lazada',
  'tiktok_shop',
  'direct_store'
);
create type public.order_status as enum (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);
create type public.webhook_event_status as enum ('pending', 'processed', 'failed');
create type public.audit_actor_type as enum ('user', 'system', 'webhook');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  business_name text not null,
  support_email text not null,
  support_phone text,
  logo_preview text,
  default_locale public.app_locale not null default 'en',
  timezone text not null default 'Asia/Bangkok',
  business_hours jsonb not null default '{}'::jsonb,
  inbox_preferences jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  sla_target_minutes integer not null default 15,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  email text not null,
  full_name text not null,
  avatar_fallback text,
  phone text,
  locale_preference public.app_locale,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_organization_email_key unique (organization_id, email)
);

create table if not exists public.members (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role public.workspace_role not null,
  status public.member_status not null default 'active',
  team text not null,
  workload_limit integer not null default 0 check (workload_limit >= 0),
  online_status public.presence_status not null default 'offline',
  last_active_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint members_organization_profile_key unique (organization_id, profile_id)
);

create table if not exists public.invitations (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by_member_id text references public.members(id) on delete set null,
  email text not null,
  role public.workspace_role not null,
  team text not null,
  status public.invitation_status not null default 'pending',
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  provider_name text not null,
  required_account_type text not null,
  permissions_hint text not null,
  account_name text,
  available_accounts jsonb not null default '[]'::jsonb,
  capabilities public.integration_capability[] not null default '{}'::public.integration_capability[],
  status public.integration_status not null default 'disconnected',
  last_checked_at timestamptz,
  connection_metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint integrations_organization_provider_key unique (organization_id, provider)
);

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_id uuid not null unique references public.integrations(id) on delete cascade,
  encrypted_payload text not null,
  iv text not null,
  auth_tag text not null,
  key_version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  rotated_at timestamptz
);

create table if not exists public.customers (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_member_id text references public.members(id) on delete set null,
  primary_conversation_id text unique,
  avatar_fallback text,
  name text not null,
  email text,
  phone text,
  location text,
  notes text,
  status public.conversation_status not null,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_interaction_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customers_organization_email_key unique (organization_id, email)
);

create table if not exists public.customer_channel_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  channel public.channel_type not null,
  handle text not null,
  external_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_channel_identities_organization_channel_external_key
    unique (organization_id, channel, external_id)
);

create table if not exists public.conversations (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  assigned_member_id text references public.members(id) on delete set null,
  channel public.channel_type not null,
  status public.conversation_status not null,
  preview_text text,
  unread_count integer not null default 0 check (unread_count >= 0),
  started_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  last_message_at timestamptz,
  external_thread_id text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_organization_external_thread_key unique (organization_id, external_thread_id)
);

alter table public.customers
  add constraint customers_primary_conversation_id_fkey
  foreign key (primary_conversation_id)
  references public.conversations(id)
  on delete set null;

create table if not exists public.conversation_messages (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_member_id text references public.members(id) on delete set null,
  sender_display_name text not null,
  direction public.message_direction not null,
  type public.message_type not null,
  body text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id text not null references public.conversation_messages(id) on delete cascade,
  kind public.attachment_kind not null,
  file_name text not null,
  mime_type text not null,
  storage_path text,
  public_url text,
  size_bytes integer,
  width integer,
  height integer,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint tags_organization_name_key unique (organization_id, name)
);

create table if not exists public.customer_tags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (customer_id, tag_id)
);

create table if not exists public.conversation_tags (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, tag_id)
);

create table if not exists public.conversation_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id text not null references public.conversations(id) on delete cascade,
  assigned_member_id text not null references public.members(id) on delete cascade,
  assigned_by_member_id text references public.members(id) on delete set null,
  assigned_at timestamptz not null default timezone('utc', now()),
  unassigned_at timestamptz
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  author_member_id text references public.members(id) on delete set null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_replies (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_member_id text references public.members(id) on delete set null,
  title text not null,
  category text not null,
  shortcut text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_replies_organization_shortcut_key unique (organization_id, shortcut)
);

create table if not exists public.publishing_posts (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_member_id text references public.members(id) on delete set null,
  caption text not null,
  media_metadata jsonb,
  submit_mode public.publish_submit_mode not null,
  status public.publishing_status not null,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.publishing_targets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id text not null references public.publishing_posts(id) on delete cascade,
  provider public.integration_provider not null,
  account_label text,
  external_post_id text,
  status public.publishing_target_status not null,
  scheduled_for timestamptz,
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  marketplace public.order_marketplace not null,
  order_number text not null,
  status public.order_status not null,
  billing_name text not null,
  delivery_address text not null,
  payment_method text not null,
  shipping_fee numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  tracking_number text,
  ordered_at timestamptz not null,
  fulfillment_timeline jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint orders_organization_order_number_key unique (organization_id, order_number)
);

create table if not exists public.order_items (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id text not null references public.orders(id) on delete cascade,
  sku text not null,
  name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  discount_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.invoices (
  id text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id text not null unique references public.orders(id) on delete cascade,
  customer_id text not null references public.customers(id) on delete cascade,
  invoice_number text not null,
  billed_to_name text not null,
  billed_to_email text,
  billed_to_address text not null,
  billed_to_tax_id text,
  notes text,
  payment_method text not null,
  shipping_fee numeric(12,2) not null default 0,
  subtotal_amount numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  tax_rate numeric(6,4) not null default 0,
  total_amount numeric(12,2) not null default 0,
  issued_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint invoices_organization_invoice_number_key unique (organization_id, invoice_number)
);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id text not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity integer not null check (quantity > 0),
  amount numeric(12,2) not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider public.integration_provider not null,
  event_type text not null,
  external_event_id text not null,
  payload jsonb not null,
  status public.webhook_event_status not null default 'pending',
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type public.audit_actor_type not null,
  actor_member_id text references public.members(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger set_updated_at_organizations
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger set_updated_at_workspace_settings
before update on public.workspace_settings
for each row execute function public.set_updated_at();

create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at_members
before update on public.members
for each row execute function public.set_updated_at();

create trigger set_updated_at_invitations
before update on public.invitations
for each row execute function public.set_updated_at();

create trigger set_updated_at_integrations
before update on public.integrations
for each row execute function public.set_updated_at();

create trigger set_updated_at_integration_credentials
before update on public.integration_credentials
for each row execute function public.set_updated_at();

create trigger set_updated_at_customers
before update on public.customers
for each row execute function public.set_updated_at();

create trigger set_updated_at_customer_channel_identities
before update on public.customer_channel_identities
for each row execute function public.set_updated_at();

create trigger set_updated_at_conversations
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger set_updated_at_tags
before update on public.tags
for each row execute function public.set_updated_at();

create trigger set_updated_at_customer_notes
before update on public.customer_notes
for each row execute function public.set_updated_at();

create trigger set_updated_at_saved_replies
before update on public.saved_replies
for each row execute function public.set_updated_at();

create trigger set_updated_at_publishing_posts
before update on public.publishing_posts
for each row execute function public.set_updated_at();

create trigger set_updated_at_publishing_targets
before update on public.publishing_targets
for each row execute function public.set_updated_at();

create trigger set_updated_at_orders
before update on public.orders
for each row execute function public.set_updated_at();

create trigger set_updated_at_invoices
before update on public.invoices
for each row execute function public.set_updated_at();
