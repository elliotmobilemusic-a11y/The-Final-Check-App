import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import type { EnquiryAlert } from './enquiryAlerts';

const ENQUIRY_CHANNEL_ID = 'the-final-check-enquiries';

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function ensureDeviceNotificationPermission() {
  if (isNativeAndroid()) {
    try {
      await LocalNotifications.createChannel({
        id: ENQUIRY_CHANNEL_ID,
        name: 'Enquiries',
        description: 'New client enquiries for The Final Check',
        importance: 4,
        visibility: 1
      });
    } catch {
      // Ignore channel creation failures and continue with permission checks.
    }

    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;

    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function sendEnquiryDeviceNotification(newAlerts: EnquiryAlert[]) {
  if (!newAlerts.length) return false;

  const granted = await ensureDeviceNotificationPermission();
  if (!granted) return false;

  const newest = newAlerts[0];

  if (isNativeAndroid()) {
    const title =
      newAlerts.length === 1 ? 'New client enquiry' : `${newAlerts.length} new client enquiries`;
    const body =
      newAlerts.length === 1
        ? `${newest.companyName}${newest.contactName ? ` • ${newest.contactName}` : ''}`
        : `${newest.companyName} and ${newAlerts.length - 1} more`;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Number(Date.now().toString().slice(-8)),
          title,
          body,
          schedule: { at: new Date(Date.now() + 350) },
          channelId: ENQUIRY_CHANNEL_ID,
          extra: {
            type: 'client-enquiry',
            clientId: newest.clientId
          }
        }
      ]
    });

    return true;
  }

  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    const title =
      newAlerts.length === 1 ? 'New client enquiry' : `${newAlerts.length} new client enquiries`;
    const body =
      newAlerts.length === 1
        ? `${newest.companyName}${newest.contactName ? ` • ${newest.contactName}` : ''}`
        : `${newest.companyName} and ${newAlerts.length - 1} more`;

    new Notification(title, {
      body,
      tag: 'the-final-check-enquiries'
    });
    return true;
  }

  return false;
}
