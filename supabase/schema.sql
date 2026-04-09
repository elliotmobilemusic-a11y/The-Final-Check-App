-- The Final Check
-- Complete Supabase schema for clients, audits, and menu projects.
-- Safe to run on an existing project: it creates missing tables, adds missing columns,
-- backfills top-level link fields from stored JSON, and migrates legacy audit_reports rows.

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

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.clients add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.clients add column if not exists company_name text not null default '';
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists contact_email text;
alter table public.clients add column if not exists contact_phone text;
alter table public.clients add column if not exists location text;
alter table public.clients add column if not exists notes text;
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists cover_url text;
alter table public.clients add column if not exists status text not null default 'Active';
alter table public.clients add column if not exists tier text not null default 'Standard';
alter table public.clients add column if not exists industry text;
alter table public.clients add column if not exists website text;
alter table public.clients add column if not exists next_review_date date;
alter table public.clients add column if not exists tags text[] not null default '{}'::text[];
alter table public.clients add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.clients add column if not exists created_at timestamptz not null default now();
alter table public.clients add column if not exists updated_at timestamptz not null default now();
alter table public.clients alter column user_id set default auth.uid();
alter table public.clients alter column tags set default '{}'::text[];
alter table public.clients alter column data set default '{}'::jsonb;
alter table public.clients alter column created_at set default now();
alter table public.clients alter column updated_at set default now();

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.audits add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.audits add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.audits add column if not exists client_site_id text;
alter table public.audits add column if not exists title text not null default 'Kitchen Profit Audit';
alter table public.audits add column if not exists site_name text;
alter table public.audits add column if not exists location text;
alter table public.audits add column if not exists review_date date;
alter table public.audits add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.audits add column if not exists created_at timestamptz not null default now();
alter table public.audits add column if not exists updated_at timestamptz not null default now();
alter table public.audits alter column user_id set default auth.uid();
alter table public.audits alter column data set default '{}'::jsonb;
alter table public.audits alter column created_at set default now();
alter table public.audits alter column updated_at set default now();

create table if not exists public.menu_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.menu_projects add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.menu_projects add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.menu_projects add column if not exists client_site_id text;
alter table public.menu_projects add column if not exists title text not null default 'Untitled menu';
alter table public.menu_projects add column if not exists site_name text;
alter table public.menu_projects add column if not exists location text;
alter table public.menu_projects add column if not exists review_date date;
alter table public.menu_projects add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.menu_projects add column if not exists created_at timestamptz not null default now();
alter table public.menu_projects add column if not exists updated_at timestamptz not null default now();
alter table public.menu_projects alter column user_id set default auth.uid();
alter table public.menu_projects alter column data set default '{}'::jsonb;
alter table public.menu_projects alter column created_at set default now();
alter table public.menu_projects alter column updated_at set default now();

create table if not exists public.food_safety_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.food_safety_audits add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.food_safety_audits add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.food_safety_audits add column if not exists client_site_id text;
alter table public.food_safety_audits add column if not exists title text not null default 'Food Safety Audit';
alter table public.food_safety_audits add column if not exists site_name text;
alter table public.food_safety_audits add column if not exists location text;
alter table public.food_safety_audits add column if not exists review_date date;
alter table public.food_safety_audits add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.food_safety_audits add column if not exists created_at timestamptz not null default now();
alter table public.food_safety_audits add column if not exists updated_at timestamptz not null default now();
alter table public.food_safety_audits alter column user_id set default auth.uid();
alter table public.food_safety_audits alter column data set default '{}'::jsonb;
alter table public.food_safety_audits alter column created_at set default now();
alter table public.food_safety_audits alter column updated_at set default now();

create table if not exists public.mystery_shop_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.mystery_shop_audits add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.mystery_shop_audits add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.mystery_shop_audits add column if not exists client_site_id text;
alter table public.mystery_shop_audits add column if not exists title text not null default 'Mystery Shop Audit';
alter table public.mystery_shop_audits add column if not exists site_name text;
alter table public.mystery_shop_audits add column if not exists location text;
alter table public.mystery_shop_audits add column if not exists review_date date;
alter table public.mystery_shop_audits add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.mystery_shop_audits add column if not exists created_at timestamptz not null default now();
alter table public.mystery_shop_audits add column if not exists updated_at timestamptz not null default now();
alter table public.mystery_shop_audits alter column user_id set default auth.uid();
alter table public.mystery_shop_audits alter column data set default '{}'::jsonb;
alter table public.mystery_shop_audits alter column created_at set default now();
alter table public.mystery_shop_audits alter column updated_at set default now();

