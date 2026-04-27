import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { formatCurrency, formatRenewalDate, type Subscription } from '@/lib/subscriptions';
import { supabase } from '@/lib/supabase';
import { defaultUserPreferences, fetchUserPreferences } from '@/lib/user-preferences';

const renewalChannelId = 'renewals';

async function ensureNotificationChannel() {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(renewalChannelId, {
    name: 'Renewals',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestRenewalNotificationPermission() {
  if (Platform.OS === 'web') {
    return 'denied' as const;
  }

  const existing = await Notifications.getPermissionsAsync();

  if (existing.status === 'granted') {
    await ensureNotificationChannel();
    return existing.status;
  }

  const next = await Notifications.requestPermissionsAsync();

  if (next.status === 'granted') {
    await ensureNotificationChannel();
  }

  return next.status;
}

export async function cancelRenewalNotifications() {
  if (Platform.OS === 'web') {
    return;
  }

  await Notifications.cancelAllScheduledNotificationsAsync();
}

function getReminderTriggerDate(renewalDate: string, daysBefore: number, reminderHour: number) {
  const triggerDate = new Date(`${renewalDate}T${String(reminderHour).padStart(2, '0')}:00:00`);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  return triggerDate;
}

export async function syncRenewalNotificationsForSubscriptions(
  subscriptions: Subscription[],
  options?: {
    enabled?: boolean;
    reminderHour?: number;
  }
) {
  if (Platform.OS === 'web') {
    return { scheduledCount: 0, permissionStatus: 'denied' as const };
  }

  await ensureNotificationChannel();

  const enabled = options?.enabled ?? true;
  const reminderHour = options?.reminderHour ?? defaultUserPreferences.reminder_hour;

  if (!enabled) {
    await cancelRenewalNotifications();
    return { scheduledCount: 0, permissionStatus: 'disabled' as const };
  }

  const permissionStatus = (await Notifications.getPermissionsAsync()).status;

  if (permissionStatus !== 'granted') {
    return { scheduledCount: 0, permissionStatus };
  }

  await Notifications.cancelAllScheduledNotificationsAsync();

  let scheduledCount = 0;
  const now = Date.now();

  for (const subscription of subscriptions) {
    if (subscription.status === 'canceled') {
      continue;
    }

    const reminderDays = [...new Set(subscription.reminder_days)].sort((a, b) => b - a);

    for (const daysBefore of reminderDays) {
      const triggerDate = getReminderTriggerDate(subscription.renewal_date, daysBefore, reminderHour);

      if (triggerDate.getTime() <= now) {
        continue;
      }

      const title =
        daysBefore === 1
          ? `${subscription.name} renews tomorrow`
          : `${subscription.name} renews in ${daysBefore} days`;

      const body = `Next charge ${formatRenewalDate(subscription.renewal_date)} · ${formatCurrency(
        Number(subscription.amount),
        subscription.currency_code
      )}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          channelId: renewalChannelId,
          date: triggerDate,
        },
      });

      scheduledCount += 1;
    }
  }

  return { scheduledCount, permissionStatus };
}

export async function syncRenewalNotificationsForCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await cancelRenewalNotifications();
    return { scheduledCount: 0, permissionStatus: 'signed-out' as const };
  }

  const preferences = await fetchUserPreferences(user.id);
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .neq('status', 'canceled')
    .order('renewal_date', { ascending: true });

  if (error) {
    throw error;
  }

  return syncRenewalNotificationsForSubscriptions((data ?? []) as Subscription[], {
    enabled: preferences.renewal_notifications_enabled,
    reminderHour: preferences.reminder_hour,
  });
}
