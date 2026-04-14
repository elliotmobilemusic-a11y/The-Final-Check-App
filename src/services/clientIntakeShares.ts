import { supabasePublic } from '../lib/supabase-public';
import type { ClientIntakeSharePayload, ReportShareRecord } from '../types';

const TABLE = 'report_shares';
const CLIENT_INTAKE_REPORT = 'client_intake';

function createShareToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function normalizeShareError(error: unknown): Error {
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return new Error(
      'Supabase could not reach the enquiry link service. Run the latest schema.sql in your active Supabase project, then redeploy or refresh the app.'
    );
  }

  return error instanceof Error ? error : new Error('Could not reach the enquiry link service.');
}

/**
 * ✅ Public anonymous function - called from unauthenticated intake pages
 * Uses public client only, never loads authenticated client
 */
export async function getClientIntakeShareByToken(
  token: string
): Promise<ReportShareRecord<ClientIntakeSharePayload> | null> {
  const { data, error } = await supabasePublic
    .from(TABLE)
    .select('*')
    .eq('report_type', CLIENT_INTAKE_REPORT)
    .eq('token', token)
    .maybeSingle();

  if (error) throw normalizeShareError(error);
  return (data as ReportShareRecord<ClientIntakeSharePayload> | null) ?? null;
}

/**
 * 🔒 Authenticated function - only called from logged in dashboard
 * Lazy imports authenticated client so it never loads on public pages
 */
export async function createClientIntakeShare(
  payload: ClientIntakeSharePayload = {}
): Promise<ReportShareRecord<ClientIntakeSharePayload>> {
  // Lazy load authenticated client ONLY when this function is actually called
  const { supabase } = await import('../lib/supabase');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('You must be signed in.');

  const body = {
    user_id: user.id,
    report_type: CLIENT_INTAKE_REPORT,
    title: 'Client enquiry form',
    token: createShareToken(),
    source_record_id: null,
    payload,
    is_public: true
  };

  const { data, error } = await supabase.from(TABLE).insert(body).select('*').single();
  if (error) throw normalizeShareError(error);

  return data as ReportShareRecord<ClientIntakeSharePayload>;
}
