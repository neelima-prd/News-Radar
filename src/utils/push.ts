/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Convert urlBase64 to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return null;
    return await registration.pushManager.getSubscription();
  } catch (e) {
    console.warn('[WebPush] Error getting push subscription:', e);
    return null;
  }
}

export async function checkNotificationStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  hasSubscription: boolean;
}> {
  if (!isPushNotificationSupported()) {
    return { supported: false, permission: 'denied', hasSubscription: false };
  }
  const permission = getNotificationPermissionState();
  let hasSubscription = false;
  if (permission === 'granted') {
    const sub = await getActivePushSubscription();
    hasSubscription = !!sub;
  }
  return {
    supported: true,
    permission,
    hasSubscription
  };
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[WebPush] Service Worker registration failed:', error);
    return null;
  }
}

export async function subscribeToPushNotifications(
  userEmail: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications are not supported in this browser.' };
  }

  try {
    let permission = getNotificationPermissionState();
    if (permission === 'denied') {
      return { success: false, error: 'Notifications are blocked in your browser settings.' };
    }

    if (permission !== 'granted') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      return { success: false, error: 'Permission was not granted for desktop notifications.' };
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, error: 'Failed to initialize Service Worker.' };
    }

    let vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    
    // If not bundled at build-time via Vite, dynamically fetch from server config endpoint
    if (!vapidPublicKey) {
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.vapidPublicKey) {
            vapidPublicKey = config.vapidPublicKey;
          }
        }
      } catch (cfgErr) {
        console.warn('[WebPush] Could not fetch server VAPID key:', cfgErr);
      }
    }

    if (!vapidPublicKey) {
      return { 
        success: false, 
        error: 'VAPID public key is missing. Ensure VAPID_PUBLIC_KEY is configured on the server or in the environment.' 
      };
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      try {
        const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      } catch (subErr: any) {
        console.error('[WebPush] PushManager.subscribe failed:', subErr);
        return {
          success: false,
          error: subErr.message || 'PushManager failed to create subscription.'
        };
      }
    }

    if (!subscription) {
      return { success: false, error: 'Failed to create push subscription on browser push service.' };
    }

    // Save to server
    const rawKey = subscription.getKey ? subscription.getKey('p256dh') : null;
    const rawAuth = subscription.getKey ? subscription.getKey('auth') : null;

    const p256dh = rawKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawKey)))) : '';
    const auth_key = rawAuth ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(rawAuth)))) : '';

    const payload = {
      endpoint: subscription.endpoint,
      p256dh,
      auth_key,
      user_agent: navigator.userAgent
    };

    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Failed to save subscription to server.' };
    }

    return { success: true, subscription };
  } catch (error: any) {
    console.error('[WebPush] Subscribe error:', error);
    return { success: false, error: error.message || 'Subscription failed.' };
  }
}

export async function unsubscribeFromPushNotifications(userEmail: string): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) return true;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});
        await subscription.unsubscribe().catch(() => {});
      }
    } else {
      // In case registration not active, still call server unsubscribe
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail
        },
        body: JSON.stringify({})
      }).catch(() => {});
    }
    return true;
  } catch (e) {
    console.warn('[WebPush] Unsubscribe error:', e);
    return false;
  }
}
