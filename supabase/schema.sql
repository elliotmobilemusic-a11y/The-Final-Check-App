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

update public.audits
set
  client_id = coalesce(
    client_id,
    case
      when coalesce(data ->> 'clientId', '') ~* '^[0-9a-f-]{36}$' then (data ->> 'clientId')::uuid
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
      when coalesce(data ->> 'clientId', '') ~* '^[0-9a-f-]{36}$' then (data ->> 'clientId')::uuid
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

grant usage on schema public to authenticated, service_role;
grant all on table public.clients to authenticated, service_role;
grant all on table public.audits to authenticated, service_role;
grant all on table public.menu_projects to authenticated, service_role;

alter table public.clients enable row level security;
alter table public.audits enable row level security;
alter table public.menu_projects enable row level security;

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
