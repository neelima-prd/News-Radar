/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import webpush from 'web-push';
import { DatabaseService } from './server_db.js';

let isVapidConfigured = false;

export function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@newsradar.local';

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      isVapidConfigured = true;
      return true;
    } catch (e) {
      console.warn('[NotificationService] VAPID initialization failed:', e);
    }
  }
  return false;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url: string;
    briefing_id?: string;
    [key: string]: any;
  };
}

export class NotificationService {
  /**
   * Sends a push notification to all active devices of a user
   */
  static async sendNotificationToUser(
    userId: string,
    payload: PushPayload
  ): Promise<{ sentCount: number; failedCount: number }> {
    if (!isVapidConfigured) {
      configureVapid();
    }

    if (!isVapidConfigured) {
      console.warn('[NotificationService] Skipping push: VAPID keys are not configured.');
      return { sentCount: 0, failedCount: 0 };
    }

    const subscriptions = await DatabaseService.getUserPushSubscriptions(userId);
    if (!subscriptions || subscriptions.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    let sentCount = 0;
    let failedCount = 0;

    const stringifiedPayload = JSON.stringify(payload);

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth_key
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, stringifiedPayload);
        sentCount++;
      } catch (err: any) {
        failedCount++;
        console.warn(`[NotificationService] Failed to send push to endpoint ${sub.endpoint.slice(0, 30)}...`, err.statusCode || err.message);

        // If subscription is expired or unregistered (HTTP 404 or 410 Gone), deactivate it
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.info(`[NotificationService] Deactivating expired subscription endpoint.`);
          await DatabaseService.deactivatePushSubscription(sub.endpoint);
        }
      }
    }

    return { sentCount, failedCount };
  }
}
