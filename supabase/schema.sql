-- The Final Check
-- Fresh application schema for a clean Supabase project
-- Run this after supabase/reset.sql if you are replacing an older setup

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  company_name text not null default '',
  contact_name text,
  contact_email text,
  contact_phone text,
  location text,
  notes text,
  logo_url text,
  cover_url text,
  status text not null default 'Active',
  tier text not null default 'Standard',
  industry text,
  website text,
  next_review_date date,
  tags text[] not null default '{}'::text[],
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  client_site_id text,
  title text not null default 'Kitchen Profit Audit',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.menu_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  client_site_id text,
  title text not null default 'Untitled menu',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_safety_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  client_site_id text,
  title text not null default 'Food Safety Audit',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mystery_shop_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_id uuid references public.clients(id) on delete set null,
  client_site_id text,
  title text not null default 'Mystery Shop Audit',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dashboard_task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null default 'New list',
  position integer not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dashboard_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  group_id uuid not null references public.dashboard_task_groups(id) on delete cascade,
  task_text text not null default '',
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  draft_key text not null,
  entity_type text not null,
  title text,
  client_id uuid references public.clients(id) on delete set null,
  client_site_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_drafts_user_key_unique unique (user_id, draft_key)
);

create table public.report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  report_type text not null,
  title text not null default 'Shared report',
  token text not null unique,
  source_record_id uuid,
  payload jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  avatar_position jsonb not null default '{"x":50,"y":50,"scale":1}'::jsonb,
  job_title text,
  organisation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  platform text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index clients_user_id_idx on public.clients(user_id);
create index clients_company_name_idx on public.clients(user_id, company_name asc);
create index clients_next_review_idx on public.clients(user_id, next_review_date);

create index audits_user_id_idx on public.audits(user_id);
create index audits_client_id_idx on public.audits(user_id, client_id);
create index audits_review_date_idx on public.audits(user_id, review_date desc);

create index menu_projects_user_id_idx on public.menu_projects(user_id);
create index menu_projects_client_id_idx on public.menu_projects(user_id, client_id);
create index menu_projects_review_date_idx on public.menu_projects(user_id, review_date desc);

create index food_safety_audits_user_id_idx on public.food_safety_audits(user_id);
create index food_safety_audits_client_id_idx on public.food_safety_audits(user_id, client_id);
create index food_safety_audits_review_date_idx on public.food_safety_audits(user_id, review_date desc);

create index mystery_shop_audits_user_id_idx on public.mystery_shop_audits(user_id);
create index mystery_shop_audits_client_id_idx on public.mystery_shop_audits(user_id, client_id);
create index mystery_shop_audits_review_date_idx on public.mystery_shop_audits(user_id, review_date desc);

create index dashboard_task_groups_user_id_idx on public.dashboard_task_groups(user_id);
create index dashboard_task_groups_position_idx on public.dashboard_task_groups(user_id, position);
create index dashboard_tasks_group_id_idx on public.dashboard_tasks(group_id);
create index dashboard_tasks_position_idx on public.dashboard_tasks(group_id, position);

create index user_drafts_user_id_idx on public.user_drafts(user_id);
create index user_drafts_updated_at_idx on public.user_drafts(user_id, updated_at desc);

create index report_shares_token_idx on public.report_shares(token);
create index report_shares_public_idx on public.report_shares(is_public, expires_at);
create index profiles_updated_at_idx on public.profiles(updated_at desc);
create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index push_subscriptions_last_seen_idx on public.push_subscriptions(user_id, last_seen_at desc);

create trigger set_clients_updated_at before update on public.clients for each row execute procedure public.set_updated_at();
create trigger set_audits_updated_at before update on public.audits for each row execute procedure public.set_updated_at();
create trigger set_menu_projects_updated_at before update on public.menu_projects for each row execute procedure public.set_updated_at();
create trigger set_food_safety_audits_updated_at before update on public.food_safety_audits for each row execute procedure public.set_updated_at();
create trigger set_mystery_shop_audits_updated_at before update on public.mystery_shop_audits for each row execute procedure public.set_updated_at();
create trigger set_dashboard_task_groups_updated_at before update on public.dashboard_task_groups for each row execute procedure public.set_updated_at();
create trigger set_dashboard_tasks_updated_at before update on public.dashboard_tasks for each row execute procedure public.set_updated_at();
create trigger set_user_drafts_updated_at before update on public.user_drafts for each row execute procedure public.set_updated_at();
create trigger set_report_shares_updated_at before update on public.report_shares for each row execute procedure public.set_updated_at();
create trigger set_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger set_push_subscriptions_updated_at before update on public.push_subscriptions for each row execute procedure public.set_updated_at();

