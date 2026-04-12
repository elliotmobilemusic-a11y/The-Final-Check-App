import { createClient } from '@supabase/supabase-js';

function decodeJwtPayload(token) {
  const parts = String(token ?? '').split('.');
  if (parts.length < 2) {
    throw new Error('Invalid access token.');
  }

  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');

  return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const accessToken = String(body?.accessToken ?? '').trim();

    if (!accessToken) {
      response.status(400).json({ error: 'Missing access token.' });
      return;
    }

    const payload = decodeJwtPayload(accessToken);
    const userId = String(payload?.sub ?? '').trim();
    const userMetadata =
      payload && typeof payload.user_metadata === 'object' && payload.user_metadata
        ? payload.user_metadata
        : {};

    if (!userId) {
      response.status(400).json({ error: 'Could not identify the current user.' });
      return;
    }

    const cleanedMetadata = { ...userMetadata };
    delete cleanedMetadata.avatar_url;
    delete cleanedMetadata.avatar_position;

    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: cleanedMetadata
    });

    if (error) {
      throw error;
    }

    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : 'Could not repair auth profile.'
    });
  }
}
