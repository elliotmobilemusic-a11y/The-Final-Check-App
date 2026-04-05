import { supabase } from '../lib/supabase';
import type { MenuProjectState, SupabaseRecord } from '../types';

const TABLE = 'menu_projects';

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error('You must be signed in.');

  return userId;
}

export async function listMenuProjects(
  clientId?: string
): Promise<SupabaseRecord<MenuProjectState>[]> {
  if (!supabase) return [];

  let query = supabase.from(TABLE).select('*').order('updated_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SupabaseRecord<MenuProjectState>[];
}

export async function getMenuProjectById(
  id: string
): Promise<SupabaseRecord<MenuProjectState> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as SupabaseRecord<MenuProjectState> | null) ?? null;
}

export async function saveMenuProject(
  project: MenuProjectState
): Promise<SupabaseRecord<MenuProjectState>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    title: project.menuName || 'Untitled Menu',
    site_name: project.siteName || '',
    review_date: project.reviewDate || null,
    client_id: project.clientId || null,
    client_site_id: project.clientSiteId || null,
    data: project
  };

  if (project.id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', project.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as SupabaseRecord<MenuProjectState>;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as SupabaseRecord<MenuProjectState>;
}

export async function deleteMenuProject(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}