alter table public.clients enable row level security;
alter table public.audits enable row level security;
alter table public.menu_projects enable row level security;
alter table public.food_safety_audits enable row level security;
alter table public.mystery_shop_audits enable row level security;
alter table public.dashboard_task_groups enable row level security;
alter table public.dashboard_tasks enable row level security;
alter table public.user_drafts enable row level security;
alter table public.report_shares enable row level security;
alter table public.profiles enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users can view own clients" on public.clients for select using (auth.uid() = user_id);
create policy "Users can insert own clients" on public.clients for insert with check (auth.uid() = user_id);
create policy "Users can update own clients" on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own clients" on public.clients for delete using (auth.uid() = user_id);

create policy "Users can view own audits" on public.audits for select using (auth.uid() = user_id);
create policy "Users can insert own audits" on public.audits for insert with check (auth.uid() = user_id);
create policy "Users can update own audits" on public.audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own audits" on public.audits for delete using (auth.uid() = user_id);

create policy "Users can view own menu projects" on public.menu_projects for select using (auth.uid() = user_id);
create policy "Users can insert own menu projects" on public.menu_projects for insert with check (auth.uid() = user_id);
create policy "Users can update own menu projects" on public.menu_projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own menu projects" on public.menu_projects for delete using (auth.uid() = user_id);

create policy "Users can view own food safety audits" on public.food_safety_audits for select using (auth.uid() = user_id);
create policy "Users can insert own food safety audits" on public.food_safety_audits for insert with check (auth.uid() = user_id);
create policy "Users can update own food safety audits" on public.food_safety_audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own food safety audits" on public.food_safety_audits for delete using (auth.uid() = user_id);

create policy "Users can view own mystery shop audits" on public.mystery_shop_audits for select using (auth.uid() = user_id);
create policy "Users can insert own mystery shop audits" on public.mystery_shop_audits for insert with check (auth.uid() = user_id);
create policy "Users can update own mystery shop audits" on public.mystery_shop_audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own mystery shop audits" on public.mystery_shop_audits for delete using (auth.uid() = user_id);

create policy "Users can view own dashboard task groups" on public.dashboard_task_groups for select using (auth.uid() = user_id);
create policy "Users can insert own dashboard task groups" on public.dashboard_task_groups for insert with check (auth.uid() = user_id);
create policy "Users can update own dashboard task groups" on public.dashboard_task_groups for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own dashboard task groups" on public.dashboard_task_groups for delete using (auth.uid() = user_id);

create policy "Users can view own dashboard tasks" on public.dashboard_tasks for select using (auth.uid() = user_id);
create policy "Users can insert own dashboard tasks" on public.dashboard_tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own dashboard tasks" on public.dashboard_tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own dashboard tasks" on public.dashboard_tasks for delete using (auth.uid() = user_id);

create policy "Users can view own drafts" on public.user_drafts for select using (auth.uid() = user_id);
create policy "Users can insert own drafts" on public.user_drafts for insert with check (auth.uid() = user_id);
create policy "Users can update own drafts" on public.user_drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own drafts" on public.user_drafts for delete using (auth.uid() = user_id);

create policy "Users can view own report shares" on public.report_shares for select using (auth.uid() = user_id);
create policy "Users can insert own report shares" on public.report_shares for insert with check (auth.uid() = user_id);
create policy "Users can update own report shares" on public.report_shares for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own report shares" on public.report_shares for delete using (auth.uid() = user_id);
create policy "Public can view active report shares" on public.report_shares for select using (is_public = true and (expires_at is null or expires_at > now()));

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own profile" on public.profiles for delete using (auth.uid() = user_id);

create policy "Users can view own push subscriptions" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own push subscriptions" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "Users can update own push subscriptions" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own push subscriptions" on public.push_subscriptions for delete using (auth.uid() = user_id);

grant usage on schema public to authenticated, service_role, anon;

grant all on table public.clients to authenticated, service_role;
grant all on table public.audits to authenticated, service_role;
grant all on table public.menu_projects to authenticated, service_role;
grant all on table public.food_safety_audits to authenticated, service_role;
grant all on table public.mystery_shop_audits to authenticated, service_role;
grant all on table public.dashboard_task_groups to authenticated, service_role;
grant all on table public.dashboard_tasks to authenticated, service_role;
grant all on table public.user_drafts to authenticated, service_role;
grant all on table public.report_shares to authenticated, service_role;
grant all on table public.profiles to authenticated, service_role;

grant select on table public.report_shares to anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 10485760, array['image/*'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view avatar files"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

create policy "Users can upload own avatar files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.jwt()->>'sub')
);

create policy "Users can update own avatar files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);

create policy "Users can delete own avatar files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
);
