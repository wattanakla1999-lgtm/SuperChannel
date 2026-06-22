-- DEVELOPMENT ONLY.
-- DO NOT RUN THIS FILE IN PRODUCTION.
-- This seed intentionally mirrors the current deterministic mock workspace.

insert into public.organizations (
  id,
  slug,
  name
) values (
  '11111111-1111-1111-1111-111111111111',
  'superchannel-demo',
  'SuperChannel Demo Workspace'
)
on conflict (id) do update
set slug = excluded.slug,
    name = excluded.name;

insert into public.workspace_settings (
  id,
  organization_id,
  business_name,
  support_email,
  support_phone,
  logo_preview,
  default_locale,
  timezone,
  business_hours,
  inbox_preferences,
  notifications,
  sla_target_minutes
) values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'SuperChannel Demo Workspace',
  'ops@superchannel.local',
  '+66 2 123 4567',
  'SC',
  'en',
  'Asia/Bangkok',
  '{
    "holidays": ["2026-07-28", "2026-08-12"],
    "outsideBusinessHoursMessage": "Thanks for reaching out. Our operators will reply when business hours resume.",
    "workingDays": [
      {"day":"Monday","enabled":true,"opensAt":"09:00","closesAt":"18:00"},
      {"day":"Tuesday","enabled":true,"opensAt":"09:00","closesAt":"18:00"},
      {"day":"Wednesday","enabled":true,"opensAt":"09:00","closesAt":"18:00"},
      {"day":"Thursday","enabled":true,"opensAt":"09:00","closesAt":"18:00"},
      {"day":"Friday","enabled":true,"opensAt":"09:00","closesAt":"18:00"},
      {"day":"Saturday","enabled":false,"opensAt":"10:00","closesAt":"13:00"},
      {"day":"Sunday","enabled":false,"opensAt":"10:00","closesAt":"13:00"}
    ]
  }'::jsonb,
  '{
    "autoCloseHours": 24,
    "defaultAssignment": "Mina Ortiz",
    "defaultConversationStatus": "open",
    "showMessagePreview": true,
    "soundEnabled": true
  }'::jsonb,
  '{
    "assignment": true,
    "desktop": true,
    "email": true,
    "expiredConnection": true,
    "failedPublishing": true,
    "mention": true,
    "newMessage": true,
    "sound": true
  }'::jsonb,
  15
)
on conflict (organization_id) do update
set business_name = excluded.business_name,
    support_email = excluded.support_email,
    support_phone = excluded.support_phone,
    logo_preview = excluded.logo_preview,
    default_locale = excluded.default_locale,
    timezone = excluded.timezone,
    business_hours = excluded.business_hours,
    inbox_preferences = excluded.inbox_preferences,
    notifications = excluded.notifications,
    sla_target_minutes = excluded.sla_target_minutes;

insert into public.profiles (id, organization_id, user_id, email, full_name, avatar_fallback, phone, locale_preference) values
  ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', null, 'owner@superchannel.local', 'Olivia Owens', 'OO', null, 'en'),
  ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', null, 'admin@superchannel.local', 'SuperChannel Admin', 'SA', null, 'en'),
  ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', null, 'supervisor@superchannel.local', 'Harper Quinn', 'HQ', null, 'en'),
  ('30000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', null, 'agent@superchannel.local', 'Mina Ortiz', 'MO', null, 'en'),
  ('30000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', null, 'jules.carter@superchannel.local', 'Jules Carter', 'JC', null, 'en'),
  ('30000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', null, 'priya.das@superchannel.local', 'Priya Das', 'PD', null, 'en'),
  ('30000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', null, 'ethan.cole@superchannel.local', 'Ethan Cole', 'EC', null, 'en'),
  ('30000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', null, 'celine.leung@superchannel.local', 'Celine Leung', 'CL', null, 'en'),
  ('30000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', null, 'samira.noor@superchannel.local', 'Samira Noor', 'SN', null, 'en'),
  ('30000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', null, 'diego.ramos@superchannel.local', 'Diego Ramos', 'DR', null, 'en'),
  ('30000000-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', null, 'lila.perez@superchannel.local', 'Lila Perez', 'LP', null, 'en'),
  ('30000000-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', null, 'olivia.chen@superchannel.local', 'Olivia Chen', 'OC', null, 'en'),
  ('30000000-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', null, 'rhea.patel@superchannel.local', 'Rhea Patel', 'RP', null, 'en')
on conflict (id) do update
set email = excluded.email,
    full_name = excluded.full_name,
    avatar_fallback = excluded.avatar_fallback,
    phone = excluded.phone,
    locale_preference = excluded.locale_preference;

