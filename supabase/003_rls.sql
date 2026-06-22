create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_member_id(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.id
  from public.members m
  join public.profiles p on p.id = m.profile_id
  where p.user_id = auth.uid()
    and m.organization_id = target_organization_id
    and m.status = 'active'
  limit 1
$$;

create or replace function public.is_active_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.profiles p on p.id = m.profile_id
    where p.user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
  )
$$;

create or replace function public.has_any_role(
  target_organization_id uuid,
  allowed_roles public.workspace_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members m
    join public.profiles p on p.id = m.profile_id
    where p.user_id = auth.uid()
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and m.role = any (allowed_roles)
  )
$$;

alter table public.organizations enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.customers enable row level security;
alter table public.customer_channel_identities enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.tags enable row level security;
alter table public.customer_tags enable row level security;
alter table public.conversation_tags enable row level security;
alter table public.conversation_assignments enable row level security;
alter table public.customer_notes enable row level security;
alter table public.saved_replies enable row level security;
alter table public.publishing_posts enable row level security;
alter table public.publishing_targets enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;

revoke all on table public.integration_credentials from anon, authenticated;

create policy organizations_select_active_members
on public.organizations
for select
using (public.is_active_member(id));

create policy organizations_update_owner_admin
on public.organizations
for update
using (public.has_any_role(id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(id, array['owner', 'admin']::public.workspace_role[]));

create policy workspace_settings_select_active_members
on public.workspace_settings
for select
using (public.is_active_member(organization_id));

create policy workspace_settings_modify_owner_admin
on public.workspace_settings
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy profiles_select_same_org_members
on public.profiles
for select
using (public.is_active_member(organization_id));

create policy profiles_update_self_or_admin
on public.profiles
for update
using (
  user_id = auth.uid()
  or public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  user_id = auth.uid()
  or public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[])
);

create policy members_select_active_members
on public.members
for select
using (public.is_active_member(organization_id));

create policy members_modify_owner_admin
on public.members
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy invitations_select_active_members
on public.invitations
for select
using (public.is_active_member(organization_id));

create policy invitations_modify_owner_admin
on public.invitations
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy integrations_select_active_members
on public.integrations
for select
using (public.is_active_member(organization_id));

create policy integrations_modify_owner_admin
on public.integrations
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy customers_select_active_members
on public.customers
for select
using (public.is_active_member(organization_id));

create policy customers_modify_active_members
on public.customers
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy customer_channel_identities_select_active_members
on public.customer_channel_identities
for select
using (public.is_active_member(organization_id));

create policy customer_channel_identities_modify_active_members
on public.customer_channel_identities
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy conversations_select_active_members
on public.conversations
for select
using (public.is_active_member(organization_id));

create policy conversations_modify_active_members
on public.conversations
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy conversation_messages_select_active_members
on public.conversation_messages
for select
using (public.is_active_member(organization_id));

create policy conversation_messages_insert_active_members
on public.conversation_messages
for insert
with check (
  public.is_active_member(organization_id)
  and (
    sender_member_id is null
    or sender_member_id = public.current_member_id(organization_id)
  )
);

create policy conversation_messages_update_owner_admin_supervisor
on public.conversation_messages
for update
using (
  public.has_any_role(
    organization_id,
    array['owner', 'admin', 'supervisor']::public.workspace_role[]
  )
)
with check (
  public.has_any_role(
    organization_id,
    array['owner', 'admin', 'supervisor']::public.workspace_role[]
  )
);

create policy message_attachments_select_active_members
on public.message_attachments
for select
using (public.is_active_member(organization_id));

create policy message_attachments_modify_active_members
on public.message_attachments
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy tags_select_active_members
on public.tags
for select
using (public.is_active_member(organization_id));

create policy tags_modify_active_members
on public.tags
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy customer_tags_select_active_members
on public.customer_tags
for select
using (public.is_active_member(organization_id));

create policy customer_tags_modify_active_members
on public.customer_tags
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy conversation_tags_select_active_members
on public.conversation_tags
for select
using (public.is_active_member(organization_id));

create policy conversation_tags_modify_active_members
on public.conversation_tags
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy conversation_assignments_select_active_members
on public.conversation_assignments
for select
using (public.is_active_member(organization_id));

create policy conversation_assignments_modify_owner_admin_supervisor
on public.conversation_assignments
for all
using (
  public.has_any_role(
    organization_id,
    array['owner', 'admin', 'supervisor']::public.workspace_role[]
  )
)
with check (
  public.has_any_role(
    organization_id,
    array['owner', 'admin', 'supervisor']::public.workspace_role[]
  )
  and (
    assigned_by_member_id is null
    or assigned_by_member_id = public.current_member_id(organization_id)
  )
);

create policy customer_notes_select_active_members
on public.customer_notes
for select
using (public.is_active_member(organization_id));

create policy customer_notes_insert_active_members
on public.customer_notes
for insert
with check (
  public.is_active_member(organization_id)
  and (
    author_member_id is null
    or author_member_id = public.current_member_id(organization_id)
  )
);

create policy customer_notes_update_author_or_owner_admin
on public.customer_notes
for update
using (
  author_member_id = public.current_member_id(organization_id)
  or public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[])
)
with check (
  author_member_id = public.current_member_id(organization_id)
  or public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[])
);

create policy customer_notes_delete_author_or_owner_admin
on public.customer_notes
for delete
using (
  author_member_id = public.current_member_id(organization_id)
  or public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[])
);

create policy saved_replies_select_active_members
on public.saved_replies
for select
using (public.is_active_member(organization_id));

create policy saved_replies_modify_owner_admin
on public.saved_replies
for all
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]))
with check (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy publishing_posts_select_active_members
on public.publishing_posts
for select
using (public.is_active_member(organization_id));

create policy publishing_posts_modify_active_members
on public.publishing_posts
for all
using (public.is_active_member(organization_id))
with check (
  public.is_active_member(organization_id)
  and (
    author_member_id is null
    or author_member_id = public.current_member_id(organization_id)
  )
);

create policy publishing_targets_select_active_members
on public.publishing_targets
for select
using (public.is_active_member(organization_id));

create policy publishing_targets_modify_active_members
on public.publishing_targets
for all
using (public.is_active_member(organization_id))
with check (public.is_active_member(organization_id));

create policy orders_select_active_members
on public.orders
for select
using (public.is_active_member(organization_id));

create policy order_items_select_active_members
on public.order_items
for select
using (public.is_active_member(organization_id));

create policy invoices_select_active_members
on public.invoices
for select
using (public.is_active_member(organization_id));

create policy invoice_line_items_select_active_members
on public.invoice_line_items
for select
using (public.is_active_member(organization_id));

create policy webhook_events_select_owner_admin
on public.webhook_events
for select
using (organization_id is not null and public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));

create policy audit_logs_select_owner_admin
on public.audit_logs
for select
using (public.has_any_role(organization_id, array['owner', 'admin']::public.workspace_role[]));
