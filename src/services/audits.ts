import { supabase } from '../lib/supabase';
import type { AuditFormState, SupabaseRecord } from '../types';

const TABLE = 'audits';

export async function listAudits(clientId?: string): Promise<SupabaseRecord<AuditFormState>[]> {
  if (!supabase) return [];

  let query = supabase.from(TABLE).select('*').order('updated_at', { ascending: false });

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SupabaseRecord<AuditFormState>[];
}

export async function getAuditById(id: string): Promise<SupabaseRecord<AuditFormState> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return (data as SupabaseRecord<AuditFormState> | null) ?? null;
}

export async function saveAudit(form: AuditFormState): Promise<SupabaseRecord<AuditFormState>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const payload = {
    title: form.title || 'Kitchen Profit Audit',
    site_name: form.businessName || '',
    review_date: form.visitDate || null,
    client_id: form.clientId || null,
    data: form
  };

  if (form.id) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(payload)
      .eq('id', form.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as SupabaseRecord<AuditFormState>;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as SupabaseRecord<AuditFormState>;
}

export async function deleteAudit(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}