export type PushDeviceStatus = {
  supported: boolean;
  subscribed: boolean;
  permission: NotificationPermission | 'unsupported';
};

type PushSubscriptionPayload = {
  endpoint: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

function ensurePushSupport() {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    throw new Error('Push notifications are not supported on this device/browser.');
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function buildDeviceLabel() {
  if (typeof navigator === 'undefined') return 'Current device';

  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'iPhone / iPad';
  if (ua.includes('android')) return 'Android device';
  if (ua.includes('mac')) return 'Mac';
  if (ua.includes('win')) return 'Windows PC';
  return navigator.platform || 'Current device';
}

async function getRegistration() {
  ensurePushSupport();
  const registration = await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready.then(() => registration);
}

async function getPushPublicKey() {
  const response = await fetch('/api/push-public-key');
  const data = await response.json();

  if (!response.ok || !data.publicKey) {
    throw new Error(data.error || 'Push notifications are not configured on the server.');
  }

  return data.publicKey as string;
}

export async function getCurrentPushSubscription() {
  ensurePushSupport();
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
}

export async function getPushDeviceStatus(): Promise<PushDeviceStatus> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return {
      supported: false,
      subscribed: false,
      permission: 'unsupported'
    };
  }

  const subscription = await getCurrentPushSubscription();
  return {
    supported: true,
    subscribed: Boolean(subscription),
    permission: Notification.permission
  };
}

export async function enablePushNotifications(accessToken: string) {
  ensurePushSupport();

  const permission =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await getRegistration();
  const publicKey = await getPushPublicKey();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  const payload = subscription.toJSON() as PushSubscriptionPayload;
  const response = await fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      accessToken,
      subscription: payload,
      deviceLabel: buildDeviceLabel(),
      platform: navigator.platform || 'web',
      userAgent: navigator.userAgent
    })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not save the notification subscription.');
  }

  return data;
}

export async function disablePushNotifications(accessToken: string) {
  ensurePushSupport();

  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const response = await fetch('/api/push-subscriptions', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ accessToken, endpoint })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not remove the notification subscription.');
  }
}

export async function syncPushNotifications(accessToken: string) {
  ensurePushSupport();
  if (Notification.permission !== 'granted') return;

  const subscription = await getCurrentPushSubscription();
  if (!subscription) return;

  const payload = subscription.toJSON() as PushSubscriptionPayload;
  await fetch('/api/push-subscriptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      accessToken,
      subscription: payload,
      deviceLabel: buildDeviceLabel(),
      platform: navigator.platform || 'web',
      userAgent: navigator.userAgent
    })
  });
}

export async function sendTestPushNotification(accessToken: string) {
  const response = await fetch('/api/push-send-test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({ accessToken })
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Could not send the test notification.');
  }

  return data;
}