do $$
begin
  if to_regclass('public.audit_reports') is not null then
    insert into public.audits (
      id,
      user_id,
      client_id,
      client_site_id,
      title,
      site_name,
      location,
      review_date,
      data,
      created_at,
      updated_at
    )
    select
      ar.id,
      ar.user_id,
      case
        when coalesce(ar.data ->> 'clientId', '') ~* '^[0-9a-f-]{36}$' then (ar.data ->> 'clientId')::uuid
        else null
      end as client_id,
      nullif(ar.data ->> 'clientSiteId', '') as client_site_id,
      coalesce(nullif(ar.title, ''), 'Kitchen Profit Audit') as title,
      coalesce(nullif(ar.site_name, ''), nullif(ar.data ->> 'businessName', '')) as site_name,
      coalesce(ar.location, nullif(ar.data ->> 'location', '')) as location,
      coalesce(
        ar.review_date,
        case
          when coalesce(ar.data ->> 'visitDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (ar.data ->> 'visitDate')::date
          else null
        end
      ) as review_date,
      coalesce(ar.data, '{}'::jsonb) as data,
      ar.created_at,
      ar.updated_at
    from public.audit_reports ar
    on conflict (id) do update
    set
      user_id = excluded.user_id,
      client_id = excluded.client_id,
      client_site_id = excluded.client_site_id,
      title = excluded.title,
      site_name = excluded.site_name,
      location = excluded.location,
      review_date = excluded.review_date,
      data = excluded.data,
      updated_at = excluded.updated_at;
  end if;
end
$$;

update public.audits a
set client_id = null
where client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = a.client_id
  );

update public.menu_projects m
set client_id = null
where client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = m.client_id
  );

update public.food_safety_audits f
set client_id = null
where client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = f.client_id
  );

update public.mystery_shop_audits m
set client_id = null
where client_id is not null
  and not exists (
    select 1
    from public.clients c
    where c.id = m.client_id
  );

update public.audits
set
  client_id = coalesce(
    client_id,
    case
      when coalesce(data ->> 'clientId', '') ~* '^[0-9a-f-]{36}$'
        and exists (
          select 1
          from public.clients c
          where c.id = (data ->> 'clientId')::uuid
        )
      then (data ->> 'clientId')::uuid
      else null
    end
  ),
  client_site_id = coalesce(client_site_id, nullif(data ->> 'clientSiteId', '')),
  site_name = coalesce(nullif(site_name, ''), nullif(data ->> 'businessName', '')),
  location = coalesce(location, nullif(data ->> 'location', '')),
  review_date = coalesce(
    review_date,
    case
      when coalesce(data ->> 'visitDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (data ->> 'visitDate')::date
      else null
    end
  )
where true;

update public.menu_projects
set
  client_id = coalesce(
    client_id,
    case
      when coalesce(data ->> 'clientId', '') ~* '^[0-9a-f-]{36}$'
        and exists (
          select 1
          from public.clients c
          where c.id = (data ->> 'clientId')::uuid
        )
      then (data ->> 'clientId')::uuid
      else null
    end
  ),
  client_site_id = coalesce(client_site_id, nullif(data ->> 'clientSiteId', '')),
  site_name = coalesce(nullif(site_name, ''), nullif(data ->> 'siteName', '')),
  location = coalesce(location, nullif(data ->> 'location', '')),
  review_date = coalesce(
    review_date,
    case
      when coalesce(data ->> 'reviewDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (data ->> 'reviewDate')::date
      else null
    end
  )
where true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audits_client_id_fkey'
      and conrelid = 'public.audits'::regclass
  ) then
    alter table public.audits
      add constraint audits_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_projects_client_id_fkey'
      and conrelid = 'public.menu_projects'::regclass
  ) then
    alter table public.menu_projects
      add constraint menu_projects_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_safety_audits_client_id_fkey'
      and conrelid = 'public.food_safety_audits'::regclass
  ) then
    alter table public.food_safety_audits
      add constraint food_safety_audits_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'mystery_shop_audits_client_id_fkey'
      and conrelid = 'public.mystery_shop_audits'::regclass
  ) then
    alter table public.mystery_shop_audits
      add constraint mystery_shop_audits_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end
$$;

create index if not exists clients_user_id_idx on public.clients(user_id);
create index if not exists clients_company_name_idx on public.clients(user_id, company_name);
create index if not exists clients_next_review_idx on public.clients(next_review_date);

