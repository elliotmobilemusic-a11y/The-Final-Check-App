-- Pre-Visit Questionnaire Submissions
-- Run this migration in Supabase SQL editor after schema.sql

create table if not exists questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  share_id uuid not null references report_shares(id) on delete cascade,
  template_id text not null,
  client_id uuid references clients(id) on delete set null,
  answers jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'used')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table questionnaire_submissions enable row level security;

create policy "Users can view their own questionnaire submissions"
  on questionnaire_submissions for select
  using (auth.uid() = user_id);

create policy "Users can update their own questionnaire submissions"
  on questionnaire_submissions for update
  using (auth.uid() = user_id);

create index if not exists questionnaire_submissions_user_id_idx on questionnaire_submissions(user_id);
create index if not exists questionnaire_submissions_share_id_idx on questionnaire_submissions(share_id);
create index if not exists questionnaire_submissions_client_id_idx on questionnaire_submissions(client_id);
create index if not exists questionnaire_submissions_status_idx on questionnaire_submissions(status);
