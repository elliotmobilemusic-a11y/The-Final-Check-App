import { getAuthenticatedUser, parseJsonBody, sendPushNotificationToUser } from './_push.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const body = parseJsonBody(req);
    const accessToken =
      req.headers.authorization?.replace(/^Bearer\s+/i, '') || body.accessToken;
    const user = await getAuthenticatedUser(accessToken);

    const result = await sendPushNotificationToUser(user.id, {
      title: 'The Final Check',
      body: 'Notifications are live on this device and linked to your signed-in account.',
      tag: 'the-final-check-test',
      url: '/#/settings/security',
      icon: '/the-final-check-logo.png',
      badge: '/the-final-check-favicon.png'
    });

    return res.status(200).json({
      ok: true,
      delivered: result.delivered,
      removed: result.removed,
      total: result.total
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the test notification.';
    const status = message.toLowerCase().includes('signed in') ? 401 : 400;
    return res.status(status).json({ error: message });
  }
}