create index if not exists audits_user_id_idx on public.audits(user_id);
create index if not exists audits_client_id_idx on public.audits(client_id);
create index if not exists audits_client_site_id_idx on public.audits(client_site_id);
create index if not exists audits_review_date_idx on public.audits(review_date desc);

create index if not exists menu_projects_user_id_idx on public.menu_projects(user_id);
create index if not exists menu_projects_client_id_idx on public.menu_projects(client_id);
create index if not exists menu_projects_client_site_id_idx on public.menu_projects(client_site_id);
create index if not exists menu_projects_review_date_idx on public.menu_projects(review_date desc);

create index if not exists food_safety_audits_user_id_idx on public.food_safety_audits(user_id);
create index if not exists food_safety_audits_client_id_idx on public.food_safety_audits(client_id);
create index if not exists food_safety_audits_client_site_id_idx on public.food_safety_audits(client_site_id);
create index if not exists food_safety_audits_review_date_idx on public.food_safety_audits(review_date desc);

create index if not exists mystery_shop_audits_user_id_idx on public.mystery_shop_audits(user_id);
create index if not exists mystery_shop_audits_client_id_idx on public.mystery_shop_audits(client_id);
create index if not exists mystery_shop_audits_client_site_id_idx on public.mystery_shop_audits(client_site_id);
create index if not exists mystery_shop_audits_review_date_idx on public.mystery_shop_audits(review_date desc);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row execute procedure public.set_updated_at();

drop trigger if exists set_audits_updated_at on public.audits;
create trigger set_audits_updated_at
before update on public.audits
for each row execute procedure public.set_updated_at();

drop trigger if exists set_menu_projects_updated_at on public.menu_projects;
create trigger set_menu_projects_updated_at
before update on public.menu_projects
for each row execute procedure public.set_updated_at();

drop trigger if exists set_food_safety_audits_updated_at on public.food_safety_audits;
create trigger set_food_safety_audits_updated_at
before update on public.food_safety_audits
for each row execute procedure public.set_updated_at();

drop trigger if exists set_mystery_shop_audits_updated_at on public.mystery_shop_audits;
create trigger set_mystery_shop_audits_updated_at
before update on public.mystery_shop_audits
for each row execute procedure public.set_updated_at();

grant usage on schema public to authenticated, service_role;
grant all on table public.clients to authenticated, service_role;
grant all on table public.audits to authenticated, service_role;
grant all on table public.menu_projects to authenticated, service_role;
grant all on table public.food_safety_audits to authenticated, service_role;
grant all on table public.mystery_shop_audits to authenticated, service_role;

alter table public.clients enable row level security;
alter table public.audits enable row level security;
alter table public.menu_projects enable row level security;
alter table public.food_safety_audits enable row level security;
alter table public.mystery_shop_audits enable row level security;

drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can view own clients"
on public.clients
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own clients" on public.clients;
create policy "Users can insert own clients"
on public.clients
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients"
on public.clients
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients"
on public.clients
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own audits" on public.audits;
create policy "Users can view own audits"
on public.audits
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own audits" on public.audits;
create policy "Users can insert own audits"
on public.audits
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own audits" on public.audits;
create policy "Users can update own audits"
on public.audits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own audits" on public.audits;
create policy "Users can delete own audits"
on public.audits
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own menu projects" on public.menu_projects;
create policy "Users can view own menu projects"
on public.menu_projects
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own menu projects" on public.menu_projects;
create policy "Users can insert own menu projects"
on public.menu_projects
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own menu projects" on public.menu_projects;
create policy "Users can update own menu projects"
on public.menu_projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own menu projects" on public.menu_projects;
create policy "Users can delete own menu projects"
on public.menu_projects
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own food safety audits" on public.food_safety_audits;
create policy "Users can view own food safety audits"
on public.food_safety_audits
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own food safety audits" on public.food_safety_audits;
create policy "Users can insert own food safety audits"
on public.food_safety_audits
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own food safety audits" on public.food_safety_audits;
create policy "Users can update own food safety audits"
on public.food_safety_audits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own food safety audits" on public.food_safety_audits;
create policy "Users can delete own food safety audits"
on public.food_safety_audits
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own mystery shop audits" on public.mystery_shop_audits;
create policy "Users can view own mystery shop audits"
on public.mystery_shop_audits
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own mystery shop audits" on public.mystery_shop_audits;
create policy "Users can insert own mystery shop audits"
on public.mystery_shop_audits
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own mystery shop audits" on public.mystery_shop_audits;
create policy "Users can update own mystery shop audits"
on public.mystery_shop_audits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own mystery shop audits" on public.mystery_shop_audits;
create policy "Users can delete own mystery shop audits"
on public.mystery_shop_audits
for delete
using (auth.uid() = user_id);

