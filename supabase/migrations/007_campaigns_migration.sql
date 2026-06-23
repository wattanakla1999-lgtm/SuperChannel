-- Create ENUMs
create type public.campaign_status as enum ('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED', 'CANCELLED');
create type public.campaign_target_type as enum ('BROADCAST', 'TARGETED');
create type public.campaign_message_type as enum ('TEXT', 'IMAGE');
create type public.campaign_recipient_status as enum ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- Create campaigns table
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  channel public.integration_provider not null default 'line',
  integration_id uuid references public.integrations(id) on delete set null,
  target_type public.campaign_target_type not null default 'BROADCAST',
  segment_id uuid references public.segments(id) on delete set null,
  status public.campaign_status not null default 'DRAFT',
  timezone text not null default 'UTC',
  scheduled_at timestamptz,
  created_by_member_id text references public.members(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger update_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

-- Create campaign_messages table
create table if not exists public.campaign_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  type public.campaign_message_type not null,
  text_content text,
  image_url text,
  preview_image_url text,
  order_index int not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- Create campaign_batches table
create table if not exists public.campaign_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  idempotency_key text not null,
  status public.campaign_status not null default 'SENDING',
  error_message text,
  recipient_count int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger update_campaign_batches_updated_at
  before update on public.campaign_batches
  for each row execute function public.set_updated_at();

-- Create campaign_recipients table
create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  batch_id uuid references public.campaign_batches(id) on delete set null,
  customer_id text not null references public.customers(id) on delete cascade,
  line_user_id text not null,
  status public.campaign_recipient_status not null default 'PENDING',
  error_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger update_campaign_recipients_updated_at
  before update on public.campaign_recipients
  for each row execute function public.set_updated_at();

-- Create campaign_audit_logs
create table if not exists public.campaign_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  actor_member_id text references public.members(id) on delete set null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Unique constraints & indexes
create unique index if not exists campaigns_batch_idempotency_key_idx on public.campaign_batches(campaign_id, idempotency_key);
create index if not exists campaigns_organization_id_idx on public.campaigns(organization_id);
create index if not exists campaigns_status_idx on public.campaigns(status);
create index if not exists campaign_recipients_campaign_id_idx on public.campaign_recipients(campaign_id);
create index if not exists campaign_recipients_status_idx on public.campaign_recipients(status);

-- Enable RLS
alter table public.campaigns enable row level security;
alter table public.campaign_messages enable row level security;
alter table public.campaign_batches enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.campaign_audit_logs enable row level security;

-- Policies for Campaigns
create policy campaigns_select_active_members on public.campaigns
for select using (public.is_active_member(organization_id));

create policy campaigns_modify_owner_admin on public.campaigns
for all
using (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]));

-- Policies for Messages
create policy campaign_messages_select_active_members on public.campaign_messages
for select using (public.is_active_member(organization_id));

create policy campaign_messages_modify_owner_admin on public.campaign_messages
for all
using (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]));

-- Policies for Batches
create policy campaign_batches_select_active_members on public.campaign_batches
for select using (public.is_active_member(organization_id));

create policy campaign_batches_modify_owner_admin on public.campaign_batches
for all
using (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]));

-- Policies for Recipients
create policy campaign_recipients_select_active_members on public.campaign_recipients
for select using (public.is_active_member(organization_id));

create policy campaign_recipients_modify_owner_admin on public.campaign_recipients
for all
using (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin', 'supervisor']::public.workspace_role[]));

-- Policies for Audit Logs
create policy campaign_audit_logs_select_active_members on public.campaign_audit_logs
for select using (public.is_active_member(organization_id));

create policy campaign_audit_logs_insert_active_members on public.campaign_audit_logs
for insert
with check (
  public.is_active_member(organization_id)
  and (
    actor_member_id is null
    or actor_member_id = public.current_member_id(organization_id)
  )
);
