import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSession } from '@/components/session-provider';
import { Fonts } from '@/constants/theme';
import {
  requestRenewalNotificationPermission,
  syncRenewalNotificationsForCurrentUser,
} from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import { defaultUserPreferences, fetchUserPreferences, upsertUserPreferences } from '@/lib/user-preferences';

export default function AccountScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [preferences, setPreferences] = useState(defaultUserPreferences);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const topSpacerHeight = Math.max(12, Math.min(Math.round(height * 0.08), 72));

  const loadPreferences = useCallback(async () => {
    if (!session?.user.id) {
      setLoadingPreferences(false);
      return;
    }

    try {
      const nextPreferences = await fetchUserPreferences(session.user.id);
      setPreferences({
        renewal_notifications_enabled: nextPreferences.renewal_notifications_enabled,
        reminder_hour: nextPreferences.reminder_hour,
        import_email_enabled: nextPreferences.import_email_enabled,
        import_bank_enabled: nextPreferences.import_bank_enabled,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not load settings', message);
    } finally {
      setLoadingPreferences(false);
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
    }, [loadPreferences])
  );

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Sign out failed', error.message);
    }
  }

  async function handleNotificationsToggle(nextValue: boolean) {
    if (!session?.user.id || savingNotifications) {
      return;
    }

    setSavingNotifications(true);

    try {
      if (nextValue) {
        const permissionStatus = await requestRenewalNotificationPermission();

        if (permissionStatus !== 'granted') {
          Alert.alert(
            'Notifications are off',
            'Enable notifications on your device to receive renewal reminders.'
          );
          return;
        }
      }

      await upsertUserPreferences(session.user.id, {
        renewal_notifications_enabled: nextValue,
      });

      setPreferences((current) => ({
        ...current,
        renewal_notifications_enabled: nextValue,
      }));

      await syncRenewalNotificationsForCurrentUser();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      Alert.alert('Could not update notifications', message);
    } finally {
      setSavingNotifications(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      style={styles.screen}>
      <View style={{ height: topSpacerHeight }} />

      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text numberOfLines={1} style={styles.email}>
          {session?.user.email ?? 'Unknown account'}
        </Text>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Renewal reminders</Text>
            <Text style={styles.settingText}>
              Send a reminder before an active subscription renews.
            </Text>
          </View>
          {loadingPreferences ? (
            <ActivityIndicator color="#80ba9d" />
          ) : (
            <Switch
              disabled={savingNotifications}
              onValueChange={handleNotificationsToggle}
              thumbColor={preferences.renewal_notifications_enabled ? '#F9FAFB' : '#E5E7EB'}
              trackColor={{ false: '#CBD5E1', true: '#80ba9d' }}
              value={preferences.renewal_notifications_enabled}
            />
          )}
        </View>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Email import</Text>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>Connect Gmail</Text>
          <Text style={styles.settingText}>
            Detect receipts and renewal emails, then review likely subscriptions before adding them.
          </Text>
        </View>
        <Pressable onPress={() => router.push('/email-import')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Open email import</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  label: {
    color: '#6B7280',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  email: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 24,
    lineHeight: 30,
    flexShrink: 1,
  },
  copy: {
    color: '#4B5563',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  settingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    padding: 20,
  },
  sectionTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 18,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  settingCopy: {
    flex: 1,
    gap: 4,
  },
  settingTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  settingText: {
    color: '#4B5563',
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 56,
  },
  signOutText: {
    color: '#F9FAFB',
    fontFamily: Fonts.monoBold,
    fontSize: 16,
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
  },
});
