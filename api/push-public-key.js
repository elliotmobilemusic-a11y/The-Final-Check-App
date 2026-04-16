import { configureWebPush } from './_push.js';

export default async function handler(_req, res) {
  try {
    const { publicKey } = configureWebPush();
    res.status(200).json({ publicKey, enabled: true });
  } catch (error) {
    res.status(503).json({
      enabled: false,
      error: error instanceof Error ? error.message : 'Push notifications are not configured.'
    });
  }
}
