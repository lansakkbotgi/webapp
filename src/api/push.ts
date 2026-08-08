import { api } from './client';

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const data = await api.get<{ publicKey: string }>('/push/vapid-key');
    return data.publicKey;
  } catch { return null; }
}

export async function subscribePush(registration: ServiceWorkerRegistration): Promise<boolean> {
  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return false;

  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
    });
    const json = sub.toJSON();
    await api.post('/push/subscribe', {
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    });
    return true;
  } catch (err) {
    console.error('[push] subscribe error:', err);
    return false;
  }
}

export async function unsubscribePush(registration: ServiceWorkerRegistration): Promise<void> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  await api.delete('/push/subscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