-- Dashboard task lists and task items
create table if not exists public.dashboard_task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New list',
  position integer not null default 0,
  collapsed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_task_groups add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.dashboard_task_groups add column if not exists title text not null default 'New list';
alter table public.dashboard_task_groups add column if not exists position integer not null default 0;
alter table public.dashboard_task_groups add column if not exists collapsed boolean not null default false;
alter table public.dashboard_task_groups add column if not exists created_at timestamptz not null default now();
alter table public.dashboard_task_groups add column if not exists updated_at timestamptz not null default now();
alter table public.dashboard_task_groups alter column user_id set default auth.uid();
alter table public.dashboard_task_groups alter column position set default 0;
alter table public.dashboard_task_groups alter column collapsed set default false;
alter table public.dashboard_task_groups alter column created_at set default now();
alter table public.dashboard_task_groups alter column updated_at set default now();

create table if not exists public.dashboard_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.dashboard_task_groups(id) on delete cascade,
  task_text text not null default '',
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dashboard_tasks add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.dashboard_tasks add column if not exists group_id uuid references public.dashboard_task_groups(id) on delete cascade;
alter table public.dashboard_tasks add column if not exists task_text text not null default '';
alter table public.dashboard_tasks add column if not exists completed boolean not null default false;
alter table public.dashboard_tasks add column if not exists position integer not null default 0;
alter table public.dashboard_tasks add column if not exists created_at timestamptz not null default now();
alter table public.dashboard_tasks add column if not exists updated_at timestamptz not null default now();
alter table public.dashboard_tasks alter column user_id set default auth.uid();
alter table public.dashboard_tasks alter column completed set default false;
alter table public.dashboard_tasks alter column position set default 0;
alter table public.dashboard_tasks alter column created_at set default now();
alter table public.dashboard_tasks alter column updated_at set default now();

-- Generic user drafts for autosave and restore across client forms and tools
create table if not exists public.user_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

alter table public.user_drafts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.user_drafts add column if not exists draft_key text;
alter table public.user_drafts add column if not exists entity_type text;
alter table public.user_drafts add column if not exists title text;
alter table public.user_drafts add column if not exists client_id uuid references public.clients(id) on delete set null;
alter table public.user_drafts add column if not exists client_site_id text;
alter table public.user_drafts add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.user_drafts add column if not exists created_at timestamptz not null default now();
alter table public.user_drafts add column if not exists updated_at timestamptz not null default now();
alter table public.user_drafts alter column user_id set default auth.uid();
alter table public.user_drafts alter column payload set default '{}'::jsonb;
alter table public.user_drafts alter column created_at set default now();
alter table public.user_drafts alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_drafts_user_key_unique'
      and conrelid = 'public.user_drafts'::regclass
  ) then
    alter table public.user_drafts
      add constraint user_drafts_user_key_unique unique (user_id, draft_key);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dashboard_tasks_group_id_fkey'
      and conrelid = 'public.dashboard_tasks'::regclass
  ) then
    alter table public.dashboard_tasks
      add constraint dashboard_tasks_group_id_fkey
      foreign key (group_id) references public.dashboard_task_groups(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_drafts_client_id_fkey'
      and conrelid = 'public.user_drafts'::regclass
  ) then
    alter table public.user_drafts
      add constraint user_drafts_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end
$$;

create index if not exists dashboard_task_groups_user_id_idx on public.dashboard_task_groups(user_id);
create index if not exists dashboard_task_groups_position_idx on public.dashboard_task_groups(user_id, position);
create index if not exists dashboard_tasks_user_id_idx on public.dashboard_tasks(user_id);
create index if not exists dashboard_tasks_group_id_idx on public.dashboard_tasks(group_id);
create index if not exists dashboard_tasks_position_idx on public.dashboard_tasks(group_id, position);
create index if not exists user_drafts_user_id_idx on public.user_drafts(user_id);
create index if not exists user_drafts_entity_type_idx on public.user_drafts(user_id, entity_type);
create index if not exists user_drafts_client_id_idx on public.user_drafts(client_id);
create index if not exists user_drafts_updated_at_idx on public.user_drafts(user_id, updated_at desc);

drop trigger if exists set_dashboard_task_groups_updated_at on public.dashboard_task_groups;
create trigger set_dashboard_task_groups_updated_at
before update on public.dashboard_task_groups
for each row execute procedure public.set_updated_at();

