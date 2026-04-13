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
    const error = new Error('Supabase admin credentials are not configured.');
    error.statusCode = 503;
    throw error;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl ?? '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image payload.');
  }

  const [, contentType, base64] = match;
  return {
    contentType,
    buffer: Buffer.from(base64, 'base64')
  };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const accessToken = String(body?.accessToken ?? '').trim();
    const imageDataUrl = String(body?.imageDataUrl ?? '').trim();

    if (!accessToken || !imageDataUrl) {
      response.status(400).json({ error: 'Missing access token or image payload.' });
      return;
    }

    const payload = decodeJwtPayload(accessToken);
    const userId = String(payload?.sub ?? '').trim();
    if (!userId) {
      response.status(401).json({ error: 'Could not identify the current user.' });
      return;
    }

    const { contentType, buffer } = parseDataUrl(imageDataUrl);
    if (buffer.length > 10 * 1024 * 1024) {
      response.status(413).json({ error: 'Avatar image is too large.' });
      return;
    }

    const extension = contentType.split('/')[1] || 'jpg';
    const version = Date.now();
    const path = `${userId}/avatar-${version}.${extension}`;

    const supabase = createAdminClient();
    const upload = await supabase.storage.from('avatars').upload(path, buffer, {
      contentType,
      cacheControl: '31536000',
      upsert: true
    });

    if (upload.error) {
      throw upload.error;
    }

    const {
      data: { publicUrl }
    } = supabase.storage.from('avatars').getPublicUrl(path);

    response.status(200).json({
      publicUrl: `${publicUrl}?v=${version}`
    });
  } catch (error) {
    response.status(error.statusCode || 500).json({
      error: error instanceof Error ? error.message : 'Could not upload avatar.'
    });
  }
}
