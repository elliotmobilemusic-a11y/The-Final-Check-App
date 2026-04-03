-- Kitchen Performance Platform
-- Supabase schema for protected audit + menu storage.

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

create table if not exists public.audit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled audit',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled menu',
  site_name text,
  location text,
  review_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists audit_reports_user_id_idx on public.audit_reports(user_id);
create index if not exists menu_projects_user_id_idx on public.menu_projects(user_id);

drop trigger if exists set_audit_reports_updated_at on public.audit_reports;
create trigger set_audit_reports_updated_at
before update on public.audit_reports
for each row execute procedure public.set_updated_at();

drop trigger if exists set_menu_projects_updated_at on public.menu_projects;
create trigger set_menu_projects_updated_at
before update on public.menu_projects
for each row execute procedure public.set_updated_at();

alter table public.audit_reports enable row level security;
alter table public.menu_projects enable row level security;

drop policy if exists "Users can view own audit reports" on public.audit_reports;
create policy "Users can view own audit reports"
on public.audit_reports
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own audit reports" on public.audit_reports;
create policy "Users can insert own audit reports"
on public.audit_reports
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own audit reports" on public.audit_reports;
create policy "Users can update own audit reports"
on public.audit_reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own audit reports" on public.audit_reports;
create policy "Users can delete own audit reports"
on public.audit_reports
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
