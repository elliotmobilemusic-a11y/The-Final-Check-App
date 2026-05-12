import { supabase } from '../lib/supabase';
import type { MenuProjectState, SupabaseRecord } from '../types';
import { normalizeServiceError, requireSignedInUserId } from './serviceUtils';

const TABLE = 'menu_projects';

export async function listMenuProjects(
  clientId?: string
): Promise<SupabaseRecord<MenuProjectState>[]> {
  if (!supabase) return [];

  const userId = await requireSignedInUserId();
  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw normalizeServiceError(error, 'Could not load menu projects.');
  return (data ?? []) as SupabaseRecord<MenuProjectState>[];
}

export async function getMenuProjectById(
  id: string
): Promise<SupabaseRecord<MenuProjectState> | null> {
  if (!supabase) return null;

  const userId = await requireSignedInUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw normalizeServiceError(error, 'Could not load this menu project.');
  return (data as SupabaseRecord<MenuProjectState> | null) ?? null;
}

export async function saveMenuProject(
  project: MenuProjectState
): Promise<SupabaseRecord<MenuProjectState>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
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
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw normalizeServiceError(error, 'Could not save this menu project.');
    return data as SupabaseRecord<MenuProjectState>;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw normalizeServiceError(error, 'Could not save this menu project.');
  return data as SupabaseRecord<MenuProjectState>;
}

export async function deleteMenuProject(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId);
  if (error) throw normalizeServiceError(error, 'Could not delete this menu project.');
}
