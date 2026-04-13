import { createClient } from '@supabase/supabase-js';
import type { ClientIntakeSharePayload, ReportShareRecord } from '../types';

const TABLE = 'report_shares';
const CLIENT_INTAKE_REPORT = 'client_intake';

// ✅ Dedicated anonymous client for public intake links
// This prevents the main auth client from attempting automatic session refresh
// which causes cascading CORS failures when unauthenticated users visit share links
const getPublicSupabaseClient = () => {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
};

// Main authenticated client for internal use (requires logged in user)
import { supabase } from '../lib/supabase';

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
  const publicClient = getPublicSupabaseClient();

  const { data, error } = await publicClient
    .from(TABLE)
    .select('*')
    .eq('report_type', CLIENT_INTAKE_REPORT)
    .eq('token', token)
    .maybeSingle();

  if (error) throw normalizeShareError(error);
  return (data as ReportShareRecord<ClientIntakeSharePayload> | null) ?? null;
}