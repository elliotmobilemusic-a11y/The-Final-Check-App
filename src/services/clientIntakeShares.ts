import { supabase } from '../lib/supabase';
import type { ClientIntakeSharePayload, ReportShareRecord } from '../types';

const TABLE = 'report_shares';
const CLIENT_INTAKE_REPORT = 'client_intake';

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

function normalizeShareError(error: unknown): Error {
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return new Error(
      'Supabase could not reach the intake link service. Run the latest schema.sql in your active Supabase project, then redeploy or refresh the app.'
    );
  }

  return error instanceof Error ? error : new Error('Could not reach the intake link service.');
}

export async function createClientIntakeShare(
  payload: ClientIntakeSharePayload = {}
): Promise<ReportShareRecord<ClientIntakeSharePayload>> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const userId = await requireUserId();
  const body = {
    user_id: userId,
    report_type: CLIENT_INTAKE_REPORT,
    title: 'Client intake form',
    token: createShareToken(),
    source_record_id: null,
    payload,
    is_public: true
  };

  const { data, error } = await supabase.from(TABLE).insert(body).select('*').single();
  if (error) throw normalizeShareError(error);

  return data as ReportShareRecord<ClientIntakeSharePayload>;
}

export async function getClientIntakeShareByToken(
  token: string
): Promise<ReportShareRecord<ClientIntakeSharePayload> | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('report_type', CLIENT_INTAKE_REPORT)
    .eq('token', token)
    .maybeSingle();

  if (error) throw normalizeShareError(error);
  return (data as ReportShareRecord<ClientIntakeSharePayload> | null) ?? null;
}