drop trigger if exists set_dashboard_tasks_updated_at on public.dashboard_tasks;
create trigger set_dashboard_tasks_updated_at
before update on public.dashboard_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists set_user_drafts_updated_at on public.user_drafts;
create trigger set_user_drafts_updated_at
before update on public.user_drafts
for each row execute procedure public.set_updated_at();

grant all on table public.dashboard_task_groups to authenticated, service_role;
grant all on table public.dashboard_tasks to authenticated, service_role;
grant all on table public.user_drafts to authenticated, service_role;

alter table public.dashboard_task_groups enable row level security;
alter table public.dashboard_tasks enable row level security;
alter table public.user_drafts enable row level security;

drop policy if exists "Users can view own dashboard task groups" on public.dashboard_task_groups;
create policy "Users can view own dashboard task groups"
on public.dashboard_task_groups
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own dashboard task groups" on public.dashboard_task_groups;
create policy "Users can insert own dashboard task groups"
on public.dashboard_task_groups
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own dashboard task groups" on public.dashboard_task_groups;
create policy "Users can update own dashboard task groups"
on public.dashboard_task_groups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own dashboard task groups" on public.dashboard_task_groups;
create policy "Users can delete own dashboard task groups"
on public.dashboard_task_groups
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own dashboard tasks" on public.dashboard_tasks;
create policy "Users can view own dashboard tasks"
on public.dashboard_tasks
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own dashboard tasks" on public.dashboard_tasks;
create policy "Users can insert own dashboard tasks"
on public.dashboard_tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own dashboard tasks" on public.dashboard_tasks;
create policy "Users can update own dashboard tasks"
on public.dashboard_tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own dashboard tasks" on public.dashboard_tasks;
create policy "Users can delete own dashboard tasks"
on public.dashboard_tasks
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can view own drafts" on public.user_drafts;
create policy "Users can view own drafts"
on public.user_drafts
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own drafts" on public.user_drafts;
create policy "Users can insert own drafts"
on public.user_drafts
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own drafts" on public.user_drafts;
create policy "Users can update own drafts"
on public.user_drafts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own drafts" on public.user_drafts;
create policy "Users can delete own drafts"
on public.user_drafts
for delete
using (auth.uid() = user_id);

-- Shared HTML report links
create table if not exists public.report_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null,
  title text not null default 'Shared report',
  token text not null,
  source_record_id uuid,
  payload jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_shares add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.report_shares add column if not exists report_type text;
alter table public.report_shares add column if not exists title text not null default 'Shared report';
alter table public.report_shares add column if not exists token text;
alter table public.report_shares add column if not exists source_record_id uuid;
alter table public.report_shares add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.report_shares add column if not exists is_public boolean not null default true;
alter table public.report_shares add column if not exists expires_at timestamptz;
alter table public.report_shares add column if not exists created_at timestamptz not null default now();
alter table public.report_shares add column if not exists updated_at timestamptz not null default now();
alter table public.report_shares alter column user_id set default auth.uid();
alter table public.report_shares alter column title set default 'Shared report';
alter table public.report_shares alter column payload set default '{}'::jsonb;
alter table public.report_shares alter column is_public set default true;
alter table public.report_shares alter column created_at set default now();
alter table public.report_shares alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'report_shares_token_unique'
      and conrelid = 'public.report_shares'::regclass
  ) then
    alter table public.report_shares
      add constraint report_shares_token_unique unique (token);
  end if;
end
$$;

create index if not exists report_shares_user_id_idx on public.report_shares(user_id);
create index if not exists report_shares_report_type_idx on public.report_shares(report_type);
create index if not exists report_shares_token_idx on public.report_shares(token);
create index if not exists report_shares_public_idx on public.report_shares(is_public, expires_at);

drop trigger if exists set_report_shares_updated_at on public.report_shares;
create trigger set_report_shares_updated_at
before update on public.report_shares
for each row execute procedure public.set_updated_at();

grant all on table public.report_shares to authenticated, service_role;
grant select on table public.report_shares to anon;
grant usage on schema public to anon;

alter table public.report_shares enable row level security;

drop policy if exists "Users can view own report shares" on public.report_shares;
create policy "Users can view own report shares"
on public.report_shares
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own report shares" on public.report_shares;
create policy "Users can insert own report shares"
on public.report_shares
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own report shares" on public.report_shares;
create policy "Users can update own report shares"
on public.report_shares
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own report shares" on public.report_shares;
create policy "Users can delete own report shares"
on public.report_shares
for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view active report shares" on public.report_shares;
create policy "Public can view active report shares"
on public.report_shares
for select
using (
  is_public = true
  and (expires_at is null or expires_at > now())
);
