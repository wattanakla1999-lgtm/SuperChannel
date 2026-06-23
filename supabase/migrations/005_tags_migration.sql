-- Create new ENUM types
create type public.tag_target as enum ('customer', 'conversation');
create type public.tag_assignment_source as enum ('manual', 'automation', 'import', 'api');

-- Alter tags table to include missing fields
alter table public.tags 
  add column description text,
  add column target public.tag_target not null default 'customer',
  add column is_archived boolean not null default false;

-- Update tags constraints
alter table public.tags drop constraint if exists tags_organization_name_key;
alter table public.tags add constraint tags_organization_target_name_key unique (organization_id, target, name);

-- Alter customer_tags table
alter table public.customer_tags
  add column assigned_by_member_id text references public.members(id) on delete set null,
  add column source public.tag_assignment_source not null default 'manual';

-- Alter conversation_tags table
alter table public.conversation_tags
  add column assigned_by_member_id text references public.members(id) on delete set null,
  add column source public.tag_assignment_source not null default 'manual';

-- Create tag_audit_logs table
create table if not exists public.tag_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_member_id text references public.members(id) on delete set null,
  tag_id uuid not null references public.tags(id) on delete cascade,
  action text not null,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

-- Enable RLS for tag_audit_logs
alter table public.tag_audit_logs enable row level security;

-- Create RLS policies for tag_audit_logs
create policy tag_audit_logs_select_active_members
on public.tag_audit_logs
for select
using (public.is_active_member(organization_id));

create policy tag_audit_logs_insert_active_members
on public.tag_audit_logs
for insert
with check (
  public.is_active_member(organization_id)
  and (
    actor_member_id is null
    or actor_member_id = public.current_member_id(organization_id)
  )
);

-- Create indexes for performance
create index if not exists tags_organization_id_idx on public.tags(organization_id);
create index if not exists tags_target_idx on public.tags(target);
create index if not exists customer_tags_tag_id_idx on public.customer_tags(tag_id);
create index if not exists conversation_tags_tag_id_idx on public.conversation_tags(tag_id);
create index if not exists tag_audit_logs_tag_id_idx on public.tag_audit_logs(tag_id);

-- Restrict tags table modifications to Owner and Admin only
drop policy if exists tags_modify_active_members on public.tags;

create policy tags_modify_owner_admin
on public.tags
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));
