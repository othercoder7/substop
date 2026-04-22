import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useSession } from '@/components/session-provider';
import {
  categoryAccent,
  formatCurrency,
  formatRenewalDate,
  monthlyEquivalent,
  type Subscription,
} from '@/lib/subscriptions';
import { supabase } from '@/lib/supabase';

export default function OverviewScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    if (!session?.user.id) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('renewal_date', { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setSubscriptions((data ?? []) as Subscription[]);
    setLoading(false);
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      loadSubscriptions();
    }, [loadSubscriptions])
  );

  const activeSubscriptions = subscriptions.filter((subscription) => subscription.status !== 'canceled');
  const monthlySpend = activeSubscriptions.reduce(
    (sum, subscription) => sum + monthlyEquivalent(subscription),
    0
  );
  const renewingSoon = activeSubscriptions.filter((subscription) => {
    const today = new Date();
    const renewal = new Date(subscription.renewal_date);
    const diffDays = Math.ceil((renewal.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const stats = [
    { label: 'Monthly spend', value: formatCurrency(monthlySpend, 'USD') },
    { label: 'Renewing soon', value: String(renewingSoon) },
    { label: 'Tracked plans', value: String(activeSubscriptions.length) },
  ];

  const topSpacerHeight = Math.max(12, Math.min(Math.round(height * 0.08), 72));

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={{ height: topSpacerHeight }} />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This month</Text>
        <Text style={styles.summaryValue}>{formatCurrency(monthlySpend, 'USD')}</Text>
        <Text style={styles.summaryHint}>
          {renewingSoon === 0
            ? 'No renewals are due in the next 7 days.'
            : `${renewingSoon} renewal${renewingSoon === 1 ? '' : 's'} are coming up in the next 7 days.`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.statValue}>
              {stat.value}
            </Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Pressable onPress={() => router.push('/add-subscription')} style={styles.addButton}>
        <Text style={styles.addButtonText}>Add subscription</Text>
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming renewals</Text>
        {loading ? (
          <View style={styles.stateRow}>
            <ActivityIndicator color="#80ba9d" />
          </View>
        ) : errorMessage ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>Could not load subscriptions.</Text>
            <Text style={styles.stateSubtext}>{errorMessage}</Text>
            <Pressable
              onPress={() => {
                void loadSubscriptions();
              }}
              style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : activeSubscriptions.length === 0 ? (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>No subscriptions yet.</Text>
            <Text style={styles.stateSubtext}>
              Add your first subscription to start tracking renewals and monthly spend.
            </Text>
            <Pressable onPress={() => router.push('/add-subscription')} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Add your first one</Text>
            </Pressable>
          </View>
        ) : (
          activeSubscriptions.map((subscription) => (
            <Pressable
              key={subscription.id}
              onPress={() => router.push(`/subscription/${subscription.id}`)}
              style={styles.subscriptionRow}>
              <View
                style={[
                  styles.subscriptionBadge,
                  { backgroundColor: categoryAccent[subscription.category] },
                ]}
              />
              <View style={styles.subscriptionCopy}>
                <Text style={styles.subscriptionName}>{subscription.name}</Text>
                <Text style={styles.subscriptionMeta}>
                  Renews {formatRenewalDate(subscription.renewal_date)}
                </Text>
              </View>
              <Text style={styles.subscriptionAmount}>
                {formatCurrency(Number(subscription.amount), subscription.currency_code)}
              </Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F5F7F4',
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#80ba9d',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: {
    color: '#10231A',
    fontFamily: Fonts.monoBold,
    fontSize: 13,
  },
  summaryCard: {
    gap: 8,
  },
  summaryLabel: {
    color: '#7C2D12',
    fontFamily: Fonts.monoBold,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 36,
  },
  summaryHint: {
    color: '#57534E',
    fontFamily: Fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    flex: 1,
    gap: 6,
    minWidth: 0,
    padding: 16,
  },
  statValue: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 20,
    lineHeight: 24,
  },
  statLabel: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    gap: 14,
    padding: 18,
  },
  stateRow: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  stateBlock: {
    gap: 8,
    paddingVertical: 4,
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
  sectionTitle: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 18,
  },
  subscriptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  subscriptionBadge: {
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  subscriptionCopy: {
    flex: 1,
    gap: 2,
  },
  subscriptionName: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 16,
  },
  subscriptionMeta: {
    color: '#6B7280',
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  subscriptionAmount: {
    color: '#111827',
    fontFamily: Fonts.monoBold,
    fontSize: 15,
  },
});
