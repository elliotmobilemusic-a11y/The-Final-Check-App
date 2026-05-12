import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export async function requireSignedInUserId(): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data, error } = await supabase.auth.getUser();
  if (error) throw normalizeServiceError(error, 'Could not verify your session.');

  const userId = data.user?.id;
  if (!userId) throw new Error('You must be signed in.');

  return userId;
}

export function normalizeServiceError(error: unknown, fallback = 'Something went wrong. Please try again.') {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/jwt|token|refresh|session|auth/i.test(message)) {
    return new Error('Your session could not be verified. Please sign in again.');
  }

  if (/row level security|permission denied|not authorized|unauthorized|forbidden/i.test(message)) {
    return new Error('You do not have permission to access this record.');
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return new Error('The workspace could not reach the secure data service. Check your connection and try again.');
  }

  const code = (error as PostgrestError | undefined)?.code;
  if (code === 'PGRST116') {
    return new Error('That record is no longer available.');
  }

  return error instanceof Error ? error : new Error(fallback);
}

export function isSafePublicToken(token: string) {
  return /^[a-zA-Z0-9_-]{16,128}$/.test(token);
}
