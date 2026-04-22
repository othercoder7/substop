import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Fonts } from '@/constants/theme';
import { formatCurrency, formatRenewalDate, type Subscription } from '@/lib/subscriptions';
import { supabase } from '@/lib/supabase';

function isRenewingWithinSevenDays(renewalDate: string) {
  const today = new Date();
  const renewal = new Date(renewalDate);
  const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

export default function RenewingSoonScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const topSpacerHeight = Math.max(12, Math.min(Math.round(height * 0.08), 72));

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .neq('status', 'canceled')
      .order('renewal_date', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const soon = ((data ?? []) as Subscription[]).filter((subscription) =>
      isRenewingWithinSevenDays(subscription.renewal_date)
    );

    setSubscriptions(soon);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions])
  );

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={{ height: topSpacerHeight }} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Renewing soon</Text>
        <Text style={styles.title}>{subscriptions.length}</Text>
      </View>

      {loading ? (
        <View style={styles.stateRow}>
          <ActivityIndicator color="#80ba9d" />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>Could not load renewals.</Text>
          <Text style={styles.stateSubtext}>{errorMessage}</Text>
          <Pressable
            onPress={() => {
              void loadSubscriptions();
            }}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : subscriptions.length === 0 ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateText}>Nothing renewing soon.</Text>
          <Text style={styles.stateSubtext}>
            You do not have any subscriptions renewing within the next 7 days.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {subscriptions.map((subscription) => (
            <Pressable
              key={subscription.id}
              onPress={() => router.push(`/subscription/${subscription.id}`)}
              style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.name}>{subscription.name}</Text>
                <Text style={styles.meta}>
                  Renews {formatRenewalDate(subscription.renewal_date)}
                </Text>
              </View>
              <Text style={styles.amount}>
                {formatCurrency(Number(subscription.amount), subscription.currency_code)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    gap: 20,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: '#7C2D12',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 42,
    lineHeight: 46,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 16,
  },
  meta: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  amount: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
  },
  stateRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  stateBlock: {
    gap: 8,
  },
  stateText: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
  stateSubtext: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 12,
  },
});
