import {
  deletePushSubscription,
  getAuthenticatedUser,
  listPushSubscriptions,
  parseJsonBody,
  upsertPushSubscription
} from './_push.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const body = parseJsonBody(req);
    const accessToken =
      req.headers.authorization?.replace(/^Bearer\s+/i, '') ||
      body.accessToken ||
      req.query.accessToken;
    const user = await getAuthenticatedUser(accessToken);

    if (req.method === 'GET') {
      const subscriptions = await listPushSubscriptions(user.id);
      return res.status(200).json({
        subscriptions: subscriptions.map((item) => ({
          endpoint: item.endpoint,
          deviceLabel: item.device_label,
          platform: item.platform,
          lastSeenAt: item.last_seen_at
        }))
      });
    }

    if (req.method === 'POST') {
      const saved = await upsertPushSubscription(user.id, body.subscription, {
        deviceLabel: body.deviceLabel,
        platform: body.platform,
        userAgent: body.userAgent || req.headers['user-agent'] || ''
      });

      return res.status(200).json({
        ok: true,
        subscription: {
          endpoint: saved.endpoint,
          deviceLabel: saved.device_label,
          platform: saved.platform
        }
      });
    }

    await deletePushSubscription(user.id, body.endpoint);
    return res.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not manage push subscriptions.';
    const status = message.toLowerCase().includes('signed in') ? 401 : 400;
    return res.status(status).json({ error: message });
  }
}
