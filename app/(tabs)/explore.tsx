import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/components/session-provider';
import { Fonts } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { session } = useSession();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Sign out failed', error.message);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.email}>{session?.user.email ?? 'Unknown account'}</Text>
        <Text style={styles.copy}>
          This is a simple starter account screen. Next we can add reminder settings, billing
          preferences, and household sharing if you want to expand the MVP.
        </Text>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Next good build steps</Text>
        <Text style={styles.tipText}>Create the subscriptions table in Supabase.</Text>
        <Text style={styles.tipText}>Replace the mock cards with real subscription queries.</Text>
        <Text style={styles.tipText}>Add create, edit, and renewal reminder flows.</Text>
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
  },
  copy: {
    color: '#4B5563',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#DCEAFE',
    borderRadius: 24,
    gap: 8,
    padding: 20,
  },
  tipTitle: {
    color: '#1E3A8A',
    fontFamily: Fonts.monoBold,
    fontSize: 18,
  },
  tipText: {
    color: '#1F2937',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
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
});