insert into public.members (
  id,
  organization_id,
  profile_id,
  role,
  status,
  team,
  workload_limit,
  online_status,
  last_active_at
) values
  ('member-owner-001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000001', 'owner', 'active', 'Leadership', 20, 'online', '2026-06-21T08:40:00.000Z'),
  ('member-admin-001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000002', 'admin', 'active', 'Leadership', 18, 'online', '2026-06-21T08:37:00.000Z'),
  ('member-supervisor-001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000003', 'supervisor', 'active', 'Operations', 14, 'online', '2026-06-21T08:11:00.000Z'),
  ('member-agent-001', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000004', 'agent', 'active', 'Support', 12, 'away', '2026-06-21T07:58:00.000Z'),
  ('member-agent-002', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000005', 'agent', 'active', 'Support', 12, 'online', '2026-06-21T07:42:00.000Z'),
  ('member-agent-003', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000006', 'supervisor', 'active', 'Creative', 10, 'away', '2026-06-21T07:24:00.000Z'),
  ('member-agent-004', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000007', 'agent', 'active', 'Operations', 10, 'offline', '2026-06-21T06:58:00.000Z'),
  ('member-agent-005', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000008', 'agent', 'active', 'Creative', 8, 'offline', '2026-06-21T06:18:00.000Z'),
  ('member-agent-006', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000009', 'agent', 'active', 'Growth', 11, 'online', '2026-06-21T05:42:00.000Z'),
  ('member-agent-007', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000010', 'agent', 'active', 'Growth', 9, 'away', '2026-06-21T05:18:00.000Z'),
  ('member-agent-008', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000011', 'agent', 'inactive', 'Support', 7, 'offline', '2026-06-19T11:20:00.000Z'),
  ('member-agent-009', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000012', 'supervisor', 'active', 'Retention', 10, 'online', '2026-06-21T04:55:00.000Z'),
  ('member-agent-010', '11111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-000000000013', 'agent', 'active', 'Retention', 8, 'away', '2026-06-21T04:22:00.000Z')
on conflict (id) do update
set profile_id = excluded.profile_id,
    role = excluded.role,
    status = excluded.status,
    team = excluded.team,
    workload_limit = excluded.workload_limit,
    online_status = excluded.online_status,
    last_active_at = excluded.last_active_at;

insert into public.invitations (
  id,
  organization_id,
  invited_by_member_id,
  email,
  role,
  team,
  status,
  invited_at,
  created_at
) values
  ('invite-001', '11111111-1111-1111-1111-111111111111', 'member-admin-001', 'sam.keller@superchannel.local', 'agent', 'Support', 'pending', '2026-06-21T07:00:00.000Z', '2026-06-21T07:00:00.000Z'),
  ('invite-002', '11111111-1111-1111-1111-111111111111', 'member-owner-001', 'anya.ross@superchannel.local', 'supervisor', 'Growth', 'pending', '2026-06-20T16:40:00.000Z', '2026-06-20T16:40:00.000Z'),
  ('invite-003', '11111111-1111-1111-1111-111111111111', 'member-admin-001', 'leo.farrell@superchannel.local', 'agent', 'Creative', 'pending', '2026-06-20T10:12:00.000Z', '2026-06-20T10:12:00.000Z')
on conflict (id) do update
set email = excluded.email,
    role = excluded.role,
    team = excluded.team,
    status = excluded.status;

insert into public.integrations (
  id,
  organization_id,
  provider,
  provider_name,
  required_account_type,
  permissions_hint,
  account_name,
  available_accounts,
  capabilities,
  status,
  last_checked_at
) values
  ('40000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'line', 'LINE Official Account', 'Verified LINE Official Account', 'Requires messaging, webhook, and profile access.', null, '[{"id":"line-main","label":"SuperChannel Support OA"},{"id":"line-sales","label":"SuperChannel Sales OA"}]'::jsonb, array['inbox']::public.integration_capability[], 'disconnected', null),
  ('40000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'facebook', 'Facebook Page', 'Facebook Page with business admin access', 'Requires page messaging, comments, and publishing scopes.', 'SuperChannel Main Page', '[{"id":"fb-main","label":"SuperChannel Main Page"}]'::jsonb, array['inbox','publishing']::public.integration_capability[], 'connected', '2026-06-21T09:30:00.000Z'),
  ('40000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'instagram', 'Instagram Professional Account', 'Instagram professional account', 'Requires a professional account linked to a Facebook Page.', 'superchannel.studio', '[{"id":"ig-studio","label":"superchannel.studio"},{"id":"ig-labs","label":"superchannel.labs"}]'::jsonb, array['publishing']::public.integration_capability[], 'connected', '2026-06-21T09:26:00.000Z'),
  ('40000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'telegram', 'Telegram Bot', 'Telegram bot plus channel admin access', 'Requires bot access and channel admin posting rights.', '@superchannel_ops_bot', '[{"id":"tg-ops","label":"@superchannel_ops_bot"},{"id":"tg-promo","label":"@superchannel_promo_bot"}]'::jsonb, array['inbox','publishing']::public.integration_capability[], 'connected', '2026-06-21T08:55:00.000Z'),
  ('40000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'x', 'X', 'X account with app write permissions', 'Requires read-write app permissions for the workspace handle.', '@superchannelapp', '[{"id":"x-main","label":"@superchannelapp"}]'::jsonb, array['publishing']::public.integration_capability[], 'expired', '2026-06-20T18:00:00.000Z'),
  ('40000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'tiktok', 'TikTok', 'TikTok business account', 'Requires a TikTok business account with content posting enabled.', 'SuperChannel Creators', '[{"id":"tt-main","label":"SuperChannel Creators"},{"id":"tt-labs","label":"SuperChannel Labs"}]'::jsonb, array['publishing']::public.integration_capability[], 'error', '2026-06-21T07:35:00.000Z'),
  ('40000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'shopee', 'Shopee', 'Coming soon', 'Marketplace support is not yet available in this mock.', null, '[]'::jsonb, array['inbox']::public.integration_capability[], 'coming_soon', null),
  ('40000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'lazada', 'Lazada', 'Coming soon', 'Marketplace support is not yet available in this mock.', null, '[]'::jsonb, array['inbox']::public.integration_capability[], 'coming_soon', null),
  ('40000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'tiktok_shop', 'TikTok Shop', 'Coming soon', 'Commerce support is not yet available in this mock.', null, '[]'::jsonb, array['inbox','publishing']::public.integration_capability[], 'coming_soon', null)
on conflict (id) do update
set account_name = excluded.account_name,
    available_accounts = excluded.available_accounts,
    capabilities = excluded.capabilities,
    status = excluded.status,
    last_checked_at = excluded.last_checked_at;

insert into public.tags (id, organization_id, name, color) values
  ('50000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'VIP', '#06b6d4'),
  ('50000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Shipping', '#0f172a'),
  ('50000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Sales', '#f59e0b'),
  ('50000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Partner', '#fb7185'),
  ('50000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Creative', '#14b8a6'),
  ('50000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Urgent', '#ef4444'),
  ('50000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Ops', '#6366f1')
on conflict (id) do update
set name = excluded.name,
    color = excluded.color;

insert into public.customers (
  id,
  organization_id,
  assigned_member_id,
  avatar_fallback,
  name,
  email,
  phone,
  location,
  notes,
  status,
  unread_count,
  last_interaction_at
) values
  ('cust-line-nina', '11111111-1111-1111-1111-111111111111', 'member-agent-001', 'NT', 'Nina Tan', 'nina.tan@example.com', '+66 81 555 1244', 'Bangkok, Thailand', 'Prefers LINE support and same-day order updates.', 'open', 2, '2026-06-21T08:31:00.000Z'),
  ('cust-fb-marco', '11111111-1111-1111-1111-111111111111', 'member-agent-002', 'MR', 'Marco Rivera', 'marco.rivera@example.com', '+63 917 800 4512', 'Manila, Philippines', 'Interested in reseller pricing for campaign bundles.', 'pending', 0, '2026-06-21T06:15:00.000Z'),
  ('cust-ig-aya', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'AL', 'Aya Lim', 'aya.lim@example.com', '+65 9123 8876', 'Singapore', 'Frequently asks for image-ready product details.', 'resolved', 0, '2026-06-20T15:45:00.000Z'),
  ('cust-tg-jonas', '11111111-1111-1111-1111-111111111111', 'member-supervisor-001', 'JH', 'Jonas Holt', 'jonas.holt@example.com', '+61 412 700 210', 'Sydney, Australia', 'Needs escalation path documented for operations incidents.', 'open', 1, '2026-06-21T02:09:00.000Z'),
  ('cust-fb-lila', '11111111-1111-1111-1111-111111111111', 'member-agent-001', 'LP', 'Lila Perez', 'lila.perez@example.com', '+62 811 2200 984', 'Jakarta, Indonesia', 'Waiting on revised quote for weekend moderation support.', 'open', 3, '2026-06-21T07:44:00.000Z'),
  ('cust-ig-mateo', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'MC', 'Mateo Cruz', 'mateo.cruz@example.com', '+63 945 771 0032', 'Cebu, Philippines', 'Strong visual direction, prefers approval batches every Tuesday.', 'pending', 0, '2026-06-21T07:10:00.000Z'),
  ('cust-line-sora', '11111111-1111-1111-1111-111111111111', 'member-agent-002', 'SA', 'Sora Akiyama', 'sora.akiyama@example.com', '+81 80 2222 4401', 'Osaka, Japan', 'Escalate refund questions to local operations within one hour.', 'open', 1, '2026-06-21T05:55:00.000Z'),
  ('cust-tg-emma', '11111111-1111-1111-1111-111111111111', 'member-supervisor-001', 'EL', 'Emma Liu', 'emma.liu@example.com', '+852 9822 1408', 'Hong Kong', 'Wants incident summaries attached to weekly stakeholder update.', 'resolved', 0, '2026-06-21T05:12:00.000Z')
on conflict (id) do update
set assigned_member_id = excluded.assigned_member_id,
    avatar_fallback = excluded.avatar_fallback,
    name = excluded.name,
    email = excluded.email,
    phone = excluded.phone,
    location = excluded.location,
    notes = excluded.notes,
    status = excluded.status,
    unread_count = excluded.unread_count,
    last_interaction_at = excluded.last_interaction_at;

insert into public.customer_channel_identities (
  id,
  organization_id,
  customer_id,
  channel,
  handle,
  external_id
) values
  ('60000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'line', '@ninatan.vip', 'line-99124'),
  ('60000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cust-fb-marco', 'facebook', 'marco.rivera.growth', 'fb-22048'),
  ('60000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cust-ig-aya', 'instagram', '@ayalim.studio', 'ig-48119'),
  ('60000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', 'telegram', '@jonasholt_ops', 'tg-70122'),
  ('60000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'cust-fb-lila', 'facebook', 'lila.perez.shop', 'fb-61921'),
  ('60000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'cust-ig-mateo', 'instagram', '@mateocruz.brand', 'ig-88910'),
  ('60000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'cust-line-sora', 'line', '@sora.home', 'line-23098'),
  ('60000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'cust-tg-emma', 'telegram', '@emma_liu_ops', 'tg-66211')
on conflict (id) do update
set handle = excluded.handle,
    external_id = excluded.external_id;

insert into public.conversations (
  id,
  organization_id,
  customer_id,
  assigned_member_id,
  channel,
  status,
  preview_text,
  unread_count,
  started_at,
  first_response_at,
  resolved_at,
  last_message_at,
  external_thread_id
) values
  ('conv-line-001', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'member-agent-001', 'line', 'open', 'Perfect, thank you for the quick update.', 2, '2026-06-21T08:25:00.000Z', '2026-06-21T08:29:00.000Z', null, '2026-06-21T08:31:00.000Z', 'line-99124-thread'),
  ('conv-fb-002', '11111111-1111-1111-1111-111111111111', 'cust-fb-marco', 'member-agent-002', 'facebook', 'pending', 'Absolutely. I can send the current partner deck and seat tiers.', 0, '2026-06-21T06:10:00.000Z', '2026-06-21T06:15:00.000Z', null, '2026-06-21T06:15:00.000Z', 'fb-22048-thread'),
  ('conv-ig-003', '11111111-1111-1111-1111-111111111111', 'cust-ig-aya', 'member-agent-003', 'instagram', 'resolved', 'Uploaded the launch creative with caption-safe spacing.', 0, '2026-06-20T15:40:00.000Z', '2026-06-20T15:45:00.000Z', '2026-06-20T15:45:00.000Z', '2026-06-20T15:45:00.000Z', 'ig-48119-thread'),
  ('conv-tg-004', '11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', 'member-supervisor-001', 'telegram', 'open', 'Sending the incident timeline and mitigation snapshot now.', 1, '2026-06-21T02:05:00.000Z', '2026-06-21T02:09:00.000Z', null, '2026-06-21T02:09:00.000Z', 'tg-70122-thread')
on conflict (id) do update
set assigned_member_id = excluded.assigned_member_id,
    status = excluded.status,
    preview_text = excluded.preview_text,
    unread_count = excluded.unread_count,
    started_at = excluded.started_at,
    first_response_at = excluded.first_response_at,
    resolved_at = excluded.resolved_at,
    last_message_at = excluded.last_message_at,
    external_thread_id = excluded.external_thread_id;

update public.customers
set primary_conversation_id = case id
  when 'cust-line-nina' then 'conv-line-001'
  when 'cust-fb-marco' then 'conv-fb-002'
  when 'cust-ig-aya' then 'conv-ig-003'
  when 'cust-tg-jonas' then 'conv-tg-004'
  else primary_conversation_id
end
where organization_id = '11111111-1111-1111-1111-111111111111';

insert into public.conversation_messages (
  id,
  organization_id,
  conversation_id,
  sender_member_id,
  sender_display_name,
  direction,
  type,
  body,
  created_at
) values
  ('msg-line-1', '11111111-1111-1111-1111-111111111111', 'conv-line-001', null, 'Nina Tan', 'inbound', 'text', 'Hi team, can you confirm if my order can still ship today?', '2026-06-21T08:25:00.000Z'),
  ('msg-line-2', '11111111-1111-1111-1111-111111111111', 'conv-line-001', 'member-agent-001', 'Mina Ortiz', 'outbound', 'text', 'Yes, it is packed and queued for pickup before 5 PM.', '2026-06-21T08:29:00.000Z'),
  ('msg-line-3', '11111111-1111-1111-1111-111111111111', 'conv-line-001', null, 'Nina Tan', 'inbound', 'text', 'Perfect, thank you for the quick update.', '2026-06-21T08:31:00.000Z'),
  ('msg-fb-1', '11111111-1111-1111-1111-111111111111', 'conv-fb-002', null, 'Marco Rivera', 'inbound', 'text', 'Can you share your bulk publishing rates for six brands?', '2026-06-21T06:10:00.000Z'),
  ('msg-fb-2', '11111111-1111-1111-1111-111111111111', 'conv-fb-002', 'member-agent-002', 'Jules Carter', 'outbound', 'text', 'Absolutely. I can send the current partner deck and seat tiers.', '2026-06-21T06:15:00.000Z'),
  ('msg-ig-1', '11111111-1111-1111-1111-111111111111', 'conv-ig-003', null, 'Aya Lim', 'inbound', 'text', 'Can you send the latest launch image again?', '2026-06-20T15:40:00.000Z'),
  ('msg-ig-2', '11111111-1111-1111-1111-111111111111', 'conv-ig-003', 'member-agent-003', 'Priya Das', 'outbound', 'image', 'Uploaded the launch creative with caption-safe spacing.', '2026-06-20T15:45:00.000Z'),
  ('msg-tg-1', '11111111-1111-1111-1111-111111111111', 'conv-tg-004', null, 'Jonas Holt', 'inbound', 'text', 'Need an outage summary for the dashboard slowdown.', '2026-06-21T02:05:00.000Z'),
  ('msg-tg-2', '11111111-1111-1111-1111-111111111111', 'conv-tg-004', 'member-supervisor-001', 'Harper Quinn', 'outbound', 'text', 'Sending the incident timeline and mitigation snapshot now.', '2026-06-21T02:09:00.000Z')
on conflict (id) do update
set sender_member_id = excluded.sender_member_id,
    sender_display_name = excluded.sender_display_name,
    direction = excluded.direction,
    type = excluded.type,
    body = excluded.body,
    created_at = excluded.created_at;

insert into public.customer_notes (
  id,
  organization_id,
  customer_id,
  author_member_id,
  body,
  created_at
) values
  ('70000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'member-agent-001', 'Prefers LINE support and same-day order updates.', '2026-06-21T08:31:00.000Z'),
  ('70000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cust-fb-marco', 'member-agent-002', 'Interested in reseller pricing for campaign bundles.', '2026-06-21T06:15:00.000Z'),
  ('70000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cust-ig-aya', 'member-agent-003', 'Frequently asks for image-ready product details.', '2026-06-20T15:45:00.000Z'),
  ('70000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', 'member-supervisor-001', 'Needs escalation path documented for operations incidents.', '2026-06-21T02:09:00.000Z')
on conflict (id) do update
set body = excluded.body,
    created_at = excluded.created_at;

insert into public.customer_tags (organization_id, customer_id, tag_id) values
  ('11111111-1111-1111-1111-111111111111', 'cust-line-nina', '50000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'cust-line-nina', '50000000-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111', 'cust-fb-marco', '50000000-0000-0000-0000-000000000003'),
  ('11111111-1111-1111-1111-111111111111', 'cust-fb-marco', '50000000-0000-0000-0000-000000000004'),
  ('11111111-1111-1111-1111-111111111111', 'cust-ig-aya', '50000000-0000-0000-0000-000000000005'),
  ('11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', '50000000-0000-0000-0000-000000000006'),
  ('11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', '50000000-0000-0000-0000-000000000007')
on conflict do nothing;

insert into public.conversation_tags (organization_id, conversation_id, tag_id) values
  ('11111111-1111-1111-1111-111111111111', 'conv-line-001', '50000000-0000-0000-0000-000000000001'),
  ('11111111-1111-1111-1111-111111111111', 'conv-line-001', '50000000-0000-0000-0000-000000000002'),
  ('11111111-1111-1111-1111-111111111111', 'conv-fb-002', '50000000-0000-0000-0000-000000000003'),
  ('11111111-1111-1111-1111-111111111111', 'conv-fb-002', '50000000-0000-0000-0000-000000000004'),
  ('11111111-1111-1111-1111-111111111111', 'conv-ig-003', '50000000-0000-0000-0000-000000000005'),
  ('11111111-1111-1111-1111-111111111111', 'conv-tg-004', '50000000-0000-0000-0000-000000000006'),
  ('11111111-1111-1111-1111-111111111111', 'conv-tg-004', '50000000-0000-0000-0000-000000000007')
on conflict do nothing;

insert into public.conversation_assignments (
  id,
  organization_id,
  conversation_id,
  assigned_member_id,
  assigned_by_member_id,
  assigned_at
) values
  ('80000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'conv-line-001', 'member-agent-001', 'member-admin-001', '2026-06-21T08:25:00.000Z'),
  ('80000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'conv-fb-002', 'member-agent-002', 'member-admin-001', '2026-06-21T06:10:00.000Z'),
  ('80000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'conv-ig-003', 'member-agent-003', 'member-owner-001', '2026-06-20T15:40:00.000Z'),
  ('80000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'conv-tg-004', 'member-supervisor-001', 'member-owner-001', '2026-06-21T02:05:00.000Z')
on conflict (id) do update
set assigned_member_id = excluded.assigned_member_id,
    assigned_by_member_id = excluded.assigned_by_member_id,
    assigned_at = excluded.assigned_at;

insert into public.saved_replies (
  id,
  organization_id,
  created_by_member_id,
  title,
  category,
  shortcut,
  message,
  updated_at
) values
  ('saved-reply-001', '11111111-1111-1111-1111-111111111111', 'member-admin-001', 'Order status update', 'Support', '/status', 'Thanks for reaching out. I’m checking the latest order status now and will update you shortly.', '2026-06-21T08:10:00.000Z'),
  ('saved-reply-002', '11111111-1111-1111-1111-111111111111', 'member-admin-001', 'Ops escalation', 'Escalation', '/escalate', 'I’m escalating this to the on-call operator and will share the next update within 30 minutes.', '2026-06-21T07:30:00.000Z'),
  ('saved-reply-003', '11111111-1111-1111-1111-111111111111', 'member-owner-001', 'Pricing follow-up', 'Sales', '/pricing', 'Absolutely. I’ll send the current pricing deck and available package tiers in this thread.', '2026-06-20T18:40:00.000Z'),
  ('saved-reply-004', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'Creative resend', 'Creative', '/creative', 'Sharing the latest approved creative asset now. Let me know if you want a caption-safe crop as well.', '2026-06-20T15:12:00.000Z')
on conflict (id) do update
set title = excluded.title,
    category = excluded.category,
    shortcut = excluded.shortcut,
    message = excluded.message,
    updated_at = excluded.updated_at;

insert into public.publishing_posts (
  id,
  organization_id,
  author_member_id,
  caption,
  media_metadata,
  submit_mode,
  status,
  scheduled_for,
  published_at,
  created_at
) values
  ('post-001', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'Weekend launch checklist is live. Grab the final promo assets and posting windows before 6 PM.', '{"id":"launch-grid","label":"Launch grid","accent":"from-pink-200 via-orange-100 to-amber-100"}'::jsonb, 'schedule', 'scheduled', '2026-06-22T02:30:00.000Z', null, '2026-06-21T03:10:00.000Z'),
  ('post-002', '11111111-1111-1111-1111-111111111111', 'member-admin-001', 'Shipping notice: same-day courier cutoffs now update automatically in the workspace.', null, 'publish', 'published', null, '2026-06-20T10:20:00.000Z', '2026-06-20T10:20:00.000Z'),
  ('post-003', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'Drafting the next creator toolkit drop with carousel variations and hashtag options.', '{"id":"promo-banner","label":"Promo banner","accent":"from-emerald-200 via-lime-100 to-teal-100"}'::jsonb, 'draft', 'draft', null, null, '2026-06-19T09:00:00.000Z'),
  ('post-004', '11111111-1111-1111-1111-111111111111', 'member-agent-003', 'The provider rejected this post because the mock TikTok caption exceeded the safe preview limit.', '{"id":"event-card","label":"Event card","accent":"from-cyan-200 via-sky-100 to-indigo-100"}'::jsonb, 'publish', 'failed', null, null, '2026-06-18T07:40:00.000Z')
on conflict (id) do update
set caption = excluded.caption,
    media_metadata = excluded.media_metadata,
    submit_mode = excluded.submit_mode,
    status = excluded.status,
    scheduled_for = excluded.scheduled_for,
    published_at = excluded.published_at;

insert into public.publishing_targets (
  id,
  organization_id,
  post_id,
  provider,
  account_label,
  status,
  scheduled_for,
  published_at,
  error_message
) values
  ('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'post-001', 'facebook', 'SuperChannel Main Page', 'scheduled', '2026-06-22T02:30:00.000Z', null, null),
  ('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'post-001', 'instagram', 'superchannel.studio', 'scheduled', '2026-06-22T02:30:00.000Z', null, null),
  ('90000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'post-002', 'telegram', '@superchannel_ops_bot', 'published', null, '2026-06-20T10:20:00.000Z', null),
  ('90000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'post-002', 'x', '@superchannelapp', 'published', null, '2026-06-20T10:20:00.000Z', null),
  ('90000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'post-004', 'tiktok', 'SuperChannel Creators', 'failed', null, null, 'The provider rejected this post because the mock TikTok caption exceeded the safe preview limit.')
on conflict (id) do update
set status = excluded.status,
    scheduled_for = excluded.scheduled_for,
    published_at = excluded.published_at,
    error_message = excluded.error_message;

insert into public.orders (
  id,
  organization_id,
  customer_id,
  marketplace,
  order_number,
  status,
  billing_name,
  delivery_address,
  payment_method,
  shipping_fee,
  subtotal_amount,
  total_amount,
  tracking_number,
  ordered_at,
  fulfillment_timeline
) values
  ('order-nina-1003', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'direct_store', 'SC-1003', 'delivered', 'Nina Tan', '52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand', 'LINE Pay', 0, 2290, 2450.30, null, '2026-06-20T03:11:00.000Z', '[{"title":"Paid","timestamp":"2026-06-20T03:15:00.000Z","description":"Payment captured from the customer''s LINE checkout link."},{"title":"Processing","timestamp":"2026-06-20T03:25:00.000Z","description":"Operations approved same-day handling for the priority workspace add-on."},{"title":"Delivered","timestamp":"2026-06-20T04:00:00.000Z","description":"Workspace access and onboarding handoff completed."}]'::jsonb),
  ('order-nina-1002', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'shopee', 'SP-40219', 'shipped', 'Nina Tan', '52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand', 'ShopeePay', 35, 1410, 1445, 'SPXTH21061840219', '2026-06-18T01:22:00.000Z', '[{"title":"Paid","timestamp":"2026-06-18T01:30:00.000Z","description":"Order imported from the Shopee historical commerce mock."},{"title":"Shipped","timestamp":"2026-06-18T08:10:00.000Z","description":"Packed and handed to the marketplace courier."}]'::jsonb),
  ('order-nina-1001', '11111111-1111-1111-1111-111111111111', 'cust-line-nina', 'lazada', 'LZD-88214', 'refunded', 'Nina Tan', '52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand', 'Lazada Wallet', 40, 1180, 1220, null, '2026-06-10T08:54:00.000Z', '[{"title":"Paid","timestamp":"2026-06-10T09:00:00.000Z","description":"Historical Lazada order captured for refund reconciliation."},{"title":"Refunded","timestamp":"2026-06-11T10:40:00.000Z","description":"Refund approved after duplicate plan purchase."}]'::jsonb),
  ('order-aya-2001', '11111111-1111-1111-1111-111111111111', 'cust-ig-aya', 'direct_store', 'SC-2001', 'refunded', 'Aya Lim', '371 River Valley Road, Singapore 238372', 'Credit Card', 0, 1690, 1808.30, null, '2026-06-17T05:01:00.000Z', '[{"title":"Paid","timestamp":"2026-06-17T05:05:00.000Z","description":"Payment accepted for the launch image bundle."},{"title":"Refunded","timestamp":"2026-06-18T02:12:00.000Z","description":"Refund processed after campaign rescope."}]'::jsonb),
  ('order-aya-2002', '11111111-1111-1111-1111-111111111111', 'cust-ig-aya', 'tiktok_shop', 'TTS-51008', 'cancelled', 'Aya Lim', '371 River Valley Road, Singapore 238372', 'TikTok PayLater', 25, 780, 805, null, '2026-06-19T06:05:00.000Z', '[{"title":"Pending","timestamp":"2026-06-19T06:05:00.000Z","description":"Order reserved before the customer cancelled from TikTok Shop."},{"title":"Cancelled","timestamp":"2026-06-19T06:40:00.000Z","description":"Marketplace cancellation synced into the mock inbox context."}]'::jsonb),
  ('order-jonas-3001', '11111111-1111-1111-1111-111111111111', 'cust-tg-jonas', 'direct_store', 'SC-3001', 'paid', 'Jonas Holt', '88 Pitt Street, Sydney NSW 2000 Australia', 'Bank Transfer', 0, 2450, 2621.50, null, '2026-06-20T11:00:00.000Z', '[{"title":"Paid","timestamp":"2026-06-20T11:05:00.000Z","description":"Payment received for incident audit and runbook bundle."}]'::jsonb)
on conflict (id) do update
set status = excluded.status,
    subtotal_amount = excluded.subtotal_amount,
    total_amount = excluded.total_amount,
    fulfillment_timeline = excluded.fulfillment_timeline;

insert into public.order_items (
  id,
  organization_id,
  order_id,
  sku,
  name,
  quantity,
  unit_price,
  discount_amount
) values
  ('item-nina-1003-1', '11111111-1111-1111-1111-111111111111', 'order-nina-1003', 'SC-HUB-ANNUAL', 'SC Messenger Hub Annual', 1, 2200, 200),
  ('item-nina-1003-2', '11111111-1111-1111-1111-111111111111', 'order-nina-1003', 'SC-SUPPORT-PRIORITY', 'Priority Support Add-on', 1, 290, 0),
  ('item-nina-1002-1', '11111111-1111-1111-1111-111111111111', 'order-nina-1002', 'SC-TRIAGE-PACK', 'Creator Comment Triage Pack', 1, 1040, 50),
  ('item-nina-1002-2', '11111111-1111-1111-1111-111111111111', 'order-nina-1002', 'SC-WEEKEND-COVER', 'Weekend Escalation Coverage', 1, 420, 0),
  ('item-aya-2001-1', '11111111-1111-1111-1111-111111111111', 'order-aya-2001', 'SC-CREATIVE-BUNDLE', 'Launch Image Bundle', 1, 1690, 0),
  ('item-jonas-3001-1', '11111111-1111-1111-1111-111111111111', 'order-jonas-3001', 'SC-OPS-AUDIT', 'Incident Audit Bundle', 1, 2450, 0)
on conflict (id) do update
set sku = excluded.sku,
    name = excluded.name,
    quantity = excluded.quantity,
    unit_price = excluded.unit_price,
    discount_amount = excluded.discount_amount;

insert into public.invoices (
  id,
  organization_id,
  order_id,
  customer_id,
  invoice_number,
  billed_to_name,
  billed_to_email,
  billed_to_address,
  billed_to_tax_id,
  notes,
  payment_method,
  shipping_fee,
  subtotal_amount,
  tax_amount,
  tax_rate,
  total_amount,
  issued_at
) values
  ('invoice-nina-1003', '11111111-1111-1111-1111-111111111111', 'order-nina-1003', 'cust-line-nina', 'INV-2026-1003', 'Nina Tan', 'nina.tan@example.com', '52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand', '0105559021431', 'Local mock invoice for workspace activation. No external tax service used.', 'LINE Pay', 0, 2290, 160.30, 0.07, 2450.30, '2026-06-20T04:05:00.000Z'),
  ('invoice-nina-1001', '11111111-1111-1111-1111-111111111111', 'order-nina-1001', 'cust-line-nina', 'INV-2026-1001', 'Nina Tan', 'nina.tan@example.com', '52 Sukhumvit 31, Khlong Toei Nuea, เขตวัฒนา Bangkok 10110 Thailand', '0105559021431', 'Historical invoice retained after refund for support context only.', 'Lazada Wallet', 40, 1180, 82.60, 0.07, 1220.60, '2026-06-10T09:12:00.000Z'),
  ('invoice-aya-2001', '11111111-1111-1111-1111-111111111111', 'order-aya-2001', 'cust-ig-aya', 'INV-2026-2001', 'Aya Lim', 'aya.lim@example.com', '371 River Valley Road, Singapore 238372', 'UEN-2026-AYA', 'Retained for refund audit in this deterministic mock session.', 'Credit Card', 0, 1690, 118.30, 0.07, 1808.30, '2026-06-17T05:12:00.000Z'),
  ('invoice-jonas-3001', '11111111-1111-1111-1111-111111111111', 'order-jonas-3001', 'cust-tg-jonas', 'INV-2026-3001', 'Jonas Holt', 'jonas.holt@example.com', '88 Pitt Street, Sydney NSW 2000 Australia', 'AU-OPS-3001', 'Read-only preview generated from deterministic mock order data.', 'Bank Transfer', 0, 2450, 171.50, 0.07, 2621.50, '2026-06-20T11:06:00.000Z')
on conflict (id) do update
set notes = excluded.notes,
    total_amount = excluded.total_amount,
    issued_at = excluded.issued_at;

insert into public.invoice_line_items (
  id,
  organization_id,
  invoice_id,
  description,
  quantity,
  amount
) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'invoice-nina-1003', 'SC Messenger Hub Annual', 1, 2000),
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'invoice-nina-1003', 'Priority Support Add-on', 1, 290),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'invoice-aya-2001', 'Launch Image Bundle', 1, 1690),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'invoice-jonas-3001', 'Incident Audit Bundle', 1, 2450)
on conflict (id) do update
set description = excluded.description,
    quantity = excluded.quantity,
    amount = excluded.amount;

insert into public.webhook_events (
  id,
  organization_id,
  provider,
  event_type,
  external_event_id,
  payload,
  status,
  received_at,
  processed_at
) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'facebook', 'message.created', 'fb-event-20260621-001', '{"thread":"fb-22048-thread","message":"Bulk publishing rates inquiry"}'::jsonb, 'processed', '2026-06-21T06:10:00.000Z', '2026-06-21T06:10:01.000Z')
on conflict (id) do update
set status = excluded.status,
    processed_at = excluded.processed_at;

insert into public.audit_logs (
  id,
  organization_id,
  actor_type,
  actor_member_id,
  action,
  entity_type,
  entity_id,
  metadata,
  created_at
) values
  ('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'user', 'member-admin-001', 'integration.connected', 'integration', 'facebook', '{"provider":"facebook","accountName":"SuperChannel Main Page"}'::jsonb, '2026-06-21T09:30:00.000Z'),
  ('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'user', 'member-admin-001', 'member.invited', 'invitation', 'invite-001', '{"email":"sam.keller@superchannel.local","role":"agent"}'::jsonb, '2026-06-21T07:00:00.000Z')
on conflict (id) do update
set metadata = excluded.metadata,
    created_at = excluded.created_at;
