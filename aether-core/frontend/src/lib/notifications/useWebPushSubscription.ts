import { apiFetch, apiRoutes } from '@/lib/api';
import { env } from '@/lib/config';

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isWebPushAvailable(): boolean {
  return isPushSupported() && env.isLiveMode;
}

export async function subscribeWebPush(): Promise<boolean> {
  if (!isWebPushAvailable()) return false;

  const { publicKey } = await apiFetch<{ publicKey: string | null }>(
    apiRoutes.admin.notificationPushVapidKey,
  );
  if (!publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register('/sw-notifications.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  await apiFetch(apiRoutes.admin.notificationPushSubscribe, {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: navigator.userAgent,
    }),
  });

  return true;
}

export async function unsubscribeWebPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.getRegistration('/sw-notifications.js');
  if (!registration) return;

  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  await apiFetch(apiRoutes.admin.notificationPushUnsubscribe, {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * Sync browser push subscription when any category has push enabled.
 */
export async function syncWebPushSubscription(pushEnabled: boolean): Promise<void> {
  if (!isWebPushAvailable()) return;
  if (pushEnabled) {
    await subscribeWebPush();
  } else {
    await unsubscribeWebPush();
  }
}
