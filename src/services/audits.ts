import { supabase } from '../lib/supabase';
import type { AuditFormState, SupabaseRecord } from '../types';
import { normalizeServiceError, requireSignedInUserId } from './serviceUtils';

const TABLE = 'audits';

export async function listAudits(clientId?: string): Promise<SupabaseRecord<AuditFormState>[]> {
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
  if (error) throw normalizeServiceError(error, 'Could not load audits.');
  return (data ?? []) as SupabaseRecord<AuditFormState>[];
}

export async function getAuditById(id: string): Promise<SupabaseRecord<AuditFormState> | null> {
  if (!supabase) return null;

  const userId = await requireSignedInUserId();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw normalizeServiceError(error, 'Could not load this audit.');
  return (data as SupabaseRecord<AuditFormState> | null) ?? null;
}

export async function saveAudit(form: AuditFormState): Promise<SupabaseRecord<AuditFormState>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
  const payload = {
    user_id: userId,
    title: form.title || 'Kitchen Profit Audit',
    site_name: form.businessName || '',
    location: form.location || null,
    review_date: form.visitDate || null,
    client_id: form.clientId || null,
    client_site_id: form.clientSiteId || null,
    data: form
  };

  if (form.id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', form.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw normalizeServiceError(error, 'Could not save this audit.');
    return data as SupabaseRecord<AuditFormState>;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw normalizeServiceError(error, 'Could not save this audit.');
  return data as SupabaseRecord<AuditFormState>;
}

export async function deleteAudit(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireSignedInUserId();
  const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId);
  if (error) throw normalizeServiceError(error, 'Could not delete this audit.');
}
