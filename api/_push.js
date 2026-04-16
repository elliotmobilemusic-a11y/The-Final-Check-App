import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const TABLE = 'push_subscriptions';

function normalizePushStorageError(error, fallbackMessage) {
  const message = error?.message || fallbackMessage;

  if (typeof message === 'string' && message.toLowerCase().includes('push_subscriptions')) {
    return 'Push notifications need the latest Supabase schema. Run the latest supabase/schema.sql in your active project, then try again.';
  }

  return message;
}

function getSupabaseUrl() {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
}

function getAnonKey() {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

function getServiceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

function getVapidPublicKey() {
  return (process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '').trim();
}

function getVapidPrivateKey() {
  return (process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '').trim();
}

function getVapidSubject() {
  return (process.env.WEB_PUSH_VAPID_SUBJECT || 'mailto:hello@thefinalcheck.uk').trim();
}

export function createAdminClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are missing.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function createAuthClient() {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getAnonKey();

  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase public credentials are missing.');
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function getAuthenticatedUser(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Missing access token.');
  }

  const authClient = createAuthClient();
  const {
    data: { user },
    error
  } = await authClient.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error('You must be signed in to manage notifications.');
  }

  return user;
}

export function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();

  if (!publicKey || !privateKey) {
    throw new Error('Web push VAPID keys are missing.');
  }

  webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
  return { publicKey };
}

export function parseJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

export async function upsertPushSubscription(userId, subscription, metadata = {}) {
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new Error('The push subscription payload is incomplete.');
  }

  const admin = createAdminClient();
  const payload = {
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    device_label: metadata.deviceLabel || null,
    platform: metadata.platform || null,
    user_agent: metadata.userAgent || null,
    last_seen_at: new Date().toISOString()
  };

  const { data, error } = await admin
    .from(TABLE)
    .upsert(payload, { onConflict: 'endpoint' })
    .select('*')
    .single();

  if (error) {
    throw new Error(normalizePushStorageError(error, 'Could not save the push subscription.'));
  }

  return data;
}

export async function deletePushSubscription(userId, endpoint) {
  if (!endpoint) {
    throw new Error('Subscription endpoint is required.');
  }

  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).delete().eq('user_id', userId).eq('endpoint', endpoint);

  if (error) {
    throw new Error(normalizePushStorageError(error, 'Could not remove the push subscription.'));
  }
}

export async function listPushSubscriptions(userId) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false });

  if (error) {
    throw new Error(normalizePushStorageError(error, 'Could not load push subscriptions.'));
  }

  return data ?? [];
}

export async function removeExpiredPushSubscription(endpoint) {
  const admin = createAdminClient();
  await admin.from(TABLE).delete().eq('endpoint', endpoint);
}

export async function sendPushNotificationToUser(userId, payload) {
  configureWebPush();
  const subscriptions = await listPushSubscriptions(userId);

  let delivered = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth
            }
          },
          JSON.stringify(payload)
        );
        delivered += 1;
      } catch (error) {
        const statusCode = error?.statusCode || error?.status;
        if (statusCode === 404 || statusCode === 410) {
          removed += 1;
          await removeExpiredPushSubscription(row.endpoint);
          return;
        }

        throw error;
      }
    })
  );

  return {
    delivered,
    removed,
    total: subscriptions.length
  };
}
