import { supabase } from '../lib/supabase';
import type { AuditFormState, ReportShareRecord } from '../types';

const TABLE = 'report_shares';
const KITCHEN_AUDIT_REPORT = 'kitchen_audit';

async function requireUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error('You must be signed in.');

  return userId;
}

function createShareToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export async function createKitchenAuditShare(
  audit: AuditFormState
): Promise<ReportShareRecord<AuditFormState>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    report_type: KITCHEN_AUDIT_REPORT,
    title: audit.businessName?.trim() || audit.title?.trim() || 'Kitchen audit report',
    token: createShareToken(),
    source_record_id: audit.id ?? null,
    payload: audit,
    is_public: true
  };

  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) throw error;

  return data as ReportShareRecord<AuditFormState>;
}

export async function getKitchenAuditShareByToken(
  token: string
): Promise<ReportShareRecord<AuditFormState> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('report_type', KITCHEN_AUDIT_REPORT)
    .eq('token', token)
    .maybeSingle();

  if (error) throw error;
  return (data as ReportShareRecord<AuditFormState> | null) ?? null;
}
