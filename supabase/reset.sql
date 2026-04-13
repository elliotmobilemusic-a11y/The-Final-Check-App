-- The Final Check
-- Clean reset for the app-owned Supabase objects
-- Run this first if you want to replace an older database setup
-- This does NOT delete auth.users accounts

begin;

drop policy if exists "Public can view avatar files" on storage.objects;
drop policy if exists "Users can upload own avatar files" on storage.objects;
drop policy if exists "Users can update own avatar files" on storage.objects;
drop policy if exists "Users can delete own avatar files" on storage.objects;

delete from storage.objects where bucket_id = 'avatars';
delete from storage.buckets where id = 'avatars';

drop table if exists public.profiles cascade;
drop table if exists public.report_shares cascade;
drop table if exists public.user_drafts cascade;
drop table if exists public.dashboard_tasks cascade;
drop table if exists public.dashboard_task_groups cascade;
drop table if exists public.mystery_shop_audits cascade;
drop table if exists public.food_safety_audits cascade;
drop table if exists public.menu_projects cascade;
drop table if exists public.audits cascade;
drop table if exists public.clients cascade;

drop function if exists public.set_updated_at() cascade;

commit;

-- Optional: if you also want to wipe application data but keep the schema,
-- use truncate instead of drop table in a separate script.
--
-- Optional and dangerous: if you want to remove app users too, do it manually
-- from Authentication > Users in Supabase, or via admin API with a service role.
