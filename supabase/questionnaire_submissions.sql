-- Pre-Visit Questionnaire Submissions
-- Run this migration in Supabase SQL editor after schema.sql

create table if not exists public.questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  share_id uuid not null references public.report_shares(id) on delete cascade,
  template_id text not null,
  client_id uuid references public.clients(id) on delete set null,
  answers jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'used')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.questionnaire_submissions enable row level security;

drop policy if exists "Users can view their own questionnaire submissions"
  on public.questionnaire_submissions;

create policy "Users can view their own questionnaire submissions"
  on public.questionnaire_submissions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own questionnaire submissions"
  on public.questionnaire_submissions;

create policy "Users can update their own questionnaire submissions"
  on public.questionnaire_submissions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_questionnaire_submissions_updated_at
  on public.questionnaire_submissions;

create trigger set_questionnaire_submissions_updated_at
  before update on public.questionnaire_submissions
  for each row execute procedure public.set_updated_at();

create index if not exists questionnaire_submissions_user_id_idx on public.questionnaire_submissions(user_id);
create index if not exists questionnaire_submissions_share_id_idx on public.questionnaire_submissions(share_id);
create index if not exists questionnaire_submissions_client_id_idx on public.questionnaire_submissions(client_id);
create index if not exists questionnaire_submissions_status_idx on public.questionnaire_submissions(status);

grant all on table public.questionnaire_submissions to authenticated, service_role;

notify pgrst, 'reload schema';
